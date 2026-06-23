import { useState, useEffect, useMemo } from 'react';
import { useGuest } from './GuestLayout';
import { supabase } from '../../lib/supabaseClient';
import { ShoppingCart, Check, X, Search, ChevronRight, AlertCircle, Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

type Category = { id: number; name: string; sort_order: number; is_active: boolean };
type MenuItem = { 
  id: number; 
  category_id: number | null; 
  name: string; 
  description: string; 
  price: number; 
  image_url: string | null; 
  is_veg: boolean; 
  is_available: boolean; 
  preparation_time_mins: number;
};
type CartEntry = { item: MenuItem; quantity: number; notes: string };

export default function GuestFoodOrder() {
  const { session } = useGuest();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  
  const [cart, setCart] = useState<Map<number, CartEntry>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderedId, setOrderedId] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.tenant_id) return;
    
    async function loadMenu() {
      try {
        setLoading(true);
        // Load categories
        const { data: cats } = await supabase
          .from('menu_categories')
          .select('*')
          .eq('tenant_id', session.tenant_id)
          .eq('is_active', true)
          .order('sort_order');
        setCategories(cats || []);

        // Load items
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('*')
          .eq('tenant_id', session.tenant_id)
          .eq('is_available', true)
          .order('sort_order');
        setItems(menuItems || []);
      } catch (err) {
        console.error('Failed to load menu details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, [session]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const next = new Map<number, CartEntry>(prev);
      const existing = next.get(item.id);
      next.set(item.id, { 
        item, 
        quantity: (existing?.quantity || 0) + 1, 
        notes: existing?.notes || '' 
      });
      return next;
    });
    toast.success(`${item.name} added to cart`);
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

  const updateItemNotes = (itemId: number, notes: string) => {
    setCart(prev => {
      const next = new Map<number, CartEntry>(prev);
      const entry = next.get(itemId);
      if (entry) {
        next.set(itemId, { ...entry, notes });
      }
      return next;
    });
  };

  const cartItems = useMemo(() => Array.from(cart.values()), [cart]);
  const cartCount = useMemo(() => cartItems.reduce((s, e) => s + e.quantity, 0), [cartItems]);
  const cartSubtotal = useMemo(() => cartItems.reduce((s, e) => s + e.item.price * e.quantity, 0), [cartItems]);
  const gstAmount = useMemo(() => Math.round(cartSubtotal * 0.05 * 100) / 100, [cartSubtotal]);
  const cartTotal = useMemo(() => cartSubtotal + gstAmount, [cartSubtotal, gstAmount]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesVeg = !vegOnly || item.is_veg;
      return matchesSearch && matchesCategory && matchesVeg;
    });
  }, [items, searchQuery, selectedCategory, vegOnly]);

  const placeOrder = async () => {
    if (!session || cartItems.length === 0) return;
    setSubmitting(true);
    try {
      // 1. Create order header
      const { data: order, error: oErr } = await supabase
        .from('food_orders')
        .insert({
          tenant_id: session.tenant_id,
          reservation_id: session.reservation_id,
          room_id: session.room_id,
          order_type: 'dine_in',
          is_room_service: true,
          customer_name: session.guest_name,
          customer_phone: session.guest_phone || '',
          status: 'pending',
          total_amount: cartTotal,
          gst_amount: gstAmount,
          payment_status: 'unpaid',
          payment_method: 'room_bill',
          notes: `Room service order for Room ${session.room_number || 'TBD'}`,
        })
        .select('id')
        .single();

      if (oErr || !order) throw oErr;

      // 2. Create order items
      const orderItems = cartItems.map(e => ({
        order_id: order.id,
        tenant_id: session.tenant_id,
        menu_item_id: e.item.id,
        item_name: e.item.name,
        quantity: e.quantity,
        unit_price: e.item.price,
        notes: e.notes,
      }));

      const { error: itemsErr } = await supabase
        .from('food_order_items')
        .insert(orderItems);

      if (itemsErr) throw itemsErr;

      setOrderedId(order.id);
      setCart(new Map());
      setShowCart(false);
      toast.success('Your order has been placed successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-sm animate-pulse">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Room Service Menu</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Freshly prepared in our kitchen and delivered to room {session?.room_number}</p>
        </div>
        {cartCount > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="relative bg-amber-500 text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-600 transition-colors active:scale-95 shadow-lg shadow-amber-500/10"
          >
            <ShoppingCart size={18} />
            <span>Cart ({cartCount})</span>
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-zinc-950 text-white rounded-full flex items-center justify-center text-[9px] font-black">{cartCount}</span>
          </button>
        )}
      </div>

      {/* Toggles & Search */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search dishes, desserts, drinks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none transition-colors"
            />
          </div>
          
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${
              vegOnly 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${vegOnly ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
            Veg Only
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900/60 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-900/60 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-12 text-center text-zinc-500">
          <AlertCircle size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-medium">No dishes match your current filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-4 flex gap-4 hover:border-zinc-800 transition-colors"
            >
              {item.image_url && (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover shrink-0 bg-zinc-800"
                />
              )}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white text-sm line-clamp-1 leading-snug">{item.name}</h3>
                    <span className={`w-4 h-4 border-2 shrink-0 flex items-center justify-center rounded-[3px] ${item.is_veg ? 'border-emerald-600' : 'border-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    </span>
                  </div>
                  <p className="text-2xs text-zinc-500 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-white text-sm">₹{item.price}</span>
                  
                  {cart.has(item.id) ? (
                    <div className="flex items-center bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg overflow-hidden h-8">
                      <button onClick={() => updateQty(item.id, -1)} className="px-2 hover:bg-amber-500/20 h-full flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="px-2 font-bold text-xs">{cart.get(item.id)?.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="px-2 hover:bg-amber-500/20 h-full flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white border border-zinc-700 hover:border-zinc-600 font-bold px-3 py-1 text-xs rounded-lg transition-all"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Modal / Panel */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
            
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base">Your Cart</h3>
                <p className="text-2xs text-zinc-400">Order from Room {session?.room_number}</p>
              </div>
              <button 
                onClick={() => setShowCart(false)} 
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cartItems.map(entry => (
                <div key={entry.item.id} className="space-y-3 pb-3 border-b border-zinc-900">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{entry.item.name}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">₹{entry.item.price} each</p>
                    </div>
                    <div className="flex items-center bg-zinc-900 border border-zinc-850 text-zinc-200 rounded-lg overflow-hidden h-8">
                      <button onClick={() => updateQty(entry.item.id, -1)} className="px-2 hover:bg-zinc-800 h-full flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="px-2 font-bold text-xs">{entry.quantity}</span>
                      <button onClick={() => updateQty(entry.item.id, 1)} className="px-2 hover:bg-zinc-800 h-full flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Add cooking instructions (e.g. no onions, extra spicy)..."
                    value={entry.notes}
                    onChange={e => updateItemNotes(entry.item.id, e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-zinc-800 focus:bg-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none transition-colors"
                  />
                </div>
              ))}

              <div className="space-y-2 pt-2 text-sm text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white">₹{cartSubtotal}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>GST (5%)</span>
                  <span>₹{gstAmount}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-2 border-t border-zinc-900">
                  <span>Grand Total</span>
                  <span className="text-amber-400">₹{cartTotal}</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-900 bg-zinc-900/20">
              <button
                onClick={placeOrder}
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black font-extrabold h-12 rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <span>Place In-Room Order (₹{cartTotal})</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderedId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Check size={28} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Order Placed successfully!</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your order has been sent to the kitchen. It is tagged to your room bill. We will notify you once it's on the way.
            </p>
            <button
              onClick={() => setOrderedId(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-11 rounded-xl text-xs transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
