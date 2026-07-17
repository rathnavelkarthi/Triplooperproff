import { useState } from 'react';
import { useCRM, InventoryItem } from '../../context/CRMDataContext';
import { Plus, Pencil, Trash2, X, AlertTriangle, Search, Package, ArrowDownToLine } from 'lucide-react';

const UNITS: InventoryItem['unit'][] = ['kg', 'litre', 'pieces', 'packets', 'grams', 'ml'];

export default function FoodInventory() {
    const { inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useCRM();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<InventoryItem | null>(null);
    const [search, setSearch] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);

    // Form state
    const [itemName, setItemName] = useState('');
    const [unit, setUnit] = useState<InventoryItem['unit']>('kg');
    const [currentStock, setCurrentStock] = useState('0');
    const [minStockAlert, setMinStockAlert] = useState('5');
    const [costPerUnit, setCostPerUnit] = useState('0');

    const resetForm = () => {
        setItemName(''); setUnit('kg'); setCurrentStock('0');
        setMinStockAlert('5'); setCostPerUnit('0');
        setShowForm(false); setEditing(null);
    };

    const startEdit = (item: InventoryItem) => {
        setEditing(item); setItemName(item.item_name); setUnit(item.unit);
        setCurrentStock(String(item.current_stock)); setMinStockAlert(String(item.min_stock_alert));
        setCostPerUnit(String(item.cost_per_unit)); setShowForm(true);
    };

    const handleSave = async () => {
        if (!itemName.trim()) return;
        const data = {
            item_name: itemName, unit,
            current_stock: parseFloat(currentStock) || 0,
            min_stock_alert: parseFloat(minStockAlert) || 5,
            cost_per_unit: parseFloat(costPerUnit) || 0,
            last_restocked_at: null,
        };
        if (editing) {
            await updateInventoryItem(editing.id, data);
        } else {
            await addInventoryItem(data);
        }
        resetForm();
    };

    const handleRestock = async (item: InventoryItem, amount: number) => {
        await updateInventoryItem(item.id, {
            current_stock: item.current_stock + amount,
            last_restocked_at: new Date().toISOString(),
        });
    };

    const lowStockItems = inventoryItems.filter(i => i.current_stock <= i.min_stock_alert);
    const totalItems = inventoryItems.length;
    const totalValue = inventoryItems.reduce((s, i) => s + i.current_stock * i.cost_per_unit, 0);

    let filtered = inventoryItems;
    if (search) filtered = filtered.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()));
    if (filterLowStock) filtered = filtered.filter(i => i.current_stock <= i.min_stock_alert);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Food Inventory</h1>
                    <p className="text-sm text-gray-500 mt-1">{totalItems} items tracked</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0E2A38] text-white rounded-lg hover:bg-[#1a3d4f] transition-colors text-sm font-medium">
                    <Plus size={16} /> Add Item
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Items', value: totalItems, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Low Stock', value: lowStockItems.length, color: lowStockItems.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700' },
                    { label: 'Inventory Value', value: `₹${Math.round(totalValue).toLocaleString()}`, color: 'bg-purple-50 text-purple-700' },
                ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                        <p className="text-xl font-bold mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Low stock alert */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Low stock alert</p>
                        <p className="text-xs text-red-500 mt-0.5">
                            {lowStockItems.map(i => i.item_name).join(', ')} {lowStockItems.length === 1 ? 'is' : 'are'} running low.
                        </p>
                    </div>
                </div>
            )}

            {/* Search + filter */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E2A38]/20 focus:border-[#0E2A38]/40 outline-none" />
                </div>
                <button onClick={() => setFilterLowStock(!filterLowStock)}
                    className={`px-3 py-2.5 text-xs rounded-lg font-medium border transition-colors ${filterLowStock ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <AlertTriangle size={14} className="inline mr-1" />
                    Low Stock Only
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{editing ? 'Edit Item' : 'New Inventory Item'}</h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item name (e.g. Rice)"
                            className="col-span-2 sm:col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                        <select value={unit} onChange={e => setUnit(e.target.value as any)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={currentStock} onChange={e => setCurrentStock(e.target.value)} placeholder="Current stock"
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                        <input type="number" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} placeholder="Min stock alert"
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                        <input type="number" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} placeholder="Cost per unit (₹)"
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-[#0E2A38] text-white rounded-lg hover:bg-[#1a3d4f]">
                            {editing ? 'Update' : 'Add Item'}
                        </button>
                    </div>
                </div>
            )}

            {/* Inventory Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Package size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm mb-4">
                        {search || filterLowStock ? 'No items match your filters.' : 'No inventory items yet. Start tracking your stock.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Item</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Stock</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Cost/Unit</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Value</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">Last Restocked</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => {
                                const isLow = item.current_stock <= item.min_stock_alert;
                                return (
                                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                {isLow && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                                                <span className="font-medium text-gray-900">{item.item_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                                {item.current_stock}
                                            </span>
                                            <span className="text-gray-400 ml-1">{item.unit}</span>
                                            {isLow && <span className="text-[10px] text-red-400 ml-2">(min: {item.min_stock_alert})</span>}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">₹{item.cost_per_unit}</td>
                                        <td className="px-5 py-3 text-gray-600 hidden md:table-cell">₹{Math.round(item.current_stock * item.cost_per_unit).toLocaleString()}</td>
                                        <td className="px-5 py-3 text-gray-400 text-xs hidden lg:table-cell">
                                            {item.last_restocked_at ? new Date(item.last_restocked_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button onClick={() => handleRestock(item, 10)} title="Quick restock +10" aria-label={`Restock ${item.item_name} by 10`}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
                                                    <ArrowDownToLine size={14} />
                                                </button>
                                                <button onClick={() => startEdit(item)} aria-label={`Edit ${item.item_name}`}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => { if (window.confirm(`Delete "${item.item_name}" from inventory? This cannot be undone.`)) deleteInventoryItem(item.id); }} aria-label={`Delete ${item.item_name}`}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
