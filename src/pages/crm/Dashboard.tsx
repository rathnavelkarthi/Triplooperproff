import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMDataContext';
import { motion } from 'motion/react';
import {
  BarChart3,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  BedDouble,
  LogIn,
  LogOut,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#000000', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];
const OCC_COLORS = { available: '#c1fbd4', occupied: '#000000', notReady: '#71717a' };

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

function formatINR(amount: number): string {
  if (!amount) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { tenant } = useAuth();
  const { reservations, rooms, foodOrders, restaurantTables, menuItems } = useCRM();
  const [waStats, setWaStats] = useState<{ sent: number; total: number } | null>(null);

  // Date filter for daily statement
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dayExpenses, setDayExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(false);

  // Load expenses for selected date
  React.useEffect(() => {
    if (!tenant?.id || !selectedDate) return;
    setLoadingExpenses(true);
    import('../../lib/supabaseClient').then(({ supabase }) => {
      supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('date', selectedDate)
        .then(({ data, error }) => {
          setLoadingExpenses(false);
          if (data) {
            setDayExpenses(data);
          }
        });
    });
  }, [tenant?.id, selectedDate]);

  React.useEffect(() => {
    if (!tenant?.id) return;
    import('../../lib/supabaseClient').then(({ supabase }) => {
      supabase
        .from('whatsapp_scheduled_messages')
        .select('sent')
        .eq('tenant_id', tenant.id)
        .then(({ data }) => {
          if (data) {
            const sentCount = data.filter(d => d.sent).length;
            setWaStats({ sent: sentCount, total: data.length });
          }
        });
    });
  }, [tenant?.id]);

  const isHotel = !tenant?.business_type || tenant?.business_type === 'hotel' || tenant?.business_type === 'combined';
  const isRestaurant = tenant?.business_type === 'restaurant' || tenant?.business_type === 'combined';

  // Compute selected day transactions
  const dailyTransactions = useMemo(() => {
    const list: any[] = [];
    
    // 1. Reservations matching check-in date
    reservations.forEach(r => {
      if (r.checkIn === selectedDate) {
        list.push({
          id: r.id,
          type: 'Room Booking',
          desc: `${r.guest || 'Guest'} (${r.room || 'Room'})`,
          status: r.payment === 'PAID' ? 'paid' : 'pending',
          amount: r.amount || 0,
          isExpense: false
        });
      }
    });

    // 2. Food orders matching date
    foodOrders.forEach(o => {
      if (o.created_at?.slice(0, 10) === selectedDate) {
        list.push({
          id: `Order #${o.id}`,
          type: 'Food Order',
          desc: o.is_room_service ? `Room Service (${o.customer_name || 'Guest'})` : `Dine-in / Walk-in`,
          status: o.payment_status === 'paid' ? 'paid' : 'pending',
          amount: o.total_amount || 0,
          isExpense: false
        });
      }
    });

    // 3. Expenses matching date
    dayExpenses.forEach(e => {
      list.push({
        id: e.id,
        type: 'Expense',
        desc: `${e.description || e.category} (${e.vendor || 'Vendor'})`,
        status: 'paid',
        amount: e.amount || 0,
        isExpense: true
      });
    });

    // Summaries
    const roomTotal = list.filter(item => item.type === 'Room Booking').reduce((sum, item) => sum + item.amount, 0);
    const foodTotal = list.filter(item => item.type === 'Food Order').reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = list.filter(item => item.isExpense).reduce((sum, item) => sum + item.amount, 0);
    const netTotal = (roomTotal + foodTotal) - expenseTotal;

    return { list, roomTotal, foodTotal, expenseTotal, netTotal };
  }, [reservations, foodOrders, dayExpenses, selectedDate]);

  // ── Hotel KPI data ───────────────────────────────────────────────────────
  const hotelStats = useMemo(() => {
    const totalBookings = reservations.length;
    const checkIns = reservations.filter(r => r.status === 'Checked In' || r.status === 'Confirmed').length;
    const checkOuts = reservations.filter(r => r.status === 'Checked Out').length;
    const totalRevenue = reservations.reduce((s, r) => s + (r.amount || 0), 0);
    const offlineRevenue = reservations
      .filter(r => !r.source || r.source === 'Direct' || r.source === 'Walk-in')
      .reduce((s, r) => s + (r.amount || 0), 0);
    const platformRevenue = totalRevenue - offlineRevenue;

    return { totalBookings, checkIns, checkOuts, totalRevenue, offlineRevenue, platformRevenue };
  }, [reservations]);

  // ── Occupancy bar chart (daily for last 30 days) ─────────────────────────
  const occupancyBarData = useMemo(() => {
    const total = Math.max(rooms.length, 1);
    // Build day buckets for the last 30 days
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      const label = String(d.getDate()).padStart(2, '0');
      const dayStr = d.toISOString().slice(0, 10);

      const occupied = reservations.filter(r => {
        const ci = r.checkIn?.slice(0, 10);
        const co = r.checkOut?.slice(0, 10);
        return ci && co && dayStr >= ci && dayStr < co;
      }).length;
      const notReady = rooms.filter(r => r.status === 'Cleaning' || r.status === 'Maintenance').length;
      const available = Math.max(0, total - occupied - notReady);

      return { name: label, available, occupied, notReady };
    });
  }, [reservations, rooms]);

  // ── Revenue by month ─────────────────────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    reservations.forEach(r => {
      if (r.checkIn && r.amount) {
        const m = names[new Date(r.checkIn).getMonth()];
        months[m] = (months[m] || 0) + r.amount;
      }
    });
    return Object.entries(months).map(([name, total]) => ({ name, total }));
  }, [reservations]);

  // ── Booking sources ──────────────────────────────────────────────────────
  const bookingSources = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations.forEach(r => {
      const src = r.source || 'Direct';
      counts[src] = (counts[src] || 0) + 1;
    });
    const total = reservations.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], i) => ({
        name,
        pct: Math.round((count / total) * 100),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [reservations]);

  // ── Recent arrivals ──────────────────────────────────────────────────────
  const recentArrivals = useMemo(() => {
    return [...reservations]
      .sort((a, b) => new Date(b.checkIn || 0).getTime() - new Date(a.checkIn || 0).getTime())
      .slice(0, 6)
      .map((r, i) => ({
        roomNo: r.room ? `#${r.room.replace(/\D/g, '')}` : `#${100 + i}`,
        name: r.guest || 'Guest',
        avatar: (r.guest || 'G').charAt(0).toUpperCase(),
        color: CHART_COLORS[i % CHART_COLORS.length],
        time: timeAgo(r.checkIn),
      }));
  }, [reservations]);

  // ── Restaurant data ──────────────────────────────────────────────────────
  const restaurantData = useMemo(() => {
    if (!isRestaurant) return null;
    const today = new Date().toDateString();
    const todayOrders = foodOrders.filter(o => new Date(o.created_at).toDateString() === today);
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const activeOrders = foodOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
    const totalTables = restaurantTables.length;
    const occupiedTables = restaurantTables.filter(t => t.status === 'occupied').length;
    const tableUtilization = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
    const avgOrder = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
    return { todayOrders: todayOrders.length, todayRevenue, activeOrders, tableUtilization, avgOrder, menuItemCount: menuItems.length };
  }, [foodOrders, restaurantTables, menuItems, isRestaurant]);

  // ── Calendar rooms ───────────────────────────────────────────────────────
  const calendarRooms = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rooms.slice(0, 4).map(room => {
      const roomReservations = reservations.filter(r => {
        if (r.room_id && room.id && String(r.room_id) === String(room.id)) return true;
        const rNum = r.room?.replace(/\D/g, '');
        const mNum = (room.number || room.room_number || '')?.toString().replace(/\D/g, '');
        return rNum && mNum && rNum === mNum;
      });
      const activeGuests = roomReservations
        .filter(r => r.checkIn?.slice(0, 10) <= today && (!r.checkOut || r.checkOut.slice(0, 10) >= today))
        .map((r, i) => ({
          name: r.guest || 'Guest',
          avatar: (r.guest || 'G').charAt(0).toUpperCase(),
          color: CHART_COLORS[i % CHART_COLORS.length],
          checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
        }));
      return {
        number: `Room #${room.number || room.room_number || (room.id ? String(room.id).slice(0, 4) : '')}`,
        guests: activeGuests,
      };
    });
  }, [rooms, reservations]);

  const hasData = reservations.length > 0 || rooms.length > 0;

  return (
    <div className="max-w-[1600px] mx-auto pb-6" style={{ fontFeatureSettings: '"ss03"' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-black">Dashboard</h1>
      </div>

      {!hasData ? (
        <EmptyState isRestaurant={isRestaurant && !isHotel} />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">

          {/* Daily Transaction & Bill Report */}
          <motion.div variants={itemVariants}>
            <Card className="border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg">
              <CardHeader className="pb-4 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight text-black">Daily Transactions & Bills</CardTitle>
                  <p className="text-xs text-zinc-400 mt-0.5">Filter and review itemized daily statements</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-500">Filter Date:</span>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="px-4 py-1.5 border border-zinc-200 rounded-full text-xs font-semibold bg-white text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Summary boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-[#fbfbf5] border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider mb-1">Room Revenue</p>
                    <p className="text-lg font-bold text-black">{formatINR(dailyTransactions.roomTotal)}</p>
                  </div>
                  <div className="bg-[#fbfbf5] border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider mb-1">Food Revenue</p>
                    <p className="text-lg font-bold text-black">{formatINR(dailyTransactions.foodTotal)}</p>
                  </div>
                  <div className="bg-[#fbfbf5] border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider mb-1">Expenses</p>
                    <p className="text-lg font-bold text-rose-600">-{formatINR(dailyTransactions.expenseTotal)}</p>
                  </div>
                  <div className={`border rounded-xl p-4 shadow-sm text-center ${dailyTransactions.netTotal >= 0 ? 'bg-[#d4f9e0] border-[#c1fbd4]' : 'bg-rose-50 border-rose-100'}`}>
                    <p className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider mb-1">Net Income</p>
                    <p className={`text-lg font-bold ${dailyTransactions.netTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {dailyTransactions.netTotal < 0 ? '-' : ''}{formatINR(Math.abs(dailyTransactions.netTotal))}
                    </p>
                  </div>
                </div>

                {/* Table list */}
                {dailyTransactions.list.length > 0 ? (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow className="border-b border-zinc-200">
                          <TableHead className="text-xs text-zinc-500 pl-4">Type</TableHead>
                          <TableHead className="text-xs text-zinc-500">Description</TableHead>
                          <TableHead className="text-xs text-zinc-500">Status</TableHead>
                          <TableHead className="text-xs text-zinc-500 text-right pr-4">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyTransactions.list.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                            <TableCell className="pl-4 py-3 text-xs font-semibold">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase ${
                                item.type === 'Room Booking' ? 'bg-zinc-100 text-zinc-800' :
                                item.type === 'Food Order' ? 'bg-[#c1fbd4] text-zinc-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {item.type}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 text-xs font-medium text-zinc-900">{item.desc}</TableCell>
                            <TableCell className="py-3 text-xs">
                              <Badge className={`border-none rounded-full text-[9px] font-medium px-2 py-0.5 ${
                                item.status === 'paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              }`}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={`py-3 text-right pr-4 text-xs font-semibold ${item.isExpense ? 'text-rose-600' : 'text-zinc-900'}`}>
                              {item.isExpense ? '-' : ''}{formatINR(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 text-center py-8">No bills or transactions recorded on this day.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Restaurant KPIs */}
          {isRestaurant && restaurantData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <motion.div variants={itemVariants}><KpiCard label="Today's Orders" value={String(restaurantData.todayOrders)} sublabel="today" /></motion.div>
                <motion.div variants={itemVariants}><KpiCard label="Today's Revenue" value={formatINR(restaurantData.todayRevenue)} sublabel="today" /></motion.div>
                <motion.div variants={itemVariants}><KpiCard label="Avg Order Value" value={formatINR(restaurantData.avgOrder)} sublabel="today" /></motion.div>
                <motion.div variants={itemVariants}><KpiCard label="Table Utilization" value={`${restaurantData.tableUtilization}%`} sublabel="today" /></motion.div>
              </div>
              <motion.div variants={itemVariants}>
                <Card className="border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg">
                  <CardHeader className="pb-2 border-b border-zinc-100">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-semibold tracking-tight text-black">Live Kitchen Orders</CardTitle>
                      <Badge className="bg-[#c1fbd4] text-zinc-900 border-none hover:bg-[#c1fbd4] font-semibold">{restaurantData.activeOrders} Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
                      {foodOrders.filter(o => ['pending', 'preparing'].includes(o.status)).length > 0 ? (
                        foodOrders
                          .filter(o => ['pending', 'preparing'].includes(o.status))
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map(order => (
                            <div key={order.id} className="min-w-[280px] border border-zinc-200 bg-[#fbfbf5] rounded-xl p-4 shadow-sm snap-start shrink-0">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-bold text-black uppercase tracking-wider text-[10px]">{order.order_type?.replace('_', ' ')}</p>
                                  <p className="text-sm font-semibold text-zinc-800">
                                    {order.table_id
                                      ? `Table ${restaurantTables.find(t => t.id === order.table_id)?.table_number}`
                                      : (order.customer_name || 'Walk-in')}
                                  </p>
                                </div>
                                <Badge className="bg-black text-white hover:bg-zinc-800 border-none rounded-full text-[10px] font-medium px-2.5 py-0.5">{order.status}</Badge>
                              </div>
                              <div className="space-y-1.5 mt-4">
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700"><span className="font-semibold text-gray-900 pr-2">{item.quantity}x</span>{item.item_name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="w-full py-8 text-center text-gray-400 text-sm">No active kitchen orders.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Hotel KPI Row */}
          {isHotel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <motion.div variants={itemVariants}>
                <KpiCard label="Total Bookings" value={hotelStats.totalBookings.toLocaleString('en-IN')} sublabel="All reservations" icon={<BedDouble size={18} />} accentColor="var(--color-ocean-500)" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <KpiCard label="Check In" value={hotelStats.checkIns.toLocaleString('en-IN')} sublabel="Confirmed / Checked In" arrow="down-left" icon={<LogIn size={18} />} accentColor="#2E7D5B" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <KpiCard label="Check Out" value={hotelStats.checkOuts.toLocaleString('en-IN')} sublabel="Checked Out" arrow="up-right" icon={<LogOut size={18} />} accentColor="#ef4444" />
              </motion.div>
              {waStats !== null && (
                <motion.div variants={itemVariants}>
                  <KpiCard
                    label="WhatsApp MSGs"
                    value={waStats.sent.toLocaleString('en-IN')}
                    sublabel={`${waStats.total} Setup / Pending / Sent`}
                    icon={<MessageCircle size={18} />}
                    accentColor="#25D366"
                  />
                </motion.div>
              )}
            </div>
          )}

          {/* Occupancy Chart + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <motion.div variants={itemVariants} className="lg:col-span-3">
              <Card className="border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold tracking-tight text-black">Occupancy</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {[
                      { label: 'Available', color: OCC_COLORS.available },
                      { label: 'Occupied', color: OCC_COLORS.occupied },
                      { label: 'Not Ready', color: OCC_COLORS.notReady },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: l.color }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {rooms.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={occupancyBarData} barSize={8} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={6} interval={4} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-4} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} cursor={{ fill: '#F9FAFB' }} />
                          <Bar dataKey="available" stackId="a" fill={OCC_COLORS.available} />
                          <Bar dataKey="occupied" stackId="a" fill={OCC_COLORS.occupied} />
                          <Bar dataKey="notReady" stackId="a" fill={OCC_COLORS.notReady} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart message="Add rooms to see occupancy data." />
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2">
              <CalendarPanel rooms={rooms} calendarRooms={calendarRooms} />
            </motion.div>
          </div>

          {/* Revenue Overview + Recent Arrivals */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <CardTitle className="text-sm font-semibold tracking-tight text-black">Revenue Overview</CardTitle>
                  <p className="text-xs text-zinc-400 mt-0.5">Total Revenue</p>
                  <p className="text-3xl font-semibold tracking-tight text-black mt-1">{formatINR(hotelStats.totalRevenue)}</p>
                </CardHeader>
                <CardContent className="pt-3">
                  {/* Revenue split */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex flex-col items-center justify-center bg-white rounded-lg py-3 border border-zinc-200 shadow-sm">
                      <DollarSign size={18} className="mb-1 text-zinc-950" />
                      <p className="text-[9px] text-zinc-400 mt-1 uppercase font-semibold tracking-wider">Offline Revenue</p>
                      <p className="text-base font-bold text-black">{formatINR(hotelStats.offlineRevenue)}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-[#d4f9e0] rounded-lg py-3 border border-[#c1fbd4] shadow-sm">
                      <TrendingUp size={18} className="mb-1 text-zinc-950" />
                      <p className="text-[9px] text-zinc-700 mt-1 uppercase font-semibold tracking-wider">Platform Revenue</p>
                      <p className="text-base font-bold text-black">{formatINR(hotelStats.platformRevenue)}</p>
                    </div>
                  </div>

                  {/* Monthly revenue trend */}
                  {revenueByMonth.length > 0 && (
                    <div className="h-24 mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueByMonth}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#c1fbd4" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#c1fbd4" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }} formatter={(v: number) => [formatINR(v), 'Revenue']} />
                          <Area type="monotone" dataKey="total" stroke="#000000" strokeWidth={2} fill="url(#revGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Booking source bars */}
                  {bookingSources.length > 0 ? (
                    <div className="space-y-2">
                      {bookingSources.map(src => (
                        <div key={src.name} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{src.name}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${src.pct}%`, backgroundColor: src.color }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-8 text-right">{src.pct}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No booking sources yet.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-3">
              <Card className="border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold tracking-tight text-black">Recent Arrivals</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-0">
                  {recentArrivals.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-100">
                          <TableHead className="text-xs text-gray-400 pl-6 w-16">R. No</TableHead>
                          <TableHead className="text-xs text-gray-400">Name</TableHead>
                          <TableHead className="text-xs text-gray-400">Time</TableHead>
                          <TableHead className="text-xs text-gray-400 text-right pr-6">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentArrivals.map((arrival, i) => (
                          <TableRow key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <TableCell className="pl-6 py-3">
                              <span className="text-xs font-semibold text-gray-600">{arrival.roomNo}</span>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: arrival.color }}>
                                  {arrival.avatar}
                                </div>
                                <span className="text-sm font-medium text-gray-800">{arrival.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="text-xs text-gray-500">{arrival.time}</span>
                            </TableCell>
                            <TableCell className="py-3 text-right pr-6">
                              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                <MoreHorizontal size={16} />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-10">No recent arrivals yet.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

        </motion.div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ isRestaurant }: { isRestaurant: boolean }) {
  return (
    <Card className="p-10 text-center border border-zinc-200 bg-white shadow-sm rounded-lg">
      <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100 mx-auto mb-4">
        <BarChart3 size={28} className="text-zinc-300" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 tracking-tight mb-2">Welcome to your Dashboard</h3>
      <p className="text-zinc-500 text-sm max-w-md mx-auto">
        {isRestaurant
          ? 'Set up your menu and start taking orders — your metrics will appear here.'
          : 'Add rooms and create reservations — your metrics will appear here.'}
      </p>
    </Card>
  );
}

// ─── Empty chart placeholder ──────────────────────────────────────────────────
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-gray-400">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sublabel, arrow, icon, accentColor }: {
  label: string;
  value: string;
  sublabel?: string;
  arrow?: 'down-left' | 'up-right';
  icon?: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <Card className="p-5 border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg transition-all duration-200 hover:border-zinc-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-black tracking-tight">{value}</span>
            {arrow === 'down-left' && <TrendingDown size={14} className="text-emerald-600" />}
            {arrow === 'up-right' && <TrendingUp size={14} className="text-rose-600" />}
          </div>
          {sublabel && <p className="text-[11px] text-zinc-400 mt-1.5">{sublabel}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-[#c1fbd4] text-zinc-950 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Calendar Panel ───────────────────────────────────────────────────────────
function CalendarPanel({ rooms, calendarRooms }: {
  rooms: any[];
  calendarRooms: { number: string; guests: { name: string; avatar: string; color: string; checkIn: string; checkOut: string }[] }[];
}) {
  const navigate = useNavigate();
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 7-day window starting Monday of current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    const monday = d.getDate() - ((d.getDay() + 6) % 7);
    d.setDate(monday + i);
    return d;
  });

  return (
    <Card className="h-full flex flex-col overflow-hidden border border-zinc-200 bg-white shadow-[0_8px_8px_rgba(0,0,0,0.01),0_4px_4px_rgba(0,0,0,0.015),0_2px_2px_rgba(0,0,0,0.015),0_0_0_1px_rgba(0,0,0,0.05)] rounded-lg">
      <CardHeader className="pb-2 border-b border-zinc-100">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-black">Calendar</CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">Recent activities of {rooms.length} rooms</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Check-out at 12:00 PM
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mt-2">
          <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-zinc-100"><ChevronLeft size={14} className="text-zinc-500" /></button>
          <span className="text-xs font-semibold text-black">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-zinc-100"><ChevronRight size={14} className="text-zinc-500" /></button>
        </div>

        {/* Date strip */}
        <div className="grid grid-cols-7 gap-0.5 mt-3">
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} className={`flex flex-col items-center py-1.5 rounded-lg text-center ${isToday ? 'bg-black text-white' : 'text-zinc-500'}`}>
                <span className="text-[10px] font-medium">{String(d.getDate()).padStart(2, '0')}</span>
                <span className="text-[9px] opacity-70">{dayNames[d.getDay()]}</span>
                {isToday && <span className="text-[8px] mt-0.5 font-bold uppercase tracking-wider opacity-80">Today</span>}
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-1 overflow-y-auto space-y-2 px-3">
        {calendarRooms.length > 0 ? (
          calendarRooms.map((room, ri) => (
            <div key={ri} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-600">{room.number}</span>
              </div>
              {room.guests.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {room.guests.map((g, gi) => (
                    <div key={gi} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: g.color }}>
                        {g.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{g.name}</p>
                        <p className="text-[10px] text-gray-400">In {g.checkIn} · Out {g.checkOut}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2.5 text-xs text-gray-400">No guests today</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 text-center py-8">Add rooms to see the calendar.</p>
        )}
      </CardContent>

      <div className="border-t border-zinc-100 p-2">
        <button 
          onClick={() => navigate('/admin/calendar')}
          className="w-full py-2 rounded-full border border-black text-xs font-semibold text-black hover:bg-zinc-50 transition-colors"
        >
          Full View
        </button>
      </div>
    </Card>
  );
}
