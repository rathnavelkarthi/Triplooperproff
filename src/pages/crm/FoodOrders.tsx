import { useState } from 'react';
import { useCRM, FoodOrder, FoodOrderItem } from '../../context/CRMDataContext';
import { Plus, Clock, ChefHat, CheckCircle2, UtensilsCrossed, X, ShoppingCart, Phone, User, FileText, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { usePlanLimits } from '../../lib/planLimits';
import UpgradeModal from '../../components/crm/UpgradeModal';

const STATUS_COLS = [
    { key: 'pending', label: 'Pending', color: 'bg-amber-500', lightBg: 'bg-amber-50', icon: Clock },
    { key: 'preparing', label: 'Preparing', color: 'bg-blue-500', lightBg: 'bg-blue-50', icon: ChefHat },
    { key: 'ready', label: 'Ready', color: 'bg-green-500', lightBg: 'bg-green-50', icon: CheckCircle2 },
    { key: 'served', label: 'Served', color: 'bg-purple-500', lightBg: 'bg-purple-50', icon: UtensilsCrossed },
    { key: 'bill_requested', label: 'Bill Requested', color: 'bg-orange-500', lightBg: 'bg-orange-50', icon: FileText },
    { key: 'billed', label: 'Billed', color: 'bg-emerald-500', lightBg: 'bg-emerald-50', icon: CheckCircle2 },
] as const;

type NewOrderForm = {
    order_type: 'dine_in' | 'takeaway' | 'delivery';
    customer_name: string;
    customer_phone: string;
    table_id: number | null;
    notes: string;
    selectedItems: { menu_item_id: number; item_name: string; quantity: number; unit_price: number; notes: string }[];
};

const emptyForm: NewOrderForm = {
    order_type: 'dine_in', customer_name: '', customer_phone: '',
    table_id: null, notes: '', selectedItems: [],
};

export default function FoodOrders() {
    const {
        foodOrders, menuItems, menuCategories, restaurantTables,
        addFoodOrder, updateFoodOrder, refreshFoodOrders,
    } = useCRM();
    const { canAdd, limitFor, currentCount, plan } = usePlanLimits();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const [showNewOrder, setShowNewOrder] = useState(false);
    const [form, setForm] = useState<NewOrderForm>({ ...emptyForm });
    const [filterType, setFilterType] = useState<string>('all');

    const filteredOrders = foodOrders.filter(o => {
        if (filterType !== 'all' && o.order_type !== filterType) return false;
        return true;
    });

    const ordersByStatus = (status: string) =>
        filteredOrders.filter(o => o.status === status);

    const moveOrder = async (orderId: number, newStatus: FoodOrder['status']) => {
        await updateFoodOrder(orderId, { status: newStatus });
    };

    const addItemToOrder = (menuItemId: number) => {
        const item = menuItems.find(i => i.id === menuItemId);
        if (!item) return;

        setForm(prev => {
            const existing = prev.selectedItems.find(i => i.menu_item_id === menuItemId);
            if (existing) {
                return {
                    ...prev,
                    selectedItems: prev.selectedItems.map(i =>
                        i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
                    ),
                };
            }
            return {
                ...prev,
                selectedItems: [...prev.selectedItems, {
                    menu_item_id: item.id, item_name: item.name,
                    quantity: 1, unit_price: item.price, notes: '',
                }],
            };
        });
    };

    const removeItemFromOrder = (menuItemId: number) => {
        setForm(prev => ({
            ...prev,
            selectedItems: prev.selectedItems.filter(i => i.menu_item_id !== menuItemId),
        }));
    };

    const updateItemQty = (menuItemId: number, qty: number) => {
        if (qty < 1) return removeItemFromOrder(menuItemId);
        setForm(prev => ({
            ...prev,
            selectedItems: prev.selectedItems.map(i =>
                i.menu_item_id === menuItemId ? { ...i, quantity: qty } : i
            ),
        }));
    };

    const orderTotal = form.selectedItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const gstAmount = Math.round(orderTotal * 0.05 * 100) / 100;

    const handleCreateOrder = async () => {
        if (form.selectedItems.length === 0) return;
        await addFoodOrder(
            {
                table_id: form.table_id,
                order_type: form.order_type,
                customer_name: form.customer_name,
                customer_phone: form.customer_phone,
                status: 'pending',
                total_amount: orderTotal + gstAmount,
                gst_amount: gstAmount,
                payment_status: 'unpaid',
                payment_method: 'cash',
                notes: form.notes,
            },
            form.selectedItems,
        );
        setShowNewOrder(false);
        setForm({ ...emptyForm });
    };

    const todayOrders = foodOrders.filter(o => {
        const d = new Date(o.created_at).toDateString();
        return d === new Date().toDateString();
    });
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const activeOrders = foodOrders.filter(o => ['pending', 'preparing', 'ready', 'bill_requested'].includes(o.status)).length;

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Food Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">{activeOrders} active orders</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => refreshFoodOrders()} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                        Refresh
                    </button>
                    <button
                        onClick={() => canAdd('food_orders') ? setShowNewOrder(true) : setShowUpgrade(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0E2A38] text-white rounded-lg hover:bg-[#1a3d4f] transition-colors text-sm font-medium"
                    >
                        <Plus size={16} /> New Order
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Today's Orders", value: todayOrders.length, color: 'bg-blue-50 text-blue-700' },
                    { label: "Today's Revenue", value: `₹${todayRevenue.toLocaleString()}`, color: 'bg-green-50 text-green-700' },
                    { label: 'Active Now', value: activeOrders, color: 'bg-amber-50 text-amber-700' },
                    { label: 'Avg Order', value: todayOrders.length ? `₹${Math.round(todayRevenue / todayOrders.length)}` : '₹0', color: 'bg-purple-50 text-purple-700' },
                ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                        <p className="text-xl font-bold mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {['all', 'dine_in', 'takeaway', 'delivery'].map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${filterType === t ? 'bg-[#0E2A38] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {t === 'all' ? 'All' : t === 'dine_in' ? 'Dine In' : t === 'takeaway' ? 'Takeaway' : 'Delivery'}
                    </button>
                ))}
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                {STATUS_COLS.map(col => {
                    const orders = ordersByStatus(col.key);
                    const Icon = col.icon;
                    return (
                        <div key={col.key} className="flex-shrink-0 w-80 space-y-3">
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.lightBg}`}>
                                <Icon size={16} />
                                <span className="text-sm font-semibold">{col.label}</span>
                                <span className="ml-auto text-xs font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center">{orders.length}</span>
                            </div>
                            <div className="space-y-2 min-h-[100px]">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900">#{order.id}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.order_type === 'dine_in' ? 'bg-blue-100 text-blue-700' :
                                                order.order_type === 'takeaway' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>
                                                {order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'takeaway' ? 'Takeaway' : 'Delivery'}
                                            </span>
                                        </div>
                                        {order.customer_name && (
                                            <p className="text-xs text-gray-600">{order.customer_name}</p>
                                        )}
                                        <div className="text-xs text-gray-400 space-y-0.5">
                                            {order.items.slice(0, 3).map((it, idx) => (
                                                <p key={idx}>{it.quantity}x {it.item_name}</p>
                                            ))}
                                            {order.items.length > 3 && <p className="text-gray-300">+{order.items.length - 3} more</p>}
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                            <span className="text-xs text-gray-400">{formatTime(order.created_at)}</span>
                                            <span className="text-sm font-semibold text-gray-900">₹{order.total_amount}</span>
                                        </div>
                                        {/* Action buttons */}
                                        <div className="flex gap-1.5 pt-1">
                                            {col.key === 'pending' && (
                                                <>
                                                    <button onClick={() => moveOrder(order.id, 'preparing')} className="flex-1 text-[11px] py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium">Start</button>
                                                    <button onClick={() => moveOrder(order.id, 'cancelled')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"><Ban size={14} /></button>
                                                </>
                                            )}
                                            {col.key === 'preparing' && (
                                                <button onClick={() => moveOrder(order.id, 'ready')} className="flex-1 text-[11px] py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium">Mark Ready</button>
                                            )}
                                            {col.key === 'ready' && (
                                                <button onClick={() => moveOrder(order.id, 'served')} className="flex-1 text-[11px] py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-800 font-medium">Mark Served</button>
                                            )}
                                            {col.key === 'served' && (
                                                <button onClick={() => moveOrder(order.id, 'bill_requested')} className="flex-1 text-[11px] py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium">Request Bill</button>
                                            )}
                                            {col.key === 'bill_requested' && (
                                                <button onClick={() => {
                                                    moveOrder(order.id, 'billed');
                                                    // Actual print would need a dedicated print component or window.print logic
                                                    toast.success("Printing bill...");
                                                }} className="flex-1 text-[11px] py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium">Print & Finalize</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {orders.length === 0 && (
                                    <div className="text-center py-8 text-xs text-gray-300">No orders</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* New Order Modal */}
            {showNewOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-gray-900">New Order</h2>
                            <button onClick={() => { setShowNewOrder(false); setForm({ ...emptyForm }); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Order type */}
                            <div className="flex gap-2">
                                {(['dine_in', 'takeaway', 'delivery'] as const).map(t => (
                                    <button key={t} onClick={() => setForm(p => ({ ...p, order_type: t, table_id: t !== 'dine_in' ? null : p.table_id }))}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.order_type === t ? 'bg-[#0E2A38] text-white border-[#0E2A38]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                        {t === 'dine_in' ? 'Dine In' : t === 'takeaway' ? 'Takeaway' : 'Delivery'}
                                    </button>
                                ))}
                            </div>

                            {/* Customer + table */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                                        placeholder="Customer name" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                                </div>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
                                        placeholder="Phone" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                                </div>
                            </div>

                            {form.order_type === 'dine_in' && restaurantTables.length > 0 && (
                                <div>
                                    <label className="text-xs text-gray-500 font-medium mb-2 block">Select Table</label>
                                    <div className="flex flex-wrap gap-2">
                                        {restaurantTables.filter(t => t.status === 'available').map(t => (
                                            <button key={t.id} onClick={() => setForm(p => ({ ...p, table_id: t.id }))}
                                                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${form.table_id === t.id ? 'bg-[#0E2A38] text-white border-[#0E2A38]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                                Table {t.table_number} ({t.capacity}p)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Menu picker */}
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-2 block">Add Items</label>
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {menuCategories.map(cat => {
                                        const items = menuItems.filter(i => i.category_id === cat.id && i.is_available);
                                        if (items.length === 0) return null;
                                        return (
                                            <div key={cat.id}>
                                                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">{cat.name}</div>
                                                {items.map(item => {
                                                    const inOrder = form.selectedItems.find(i => i.menu_item_id === item.id);
                                                    return (
                                                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                            <span className={`w-2.5 h-2.5 rounded-sm border-2 ${item.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                                                                <span className={`block w-1.5 h-1.5 rounded-full mt-px ml-px ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                                            </span>
                                                            <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                                                            <span className="text-sm text-gray-500">₹{item.price}</span>
                                                            {inOrder ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => updateItemQty(item.id, inOrder.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">-</button>
                                                                    <span className="w-6 text-center text-xs font-semibold">{inOrder.quantity}</span>
                                                                    <button onClick={() => updateItemQty(item.id, inOrder.quantity + 1)} className="w-6 h-6 rounded bg-[#0E2A38] text-white flex items-center justify-center text-xs font-bold">+</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => addItemToOrder(item.id)} className="text-xs px-2.5 py-1 bg-[#0E2A38] text-white rounded-md hover:bg-[#1a3d4f] font-medium">Add</button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Order summary */}
                            {form.selectedItems.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingCart size={14} className="text-gray-500" />
                                        <span className="text-sm font-semibold text-gray-700">Order Summary</span>
                                    </div>
                                    {form.selectedItems.map(item => (
                                        <div key={item.menu_item_id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">{item.quantity}x {item.item_name}</span>
                                            <span className="text-gray-900 font-medium">₹{item.unit_price * item.quantity}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-xs text-gray-500">
                                        <span>GST (5%)</span>
                                        <span>₹{gstAmount}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-gray-900">
                                        <span>Total</span>
                                        <span>₹{orderTotal + gstAmount}</span>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="relative">
                                <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
                                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Order notes (optional)" rows={2}
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20 resize-none" />
                            </div>

                            <button onClick={handleCreateOrder} disabled={form.selectedItems.length === 0}
                                className="w-full py-3 bg-[#0E2A38] text-white rounded-lg font-semibold text-sm hover:bg-[#1a3d4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Place Order — ₹{orderTotal + gstAmount}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} resource="food orders this month" plan={plan} currentCount={currentCount('food_orders')} limit={limitFor('food_orders')} />
        </div>
    );
}
