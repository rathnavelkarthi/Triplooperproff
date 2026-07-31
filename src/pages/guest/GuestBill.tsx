import { useState, useEffect, useMemo } from 'react';
import { useGuest } from './GuestLayout';
import { supabase } from '../../lib/supabaseClient';
import { Receipt, FileText, ShoppingBag, Calendar, Check, Landmark, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type FoodOrderItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
};

type FoodOrderBill = {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  food_order_items: FoodOrderItem[];
};

export default function GuestBill() {
  const { session } = useGuest();
  const [foodOrders, setFoodOrders] = useState<FoodOrderBill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBillDetails = async () => {
    if (!session?.reservation_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('food_orders')
        .select(`
          id, 
          total_amount, 
          status, 
          created_at,
          food_order_items (
            item_name, 
            quantity, 
            unit_price
          )
        `)
        .eq('reservation_id', session.reservation_id);

      if (error) throw error;
      setFoodOrders((data as any) || []);
    } catch (err) {
      console.error('Failed to load bill items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillDetails();
  }, [session]);

  const nights = useMemo(() => {
    if (!session) return 1;
    const start = new Date(session.check_in);
    const end = new Date(session.check_out);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [session]);

  const foodTotal = useMemo(() => {
    return foodOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [foodOrders]);

  const totalBill = useMemo(() => {
    if (!session) return 0;
    return Number(session.amount || 0) + foodTotal;
  }, [session, foodTotal]);

  if (!session) return null;

  const formatDateStr = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto print:bg-white print:text-black print:p-8">
      
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Running Bill</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time overview of your room charges and services.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadBillDetails}
            className="w-10 h-10 border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl active:scale-95 transition-all"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handlePrint}
            className="bg-emerald-500 text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors active:scale-95 shadow-lg shadow-emerald-500/10 text-xs uppercase tracking-wider"
          >
            <FileText size={16} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Bill Presentation */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 print:border-none print:shadow-none print:bg-transparent">
        
        {/* Invoice Meta */}
        <div className="flex justify-between items-start border-b border-zinc-800/60 pb-6 print:border-zinc-300">
          <div>
            <h1 className="text-lg font-bold text-white print:text-black">{session.business_name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5 print:text-zinc-650">{session.room_name} • Room {session.room_number}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-550 uppercase tracking-wider">Stay Reference</span>
            <p className="text-xs font-semibold text-white font-mono mt-0.5 print:text-black">{session.reservation_id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Guest Details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-550 uppercase font-medium">Guest Name</span>
            <p className="font-semibold text-white mt-0.5 print:text-black">{session.guest_name}</p>
            <p className="text-zinc-500">{session.guest_email || session.guest_phone}</p>
          </div>
          <div className="text-right">
            <span className="text-zinc-550 uppercase font-medium">Dates & Nights</span>
            <p className="font-semibold text-white mt-0.5 print:text-black">{formatDateStr(session.check_in)} - {formatDateStr(session.check_out)}</p>
            <p className="text-emerald-400 print:text-zinc-700 font-semibold">{nights} Night{nights > 1 ? 's' : ''} stay</p>
          </div>
        </div>

        {/* Customer Tax Bill Breakdown */}
        {(() => {
          const roomPrice = Number(session.amount || 0);
          const discount = (session as any).discount || 0;
          const taxableValue = Math.max(0, roomPrice - discount);
          const gstAmount = Math.round(taxableValue * 0.12);
          const grandTotal = taxableValue + gstAmount + foodTotal;

          return (
            <div className="space-y-4 pt-4 border-t border-zinc-800/40 print:border-zinc-350">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 print:text-zinc-600">Customer Tax Bill</h3>

              <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase text-[10px]">
                      <th className="text-left pb-2">Particulars</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    <tr>
                      <td className="py-2">Room Price</td>
                      <td className="py-2 text-right font-medium">₹{roomPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {discount > 0 && (
                      <tr>
                        <td className="py-2">Discount</td>
                        <td className="py-2 text-right font-medium text-red-400">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="font-semibold text-white">
                      <td className="py-2">Taxable Value</td>
                      <td className="py-2 text-right">₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="py-2">GST @12%</td>
                      <td className="py-2 text-right font-medium">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {foodTotal > 0 && (
                      <tr>
                        <td className="py-2">F&B / In-Room Dining</td>
                        <td className="py-2 text-right font-medium">₹{foodTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="font-extrabold text-sm text-emerald-400 bg-zinc-900/60">
                      <td className="py-2.5 px-2 rounded-l-lg text-white">Grand Total</td>
                      <td className="py-2.5 px-2 text-right rounded-r-lg text-emerald-400">
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Footer info */}
        <div className="flex gap-2.5 items-start p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-[10px] text-zinc-500 leading-relaxed print:hidden">
          <Landmark size={14} className="text-zinc-600 shrink-0 mt-0.5" />
          <p>
            Please note this is a running total of your bill during your stay. Any additional orders, services or laundry charges will be updated dynamically here. Final settlement can be made via credit card, cash or UPI at check-out.
          </p>
        </div>

      </div>

    </div>
  );
}
