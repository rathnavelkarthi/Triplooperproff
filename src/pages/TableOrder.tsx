import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Category = { id: number; name: string; sort_order: number; is_active: boolean };
type Item = { id: number; category_id: number | null; name: string; description: string; price: number; image_url: string | null; is_veg: boolean; is_available: boolean; preparation_time_mins: number };
type CartEntry = { item: Item; quantity: number; notes: string };

export default function TableOrder() {
    const { subdomain, tableId } = useParams<{ subdomain: string; tableId: string }>();
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [restaurantName, setRestaurantName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [cart, setCart] = useState<Map<number, CartEntry>>(new Map());
    const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState<number | null>(null);
    const [showCart, setShowCart] = useState(false);

    // Fetch tenant, table, menu
    useEffect(() => {
        (async () => {
            try {
                // Get tenant
                const { data: tenant, error: tErr } = await supabase
                    .from('tenants')
                    .select('id, business_name')
                    .eq('subdomain', subdomain)
                    .single();
                if (tErr || !tenant) { setError('Restaurant not found'); setLoading(false); return; }
                setTenantId(tenant.id);
                setRestaurantName(tenant.business_name);

                // Get table
                const { data: table } = await supabase
                    .from('restaurant_tables')
                    .select('table_number')
                    .eq('id', Number(tableId))
                    .eq('tenant_id', tenant.id)
                    .single();
                if (table) setTableNumber(table.table_number);

                // Get categories
                const { data: cats } = await supabase
                    .from('menu_categories')
                    .select('*')
                    .eq('tenant_id', tenant.id)
                    .eq('is_active', true)
                    .order('sort_order');
                setCategories(cats || []);
                if (cats?.length) setExpandedCats(new Set(cats.map((c: Category) => c.id)));

                // Get items
                const { data: menuItems } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('tenant_id', tenant.id)
                    .eq('is_available', true)
                    .order('sort_order');
                setItems(menuItems || []);
            } catch {
                setError('Something went wrong');
            } finally {
                setLoading(false);
            }
        })();
    }, [subdomain, tableId]);

    const toggleCat = (id: number) => {
        setExpandedCats(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const addToCart = (item: Item) => {
        setCart(prev => {
            const next = new Map<number, CartEntry>(prev);
            const existing = next.get(item.id);
            next.set(item.id, { item, quantity: (existing?.quantity || 0) + 1, notes: existing?.notes || '' });
            return next;
        });
    };

    const updateQty = (itemId: number, delta: number) => {
        setCart(prev => {
            const next = new Map<number, CartEntry>(prev);
            const entry = next.get(itemId);
            if (!entry) return prev;
            const newQty = entry.quantity + delta;
            if (newQty <= 0) next.delete(itemId);
            else next.set(itemId, { ...entry, quantity: newQty });
            return next;
        });
    };

    const cartItems = useMemo(() => Array.from(cart.values()), [cart]);
    const cartTotal = useMemo(() => cartItems.reduce((s, e) => s + e.item.price * e.quantity, 0), [cartItems]);
    const cartCount = useMemo(() => cartItems.reduce((s, e) => s + e.quantity, 0), [cartItems]);

    const placeOrder = async () => {
        if (!tenantId || cartItems.length === 0) return;
        if (!customerName.trim()) { alert('Please enter your name'); return; }
        setSubmitting(true);
        try {
            const { data: order, error: oErr } = await supabase
                .from('food_orders')
                .insert({
                    tenant_id: tenantId,
                    table_id: Number(tableId),
                    order_type: 'dine_in',
                    customer_name: customerName.trim(),
                    customer_phone: customerPhone.trim(),
                    status: 'pending',
                    total_amount: cartTotal,
                    gst_amount: 0,
                    payment_status: 'unpaid',
                    payment_method: '',
                    notes: '',
                })
                .select('id')
                .single();
            if (oErr || !order) throw oErr;

            const orderItems = cartItems.map(e => ({
                order_id: order.id,
                tenant_id: tenantId,
                menu_item_id: e.item.id,
                item_name: e.item.name,
                quantity: e.quantity,
                unit_price: e.item.price,
                notes: e.notes,
            }));
            await supabase.from('food_order_items').insert(orderItems);

            setOrderId(order.id);
            setCart(new Map());
        } catch (err) {
            console.error(err);
            alert('Failed to place order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center"><p className="text-red-500 font-medium">{error}</p></div>
        </div>
    );

    // Order confirmation
    if (orderId) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-lg space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Order Placed!</h2>
                <p className="text-gray-500 text-sm">Your order #{orderId} has been sent to the kitchen.</p>
                <p className="text-gray-400 text-xs">Table {tableNumber} &middot; {restaurantName}</p>
                <button onClick={() => { setOrderId(null); setCustomerName(''); setCustomerPhone(''); }}
                    className="mt-4 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">
                    Order More
                </button>
            </div>
        </div>
    );

    const itemsByCategory = (catId: number) => items.filter(i => i.category_id === catId);
    const uncategorized = items.filter(i => !i.category_id);

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-primary text-white px-4 py-4 sticky top-0 z-30">
                <h1 className="text-lg font-bold">{restaurantName}</h1>
                <p className="text-xs text-white/70">Table {tableNumber}</p>
            </div>

            {/* Menu */}
            <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {categories.map(cat => {
                    const catItems = itemsByCategory(cat.id);
                    if (catItems.length === 0) return null;
                    const expanded = expandedCats.has(cat.id);
                    return (
                        <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <button onClick={() => toggleCat(cat.id)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left">
                                <span className="font-semibold text-gray-900">{cat.name}</span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {expanded && (
                                <div className="divide-y divide-gray-100">
                                    {catItems.map(item => <MenuItemCard key={item.id} item={item} cartQty={cart.get(item.id)?.quantity || 0} onAdd={() => addToCart(item)} onPlus={() => updateQty(item.id, 1)} onMinus={() => updateQty(item.id, -1)} />)}
                                </div>
                            )}
                        </div>
                    );
                })}
                {uncategorized.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 font-semibold text-gray-900">Other Items</div>
                        <div className="divide-y divide-gray-100">
                            {uncategorized.map(item => <MenuItemCard key={item.id} item={item} cartQty={cart.get(item.id)?.quantity || 0} onAdd={() => addToCart(item)} onPlus={() => updateQty(item.id, 1)} onMinus={() => updateQty(item.id, -1)} />)}
                        </div>
                    </div>
                )}
            </div>

            {/* Cart Bar */}
            {cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40">
                    {showCart && (
                        <div className="bg-white border-t border-gray-200 max-h-[60vh] overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto">
                            <h3 className="font-semibold text-gray-900">Your Order</h3>
                            {cartItems.map(e => (
                                <div key={e.item.id} className="flex items-center justify-between text-sm">
                                    <div className="flex-1">
                                        <span className="text-gray-800">{e.item.name}</span>
                                        <span className="text-gray-400 ml-2">x{e.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600">₹{e.item.price * e.quantity}</span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => updateQty(e.item.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs">−</button>
                                            <span className="text-xs w-4 text-center">{e.quantity}</span>
                                            <button onClick={() => updateQty(e.item.id, 1)} className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name *"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone (optional)"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <button onClick={placeOrder} disabled={submitting}
                                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50">
                                {submitting ? 'Placing Order...' : `Place Order — ₹${cartTotal}`}
                            </button>
                        </div>
                    )}
                    <button onClick={() => setShowCart(v => !v)}
                        className="w-full bg-primary text-white px-4 py-3.5 flex items-center justify-between">
                        <span className="text-sm font-medium">{cartCount} item{cartCount > 1 ? 's' : ''} &middot; ₹{cartTotal}</span>
                        <span className="text-sm font-medium">{showCart ? 'Close' : 'View Cart'} &rarr;</span>
                    </button>
                </div>
            )}
        </div>
    );
}

function MenuItemCard({ item, cartQty, onAdd, onPlus, onMinus }: {
    item: { id: number; name: string; description: string; price: number; image_url: string | null; is_veg: boolean };
    cartQty: number; onAdd: () => void; onPlus: () => void; onMinus: () => void; key?: any;
}) {
    return (
        <div className="flex gap-3 px-4 py-3">
            {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 ${item.is_veg ? 'border-green-600' : 'border-red-500'}`}>
                        <span className={`block w-1.5 h-1.5 rounded-full m-auto mt-[1px] ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
                    </span>
                    <span className="font-medium text-gray-900 text-sm truncate">{item.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">₹{item.price}</p>
            </div>
            <div className="flex-shrink-0 flex items-end">
                {cartQty === 0 ? (
                    <button onClick={onAdd} className="px-3 py-1 text-xs font-medium border border-primary text-primary rounded-lg hover:bg-primary/5">
                        ADD
                    </button>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <button onClick={onMinus} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs">−</button>
                        <span className="text-sm font-medium w-4 text-center">{cartQty}</span>
                        <button onClick={onPlus} className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">+</button>
                    </div>
                )}
            </div>
        </div>
    );
}
