import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Check, Search, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCRM, Room } from '../../context/CRMDataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { usePlanLimits } from '../../lib/planLimits';
import UpgradeModal from '../../components/crm/UpgradeModal';

export default function RoomsCMS() {
    const { rooms, addRoom, updateRoom, deleteRoom } = useCRM();
    const { tenant } = useAuth();
    const { canAdd, limitFor, currentCount, plan } = usePlanLimits();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const initialFormState: Omit<Room, 'id'> = {
        room_number: '',
        name: '',
        type: 'Standard',
        description: '',
        price_per_night: 0,
        max_occupancy: 2,
        amenities: [],
        images: [],
        status: 'Available',
        cleaning_status: 'Clean',
        is_available: true,
        show_on_website: true,
        tourist_attractions: []
    };

    const [formData, setFormData] = useState<Omit<Room, 'id'>>(initialFormState);
    const [newAmenity, setNewAmenity] = useState('');
    const [newAttraction, setNewAttraction] = useState('');

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (room?: Room) => {
        if (room) {
            setEditingRoomId(room.id);
            setFormData({
                room_number: room.room_number || '',
                name: room.name,
                type: room.type,
                description: room.description,
                price_per_night: room.price_per_night,
                max_occupancy: room.max_occupancy,
                amenities: [...room.amenities],
                images: [...room.images],
                status: room.status,
                cleaning_status: room.cleaning_status,
                is_available: room.is_available,
                show_on_website: room.show_on_website !== false,
                tourist_attractions: [...(room.tourist_attractions || [])]
            });
        } else {
            setEditingRoomId(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenant?.id) return;

        setIsUploading(true);
        const toastId = toast.loading('Uploading image...');

        try {
            const ext = file.name.split('.').pop();
            const filePath = `${tenant.id}/rooms/room-${Date.now()}.${ext}`;

            const { error } = await supabase.storage.from('site-assets').upload(filePath, file, { upsert: true });
            if (error) { toast.error('Upload failed: ' + error.message, { id: toastId }); return; }

            const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, urlData.publicUrl]
            }));
            toast.success('Image uploaded', { id: toastId });
        } catch (err) {
            console.error('Upload Error:', err);
            toast.error('Network error during upload', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const addAmenity = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newAmenity.trim()) {
            e.preventDefault();
            if (!formData.amenities.includes(newAmenity.trim())) {
                setFormData(prev => ({
                    ...prev,
                    amenities: [...prev.amenities, newAmenity.trim()]
                }));
            }
            setNewAmenity('');
        }
    };

    const removeAmenity = (amenityToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.filter(a => a !== amenityToRemove)
        }));
    };

    const addAttraction = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newAttraction.trim()) {
            e.preventDefault();
            const currentAttractions = formData.tourist_attractions || [];
            if (!currentAttractions.includes(newAttraction.trim())) {
                setFormData(prev => ({
                    ...prev,
                    tourist_attractions: [...currentAttractions, newAttraction.trim()]
                }));
            }
            setNewAttraction('');
        }
    };

    const removeAttraction = (attractionToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tourist_attractions: (prev.tourist_attractions || []).filter(a => a !== attractionToRemove)
        }));
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingRoomId) {
                await updateRoom(editingRoomId, formData);
                toast.success('Room updated successfully');
            } else {
                await addRoom(formData);
                toast.success('Room added successfully');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Room save error:', err);
            toast.error(err?.message || 'Failed to save room. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRoom = async (room: Room) => {
        if (window.confirm(`Are you sure you want to delete room ${room.room_number || room.name}?`)) {
            try {
                await deleteRoom(room.id);
                toast.success('Room deleted successfully');
            } catch (error: any) {
                console.error(error);
                toast.error(error.message || 'Failed to delete room. It might be linked to existing reservations.');
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[#0E2A38]">Rooms Management</h1>
                    <p className="text-gray-500 mt-1">Add or modify the rooms available for booking.</p>
                </div>
                <button
                    onClick={() => canAdd('rooms') ? handleOpenModal() : setShowUpgrade(true)}
                    className="flex items-center gap-2 bg-[#C9A646] hover:bg-[#b5953f] text-white px-4 py-2 rounded-xl transition-colors shadow-sm font-semibold"
                >
                    <Plus size={20} />
                    <span>Add Room</span>
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 mb-6 flex items-center gap-3">
                <Search className="text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search rooms by name or type..."
                    className="flex-1 outline-none text-gray-700 bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Room Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                    <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                            {room.images && room.images.length > 0 ? (
                                <img
                                    src={room.images[0]}
                                    alt={room.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1000';
                                    }}
                                />
                            ) : (
                                <ImageIcon className="text-gray-300 w-12 h-12" />
                            )}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${room.is_available ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                    {room.is_available ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-lg font-bold text-[#0E2A38]">
                                    {room.room_number ? `Room ${room.room_number} – ` : ''}{room.name}
                                </h3>
                                <p className="font-bold text-[#C9A646] shrink-0 ml-2">₹{room.price_per_night}</p>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{room.type} • Up to {room.max_occupancy} Guests</p>

                            <div className="flex flex-wrap gap-1.5 mb-6 min-h-[32px]">
                                {room.amenities && room.amenities.slice(0, 4).map((amenity, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                                        {amenity}
                                    </span>
                                ))}
                                {room.amenities && room.amenities.length > 4 && (
                                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                                        +{room.amenities.length - 4} more
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button onClick={() => handleOpenModal(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Room">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDeleteRoom(room)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Room">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredRooms.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="font-medium text-lg text-gray-900">No rooms found</p>
                        <p>Try adjusting your search or add a new room.</p>
                    </div>
                )}
            </div>

            {/* ─── Add / Edit Modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 16 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingRoomId ? 'Edit room' : 'New room'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body — two columns */}
                            <div className="flex-1 overflow-y-auto">
                                <form id="roomForm" onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

                                        {/* ── LEFT ── */}
                                        <div className="lg:col-span-3 p-8 space-y-5">
                                            <h3 className="text-base font-semibold text-gray-900">Basic information</h3>

                                            {/* Room name */}
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1.5">Room name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="e.g. Standard King Room"
                                                />
                                            </div>

                                            {/* Room Number / Price / Category */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1.5">Room Number</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm"
                                                        value={formData.room_number}
                                                        onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                                        placeholder="101"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1.5">Price / Night (₹)</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm"
                                                        value={formData.price_per_night}
                                                        onChange={(e) => setFormData({ ...formData, price_per_night: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1.5">Category</label>
                                                    <select
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm"
                                                        value={formData.type}
                                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                    >
                                                        <option>Standard</option>
                                                        <option>Deluxe</option>
                                                        <option>Executive</option>
                                                        <option>Suite</option>
                                                        <option>Villa</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Max Occupancy / Available / Show on Site */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1.5">Max occupancy</label>
                                                    <select
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm"
                                                        value={formData.max_occupancy}
                                                        onChange={(e) => setFormData({ ...formData, max_occupancy: Number(e.target.value) })}
                                                    >
                                                        {[1, 2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1.5">Available (PMS)</label>
                                                    <div className="flex items-center h-[38px]">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={formData.is_available}
                                                                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                                                            />
                                                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                                                            <span className="ml-2 text-xs text-gray-600">{formData.is_available ? 'Yes' : 'No'}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1.5">Show on Site</label>
                                                    <div className="flex items-center h-[38px]">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={formData.show_on_website !== false}
                                                                onChange={(e) => setFormData({ ...formData, show_on_website: e.target.checked })}
                                                            />
                                                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                                                            <span className="ml-2 text-xs text-gray-600">{formData.show_on_website !== false ? 'Yes' : 'No'}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1.5">Description</label>
                                                <textarea
                                                    rows={4}
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none resize-none text-sm"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder="Briefly describe the room..."
                                                />
                                            </div>
                                        </div>

                                        {/* ── RIGHT ── */}
                                        <div className="lg:col-span-2 p-8 space-y-8">
                                            {/* Room photo */}
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900 mb-4">Room photo</h3>
                                                <div className="relative border-2 border-dashed border-gray-200 rounded-xl h-36 bg-gray-50 hover:border-[#C9A646] hover:bg-[#C9A646]/5 transition-colors flex flex-col items-center justify-center cursor-pointer mb-3 overflow-hidden">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        disabled={isUploading}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    />
                                                    <Upload size={20} className="text-gray-400 mb-2" />
                                                    <span className="text-sm text-gray-500 font-medium">{isUploading ? 'Uploading...' : 'Upload image'}</span>
                                                    <span className="text-xs text-gray-400 mt-0.5">16:9 recommended</span>
                                                </div>
                                                {formData.images.length > 0 && (
                                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                                        {formData.images.map((imgUrl, index) => (
                                                            <div key={index} className="relative shrink-0 w-20 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                                                                <img src={imgUrl} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                                                {index === 0 && (
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-semibold">Main</div>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(index)}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Facilities */}
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900 mb-3">Facilities and services</h3>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm mb-3"
                                                    value={newAmenity}
                                                    onChange={(e) => setNewAmenity(e.target.value)}
                                                    onKeyDown={addAmenity}
                                                    placeholder="Add facilities... (press Enter)"
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.amenities.map(amenity => (
                                                        <span key={amenity} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                                            {amenity}
                                                            <button type="button" onClick={() => removeAmenity(amenity)} className="text-gray-400 hover:text-red-500 ml-0.5">
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {formData.amenities.length === 0 && (
                                                        <p className="text-xs text-gray-400">Type a facility and press Enter.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Nearby Tourist Attractions */}
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900 mb-3">Nearby Tourist Attractions</h3>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none text-sm mb-3"
                                                    value={newAttraction}
                                                    onChange={(e) => setNewAttraction(e.target.value)}
                                                    onKeyDown={addAttraction}
                                                    placeholder="Add tourist attractions... (press Enter)"
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    {(formData.tourist_attractions || []).map(attraction => (
                                                        <span key={attraction} className="inline-flex items-center gap-1 bg-amber-50 text-[#C9A646] border border-[#C9A646]/20 px-2.5 py-1 rounded-full text-xs font-medium">
                                                            {attraction}
                                                            <button type="button" onClick={() => removeAttraction(attraction)} className="text-[#C9A646] hover:text-red-500 ml-0.5">
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {(!formData.tourist_attractions || formData.tourist_attractions.length === 0) && (
                                                        <p className="text-xs text-gray-400">Type an attraction and press Enter.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="roomForm"
                                    disabled={isUploading || isSubmitting}
                                    className="px-6 py-2.5 rounded-xl font-semibold bg-[#0E2A38] hover:bg-[#091b24] text-[#C9A646] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    <Check size={16} />
                                    {isSubmitting ? 'Saving...' : editingRoomId ? 'Save Changes' : 'Create Room'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <UpgradeModal
                open={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                resource="rooms"
                plan={plan}
                currentCount={currentCount('rooms')}
                limit={limitFor('rooms')}
            />
        </div>
    );
}
