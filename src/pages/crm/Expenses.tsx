import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  Receipt, Plus, X, Search, Trash2, Pencil, ChevronUp, ChevronDown,
  IndianRupee, Calendar, TrendingUp, Hash
} from 'lucide-react';

const CATEGORIES = [
  'Salaries', 'Utilities', 'Maintenance', 'Supplies', 'Food & Beverage',
  'Marketing', 'Rent', 'Insurance', 'Equipment', 'Other'
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

interface Expense {
  id: string;
  tenant_id: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  payment_method: string;
  vendor: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
}

const emptyForm = {
  category: 'Supplies',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  payment_method: 'Cash',
  vendor: '',
};

export default function Expenses() {
  const { tenant, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchExpenses = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, [tenant?.id]);

  const handleSubmit = async () => {
    if (!tenant?.id || !form.amount || !form.category) return;
    setSaving(true);
    const payload = {
      tenant_id: tenant.id,
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount),
      date: form.date,
      payment_method: form.payment_method,
      vendor: form.vendor || null,
      created_by: user?.name || null,
    };

    if (editingId) {
      await supabase.from('expenses').update(payload).eq('id', editingId);
    } else {
      await supabase.from('expenses').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchExpenses();
  };

  const handleEdit = (e: Expense) => {
    setForm({
      category: e.category,
      description: e.description || '',
      amount: String(e.amount),
      date: e.date,
      payment_method: e.payment_method,
      vendor: e.vendor || '',
    });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory) list = list.filter(e => e.category === filterCategory);
    if (filterDateFrom) list = list.filter(e => e.date >= filterDateFrom);
    if (filterDateTo) list = list.filter(e => e.date <= filterDateTo);
    list.sort((a, b) => {
      const av = sortField === 'date' ? a.date : a.amount;
      const bv = sortField === 'date' ? b.date : b.amount;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [expenses, search, filterCategory, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Stats
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthExpenses = expenses.filter(e => e.date >= monthStart);
  const totalThisMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const daysInMonth = now.getDate();
  const dailyAvg = daysInMonth > 0 ? totalThisMonth / daysInMonth : 0;
  const categoryTotals = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const topCategory = Object.entries(categoryTotals).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-';

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0E2A38]">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage all your expenses</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0E2A38] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3d4f] transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This Month', value: `₹${totalThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`, icon: IndianRupee, color: 'text-red-600 bg-red-50' },
          { label: 'Daily Average', value: `₹${dailyAvg.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Top Category', value: topCategory, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Expense Count', value: String(monthExpenses.length), icon: Hash, color: 'text-green-600 bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                <p className="text-lg font-bold text-[#0E2A38] truncate">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search description or vendor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="inline-flex items-center gap-1">Date <SortIcon field="date" /></span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Description</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <span className="inline-flex items-center gap-1 justify-end">Amount <SortIcon field="amount" /></span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Vendor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Payment</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No expenses found</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{e.category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{e.description || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0E2A38] whitespace-nowrap">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500">{e.vendor || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.payment_method}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(e)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-lg font-bold text-[#0E2A38]">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What was this expense for?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Vendor (optional)</label>
                  <input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}
                    placeholder="Vendor name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 outline-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.amount}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0E2A38] text-white hover:bg-[#1a3d4f] transition-all disabled:opacity-40">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
