import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { mapReservationStatus, mapPaymentStatus, mapUIToDBStatus } from '../lib/booking';
import { sendBookingConfirmation, sendBookingCancelled, sendBookingStatusChange, sendCheckInEmail, sendCheckOutEmail } from '../lib/email';
import { sendWhatsAppConfirmation } from '../lib/whatsapp';

// --- Hotel Types ---

export type StaffMember = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: 'Active' | 'Inactive';
    maintenance_notes?: string | null;
};

export type Reservation = {
    id: string;
    guest: string;
    guest_email?: string;
    guest_phone?: string;
    guest_location?: string;
    room: string;
    room_id?: number;
    checkIn: string;
    checkOut: string;
    source: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Checked In' | 'Checked Out';
    payment: 'Paid' | 'Unpaid' | 'Partial' | 'Refunded';
    payment_method?: string;
    amount?: number;
    gst_amount?: number;
    payment_date?: string;
    aadhar_url?: string | null;
    aadhar_number?: string | null;
    aadhar_extracted_age?: number | null;
    aadhar_extracted_address?: string | null;
    aadhar_extracted_name?: string | null;
    aadhar_dob?: string | null;
};

export type Room = {
    id: number;
    room_number: string;
    name: string;
    type: string;
    description: string;
    price_per_night: number;
    max_occupancy: number;
    amenities: string[];
    images: string[];
    status: 'Available' | 'Occupied' | 'Maintenance';
    cleaning_status: 'Clean' | 'Dirty';
    is_available: boolean;
    maintenance_notes?: string | null;
};

export type PageContent = {
    id: number;
    section: string;
    block_key: string;
    content_text: string;
    image_url: string | null;
    is_active: boolean;
    order_index: number;
};

export type CMSSettings = {
    heroTitle: string;
    heroSubtitle: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    aboutText: string;
    hotelName?: string;
    gstRate?: string;
};

// --- Restaurant Types ---

export type MenuCategory = {
    id: number;
    name: string;
    description: string;
    sort_order: number;
    is_active: boolean;
};

export type MenuItem = {
    id: number;
    category_id: number | null;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    is_veg: boolean;
    is_available: boolean;
    preparation_time_mins: number;
    sort_order: number;
};

export type RestaurantTable = {
    id: number;
    table_number: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved';
    section: string;
};

export type FoodOrderItem = {
    id: number;
    order_id: number;
    menu_item_id: number | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    notes: string;
};

export type FoodOrder = {
    id: number;
    table_id: number | null;
    order_type: 'dine_in' | 'takeaway' | 'delivery';
    customer_name: string;
    customer_phone: string;
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'bill_requested' | 'billed' | 'cancelled';
    total_amount: number;
    gst_amount: number;
    payment_status: 'paid' | 'unpaid' | 'partial';
    payment_method: string;
    notes: string;
    items: FoodOrderItem[];
    created_at: string;
};

export type InventoryItem = {
    id: number;
    item_name: string;
    unit: 'kg' | 'litre' | 'pieces' | 'packets' | 'grams' | 'ml';
    current_stock: number;
    min_stock_alert: number;
    cost_per_unit: number;
    last_restocked_at: string | null;
};

// --- Initial values ---

const initialCMS: CMSSettings = {
    heroTitle: 'HospitalityOS',
    heroSubtitle: 'All-in-One Hotel & Restaurant Management',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    aboutText: '',
    hotelName: '',
    gstRate: '5',
};

// --- Context Definition ---

interface CRMContextType {
    // Hotel
    staff: StaffMember[];
    reservations: Reservation[];
    cmsSettings: CMSSettings;
    rooms: Room[];
    pageContent: PageContent[];
    addStaff: (member: Omit<StaffMember, 'id'> & { password?: string }) => Promise<void>;
    deleteStaff: (id: string) => Promise<void>;
    addReservation: (reservation: Omit<Reservation, 'id'>) => Promise<void>;
    deleteReservation: (id: string) => Promise<void>;
    updateStaff: (id: string, updatedData: Partial<StaffMember>) => Promise<void>;
    updateReservation: (id: string, updatedData: Partial<Reservation>) => Promise<void>;
    updateCMSSetting: (key: keyof CMSSettings, value: string) => Promise<void>;
    addRoom: (room: Omit<Room, 'id'>) => Promise<void>;
    updateRoom: (id: number, room: Partial<Room>) => Promise<void>;
    deleteRoom: (id: number) => Promise<void>;
    updatePageContent: (section: string, blockKey: string, content: Partial<PageContent>) => Promise<void>;
    checkInGuest: (reservationId: string, roomId?: number) => Promise<void>;
    checkOutGuest: (reservationId: string, roomId?: number) => Promise<void>;

