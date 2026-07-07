import React, { useState } from 'react';
import { useCRM, MenuCategory, MenuItem } from '../../context/CRMDataContext';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, Leaf, X, Check, Search, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { usePlanLimits } from '../../lib/planLimits';
import UpgradeModal from '../../components/crm/UpgradeModal';

export default function MenuManager() {
    const { tenant } = useAuth();
    const {
        menuCategories, menuItems,
        addMenuCategory, updateMenuCategory, deleteMenuCategory,
        addMenuItem, updateMenuItem, deleteMenuItem,
    } = useCRM();
    const { canAdd, limitFor, currentCount, plan } = usePlanLimits();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set(menuCategories.map(c => c.id)));
    const [showCatForm, setShowCatForm] = useState(false);
    const [showItemForm, setShowItemForm] = useState<number | null>(null);
    const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [search, setSearch] = useState('');

    // Category form state
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');

    // Item form state
    const [itemName, setItemName] = useState('');
    const [itemDesc, setItemDesc] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemVeg, setItemVeg] = useState(true);
    const [itemPrepTime, setItemPrepTime] = useState('15');
    const [itemImageUrl, setItemImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const toggleCat = (id: number) => {
        setExpandedCats(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const resetCatForm = () => {
        setCatName(''); setCatDesc(''); setShowCatForm(false); setEditingCat(null);
    };

    const resetItemForm = () => {
        setItemName(''); setItemDesc(''); setItemPrice(''); setItemVeg(true);
        setItemPrepTime('15'); setItemImageUrl(''); setShowItemForm(null); setEditingItem(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenant?.id) return;

        setIsUploading(true);
        const toastId = toast.loading('Uploading image...');

        try {
            const ext = file.name.split('.').pop();
            const filePath = `${tenant.id}/menu/item-${Date.now()}.${ext}`;

            const { error } = await supabase.storage.from('site-assets').upload(filePath, file, { upsert: true });
            if (error) { toast.error('Upload failed: ' + error.message, { id: toastId }); return; }

            const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            setItemImageUrl(urlData.publicUrl);
            toast.success('Image uploaded', { id: toastId });
        } catch (error: any) {
            console.error('Upload Error:', error);
            toast.error('Network error during upload', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveCat = async () => {
        if (!catName.trim()) return;
        try {
            if (editingCat) {
                await updateMenuCategory(editingCat.id, { name: catName, description: catDesc });
                toast.success('Category updated');
            } else {
                await addMenuCategory({ name: catName, description: catDesc, sort_order: menuCategories.length, is_active: true });
                toast.success('Category added');
            }
            resetCatForm();
        } catch (err: any) {
            toast.error(err.message || 'Error saving category');
        }
    };

    const handleSaveItem = async (categoryId: number) => {
        if (!itemName.trim() || !itemPrice) return;
        const data = {
            name: itemName, description: itemDesc, price: parseFloat(itemPrice),
            is_veg: itemVeg, preparation_time_mins: parseInt(itemPrepTime) || 15,
            image_url: itemImageUrl || null, category_id: categoryId,
            sort_order: menuItems.filter(i => i.category_id === categoryId).length,
            is_available: true,
        };
        try {
            if (editingItem) {
                await updateMenuItem(editingItem.id, data);
                toast.success('Item updated');
            } else {
                await addMenuItem(data);
                toast.success('Item added');
            }
            resetItemForm();
        } catch (err: any) {
            toast.error(err.message || 'Error saving item');
        }
    };

    const startEditCat = (cat: MenuCategory) => {
        setEditingCat(cat); setCatName(cat.name); setCatDesc(cat.description); setShowCatForm(true);
    };

    const startEditItem = (item: MenuItem) => {
        setEditingItem(item); setItemName(item.name); setItemDesc(item.description);
        setItemPrice(String(item.price)); setItemVeg(item.is_veg);
        setItemPrepTime(String(item.preparation_time_mins)); setItemImageUrl(item.image_url || '');
        setShowItemForm(item.category_id);
    };

    const filteredItems = (catId: number) => {
        const items = menuItems.filter(i => i.category_id === catId);
        if (!search) return items;
        return items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    };

    const totalItems = menuItems.length;
    const availableItems = menuItems.filter(i => i.is_available).length;
    const vegItems = menuItems.filter(i => i.is_veg).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Menu Manager</h1>
                    <p className="text-sm text-gray-500 mt-1">{totalItems} items across {menuCategories.length} categories</p>
                </div>
                <button
                    onClick={() => { resetCatForm(); setShowCatForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0E2A38] text-white rounded-lg hover:bg-[#1a3d4f] transition-colors text-sm font-medium"
                >
                    <Plus size={16} /> Add Category
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Items', value: totalItems, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Available', value: availableItems, color: 'bg-green-50 text-green-700' },
                    { label: 'Vegetarian', value: vegItems, color: 'bg-emerald-50 text-emerald-700' },
                ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search menu items..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E2A38]/20 focus:border-[#0E2A38]/40 outline-none"
                />
            </div>

            {/* Category Form Modal */}
            {showCatForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{editingCat ? 'Edit Category' : 'New Category'}</h3>
                        <button onClick={resetCatForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name (e.g. Starters)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                    <input value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Short description (optional)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20" />
                    <div className="flex gap-2 justify-end">
                        <button onClick={resetCatForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSaveCat} className="px-4 py-2 text-sm bg-[#0E2A38] text-white rounded-lg hover:bg-[#1a3d4f]">
                            {editingCat ? 'Update' : 'Add Category'}
                        </button>
                    </div>
                </div>
            )}

            {/* Categories & Items */}
            {menuCategories.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-400 text-sm mb-4">No menu categories yet. Start by adding your first category.</p>
                    <button onClick={() => setShowCatForm(true)} className="text-[#0E2A38] font-medium text-sm hover:underline">
                        + Add your first category
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {menuCategories.map(cat => {
                        const items = filteredItems(cat.id);
                        const isExpanded = expandedCats.has(cat.id);

                        return (
                            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* Category header */}
                                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleCat(cat.id)}>
                                    <GripVertical size={16} className="text-gray-300" />
                                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                        {cat.description && <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>}
                                    </div>
                                    <span className="text-xs text-gray-400 mr-3">{items.length} items</span>
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => startEditCat(cat)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => deleteMenuCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Items */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100">
                                        {items.map(item => (
                                            <div key={item.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 group">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <span className="text-lg">{item.is_veg ? '🥬' : '🍗'}</span>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${item.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                                        </span>
                                                        <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                                                    </div>
                                                    {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                                                </div>
                                                <p className="font-semibold text-sm text-gray-900">₹{item.price}</p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => updateMenuItem(item.id, { is_available: !item.is_available })}
                                                        className={`px-2 py-1 text-xs rounded-full font-medium ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                                                    >
                                                        {item.is_available ? 'Available' : 'Unavailable'}
                                                    </button>
                                                    <button onClick={() => startEditItem(item)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => deleteMenuItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add item form or button */}
                                        {showItemForm === cat.id ? (
                                            <div className="p-4 bg-gray-50/80 space-y-4 rounded-b-xl border-t border-gray-100">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item name"
                                                        className="col-span-1 sm:col-span-3 px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20 transition-all font-medium" />
                                                    <input value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Description (optional)"
                                                        className="col-span-1 sm:col-span-3 px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20 transition-all" />

                                                    <input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="Price (₹)"
                                                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20 transition-all" />
                                                    <input type="number" value={itemPrepTime} onChange={e => setItemPrepTime(e.target.value)} placeholder="Prep time (min)"
                                                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20 transition-all" />
                                                    <select
                                                        value={itemVeg ? 'veg' : 'non-veg'}
                                                        onChange={e => setItemVeg(e.target.value === 'veg')}
                                                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/20 bg-white transition-all cursor-pointer"
                                                    >
                                                        <option value="veg">🥬 Vegetarian</option>
                                                        <option value="non-veg">🍗 Non-vegetarian</option>
                                                    </select>

                                                    {/* Image Upload Area */}
                                                    <div className="col-span-1 sm:col-span-3 relative mt-2 border-t border-gray-200 pt-3">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Food Image</label>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                            <div className="relative w-20 h-20 rounded-xl border border-gray-200 bg-white flex flex-col items-center justify-center overflow-hidden shrink-0 group shadow-sm">
                                                                {itemImageUrl ? (
                                                                    <>
                                                                        <img src={itemImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setItemImageUrl('')}
                                                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                                                                        >
                                                                            <X size={12} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <ImageIcon className="text-gray-300 mb-1" size={20} />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="relative inline-flex">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleImageUpload}
                                                                        disabled={isUploading}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                        title="Upload image"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        disabled={isUploading}
                                                                        className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                                                                    >
                                                                        <ImageIcon size={16} className={isUploading ? 'animate-pulse text-gray-400' : 'text-gray-500'} />
                                                                        {isUploading ? 'Uploading...' : 'Upload Image'}
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-gray-400 mt-2">Recommended size: 800x600px, under 2MB.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end pt-3 border-t border-gray-100 mt-2">
                                                    <div className="flex gap-2">
                                                        <button onClick={resetItemForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancel</button>
                                                        <button onClick={() => handleSaveItem(cat.id)} className="px-4 py-2 text-sm bg-[#0E2A38] text-white rounded-lg hover:bg-[#1a3d4f] shadow-sm transition-colors font-medium flex items-center gap-2">
                                                            <Check size={16} />
                                                            {editingItem ? 'Update Item' : 'Add Item'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => canAdd('menu_items') ? (resetItemForm(), setShowItemForm(cat.id)) : setShowUpgrade(true)}
                                                className="w-full px-5 py-3 text-sm text-gray-400 hover:text-[#0E2A38] hover:bg-gray-50 text-left flex items-center gap-2"
                                            >
                                                <Plus size={14} /> Add item
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} resource="menu items" plan={plan} currentCount={currentCount('menu_items')} limit={limitFor('menu_items')} />
        </div>
    );
}
