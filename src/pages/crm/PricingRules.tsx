import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useCRM } from '../../context/CRMDataContext';
import {
    Plus,
    Trash2,
    Tag,
    Calendar,
    Percent,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Activity,
    Users,
    ChevronLeft,
    ChevronRight,
    Save,
    Edit2,
    ToggleLeft,
    ToggleRight,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isSameDay, isWeekend, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

type TabType = 'calendar' | 'rules' | 'coupons';

const UPSELL_THRESHOLD = 80;
const DOWNSELL_THRESHOLD = 40;

export default function PricingRules() {
    const { tenant } = useAuth();
    const { rooms, reservations } = useCRM();
    const [rules, setRules] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('calendar');

    // Calendar State
    const [startDate, setStartDate] = useState(new Date());
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);

    // Bulk Update Form
    const [bulkFrom, setBulkFrom] = useState(new Date().toISOString().slice(0, 10));
    const [bulkTo, setBulkTo] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    const [bulkRoom, setBulkRoom] = useState('all');
    const [bulkStrategy, setBulkStrategy] = useState<'increase_pct' | 'decrease_pct' | 'fixed'>('increase_pct');
    const [bulkValue, setBulkValue] = useState('15');
    const [bulkApplying, setBulkApplying] = useState(false);

    // Dynamic Rule Modal State
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<any | null>(null);
    const [ruleForm, setRuleForm] = useState({
        room_id: '',
        rule_type: 'peak',
        start_date: '',
        end_date: '',
        price_override: '',
    });
    const [savingRule, setSavingRule] = useState(false);

    // Occupancy-Based Pricing State
    const [upsellEnabled, setUpsellEnabled] = useState(false);
    const [downsellEnabled, setDownsellEnabled] = useState(false);
    const [upsellPercentage, setUpsellPercentage] = useState(15);
    const [downsellPercentage, setDownsellPercentage] = useState(10);
    const [savingOccupancy, setSavingOccupancy] = useState(false);

    // Derive dates synchronously on render so dates[0] is never undefined
    const dates = Array.from({ length: 14 }).map((_, i) => addDays(startDate, i));

    // Occupancy computation
    const computeOccupancy = (targetDate: Date): number => {
        if (rooms.length === 0) return 0;
        const target = startOfDay(targetDate);
        const bookedCount = rooms.filter(room => {
            return reservations.some(res => {
                if (res.status !== 'Confirmed' && res.status !== 'Pending') return false;
                if (res.room_id !== room.id && res.room !== (room.name || room.type)) return false;
                const checkIn = startOfDay(new Date(res.checkIn));
                const checkOut = endOfDay(new Date(res.checkOut));
                return isWithinInterval(target, { start: checkIn, end: checkOut });
            });
        }).length;
        return Math.round((bookedCount / rooms.length) * 100);
    };

    const todayOccupancy = computeOccupancy(new Date());

    // Compute real ADR and RevPAR from reservation data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = reservations.filter(r => {
        const created = new Date(r.checkIn || r.created_at);
        return created >= thirtyDaysAgo && r.status !== 'Cancelled';
    });
    const totalRevenue = recentBookings.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalNights = recentBookings.reduce((sum, r) => {
        const ci = new Date(r.checkIn);
        const co = new Date(r.checkOut);
        const n = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
        return sum + n;
    }, 0);
    const computedADR = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;
    const computedRevPAR = rooms.length > 0 ? Math.round((totalRevenue / 30) / rooms.length) : 0;

    // Pre-compute occupancy for the 14-day calendar window
    const occupancyByDate: Record<string, number> = {};
    dates.forEach(date => {
        occupancyByDate[format(date, 'yyyy-MM-dd')] = computeOccupancy(date);
    });

    // Filter out occupancy rules from the rules listing
    const dateRangeRules = rules.filter(r => r.rule_type !== 'occupancy_upsell' && r.rule_type !== 'occupancy_downsell');

    // Simulate Daily Rates (In a real app, this would be a Time-Series DB query)
    const [dailyRates, setDailyRates] = useState<Record<number, Record<string, number>>>({});

    useEffect(() => {
        if (tenant) {
            fetchData();
        }
    }, [tenant]);

    useEffect(() => {
        // Compute daily rates based on base room prices and active pricing rules
        const initialRates: Record<number, Record<string, number>> = {};
        rooms.forEach(room => {
            initialRates[room.id] = {};
            dates.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                let price = room.price_per_night || 0;

                // Find matching rules for this date
                const matchingRules = rules.filter(rule => {
                    if (!rule.start_date || !rule.end_date) return false;
                    const ruleStart = new Date(rule.start_date);
                    const ruleEnd = new Date(rule.end_date);
                    return date >= ruleStart && date <= ruleEnd;
                });

                // Room-specific rule takes priority over "all rooms" rule
                const roomSpecificRule = matchingRules.find(r => r.room_id === room.id);
                const allRoomsRule = matchingRules.find(r => !r.room_id);
                const applicableRule = roomSpecificRule || allRoomsRule;

                if (applicableRule) {
                    price = applicableRule.price_override;
                } else if (isWeekend(date)) {
                    // Only apply default weekend premium if no explicit rule covers this date
                    price += price * 0.15;
                }

                // Apply occupancy-based dynamic pricing
                const dateOccupancy = occupancyByDate[dateStr] ?? 0;
                if (upsellEnabled && dateOccupancy >= UPSELL_THRESHOLD) {
                    price *= (1 + upsellPercentage / 100);
                } else if (downsellEnabled && dateOccupancy <= DOWNSELL_THRESHOLD) {
                    price *= (1 - downsellPercentage / 100);
                }

                initialRates[room.id][dateStr] = Math.round(price);
            });
        });
        setDailyRates(initialRates);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, rooms, rules, reservations, upsellEnabled, downsellEnabled, upsellPercentage, downsellPercentage]);

    const fetchData = async () => {
        setLoading(true);
        console.log('[PricingRules] fetchData started');
        try {
            // First fetch rules and coupons in parallel
            const [rulesRes, couponsRes] = await Promise.all([
                supabase.from('room_pricing').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }),
                supabase.from('coupons').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
            ]);

            if (rulesRes.error) {
                console.error('[PricingRules] rules fetch error:', rulesRes.error);
                throw rulesRes.error;
            }
            if (couponsRes.error) {
                console.error('[PricingRules] coupons fetch error:', couponsRes.error);
                throw couponsRes.error;
            }

            let allRules = rulesRes.data || [];

            // Next, if we have rules that reference rooms, fetch the room names separately
            const roomIds = allRules
                .filter(r => r.room_id)
                .map(r => r.room_id);

            if (roomIds.length > 0) {
                const { data: roomsData, error: roomsError } = await supabase
                    .from('rooms')
                    .select('id, name, type')
                    .in('id', roomIds);

                if (roomsError) {
                    console.error('[PricingRules] rooms fetch error:', roomsError);
                } else if (roomsData) {
                    // Manually join the room name/info to the rule
                    allRules = allRules.map(rule => {
                        const room = roomsData.find(rm => rm.id === rule.room_id);
                        return {
                            ...rule,
                            rooms: room ? { name: room.name || room.type } : null
                        };
                    });
                }
            }

            setRules(allRules);
            setCoupons(couponsRes.data || []);

            // Hydrate occupancy pricing settings
            const upsellRow = allRules.find((r: any) => r.rule_type === 'occupancy_upsell');
            const downsellRow = allRules.find((r: any) => r.rule_type === 'occupancy_downsell');
            setUpsellEnabled(!!upsellRow);
            setUpsellPercentage(upsellRow ? upsellRow.price_override : 15);
            setDownsellEnabled(!!downsellRow);
            setDownsellPercentage(downsellRow ? downsellRow.price_override : 10);
            console.log('[PricingRules] fetchData completed successfully');
        } catch (error: any) {
            console.error('[PricingRules] fetchData caught error:', error);
            toast.error('Failed to fetch data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRateChange = (roomId: number, dateStr: string, newValue: string) => {
        const val = parseInt(newValue, 10);
        if (isNaN(val)) return;
        setDailyRates(prev => ({
            ...prev,
            [roomId]: {
                ...prev[roomId],
                [dateStr]: val
            }
        }));
    };

    const openRuleModal = (rule?: any) => {
        if (rule) {
            setEditingRule(rule);
            setRuleForm({
                room_id: rule.room_id?.toString() || '',
                rule_type: rule.rule_type || 'peak',
                start_date: rule.start_date || '',
                end_date: rule.end_date || '',
                price_override: rule.price_override?.toString() || '',
            });
        } else {
            setEditingRule(null);
            setRuleForm({
                room_id: '',
                rule_type: 'peak',
                start_date: '',
                end_date: '',
                price_override: '',
            });
        }
        setShowRuleModal(true);
    };

    const closeRuleModal = () => {
        setShowRuleModal(false);
        setEditingRule(null);
        setRuleForm({ room_id: '', rule_type: 'peak', start_date: '', end_date: '', price_override: '' });
    };

    const handleSaveRule = async () => {
        if (!ruleForm.start_date || !ruleForm.end_date || !ruleForm.price_override) {
            toast.error('Please fill in all required fields (dates and price).');
            return;
        }
        if (new Date(ruleForm.end_date) < new Date(ruleForm.start_date)) {
            toast.error('End date must be after start date.');
            return;
        }
        setSavingRule(true);
        try {
            const payload = {
                tenant_id: tenant.id,
                room_id: ruleForm.room_id ? parseInt(ruleForm.room_id, 10) : null,
                rule_type: ruleForm.rule_type,
                start_date: ruleForm.start_date,
                end_date: ruleForm.end_date,
                price_override: parseFloat(ruleForm.price_override),
            };

            if (editingRule) {
                const { error } = await supabase
                    .from('room_pricing')
                    .update(payload)
                    .eq('id', editingRule.id);
                if (error) throw error;
                toast.success('Rule updated successfully!');
            } else {
                const { error } = await supabase
                    .from('room_pricing')
                    .insert(payload);
                if (error) throw error;
                toast.success('Rule created successfully!');
            }
            closeRuleModal();
            await fetchData();
        } catch (error: any) {
            toast.error('Failed to save rule: ' + error.message);
        } finally {
            setSavingRule(false);
        }
    };

    const handleDeleteRule = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this pricing rule?')) return;
        try {
            setRules(prev => prev.filter(r => r.id !== id));
            const { error } = await supabase.from('room_pricing').delete().eq('id', id);
            if (error) throw error;
            toast.success('Rule deleted.');
        } catch (error: any) {
            toast.error('Failed to delete rule: ' + error.message);
            await fetchData();
        }
    };

    const saveRates = async () => {
        if (!tenant?.id) return;
        toast.promise(
            (async () => {
                // 1. Fetch room mappings
                let { data: mappings } = await supabase
                    .from('aiosell_room_mappings')
                    .select('room_code, rateplan_code, room_id')
                    .eq('tenant_id', tenant.id);

                // 2. If empty, check if hotel code is connected and auto-seed
                if (!mappings || mappings.length === 0) {
                    const { data: conn } = await supabase
                        .from('channel_connections')
                        .select('property_id')
                        .eq('tenant_id', tenant.id)
                        .eq('channel_id', 'aiosell')
                        .maybeSingle();

                    if (!conn?.property_id) {
                        throw new Error('No Aiosell Hotel Code linked. Go to CRM > Channel Manager to enter your Hotel Code.');
                    }

                    // Auto-seed mappings for existing rooms
                    if (rooms.length > 0) {
                        const fallbackRows = rooms.map(room => ({
                            tenant_id: tenant.id,
                            room_id: room.id,
                            room_code: (room.type || room.name || 'standard').toLowerCase().replace(/\s+/g, '-'),
                            rateplan_code: `${(room.type || room.name || 'standard').toLowerCase().replace(/\s+/g, '-')}-ep`,
                            rateplan_name: 'Rooms Only'
                        }));
                        await supabase.from('aiosell_room_mappings').upsert(fallbackRows, {
                            onConflict: 'tenant_id,room_code,rateplan_code'
                        });
                        const refetched = await supabase
                            .from('aiosell_room_mappings')
                            .select('room_code, rateplan_code, room_id')
                            .eq('tenant_id', tenant.id);
                        mappings = refetched.data || [];
                    }
                }

                if (!mappings || mappings.length === 0) {
                    throw new Error('No rooms found to sync. Add your rooms in Property Setup first.');
                }

                // 3. Build rate entries matching rooms to mappings
                const rateEntries: Array<{ roomCode: string; rateplanCode: string; rate: number }> = [];
                for (const m of mappings) {
                    const room = rooms.find(r => r.id === m.room_id)
                        || rooms.find(r => (r.type || '').toLowerCase() === m.room_code.toLowerCase())
                        || rooms.find(r => (r.name || '').toLowerCase().includes(m.room_code.toLowerCase()))
                        || rooms[0];

                    const baseRate = room?.price_per_night ?? 0;
                    if (baseRate > 0) {
                        rateEntries.push({
                            roomCode: m.room_code,
                            rateplanCode: m.rateplan_code,
                            rate: baseRate,
                        });
                    }
                }

                if (rateEntries.length === 0) throw new Error('No rates to push — set room prices first.');

                const today = new Date().toISOString().slice(0, 10);
                const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

                const res = await supabase.functions.invoke('aiosell-push', {
                    body: {
                        tenant_id: tenant.id,
                        action: 'rates',
                        updates: [{ startDate: today, endDate: in90, rates: rateEntries }],
                    }
                });
                if (res.error) throw res.error;
            })(),
            {
                loading: 'Pushing rates to Aiosell → Booking.com, Agoda & all OTAs...',
                success: 'Rates synced to all channels!',
                error: (e: any) => `Sync: ${e?.message ?? e}`,
            }
        );
    };

    const handleBulkApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant?.id || !bulkFrom || !bulkTo || !bulkValue) return;
        if (new Date(bulkTo) < new Date(bulkFrom)) {
            toast.error('End date must be after start date.');
            return;
        }
        setBulkApplying(true);

        const val = parseFloat(bulkValue);
        const targetRooms = bulkRoom === 'all' ? rooms : rooms.filter(r => String(r.id) === bulkRoom);

        toast.promise(
            (async () => {
                // 1. Compute new prices for each target room
                const priceByRoom: Record<number, number> = {};
                for (const room of targetRooms) {
                    const base = room.price_per_night || 0;
                    let newPrice: number;
                    if (bulkStrategy === 'increase_pct') newPrice = Math.round(base * (1 + val / 100));
                    else if (bulkStrategy === 'decrease_pct') newPrice = Math.round(base * (1 - val / 100));
                    else newPrice = Math.round(val);
                    priceByRoom[room.id] = newPrice;
                }

                // 2. Upsert a room_pricing rule for the date range
                const rulePayloads = targetRooms.map(room => ({
                    tenant_id: tenant.id,
                    room_id: bulkRoom === 'all' ? null : room.id,
                    rule_type: 'bulk_override',
                    start_date: bulkFrom,
                    end_date: bulkTo,
                    price_override: priceByRoom[room.id],
                }));

                const deduped = bulkRoom === 'all'
                    ? [rulePayloads[0]]
                    : rulePayloads;

                for (const payload of deduped) {
                    const { error } = await supabase.from('room_pricing').insert(payload);
                    if (error) throw error;
                }

                // 3. Update local dailyRates immediately for visual feedback
                setDailyRates(prev => {
                    const next = { ...prev };
                    for (const room of targetRooms) {
                        next[room.id] = { ...(next[room.id] || {}) };
                        const start = new Date(bulkFrom);
                        const end = new Date(bulkTo);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            next[room.id][d.toISOString().slice(0, 10)] = priceByRoom[room.id];
                        }
                    }
                    return next;
                });

                // 4. Push updated rates to Aiosell → all OTAs if connected
                let { data: mappings } = await supabase
                    .from('aiosell_room_mappings')
                    .select('room_code, rateplan_code, room_id')
                    .eq('tenant_id', tenant.id);

                if (!mappings || mappings.length === 0) {
                    const { data: conn } = await supabase
                        .from('channel_connections')
                        .select('property_id')
                        .eq('tenant_id', tenant.id)
                        .eq('channel_id', 'aiosell')
                        .maybeSingle();

                    if (conn?.property_id && rooms.length > 0) {
                        const fallbackRows = rooms.map(room => ({
                            tenant_id: tenant.id,
                            room_id: room.id,
                            room_code: (room.type || room.name || 'standard').toLowerCase().replace(/\s+/g, '-'),
                            rateplan_code: `${(room.type || room.name || 'standard').toLowerCase().replace(/\s+/g, '-')}-ep`,
                            rateplan_name: 'Rooms Only'
                        }));
                        await supabase.from('aiosell_room_mappings').upsert(fallbackRows, {
                            onConflict: 'tenant_id,room_code,rateplan_code'
                        });
                        const refetched = await supabase
                            .from('aiosell_room_mappings')
                            .select('room_code, rateplan_code, room_id')
                            .eq('tenant_id', tenant.id);
                        mappings = refetched.data || [];
                    }
                }

                if (mappings && mappings.length > 0) {
                    const filteredMappings = bulkRoom === 'all'
                        ? mappings
                        : mappings.filter(m => String(m.room_id) === bulkRoom || m.room_id === null);

                    const rateEntries = filteredMappings
                        .map(m => {
                            const matchedRoom = rooms.find(r => r.id === m.room_id) || targetRooms[0];
                            const rate = (matchedRoom && priceByRoom[matchedRoom.id]) ? priceByRoom[matchedRoom.id] : (matchedRoom?.price_per_night ?? 0);
                            return {
                                roomCode: m.room_code,
                                rateplanCode: m.rateplan_code,
                                rate,
                            };
                        })
                        .filter(e => e.rate > 0);

                    if (rateEntries.length > 0) {
                        await supabase.functions.invoke('aiosell-push', {
                            body: {
                                tenant_id: tenant.id,
                                action: 'rates',
                                updates: [{ startDate: bulkFrom, endDate: bulkTo, rates: rateEntries }],
                            }
                        });
                    }
                }

                setShowBulkUpdate(false);
                await fetchData();
            })(),
            {
                loading: 'Applying bulk price change & pushing to Aiosell...',
                success: `Rates updated (${bulkFrom} → ${bulkTo}) & pushed to all OTAs!`,
                error: (e: any) => `Failed: ${e?.message ?? e}`,
            }
        );
        setBulkApplying(false);
    };

    const handleSaveOccupancySettings = async () => {
        setSavingOccupancy(true);
        try {
            const existingUpsell = rules.find(r => r.rule_type === 'occupancy_upsell');
            const existingDownsell = rules.find(r => r.rule_type === 'occupancy_downsell');

            // Handle upsell
            if (upsellEnabled) {
                const payload = {
                    tenant_id: tenant.id,
                    room_id: null,
                    rule_type: 'occupancy_upsell',
                    start_date: null,
                    end_date: null,
                    price_override: upsellPercentage,
                };
                if (existingUpsell) {
                    const { error } = await supabase.from('room_pricing').update(payload).eq('id', existingUpsell.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('room_pricing').insert(payload);
                    if (error) throw error;
                }
            } else if (existingUpsell) {
                const { error } = await supabase.from('room_pricing').delete().eq('id', existingUpsell.id);
                if (error) throw error;
            }

            // Handle downsell
            if (downsellEnabled) {
                const payload = {
                    tenant_id: tenant.id,
                    room_id: null,
                    rule_type: 'occupancy_downsell',
                    start_date: null,
                    end_date: null,
                    price_override: downsellPercentage,
                };
                if (existingDownsell) {
                    const { error } = await supabase.from('room_pricing').update(payload).eq('id', existingDownsell.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('room_pricing').insert(payload);
                    if (error) throw error;
                }
            } else if (existingDownsell) {
                const { error } = await supabase.from('room_pricing').delete().eq('id', existingDownsell.id);
                if (error) throw error;
            }

            toast.success('Occupancy pricing settings saved!');
            await fetchData();
        } catch (error: any) {
            toast.error('Failed to save settings: ' + error.message);
        } finally {
            setSavingOccupancy(false);
        }
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            {/* Header & KPIs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-[#0E2A38]">Rate & Revenue Management</h1>
                    <p className="text-gray-500 mt-2">Maximize RevPAR through dynamic pricing, OTA sync, and targeted promotions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-[var(--color-ocean-50)] group-hover:scale-110 transition-transform duration-500">
                        <Activity size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">RevPAR (Current)</p>
                        <h3 className="text-3xl font-bold text-[#0E2A38]">₹{computedRevPAR.toLocaleString()}</h3>
                        <div className="flex items-center gap-2 mt-2 text-green-600 text-sm font-medium">
                            <TrendingUp size={16} />
                            <span>{recentBookings.length} bookings (30d)</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-[var(--color-ocean-50)] group-hover:scale-110 transition-transform duration-500">
                        <Tag size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">ADR (Average Daily Rate)</p>
                        <h3 className="text-3xl font-bold text-[#0E2A38]">₹{computedADR.toLocaleString()}</h3>
                        <div className="flex items-center gap-2 mt-2 text-green-600 text-sm font-medium">
                            <TrendingUp size={16} />
                            <span>{totalNights} room-nights (30d)</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-[var(--color-ocean-50)] group-hover:scale-110 transition-transform duration-500">
                        <Users size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Occupancy Rate</p>
                        <h3 className="text-3xl font-bold text-[#0E2A38]">{todayOccupancy}%</h3>
                        <div className={`flex items-center gap-2 mt-2 text-sm font-medium ${upsellEnabled && todayOccupancy >= UPSELL_THRESHOLD ? 'text-amber-600' :
                            downsellEnabled && todayOccupancy <= DOWNSELL_THRESHOLD ? 'text-blue-600' :
                                'text-green-600'
                            }`}>
                            {upsellEnabled && todayOccupancy >= UPSELL_THRESHOLD ? (
                                <><TrendingUp size={16} /><span>Upsell Active (+{upsellPercentage}%)</span></>
                            ) : downsellEnabled && todayOccupancy <= DOWNSELL_THRESHOLD ? (
                                <><TrendingDown size={16} /><span>Downsell Active (-{downsellPercentage}%)</span></>
                            ) : (
                                <><TrendingUp size={16} /><span>Normal Rates</span></>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'calendar' ? 'border-[var(--color-ocean-600)] text-[var(--color-ocean-900)] bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                        Daily Rate Calendar
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'rules' ? 'border-[var(--color-ocean-600)] text-[var(--color-ocean-900)] bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                        Dynamic Rules
                    </button>
                    <button
                        onClick={() => setActiveTab('coupons')}
                        className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'coupons' ? 'border-[var(--color-ocean-600)] text-[var(--color-ocean-900)] bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                        Promo Codes
                    </button>
                </div>

                <div className="p-6 flex-1">
                    {/* RATE CALENDAR TAB */}
                    {activeTab === 'calendar' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setStartDate(addDays(startDate, -7))}
                                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <h3 className="font-semibold text-gray-900 w-48 text-center">
                                        {format(dates[0], 'MMM d, yyyy')} - {format(dates[dates.length - 1], 'MMM d')}
                                    </h3>
                                    <button
                                        onClick={() => setStartDate(addDays(startDate, 7))}
                                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowBulkUpdate(true)}
                                        className="flex-1 sm:flex-none bg-white text-[#0E2A38] border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                                    >
                                        Bulk Update
                                    </button>
                                    <button
                                        onClick={saveRates}
                                        className="flex-1 sm:flex-none bg-[var(--color-ocean-900)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-ocean-800)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> Force Sync
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm relative">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="p-4 bg-gray-50 border-r border-gray-200 sticky left-0 z-20 font-semibold text-gray-700 min-w-[200px]">Room Type</th>
                                            {dates.map((date, i) => (
                                                <th key={i} className={`p-3 border-b border-gray-200 text-center min-w-[100px] ${isWeekend(date) ? 'bg-[#ffedb3]/30' : 'bg-white'}`}>
                                                    <div className="text-xs text-gray-500 uppercase font-semibold">{format(date, 'EEE')}</div>
                                                    <div className={`text-base font-bold ${isSameDay(date, new Date()) ? 'text-[var(--color-ocean-600)]' : 'text-gray-900'}`}>{format(date, 'MMM d')}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rooms.map(room => (
                                            <tr key={room.id} className="hover:bg-gray-50">
                                                <td className="p-4 bg-white border-r border-gray-200 sticky left-0 z-10 font-medium text-gray-900">
                                                    {room.name || room.type}
                                                    <div className="text-xs text-gray-400 font-normal mt-0.5">Base: ₹{room.price_per_night}</div>
                                                </td>
                                                {dates.map((date, i) => {
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    const priceStr = dailyRates[room.id]?.[dateStr]?.toString() || '0';
                                                    return (
                                                        <td key={i} className={`p-2 border-r border-gray-100 ${isWeekend(date) ? 'bg-[#ffedb3]/10' : ''}`}>
                                                            <input
                                                                type="text"
                                                                value={priceStr}
                                                                onChange={(e) => handleRateChange(room.id, dateStr, e.target.value)}
                                                                className="w-full text-center py-2 px-1 rounded bg-transparent hover:bg-white focus:bg-white border-transparent focus:border-[var(--color-ocean-300)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none text-sm font-semibold transition-all"
                                                            />
                                                            <div className="text-[10px] text-center text-green-600 mt-1 font-medium scale-90">Synced</div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-[#ffedb3]/50 rounded-sm"></div> Weekend Indicator (Auto-premium applied)
                            </div>
                        </div>
                    )}

                    {/* DYNAMIC RULES TAB */}
                    {activeTab === 'rules' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Automation Rules</h3>
                                <button
                                    onClick={() => openRuleModal()}
                                    className="bg-white text-[#0E2A38] border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} /> New Rule
                                </button>
                            </div>
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">Loading rules...</div>
                            ) : dateRangeRules.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                    <Calendar className="mx-auto mb-3 opacity-20" size={40} />
                                    <p>No pricing rules set up yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dateRangeRules.map((rule) => (
                                        <div key={rule.id} className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-shadow group relative">
                                            <div className="flex gap-4">
                                                <div className={`p-3 rounded-xl flex-shrink-0 ${rule.rule_type === 'peak' ? 'bg-red-50 text-red-600' :
                                                    rule.rule_type === 'seasonal' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-green-50 text-green-600'
                                                    }`}>
                                                    <Tag size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-900">{rule.rooms?.name || 'All Rooms'}</h4>
                                                    <div className="flex items-center gap-2 mt-1.5 mb-3">
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 uppercase font-bold tracking-wider text-gray-600">{rule.rule_type}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {rule.start_date && !isNaN(new Date(rule.start_date).getTime())
                                                            ? `${format(new Date(rule.start_date), 'MMM d')} - ${rule.end_date && !isNaN(new Date(rule.end_date).getTime()) ? format(new Date(rule.end_date), 'MMM d') : ''}`
                                                            : 'Always Active (Weekends)'}
                                                    </p>
                                                </div>
                                                <div className="text-right flex flex-col items-end justify-between">
                                                    <p className="font-bold text-xl text-[#0E2A38]">₹{rule.price_override.toLocaleString()}</p>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => openRuleModal(rule)}
                                                            className="p-1.5 text-gray-400 hover:text-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-50)] rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRule(rule.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* OCCUPANCY-BASED DYNAMIC PRICING */}
                            <div className="mt-10 pt-8 border-t border-gray-200">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Occupancy-Based Pricing</h3>
                                        <p className="text-sm text-gray-500 mt-1">Auto-adjust rates based on real-time occupancy. Current occupancy: <span className="font-bold text-[#0E2A38]">{todayOccupancy}%</span></p>
                                    </div>
                                    <button
                                        onClick={handleSaveOccupancySettings}
                                        disabled={savingOccupancy}
                                        className="bg-[var(--color-ocean-900)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-ocean-800)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={16} /> {savingOccupancy ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>

                                {/* Occupancy Bar */}
                                <div className="mb-8 bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                                        <span>0%</span>
                                        <span>Downsell Zone (&le;{DOWNSELL_THRESHOLD}%)</span>
                                        <span>Normal</span>
                                        <span>Upsell Zone (&ge;{UPSELL_THRESHOLD}%)</span>
                                        <span>100%</span>
                                    </div>
                                    <div className="relative h-6 rounded-full overflow-hidden flex">
                                        <div className="bg-blue-200 h-full" style={{ width: `${DOWNSELL_THRESHOLD}%` }} />
                                        <div className="bg-green-100 h-full" style={{ width: `${UPSELL_THRESHOLD - DOWNSELL_THRESHOLD}%` }} />
                                        <div className="bg-amber-200 h-full" style={{ width: `${100 - UPSELL_THRESHOLD}%` }} />
                                        {/* Current Occupancy Marker */}
                                        <div
                                            className="absolute top-0 h-full w-1 bg-[#0E2A38] rounded-full shadow-md"
                                            style={{ left: `${Math.min(todayOccupancy, 100)}%`, transform: 'translateX(-50%)' }}
                                        />
                                        <div
                                            className="absolute -top-6 text-[10px] font-bold text-[#0E2A38] bg-white px-1.5 py-0.5 rounded shadow-sm border"
                                            style={{ left: `${Math.min(todayOccupancy, 100)}%`, transform: 'translateX(-50%)' }}
                                        >
                                            {todayOccupancy}%
                                        </div>
                                    </div>
                                </div>

                                {/* Upsell / Downsell Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Upsell Card */}
                                    <div className={`p-6 rounded-xl border-2 transition-all ${upsellEnabled ? 'border-amber-300 bg-amber-50/50 shadow-md' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">Upsell</h4>
                                                    <p className="text-xs text-gray-500">When occupancy &ge; {UPSELL_THRESHOLD}%</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setUpsellEnabled(!upsellEnabled)}
                                                className={`transition-colors ${upsellEnabled ? 'text-amber-500' : 'text-gray-300'}`}
                                            >
                                                {upsellEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                            </button>
                                        </div>

                                        <div className={`space-y-4 transition-opacity ${upsellEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-600 font-medium">Price Increase</span>
                                                    <span className="font-bold text-amber-700">+{upsellPercentage}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={5}
                                                    max={50}
                                                    value={upsellPercentage}
                                                    onChange={(e) => setUpsellPercentage(parseInt(e.target.value))}
                                                    className="w-full h-2 bg-amber-200 rounded-full appearance-none cursor-pointer accent-amber-500"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                    <span>5%</span>
                                                    <span>50%</span>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-amber-200">
                                                <p className="text-xs text-gray-500 mb-1">Example: Base rate ₹4,000</p>
                                                <p className="font-bold text-amber-700">₹{Math.round(4000 * (1 + upsellPercentage / 100)).toLocaleString()} <span className="text-xs font-normal text-gray-400">(+₹{Math.round(4000 * upsellPercentage / 100).toLocaleString()})</span></p>
                                            </div>
                                        </div>

                                        {upsellEnabled && todayOccupancy >= UPSELL_THRESHOLD && (
                                            <div className="mt-4 bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
                                                <AlertTriangle size={14} />
                                                Upsell is currently active — occupancy at {todayOccupancy}%
                                            </div>
                                        )}
                                    </div>

                                    {/* Downsell Card */}
                                    <div className={`p-6 rounded-xl border-2 transition-all ${downsellEnabled ? 'border-blue-300 bg-blue-50/50 shadow-md' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                                    <TrendingDown size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">Downsell</h4>
                                                    <p className="text-xs text-gray-500">When occupancy &le; {DOWNSELL_THRESHOLD}%</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setDownsellEnabled(!downsellEnabled)}
                                                className={`transition-colors ${downsellEnabled ? 'text-blue-500' : 'text-gray-300'}`}
                                            >
                                                {downsellEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                            </button>
                                        </div>

                                        <div className={`space-y-4 transition-opacity ${downsellEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-600 font-medium">Price Decrease</span>
                                                    <span className="font-bold text-blue-700">-{downsellPercentage}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={5}
                                                    max={40}
                                                    value={downsellPercentage}
                                                    onChange={(e) => setDownsellPercentage(parseInt(e.target.value))}
                                                    className="w-full h-2 bg-blue-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                    <span>5%</span>
                                                    <span>40%</span>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-blue-200">
                                                <p className="text-xs text-gray-500 mb-1">Example: Base rate ₹4,000</p>
                                                <p className="font-bold text-blue-700">₹{Math.round(4000 * (1 - downsellPercentage / 100)).toLocaleString()} <span className="text-xs font-normal text-gray-400">(-₹{Math.round(4000 * downsellPercentage / 100).toLocaleString()})</span></p>
                                            </div>
                                        </div>

                                        {downsellEnabled && todayOccupancy <= DOWNSELL_THRESHOLD && (
                                            <div className="mt-4 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
                                                <AlertTriangle size={14} />
                                                Downsell is currently active — occupancy at {todayOccupancy}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COUPONS TAB */}
                    {activeTab === 'coupons' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Promotions & Discount Codes</h3>
                                <button
                                    onClick={async () => {
                                        if (!tenant?.id) return;
                                        const code = window.prompt('Promo code (e.g. SUMMER20):')?.trim().toUpperCase();
                                        if (!code) return;
                                        const typeInput = window.prompt('Discount type — enter "percent" or "flat":', 'percent')?.trim().toLowerCase();
                                        const discount_type = typeInput === 'flat' ? 'flat' : 'percent';
                                        const valueRaw = window.prompt(discount_type === 'percent' ? 'Discount percentage (e.g. 20):' : 'Discount amount in ₹ (e.g. 500):');
                                        const discount_value = parseFloat(valueRaw || '');
                                        if (!discount_value || discount_value <= 0) { toast.error('Invalid discount value'); return; }
                                        const maxRaw = window.prompt('Max uses (leave blank for unlimited):');
                                        const max_uses = maxRaw && parseInt(maxRaw) > 0 ? parseInt(maxRaw) : null;
                                        const { error } = await supabase.from('coupons').insert({
                                            tenant_id: tenant.id, code, discount_type, discount_value, max_uses, is_active: true, used_count: 0,
                                        });
                                        if (error) { toast.error('Failed to create coupon: ' + error.message); return; }
                                        toast.success('Promo code created');
                                        fetchData();
                                    }}
                                    className="bg-white text-[#0E2A38] border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center gap-2">
                                    <Plus size={16} /> New Promo Code
                                </button>
                            </div>
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">Loading coupons...</div>
                            ) : coupons.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                    <Percent className="mx-auto mb-3 opacity-20" size={40} />
                                    <p>No coupons found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {coupons.map((coupon) => (
                                        <div key={coupon.id} className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-shadow relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-[#C9A646]/5 rounded-bl-full -z-10" />
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="bg-[#0E2A38] text-white px-3 py-1.5 rounded-lg">
                                                    <span className="font-mono font-bold tracking-wider">{coupon.code}</span>
                                                </div>
                                                <div className={`w-2.5 h-2.5 rounded-full ${coupon.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-xl text-[#C9A646]">
                                                    {coupon.discount_type === 'percent' ? `${coupon.discount_value}% Off` : `₹${coupon.discount_value} Off`}
                                                </p>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 mb-2">
                                                    <div
                                                        className="bg-[#0E2A38] h-1.5 rounded-full"
                                                        style={{ width: `${Math.min(((coupon.used_count || 0) / (coupon.max_uses || 1)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest flex justify-between">
                                                    <span>{coupon.used_count || 0} REDEEMED</span>
                                                    {coupon.max_uses ? <span>MAX: {coupon.max_uses}</span> : <span>UNLIMITED</span>}
                                                </p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm(`Delete promo code "${coupon.code}"? This cannot be undone.`)) return;
                                                    const { error } = await supabase.from('coupons').delete().eq('id', coupon.id);
                                                    if (error) { toast.error('Failed to delete coupon: ' + error.message); return; }
                                                    toast.success('Coupon deleted');
                                                    fetchData();
                                                }}
                                                aria-label={`Delete promo code ${coupon.code}`}
                                                className="absolute bottom-4 right-4 p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Update Rates Modal */}
            {showBulkUpdate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => !bulkApplying && setShowBulkUpdate(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10">
                        <div className="bg-gradient-to-r from-[#0E2A38] to-[#1a445a] text-white px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Bulk Update Rates</h3>
                                <p className="text-xs text-gray-300 mt-0.5">Select a date range and strategy to override prices across multiple room types.</p>
                            </div>
                            {!bulkApplying && (
                                <button onClick={() => setShowBulkUpdate(false)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleBulkApply} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">From Date</label>
                                    <input type="date" required value={bulkFrom} onChange={e => setBulkFrom(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">To Date</label>
                                    <input type="date" required value={bulkTo} onChange={e => setBulkTo(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Target Room</label>
                                <select value={bulkRoom} onChange={e => setBulkRoom(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20">
                                    <option value="all">All Room Types</option>
                                    {rooms.map(r => <option key={r.id} value={String(r.id)}>{r.name || r.type}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Strategy</label>
                                    <select value={bulkStrategy} onChange={e => setBulkStrategy(e.target.value as typeof bulkStrategy)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20">
                                        <option value="increase_pct">Increase By %</option>
                                        <option value="decrease_pct">Decrease By %</option>
                                        <option value="fixed">Set Fixed Rate</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Value</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">{bulkStrategy === 'fixed' ? '₹' : '%'}</span>
                                        <input type="number" required min="0" step="0.01" value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-0.5 text-emerald-600" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Prices will be saved and <strong>instantly pushed to Booking.com, Agoda, Expedia &amp; all connected OTAs</strong> via Aiosell.</span>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowBulkUpdate(false)} disabled={bulkApplying}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={bulkApplying || !bulkValue}
                                    className="flex-1 py-2.5 bg-[#C9A646] hover:bg-[#b8953b] text-[#0E2A38] rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {bulkApplying
                                        ? <><svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Applying...</>
                                        : <>Apply Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rule Create/Edit Modal */}
            {showRuleModal && (
                <div className="fixed inset-0 bg-[#0E2A38]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
                        <h3 className="text-2xl font-serif font-bold text-[#0E2A38] mb-2">
                            {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {editingRule ? 'Update the rule details below.' : 'Set a price override for a specific date range and room type.'}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Rule Type</label>
                                <select
                                    value={ruleForm.rule_type}
                                    onChange={(e) => setRuleForm(prev => ({ ...prev, rule_type: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[var(--color-ocean-500)] bg-white"
                                >
                                    <option value="peak">Peak</option>
                                    <option value="seasonal">Seasonal</option>
                                    <option value="weekend">Weekend</option>
                                    <option value="holiday">Holiday</option>
                                    <option value="last_minute">Last Minute</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Room</label>
                                <select
                                    value={ruleForm.room_id}
                                    onChange={(e) => setRuleForm(prev => ({ ...prev, room_id: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[var(--color-ocean-500)] bg-white"
                                >
                                    <option value="">All Rooms</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name || r.type}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={ruleForm.start_date}
                                        onChange={(e) => setRuleForm(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[var(--color-ocean-500)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={ruleForm.end_date}
                                        onChange={(e) => setRuleForm(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[var(--color-ocean-500)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Price Override</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={ruleForm.price_override}
                                        onChange={(e) => setRuleForm(prev => ({ ...prev, price_override: e.target.value }))}
                                        placeholder="e.g. 5000"
                                        className="w-full border border-gray-200 rounded-xl p-3 pl-8 focus:outline-none focus:border-[var(--color-ocean-500)]"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={closeRuleModal}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRule}
                                disabled={savingRule}
                                className="bg-[#C9A646] text-[#0E2A38] px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingRule ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