    // Restaurant
    menuCategories: MenuCategory[];
    menuItems: MenuItem[];
    restaurantTables: RestaurantTable[];
    foodOrders: FoodOrder[];
    inventoryItems: InventoryItem[];
    addMenuCategory: (cat: Omit<MenuCategory, 'id'>) => Promise<void>;
    updateMenuCategory: (id: number, data: Partial<MenuCategory>) => Promise<void>;
    deleteMenuCategory: (id: number) => Promise<void>;
    addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
    updateMenuItem: (id: number, data: Partial<MenuItem>) => Promise<void>;
    deleteMenuItem: (id: number) => Promise<void>;
    addRestaurantTable: (table: Omit<RestaurantTable, 'id'>) => Promise<void>;
    updateRestaurantTable: (id: number, data: Partial<RestaurantTable>) => Promise<void>;
    deleteRestaurantTable: (id: number) => Promise<void>;
    addFoodOrder: (order: Omit<FoodOrder, 'id' | 'items' | 'created_at'>, items: Omit<FoodOrderItem, 'id' | 'order_id'>[]) => Promise<void>;
    addItemsToOrder: (orderId: number, items: Omit<FoodOrderItem, 'id' | 'order_id'>[], newTotal: number, newGst: number) => Promise<void>;
    updateFoodOrder: (id: number, data: Partial<FoodOrder>) => Promise<void>;
    addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
    updateInventoryItem: (id: number, data: Partial<InventoryItem>) => Promise<void>;
    deleteInventoryItem: (id: number) => Promise<void>;
    refreshFoodOrders: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// --- Provider Component ---

export function CRMProvider({ children }: { children: ReactNode }) {
    const { tenant } = useAuth();

    // Hotel state
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [cmsSettings, setCmsSettings] = useState<CMSSettings>(initialCMS);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [pageContent, setPageContent] = useState<PageContent[]>([]);

    // Restaurant state
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>([]);
    const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

    const isHotel = tenant?.business_type === 'hotel' || tenant?.business_type === 'combined';
    const isRestaurant = tenant?.business_type === 'restaurant' || tenant?.business_type === 'combined';

    useEffect(() => {
        if (!tenant) {
            setStaff([]); setReservations([]); setRooms([]); setPageContent([]);
            setCmsSettings(initialCMS);
            setMenuCategories([]); setMenuItems([]); setRestaurantTables([]);
            setFoodOrders([]); setInventoryItems([]);
            return;
        }

        const loadInitialData = async () => {
            const tenantId = tenant.id;
            console.log('[CRMDataContext] Loading initial data for tenant:', {
                id: tenantId,
                name: tenant.business_name,
                type: tenant.business_type,
                subdomain: tenant.subdomain
            });

            // Clear state from previous tenant to stop data bleed
            setStaff([]); setReservations([]); setRooms([]); setPageContent([]);
            setCmsSettings(initialCMS);
            setMenuCategories([]); setMenuItems([]); setRestaurantTables([]);
            setFoodOrders([]); setInventoryItems([]);

            // Always load: settings, staff, page content
            const { data: settingsData, error: settingsError } = await supabase.from('settings').select('*').eq('tenant_id', tenantId);
            if (settingsError) console.error('[CRMDataContext] Settings fetch error:', settingsError);
            
            if (settingsData && settingsData.length > 0) {
                const settingsObj = { ...initialCMS };
                settingsData.forEach(item => {
                    const key = item.setting_key as keyof CMSSettings;
                    if (key in settingsObj) {
                        (settingsObj as any)[key] = item.setting_value;
                    }
                });
                setCmsSettings(settingsObj);
            } else {
                setCmsSettings(initialCMS);
            }

            const { data: staffData, error: staffError } = await supabase.from('staff').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
            if (staffError) console.error('[CRMDataContext] Staff fetch error:', staffError);
            
            if (staffData && staffData.length > 0) {
                setStaff(staffData.map(s => ({
                    ...s,
                    status: s.status.charAt(0) + s.status.slice(1).toLowerCase() as any
                })));
            } else { setStaff([]); }

            const { data: contentData, error: contentError } = await supabase.from('page_content').select('*').eq('tenant_id', tenantId).order('order_index', { ascending: true });
            if (contentError) console.error('[CRMDataContext] Page content fetch error:', contentError);
            setPageContent(contentData?.length ? contentData as any : []);

            // Hotel-specific data
            if (isHotel) {
                const { data: resData, error: resError } = await supabase.from('reservations').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
                if (resError) console.error('[CRMDataContext] Reservations fetch error:', resError);
                
                if (resData && resData.length > 0) {
                    setReservations(resData.map(r => ({
                        id: r.id,
                        guest: r.guest_name,
                        guest_email: r.guest_email,
                        guest_phone: r.guest_phone,
                        guest_location: r.guest_location,
                        room: r.room_type,
                        room_id: r.room_id,
                        checkIn: r.check_in,
                        checkOut: r.check_out,
                        source: r.source === 'WEBSITE' ? 'Website' : r.source,
                        status: mapReservationStatus(r.status),
                        payment: mapPaymentStatus(r.payment_status),
                        payment_method: r.payment_method,
                        amount: r.amount,
                        gst_amount: r.gst_amount,
                        payment_date: r.payment_date,
                        aadhar_url: r.aadhar_url,
                        aadhar_number: r.aadhar_number,
                        aadhar_extracted_age: r.aadhar_extracted_age,
                        aadhar_extracted_address: r.aadhar_extracted_address,
                        aadhar_extracted_name: r.aadhar_extracted_name,
                        aadhar_dob: r.aadhar_dob,
                    })));
                } else { setReservations([]); }

                const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
                if (roomsError) console.error('[CRMDataContext] Rooms fetch error:', roomsError);
                setRooms(roomsData?.length ? roomsData as any : []);
            }

            // Restaurant-specific data
            if (isRestaurant) {
                const { data: catData } = await supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order');
                setMenuCategories(catData?.length ? catData as any : []);

                const { data: itemData } = await supabase.from('menu_items').select('*').eq('tenant_id', tenantId).order('sort_order');
                setMenuItems(itemData?.length ? itemData as any : []);

                const { data: tableData } = await supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).order('table_number');
                setRestaurantTables(tableData?.length ? tableData as any : []);

                const { data: orderData, error: orderError } = await supabase
                    .from('food_orders')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(100);
                
                if (orderError) console.error('[CRMDataContext] Food orders error:', orderError);

                if (orderData && orderData.length > 0) {
                    const orderIds = orderData.map(o => o.id);
                    const { data: itemData, error: itemsError } = await supabase
                        .from('food_order_items')
                        .select('*')
                        .in('order_id', orderIds);

                    if (itemsError) console.error('[CRMDataContext] Food items error:', itemsError);

                    setFoodOrders(orderData.map((o: any) => ({
                        ...o,
                        items: itemData?.filter(i => i.order_id === o.id) || [],
                    })));
                } else { setFoodOrders([]); }

                const { data: invData } = await supabase.from('food_inventory').select('*').eq('tenant_id', tenantId).order('item_name');
                setInventoryItems(invData?.length ? invData as any : []);
            }
        };

        loadInitialData();
    }, [tenant?.id]);

    const tid = () => tenant?.id;

    // ==================== HOTEL CRUD ====================

    const addStaff = async (member: Omit<StaffMember, 'id'> & { password?: string }) => {
        if (!member.password) {
            throw new Error("Password is required for new staff members.");
        }

        const { data: newUserId, error } = await supabase.rpc('create_staff_user', {
            p_email: member.email,
            p_password: member.password,
            p_name: member.name,
            p_role: member.role,
            p_phone: member.phone,
            p_tenant_id: tid()
        });

        if (error) {
            console.error("Error creating staff:", error);
            throw new Error(error.message || "Failed to create staff member.");
        }

        // Fetch the newly created staff member to get the full formatted object
        const { data: newStaffData } = await supabase
            .from('staff')
            .select('*')
            .eq('id', newUserId)
            .single();

        if (newStaffData) {
            const formattedStaffMember = {
                ...newStaffData,
                status: newStaffData.status.charAt(0) + newStaffData.status.slice(1).toLowerCase()
            } as StaffMember;
            setStaff([formattedStaffMember, ...staff]);
        }
    };

    const deleteStaff = async (id: string) => {
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (!error) setStaff(staff.filter(s => s.id !== id));
    };

    const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
        const maxNum = reservations
            .filter(r => r.id.startsWith('RES-'))
            .reduce((max, r) => {
                const num = parseInt(r.id.replace(/[^0-9]/g, ''), 10);
                return isNaN(num) ? max : Math.max(max, num);
            }, 0);
        const newId = `RES-${String(maxNum + 1).padStart(3, '0')}`;
        const newReservation = { ...reservation, id: newId };
        const { error } = await supabase.from('reservations').insert([{
            id: newId, guest_name: reservation.guest, guest_email: reservation.guest_email,
            guest_phone: reservation.guest_phone, guest_location: reservation.guest_location,
            room_type: reservation.room, room_id: reservation.room_id,
            check_in: reservation.checkIn, check_out: reservation.checkOut,
            source: reservation.source, status: mapUIToDBStatus(reservation.status),
            payment_status: reservation.payment.toUpperCase(),
            payment_method: reservation.payment_method,
            amount: reservation.amount || 0, gst_amount: reservation.gst_amount || 0,
            tenant_id: tid(),
        }]);
        if (!error) {
            setReservations([newReservation, ...reservations]);
            
            // Fetch token generated by trigger, wait briefly if needed or query directly
            (async () => {
                let token = '';
                try {
                    // Small delay to ensure the database trigger executes and commits
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const { data: tData } = await supabase
                        .from('guest_tokens')
                        .select('token')
                        .eq('reservation_id', newId)
                        .maybeSingle();
                    if (tData?.token) {
                        token = tData.token;
                    }
                } catch (tErr) {
                    console.error('Failed to retrieve guest token for email:', tErr);
                }

                if (reservation.guest_email) {
                    sendBookingConfirmation({
                        guestName: reservation.guest,
                        guestEmail: reservation.guest_email,
                        roomType: reservation.room,
                        roomNumber: reservation.room_id ? String(reservation.room_id) : '',
                        checkIn: reservation.checkIn,
                        checkOut: reservation.checkOut,
                        amount: reservation.amount || 0,
                        gstAmount: reservation.gst_amount || 0,
                        paymentStatus: reservation.payment,
                        source: reservation.source,
                        reservationId: newId,
                        businessName: tenant?.business_name || 'Our Hotel',
                        guestToken: token || undefined,
                    });
                }

                if (reservation.guest_phone) {
                    sendWhatsAppConfirmation({
                        guestName: reservation.guest,
                        guestPhone: reservation.guest_phone,
                        roomType: reservation.room,
                        roomNumber: reservation.room_id ? String(reservation.room_id) : undefined,
                        checkIn: reservation.checkIn,
                        checkOut: reservation.checkOut,
                        reservationId: newId,
                        businessName: tenant?.business_name || 'Our Hotel',
                        guestToken: token || undefined,
                    }, tid());
                }
            })();
        }
    };

    const deleteReservation = async (id: string) => {
        const { error } = await supabase.from('reservations').delete().eq('id', id);
        if (!error) setReservations(reservations.filter(r => r.id !== id));
    };

    const updateStaff = async (id: string, updatedData: Partial<StaffMember>) => {
        const updatePayload: any = { ...updatedData };
        if (updatedData.status) updatePayload.status = updatedData.status.toUpperCase();
        const { error } = await supabase.from('staff').update(updatePayload).eq('id', id);
        if (!error) setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
    };

    const updateReservation = async (id: string, updatedData: Partial<Reservation>) => {
        const updatePayload: any = {};
        if (updatedData.guest) updatePayload.guest_name = updatedData.guest;
        if (updatedData.guest_email) updatePayload.guest_email = updatedData.guest_email;
        if (updatedData.guest_phone) updatePayload.guest_phone = updatedData.guest_phone;
        if (updatedData.guest_location) updatePayload.guest_location = updatedData.guest_location;
        if (updatedData.room) updatePayload.room_type = updatedData.room;
        if (updatedData.room_id) updatePayload.room_id = updatedData.room_id;
        if (updatedData.checkIn) updatePayload.check_in = updatedData.checkIn;
        if (updatedData.checkOut) updatePayload.check_out = updatedData.checkOut;
        if (updatedData.status) updatePayload.status = mapUIToDBStatus(updatedData.status);
        if (updatedData.payment) updatePayload.payment_status = updatedData.payment.toUpperCase();
        if (updatedData.payment_method) updatePayload.payment_method = updatedData.payment_method;
        if (updatedData.amount !== undefined) updatePayload.amount = updatedData.amount;
        if (updatedData.gst_amount !== undefined) updatePayload.gst_amount = updatedData.gst_amount;
        const oldReservation = reservations.find(r => r.id === id);
        const { error } = await supabase.from('reservations').update(updatePayload).eq('id', id);
        if (!error) {
            setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
            // Send email on status change
            if (oldReservation && updatedData.status && oldReservation.status !== updatedData.status) {
                const merged = { ...oldReservation, ...updatedData };
                if (merged.guest_email) {
                    if (updatedData.status === 'Cancelled') {
                        sendBookingCancelled({
                            guestName: merged.guest,
                            guestEmail: merged.guest_email,
                            roomType: merged.room,
                            checkIn: merged.checkIn,
                            checkOut: merged.checkOut,
                            amount: merged.amount || 0,
                            gstAmount: merged.gst_amount || 0,
                            reservationId: id,
                            businessName: tenant?.business_name || 'Our Hotel',
                        });
                    } else {
                        sendBookingStatusChange({
                            guestName: merged.guest,
                            guestEmail: merged.guest_email,
                            roomType: merged.room,
                            checkIn: merged.checkIn,
                            checkOut: merged.checkOut,
                            newStatus: updatedData.status,
                            reservationId: id,
                            businessName: tenant?.business_name || 'Our Hotel',
                        });
                    }
                }
            }
        }
    };

    const updateCMSSetting = async (key: keyof CMSSettings, value: string) => {
        const { error } = await supabase.from('settings').upsert({
            setting_key: key, setting_value: value,
            updated_at: new Date().toISOString(), tenant_id: tid(),
        });
        if (!error) setCmsSettings(prev => ({ ...prev, [key]: value }));
    };

    const addRoom = async (roomData: Omit<Room, 'id'>) => {
        const { data, error } = await supabase.from('rooms').insert([{
            ...roomData, tenant_id: tid(),
        }]).select();
        if (error) throw error;
        if (data) setRooms(prev => [{ ...roomData, id: data[0].id }, ...prev]);
    };

    const updateRoom = async (id: number, updatedData: Partial<Room>) => {
        const { error } = await supabase.from('rooms').update(updatedData).eq('id', id);
        if (!error) setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
    };

    const deleteRoom = async (id: number) => {
        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) throw error;
        setRooms(prev => prev.filter(r => r.id !== id));
    };

    const updatePageContent = async (section: string, blockKey: string, content: Partial<PageContent>) => {
        const { error } = await supabase.from('page_content').upsert({
            section, block_key: blockKey, ...content, tenant_id: tid(),
        });
        if (!error) {
            setPageContent(prev => {
                const exists = prev.find(p => p.section === section && p.block_key === blockKey);
                if (exists) {
                    return prev.map(p => (p.section === section && p.block_key === blockKey) ? { ...p, ...content } : p);
                }
                return [...prev, { section, block_key: blockKey, ...content } as PageContent];
            });
        }
    };

    const checkInGuest = async (reservationId: string, roomId?: number) => {
        console.log('CRMDataContext: checkInGuest called for', reservationId, 'room', roomId);
        const { error: resError } = await supabase.from('reservations').update({ status: 'CHECKED_IN' }).eq('id', reservationId);
        if (resError) {
            console.error('CRMDataContext: Error updating reservation status to CHECKED_IN:', resError);
            throw resError;
        }

        if (roomId) {
            const { error: roomError } = await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', roomId);
            if (roomError) {
                console.error('CRMDataContext: Error updating room status to Occupied:', roomError);
                throw roomError;
            }
            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'Occupied' } : r));
        }

        const checkedInRes = reservations.find(r => r.id === reservationId);
        setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'Checked In' } : r));
        if (checkedInRes?.guest_email) {
            sendCheckInEmail({
                guestName: checkedInRes.guest,
                guestEmail: checkedInRes.guest_email,
                roomNumber: checkedInRes.room,
                roomType: checkedInRes.room,
                checkOutDate: checkedInRes.checkOut,
                businessName: tenant?.business_name || 'Our Hotel',
            });
        }
        console.log('CRMDataContext: Successfully checked in guest');
    };

    const checkOutGuest = async (reservationId: string, roomId?: number) => {
        console.log('CRMDataContext: checkOutGuest called for', reservationId, 'room', roomId);
        const { error: resError } = await supabase.from('reservations').update({ status: 'CHECKED_OUT', payment_status: 'PAID' }).eq('id', reservationId);
        if (resError) {
            console.error('CRMDataContext: Error updating reservation status to CHECKED_OUT:', resError);
            throw resError;
        }

        if (roomId) {
            const { error: roomError } = await supabase.from('rooms').update({ status: 'Available', cleaning_status: 'Dirty' }).eq('id', roomId);
            if (roomError) {
                console.error('CRMDataContext: Error updating room status to Available:', roomError);
                throw roomError;
            }
            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'Available', cleaning_status: 'Dirty' } : r));
        }

        const checkedOutRes = reservations.find(r => r.id === reservationId);
        setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'Checked Out', payment: 'Paid' } : r));
        if (checkedOutRes?.guest_email) {
            sendCheckOutEmail({
                guestName: checkedOutRes.guest,
                guestEmail: checkedOutRes.guest_email,
                roomNumber: checkedOutRes.room,
                roomType: checkedOutRes.room,
                checkInDate: checkedOutRes.checkIn,
                checkOutDate: checkedOutRes.checkOut,
                totalAmount: checkedOutRes.amount || 0,
                gstAmount: checkedOutRes.gst_amount || 0,
                paymentMethod: checkedOutRes.payment_method || 'N/A',
                businessName: tenant?.business_name || 'Our Hotel',
            });
        }
        console.log('CRMDataContext: Successfully checked out guest');
    };

    // ==================== RESTAURANT CRUD ====================

    const addMenuCategory = async (cat: Omit<MenuCategory, 'id'>) => {
        const { data, error } = await supabase.from('menu_categories').insert([{ ...cat, tenant_id: tid() }]).select();
        if (!error && data) setMenuCategories(prev => [...prev, data[0] as any]);
    };

    const updateMenuCategory = async (id: number, data: Partial<MenuCategory>) => {
        const { error } = await supabase.from('menu_categories').update(data).eq('id', id);
        if (!error) setMenuCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    };

    const deleteMenuCategory = async (id: number) => {
        const { error } = await supabase.from('menu_categories').delete().eq('id', id);
        if (!error) setMenuCategories(prev => prev.filter(c => c.id !== id));
    };

    const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
        const { data, error } = await supabase.from('menu_items').insert([{ ...item, tenant_id: tid() }]).select();
        if (error) throw error;
        if (data) setMenuItems(prev => [...prev, data[0] as any]);
    };

    const updateMenuItem = async (id: number, data: Partial<MenuItem>) => {
        const { error } = await supabase.from('menu_items').update(data).eq('id', id);
        if (error) throw error;
        setMenuItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    };

    const deleteMenuItem = async (id: number) => {
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) throw error;
        setMenuItems(prev => prev.filter(i => i.id !== id));
    };

    const addRestaurantTable = async (table: Omit<RestaurantTable, 'id'>) => {
        const { data, error } = await supabase.from('restaurant_tables').insert([{ ...table, tenant_id: tid() }]).select();
        if (!error && data) setRestaurantTables(prev => [...prev, data[0] as any]);
    };

    const updateRestaurantTable = async (id: number, data: Partial<RestaurantTable>) => {
        const { error } = await supabase.from('restaurant_tables').update(data).eq('id', id);
        if (!error) setRestaurantTables(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    };

    const deleteRestaurantTable = async (id: number) => {
        const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
        if (!error) setRestaurantTables(prev => prev.filter(t => t.id !== id));
    };

    const addFoodOrder = async (
        order: Omit<FoodOrder, 'id' | 'items' | 'created_at'>,
        items: Omit<FoodOrderItem, 'id' | 'order_id'>[]
    ) => {
        const { data: orderData, error: orderErr } = await supabase.from('food_orders').insert([{
            tenant_id: tid(),
            table_id: order.table_id,
            order_type: order.order_type,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            status: order.status,
            total_amount: order.total_amount,
            gst_amount: order.gst_amount,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            notes: order.notes,
        }]).select();

        if (!orderErr && orderData) {
            const orderId = orderData[0].id;
            const orderItems = items.map(i => ({ ...i, order_id: orderId }));
            const { data: itemsData } = await supabase.from('food_order_items').insert(orderItems).select();

            const newOrder: FoodOrder = {
                ...orderData[0] as any,
                items: itemsData || [],
            };
            setFoodOrders(prev => [newOrder, ...prev]);
        }
    };

    const addItemsToOrder = async (orderId: number, items: Omit<FoodOrderItem, 'id' | 'order_id'>[], newTotal: number, newGst: number) => {
        const { error: orderErr } = await supabase.from('food_orders').update({
            total_amount: newTotal,
            gst_amount: newGst,
            updated_at: new Date().toISOString()
        }).eq('id', orderId);

        if (orderErr) throw orderErr;

        const orderItems = items.map(i => ({ ...i, order_id: orderId }));
        const { data: itemsData, error: itemsErr } = await supabase.from('food_order_items').insert(orderItems).select();

        if (itemsErr) throw itemsErr;

        setFoodOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    total_amount: newTotal,
                    gst_amount: newGst,
                    items: [...(o.items || []), ...(itemsData || [])]
                };
            }
            return o;
        }));
    };

    const updateFoodOrder = async (id: number, data: Partial<FoodOrder>) => {
        const { items: _items, ...updateData } = data as any;
        const { error } = await supabase.from('food_orders').update({
            ...updateData,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (!error) setFoodOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    };

    const refreshFoodOrders = async () => {
        if (!tenant) return;
        const { data: orderData, error: orderError } = await supabase
            .from('food_orders')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (orderError) console.error('[CRMDataContext] Refresh food orders error:', orderError);

        if (orderData && orderData.length > 0) {
            const orderIds = orderData.map(o => o.id);
            const { data: itemsData, error: itemsError } = await supabase
                .from('food_order_items')
                .select('*')
                .in('order_id', orderIds);

            if (itemsError) console.error('[CRMDataContext] Refresh food items error:', itemsError);

            setFoodOrders(orderData.map((o: any) => ({
                ...o,
                items: itemsData?.filter(i => i.order_id === o.id) || []
            })));
        } else { setFoodOrders([]); }
    };

    const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
        const { data, error } = await supabase.from('food_inventory').insert([{ ...item, tenant_id: tid() }]).select();
        if (!error && data) setInventoryItems(prev => [...prev, data[0] as any]);
    };

    const updateInventoryItem = async (id: number, data: Partial<InventoryItem>) => {
        const { error } = await supabase.from('food_inventory').update({
            ...data, updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (!error) setInventoryItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    };

    const deleteInventoryItem = async (id: number) => {
        const { error } = await supabase.from('food_inventory').delete().eq('id', id);
        if (!error) setInventoryItems(prev => prev.filter(i => i.id !== id));
    };

    return (
        <CRMContext.Provider value={{
            // Hotel
            staff, reservations, cmsSettings, rooms, pageContent,
            addStaff, deleteStaff, addReservation, deleteReservation,
            updateStaff, updateReservation, updateCMSSetting,
            addRoom, updateRoom, deleteRoom, updatePageContent,
            checkInGuest, checkOutGuest,
            // Restaurant
            menuCategories, menuItems, restaurantTables, foodOrders, inventoryItems,
            addMenuCategory, updateMenuCategory, deleteMenuCategory,
            addMenuItem, updateMenuItem, deleteMenuItem,
            addRestaurantTable, updateRestaurantTable, deleteRestaurantTable,
            addFoodOrder, addItemsToOrder, updateFoodOrder, refreshFoodOrders,
            addInventoryItem, updateInventoryItem, deleteInventoryItem,
        }}>
            {children}
        </CRMContext.Provider>
    );
}

export function useCRM() {
    const context = useContext(CRMContext);
    if (context === undefined) {
        throw new Error('useCRM must be used within a CRMProvider');
    }
    return context;
}
