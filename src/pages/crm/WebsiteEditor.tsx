import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, setForceFreshToken } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import {
    Eye, Save, Upload, Trash2, Plus, GripVertical, ChevronDown, ChevronUp,
    Image as ImageIcon, Type, MapPin, Phone, Mail, Star, Quote, Globe,
    EyeOff, ExternalLink, Loader2, Check, Sparkles, X, UtensilsCrossed, Clock, Camera,
    Palette, Sliders
} from 'lucide-react';

// --- Types ---
type SiteSettings = Record<string, string>;
type Testimonial = {
    id?: number; guest_name: string; guest_location: string;
    rating: number; review_text: string; is_featured: boolean;
};
type SectionVisibility = Record<string, boolean>;
type EditorRoom = {
    id: number; name: string; type: string; description: string;
    price_per_night: number; max_occupancy: number; amenities: string[]; images: string[];
    show_on_website: boolean;
};
type EditorMenuItem = {
    id: number; name: string; price: number; image_url: string | null; is_veg: boolean; is_chef_special: boolean;
};
type GalleryImage = {
    id?: number; image_url: string; caption: string; sort_order: number; tenant_id?: string;
};

// --- Section panel wrapper ---
function SectionPanel({ title, icon: Icon, isOpen, onToggle, isVisible, onToggleVisibility, children }: {
    title: string; icon: React.ElementType; isOpen: boolean; onToggle: () => void;
    isVisible: boolean; onToggleVisibility: () => void; children: React.ReactNode;
}) {
    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${isVisible ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-3 p-4 cursor-pointer select-none" onClick={onToggle}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isVisible ? 'bg-[#0E2A38] text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isVisible ? 'text-gray-900' : 'text-gray-400'}`}>{title}</p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                    title={isVisible ? 'Hide section' : 'Show section'}
                    className={`p-1.5 rounded-md transition-colors ${isVisible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <div className="text-gray-400">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
            </div>
            {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">{children}</div>
            )}
        </div>
    );
}

// --- Input helper ---
function EditorInput({ label, value, onChange, multiline, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            {multiline ? (
                <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none transition-all resize-none" />
            ) : (
                <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none transition-all" />
            )}
        </div>
    );
}

// --- Image upload ---
function ImageUploader({ label, currentUrl, onUpload, uploading }: {
    label: string; currentUrl: string; onUpload: (file: File) => void; uploading: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            <div className="relative aspect-video rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden group cursor-pointer"
                onClick={() => inputRef.current?.click()}>
                {currentUrl ? (
                    <img src={currentUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <Upload size={20} className="mx-auto mb-1" />
                            <p className="text-xs">Click to upload</p>
                        </div>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {uploading ? (
                        <Loader2 size={20} className="text-white animate-spin" />
                    ) : (
                        <div className="text-white text-xs font-medium flex items-center gap-1"><Upload size={14} /> Upload</div>
                    )}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </div>
        </div>
    );
}

// =========================================================================
// MAIN EDITOR
// =========================================================================
export default function WebsiteEditor() {
    const { tenant } = useAuth();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // State
    const [settings, setSettings] = useState<SiteSettings>({});
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [visibility, setVisibility] = useState<SectionVisibility>({
        hero: true, rooms: true, testimonials: true, about: true, contact: true, menu: true
    });
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [rooms, setRooms] = useState<EditorRoom[]>([]);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ hero: true });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    // Restaurant-specific state
    const [menuItemsList, setMenuItemsList] = useState<EditorMenuItem[]>([]);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

    // Load tenant data
    useEffect(() => {
        if (!tenant?.id) return;
        loadData();
    }, [tenant?.id]);

    const loadData = async () => {
        if (!tenant?.id) return;

        // Load settings
        const { data: settingsData } = await supabase
            .from('settings').select('setting_key, setting_value').eq('tenant_id', tenant.id);
        if (settingsData) {
            const map: Record<string, string> = {};
            settingsData.forEach(s => { map[s.setting_key] = s.setting_value; });
            setSettings(map);
        }

        // Load testimonials
        const { data: testimonialsData } = await supabase
            .from('testimonials').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false });
        if (testimonialsData) setTestimonials(testimonialsData);

        // Load tenant-level settings
        const { data: tenantData } = await supabase
            .from('tenants').select('hero_image_url, sections_visible').eq('id', tenant.id).single();
        if (tenantData) {
            setHeroImageUrl(tenantData.hero_image_url || '');
            if (tenantData.sections_visible) setVisibility(tenantData.sections_visible);
        }

        // Load rooms (hotel/combined only)
        const bType = tenant?.business_type;
        if (bType === 'hotel' || bType === 'combined') {
            const { data: roomsData } = await supabase
                .from('rooms').select('id, name, type, description, price_per_night, max_occupancy, amenities, images, show_on_website')
                .eq('tenant_id', tenant.id).order('price_per_night', { ascending: true });
            if (roomsData) setRooms(roomsData);
        }

        // Load menu items (restaurant/combined only) for chef specials toggle
        if (bType === 'restaurant' || bType === 'combined') {
            const { data: menuData } = await supabase
                .from('menu_items').select('id, name, price, image_url, is_veg, is_chef_special')
                .eq('tenant_id', tenant.id).eq('is_available', true).order('sort_order');
            if (menuData) setMenuItemsList(menuData);
        }

        // Load gallery images
        if (bType === 'restaurant' || bType === 'combined') {
            const { data: galleryData } = await supabase
                .from('gallery_images').select('*')
                .eq('tenant_id', tenant.id).order('sort_order');
            if (galleryData) setGalleryImages(galleryData);
        }
    };

    // Update setting
    const updateSetting = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    // Toggle section visibility
    const toggleVis = (section: string) => {
        setVisibility(prev => ({ ...prev, [section]: !prev[section] }));
        setHasChanges(true);
    };

    // Toggle open section panel
    const toggleOpen = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Upload image to Supabase Storage
    const uploadImage = useCallback(async (file: File, path: string): Promise<string | null> => {
        if (!tenant?.id) return null;
        const ext = file.name.split('.').pop();
        const filePath = `${tenant.id}/${path}-${Date.now()}.${ext}`;

        setForceFreshToken(true);
        const { error } = await supabase.storage.from('site-assets').upload(filePath, file, { upsert: true });
        setForceFreshToken(false);
        if (error) { toast.error('Upload failed: ' + error.message); return null; }

        const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
        return data.publicUrl;
    }, [tenant?.id]);

    // Upload hero image
    const handleHeroImageUpload = async (file: File) => {
        setUploading('hero');
        const url = await uploadImage(file, 'hero');
        if (url) { setHeroImageUrl(url); setHasChanges(true); }
        setUploading('');
    };

    // Toggle room website visibility
    const toggleRoomWebsite = (roomId: number) => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, show_on_website: !r.show_on_website } : r));
        setHasChanges(true);
    };

    // Add testimonial
    const addTestimonial = () => {
        setTestimonials(prev => [
            { guest_name: '', guest_location: '', rating: 5, review_text: '', is_featured: true },
            ...prev
        ]);
        setHasChanges(true);
        setOpenSections(prev => ({ ...prev, testimonials: true }));
    };

    // Update testimonial
    const updateTestimonial = (index: number, field: string, value: any) => {
        setTestimonials(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
        setHasChanges(true);
    };

    // Delete testimonial
    const deleteTestimonial = async (index: number) => {
        const t = testimonials[index];
        if (t.id) {
            await supabase.from('testimonials').delete().eq('id', t.id);
        }
        setTestimonials(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    // Toggle chef special
    const toggleChefSpecial = (itemId: number) => {
        setMenuItemsList(prev => prev.map(m => m.id === itemId ? { ...m, is_chef_special: !m.is_chef_special } : m));
        setHasChanges(true);
    };

    // Upload gallery image
    const handleGalleryUpload = async (file: File) => {
        if (!tenant?.id) return;
        setUploading('gallery');
        const url = await uploadImage(file, 'gallery');
        if (url) {
            const newImg: GalleryImage = { image_url: url, caption: '', sort_order: galleryImages.length, tenant_id: tenant.id };
            // Save to DB immediately
            const { data } = await supabase.from('gallery_images').insert(newImg).select().single();
            if (data) setGalleryImages(prev => [...prev, data]);
            setHasChanges(true);
        }
        setUploading('');
    };

    // Delete gallery image
    const deleteGalleryImage = async (img: GalleryImage) => {
        if (img.id) {
            await supabase.from('gallery_images').delete().eq('id', img.id);
        }
        setGalleryImages(prev => prev.filter(g => g.id !== img.id));
        setHasChanges(true);
    };

    // Save all changes
    const handleSave = async () => {
        if (!tenant?.id) return;
        setSaving(true);

        // Track partial failures. Under RLS, a write the current user isn't
        // allowed to make returns an error OR silently affects 0 rows — either
        // way the change never goes live, so we must NOT report success.
        const failures: string[] = [];

        try {
            // Save settings
            for (const [key, value] of Object.entries(settings)) {
                const { error } = await supabase.from('settings').upsert(
                    { setting_key: key, setting_value: value, tenant_id: tenant.id },
                    { onConflict: 'tenant_id,setting_key' }
                ).select();
                if (error) failures.push(`setting "${key}": ${error.message}`);
            }

            // Save tenant-level fields. .select() returns the affected rows so we
            // can detect an RLS block that reports no error but touches 0 rows.
            {
                const { data, error } = await supabase.from('tenants').update({
                    hero_image_url: heroImageUrl,
                    sections_visible: visibility,
                }).eq('id', tenant.id).select('id');
                if (error) failures.push(`hero/visibility: ${error.message}`);
                else if (!data || data.length === 0) failures.push('hero/visibility: no rows updated (permission denied)');
            }

            // Save testimonials
            for (const t of testimonials) {
                if (t.id) {
                    const { error } = await supabase.from('testimonials').update({
                        guest_name: t.guest_name, guest_location: t.guest_location,
                        rating: t.rating, review_text: t.review_text, is_featured: t.is_featured,
                    }).eq('id', t.id).select('id');
                    if (error) failures.push(`testimonial "${t.guest_name || t.id}": ${error.message}`);
                } else {
                    const { error } = await supabase.from('testimonials').insert({
                        ...t, tenant_id: tenant.id
                    }).select('id');
                    if (error) failures.push(`new testimonial "${t.guest_name || ''}": ${error.message}`);
                }
            }

            // Reload data to get IDs for new testimonials
            await loadData();

            // Save room visibility toggles
            for (const room of rooms) {
                const { data, error } = await supabase.from('rooms').update({
                    show_on_website: room.show_on_website,
                }).eq('id', room.id).select('id');
                if (error) failures.push(`room "${room.name}": ${error.message}`);
                else if (!data || data.length === 0) failures.push(`room "${room.name}": no rows updated (permission denied)`);
            }

            // Save chef specials toggles
            for (const item of menuItemsList) {
                const { data, error } = await supabase.from('menu_items').update({
                    is_chef_special: item.is_chef_special,
                }).eq('id', item.id).select('id');
                if (error) failures.push(`menu item "${item.name}": ${error.message}`);
                else if (!data || data.length === 0) failures.push(`menu item "${item.name}": no rows updated (permission denied)`);
            }

            // Refresh preview
            if (iframeRef.current) {
                iframeRef.current.src = iframeRef.current.src;
            }

            if (failures.length > 0) {
                // Something didn't persist — tell the user the truth, not "live".
                console.error('WebsiteEditor save failures:', failures);
                toast.error(
                    `${failures.length} change(s) did not save. ` +
                    `First error: ${failures[0]}`
                );
                // Leave hasChanges=true so the user can retry.
            } else {
                setHasChanges(false);
                toast.success('Website updated. Changes are live.');
            }
        } catch (err: any) {
            toast.error('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const subdomain = tenant?.subdomain || '';
    const previewUrl = `/site/${subdomain}`;
    
    // Environment-aware live URL
    const liveUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('vercel.app')
        ? `${window.location.origin}/site/${subdomain}`
        : `https://${subdomain}.triplooper.com`;

    const previewWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] -m-4 sm:-m-6 lg:-m-8">
            {/* Top toolbar */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0E2A38] to-[#1a3d4f] flex items-center justify-center">
                        <Globe size={16} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-900">Website editor</h1>
                        <p className="text-[11px] text-gray-400">{subdomain}.triplooper.com</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Device toggles */}
                    <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-0.5">
                        {(['desktop', 'tablet', 'mobile'] as const).map(d => (
                            <button key={d} onClick={() => setPreviewDevice(d)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${previewDevice === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                        ))}
                    </div>

                    <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Open in new tab">
                        <ExternalLink size={16} />
                    </a>

                    <button onClick={handleSave} disabled={saving || !hasChanges}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${hasChanges
                            ? 'bg-[#0E2A38] text-white hover:bg-[#1a3d4f] shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : hasChanges ? <Save size={14} /> : <Check size={14} />}
                        {saving ? 'Publishing...' : hasChanges ? 'Publish changes' : 'Published'}
                    </button>
                </div>
            </div>

            {/* Main split panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: editing panels */}
                <div className="w-[380px] shrink-0 border-r border-gray-200 bg-[#FAFAFA] overflow-y-auto">
                    <div className="p-4 space-y-3">

                        {/* HERO */}
                        <SectionPanel title="Hero section" icon={Sparkles} isOpen={!!openSections.hero} onToggle={() => toggleOpen('hero')}
                            isVisible={visibility.hero} onToggleVisibility={() => toggleVis('hero')}>
                            <EditorInput label="Headline" value={settings.heroTitle || ''} onChange={v => updateSetting('heroTitle', v)} placeholder={tenant?.business_name || 'Your Property Name'} />
                            <EditorInput label="Subtitle" value={settings.heroSubtitle || ''} onChange={v => updateSetting('heroSubtitle', v)} placeholder="Where comfort meets elegance" />
                            <ImageUploader label="Hero background image" currentUrl={heroImageUrl} onUpload={handleHeroImageUpload} uploading={uploading === 'hero'} />
                        </SectionPanel>

                        {/* ROOMS (Hotel/Combined only) */}
                        {(tenant?.business_type === 'hotel' || tenant?.business_type === 'combined') && (
                            <SectionPanel title="Rooms" icon={ImageIcon} isOpen={!!openSections.rooms} onToggle={() => toggleOpen('rooms')}
                                isVisible={visibility.rooms} onToggleVisibility={() => toggleVis('rooms')}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-gray-500">Toggle which rooms appear on your website.</p>
                                        <a href="/admin/rooms-cms" className="inline-flex items-center gap-1 text-[11px] text-[#0E2A38] font-semibold hover:underline">
                                            Manage in CMS <ExternalLink size={10} />
                                        </a>
                                    </div>

                                    {rooms.length === 0 && (
                                        <div className="text-center py-6">
                                            <ImageIcon size={24} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-xs text-gray-400">No rooms found.</p>
                                            <a href="/admin/rooms-cms" className="text-xs text-[#0E2A38] font-semibold hover:underline mt-1 inline-block">Add rooms in Rooms CMS</a>
                                        </div>
                                    )}

                                    {rooms.map(room => (
                                        <div key={room.id} className={`rounded-xl border transition-all ${room.show_on_website
                                            ? 'bg-white border-gray-100 shadow-sm'
                                            : 'bg-gray-50/50 border-gray-100/50 opacity-60'
                                            }`}>
                                            <div className="flex items-center gap-3 p-3">
                                                {/* Room thumbnail */}
                                                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                                                    {room.images?.[0] ? (
                                                        <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ImageIcon size={16} className="text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Room info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-[#0E2A38] truncate">{room.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{room.type}</span>
                                                        <span className="text-gray-200">|</span>
                                                        <span className="text-xs font-semibold text-[#0E2A38]">₹{room.price_per_night.toLocaleString()}<span className="text-[10px] font-normal text-gray-400">/night</span></span>
                                                    </div>
                                                </div>

                                                {/* Toggle */}
                                                <button
                                                    onClick={() => toggleRoomWebsite(room.id)}
                                                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${room.show_on_website ? 'bg-[#0E2A38]' : 'bg-gray-300'
                                                        }`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${room.show_on_website ? 'left-5' : 'left-1'
                                                        }`} />
                                                </button>
                                            </div>

                                            {/* Amenity chips preview */}
                                            {room.show_on_website && room.amenities?.length > 0 && (
                                                <div className="px-3 pb-3 flex flex-wrap gap-1">
                                                    {room.amenities.slice(0, 5).map((a, j) => (
                                                        <span key={j} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">{a}</span>
                                                    ))}
                                                    {room.amenities.length > 5 && (
                                                        <span className="text-[10px] text-gray-400">+{room.amenities.length - 5}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {rooms.length > 0 && (
                                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                                            <Eye size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                            <p className="text-[11px] text-blue-600 leading-relaxed">
                                                {rooms.filter(r => r.show_on_website).length} of {rooms.length} rooms visible on your website.
                                                Edit room details in <a href="/admin/rooms-cms" className="font-semibold underline">Rooms CMS</a>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </SectionPanel>
                        )}

                        {/* MENU (Restaurant/Combined only) */}
                        {(tenant?.business_type === 'restaurant' || tenant?.business_type === 'combined') && (
                            <SectionPanel title="Menu" icon={UtensilsCrossed} isOpen={!!openSections.menu} onToggle={() => toggleOpen('menu')}
                                isVisible={visibility.menu !== false} onToggleVisibility={() => toggleVis('menu')}>
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Your menu is displayed on the website automatically from the items you've added in Menu Manager.
                                    </p>
                                    <a href="/admin/menu" className="inline-flex items-center gap-2 text-xs text-[#0E2A38] font-semibold hover:underline">
                                        Manage menu items <ExternalLink size={10} />
                                    </a>
                                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 flex items-start gap-2">
                                        <UtensilsCrossed size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-700 leading-relaxed">
                                            Customers can browse your menu on the website and place orders via WhatsApp.
                                        </p>
                                    </div>
                                </div>
                            </SectionPanel>
                        )}

                        {/* RESTAURANT SETTINGS (Restaurant/Combined only) */}
                        {(tenant?.business_type === 'restaurant' || tenant?.business_type === 'combined') && (
                            <SectionPanel title="Restaurant settings" icon={Clock} isOpen={!!openSections.restaurantSettings} onToggle={() => toggleOpen('restaurantSettings')}
                                isVisible={true} onToggleVisibility={() => { }}>
                                <div className="space-y-4">
                                    {/* Booking Mode */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Table booking method</label>
                                        <div className="space-y-2">
                                            {[
                                                { value: 'whatsapp', label: 'WhatsApp', desc: 'Opens WhatsApp with prefilled message' },
                                                { value: 'builtin', label: 'Built-in form', desc: 'Reservation form on your website' },
                                                { value: 'external', label: 'External link', desc: 'Redirect to Zomato, Dineout, etc.' },
                                            ].map(opt => (
                                                <label key={opt.value}
                                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${settings.bookingMode === opt.value || (!settings.bookingMode && opt.value === 'whatsapp') ? 'border-[#0E2A38] bg-[#0E2A38]/5' : 'border-gray-100 hover:border-gray-200'}`}>
                                                    <input type="radio" name="bookingMode" value={opt.value}
                                                        checked={settings.bookingMode === opt.value || (!settings.bookingMode && opt.value === 'whatsapp')}
                                                        onChange={() => updateSetting('bookingMode', opt.value)}
                                                        className="mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                                                        <p className="text-[11px] text-gray-400">{opt.desc}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* External URL (shown when mode = external) */}
                                    {settings.bookingMode === 'external' && (
                                        <EditorInput label="External booking URL" value={settings.externalBookingUrl || ''} onChange={v => updateSetting('externalBookingUrl', v)} placeholder="https://zomato.com/your-restaurant/book" />
                                    )}

                                    {/* Operating Hours */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <EditorInput label="Opening time" value={settings.operatingHoursOpen || ''} onChange={v => updateSetting('operatingHoursOpen', v)} placeholder="12:00 PM" />
                                        <EditorInput label="Closing time" value={settings.operatingHoursClose || ''} onChange={v => updateSetting('operatingHoursClose', v)} placeholder="11:00 PM" />
                                    </div>

                                    {/* Price Range */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Price range</label>
                                        <div className="flex gap-2">
                                            {['₹', '₹₹', '₹₹₹', '₹₹₹₹'].map(range => (
                                                <button key={range} type="button"
                                                    onClick={() => updateSetting('priceRange', range)}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${(settings.priceRange || '₹₹') === range ? 'bg-[#0E2A38] text-white' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:border-gray-200'}`}>
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cuisine Type */}
                                    <EditorInput label="Cuisine type" value={settings.cuisineType || ''} onChange={v => updateSetting('cuisineType', v)} placeholder="South Indian Coastal" />
                                </div>
                            </SectionPanel>
                        )}

                        {/* CHEF'S SPECIALS (Restaurant/Combined only) */}
                        {(tenant?.business_type === 'restaurant' || tenant?.business_type === 'combined') && menuItemsList.length > 0 && (
                            <SectionPanel title="Chef's specials" icon={Star} isOpen={!!openSections.chefSpecials} onToggle={() => toggleOpen('chefSpecials')}
                                isVisible={true} onToggleVisibility={() => { }}>
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Toggle the items you want to highlight as chef's specials on your website.
                                    </p>
                                    {menuItemsList.map(item => (
                                        <div key={item.id} className={`rounded-lg border transition-all ${item.is_chef_special ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-3 p-2.5">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-base">{item.is_veg ? '🥬' : '🍗'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                                                    <span className="text-[10px] text-gray-400">₹{item.price}</span>
                                                </div>
                                                <button
                                                    onClick={() => toggleChefSpecial(item.id)}
                                                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${item.is_chef_special ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${item.is_chef_special ? 'left-5' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 flex items-start gap-2">
                                        <Star size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-700 leading-relaxed">
                                            {menuItemsList.filter(m => m.is_chef_special).length} of {menuItemsList.length} items marked as specials (max 6 shown on site).
                                        </p>
                                    </div>
                                </div>
                            </SectionPanel>
                        )}

                        {/* GALLERY (Restaurant/Combined only) */}
                        {(tenant?.business_type === 'restaurant' || tenant?.business_type === 'combined') && (
                            <SectionPanel title="Gallery" icon={Camera} isOpen={!!openSections.gallery} onToggle={() => toggleOpen('gallery')}
                                isVisible={true} onToggleVisibility={() => { }}>
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Upload photos of your food, interior, and ambience to showcase on your website.
                                    </p>
                                    {/* Upload button */}
                                    <label className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#0E2A38] hover:text-[#0E2A38] transition-colors cursor-pointer">
                                        {uploading === 'gallery' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                        {uploading === 'gallery' ? 'Uploading...' : 'Upload photo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleGalleryUpload(e.target.files[0])} />
                                    </label>
                                    {/* Gallery grid */}
                                    {galleryImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {galleryImages.map((img) => (
                                                <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                                                    <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => deleteGalleryImage(img)}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {galleryImages.length > 0 && (
                                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                                            <Camera size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                            <p className="text-[11px] text-blue-600 leading-relaxed">
                                                {galleryImages.length} photo{galleryImages.length !== 1 ? 's' : ''} in gallery. Photos appear in a masonry grid on your site.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </SectionPanel>
                        )}

                        {/* TESTIMONIALS */}
                        <SectionPanel title="Reviews & testimonials" icon={Quote} isOpen={!!openSections.testimonials} onToggle={() => toggleOpen('testimonials')}
                            isVisible={visibility.testimonials} onToggleVisibility={() => toggleVis('testimonials')}>
                            <button onClick={addTestimonial}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#0E2A38] hover:text-[#0E2A38] transition-colors">
                                <Plus size={14} /> Add review
                            </button>

                            {/* Google reviews link */}
                            <EditorInput label="Google reviews URL" value={settings.googleReviewUrl || ''}
                                onChange={v => updateSetting('googleReviewUrl', v)} placeholder="https://g.page/your-property/review" />

                            {testimonials.map((t, i) => (
                                <div key={t.id || i} className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Review {i + 1}</span>
                                        <button onClick={() => deleteTestimonial(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                    <input type="text" value={t.guest_name} onChange={e => updateTestimonial(i, 'guest_name', e.target.value)}
                                        placeholder="Guest name" className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#0E2A38]/30" />
                                    <input type="text" value={t.guest_location} onChange={e => updateTestimonial(i, 'guest_location', e.target.value)}
                                        placeholder="Location" className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#0E2A38]/30" />
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <button key={s} onClick={() => updateTestimonial(i, 'rating', s)}
                                                className={`transition-colors ${s <= t.rating ? 'text-amber-400' : 'text-gray-300'}`}>
                                                <Star size={14} className={s <= t.rating ? 'fill-amber-400' : ''} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea rows={2} value={t.review_text} onChange={e => updateTestimonial(i, 'review_text', e.target.value)}
                                        placeholder="Review text..." className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs outline-none resize-none focus:border-[#0E2A38]/30" />
                                </div>
                            ))}
                        </SectionPanel>

                        {/* ABOUT */}
                        <SectionPanel title="About" icon={Type} isOpen={!!openSections.about} onToggle={() => toggleOpen('about')}
                            isVisible={visibility.about} onToggleVisibility={() => toggleVis('about')}>
                            <EditorInput label="About your property" value={settings.aboutText || ''} onChange={v => updateSetting('aboutText', v)} multiline placeholder="Tell guests about your property..." />
                        </SectionPanel>

                        {/* CONTACT & LOCATION */}
                        <SectionPanel title="Contact & Location" icon={Phone} isOpen={!!openSections.contact} onToggle={() => toggleOpen('contact')}
                            isVisible={visibility.contact !== false} onToggleVisibility={() => toggleVis('contact')}>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Property Settings</h4>
                                    <div className="space-y-4">
                                        <EditorInput label="Property Public name" value={settings.hotelName || ''} onChange={v => updateSetting('hotelName', v)} placeholder={tenant?.business_name || 'Your Hotel Name'} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <EditorInput label="GST Rate (%)" value={settings.gstRate || ''} onChange={v => updateSetting('gstRate', v)} placeholder="18" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Contact Details</h4>
                                    <div className="space-y-4">
                                        <EditorInput label="Phone" value={settings.contactPhone || ''} onChange={v => updateSetting('contactPhone', v)} placeholder="+91 98765 43210" />
                                        <EditorInput label="Email" value={settings.contactEmail || ''} onChange={v => updateSetting('contactEmail', v)} placeholder="stay@your-property.com" />
                                        <EditorInput label="Address" value={settings.contactAddress || ''} onChange={v => updateSetting('contactAddress', v)} multiline placeholder="123 Beach Road, City, State" />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Location Badges</h4>
                                    <p className="text-[11px] text-gray-500 mb-4">Highlight nearby attractions or transit (e.g., Beach, Airport).</p>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <EditorInput label="Badge 1 Value" value={settings.locationStat1Value || ''} onChange={v => updateSetting('locationStat1Value', v)} placeholder="e.g. 600m" />
                                            <EditorInput label="Badge 1 Label" value={settings.locationStat1Label || ''} onChange={v => updateSetting('locationStat1Label', v)} placeholder="e.g. from Beach" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <EditorInput label="Badge 2 Value" value={settings.locationStat2Value || ''} onChange={v => updateSetting('locationStat2Value', v)} placeholder="e.g. 2km" />
                                            <EditorInput label="Badge 2 Label" value={settings.locationStat2Label || ''} onChange={v => updateSetting('locationStat2Label', v)} placeholder="e.g. from Town Center" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <EditorInput label="Badge 3 Value" value={settings.locationStat3Value || ''} onChange={v => updateSetting('locationStat3Value', v)} placeholder="e.g. 15 min" />
                                            <EditorInput label="Badge 3 Label" value={settings.locationStat3Label || ''} onChange={v => updateSetting('locationStat3Label', v)} placeholder="e.g. from Airport" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Google Maps Embed Link or Address</label>
                                    <p className="text-[11px] text-gray-400 mb-2">To display live Google Maps inside your site: Open Google Maps &rarr; Search your hotel &rarr; Click <strong>Share</strong> &rarr; Select <strong>Embed a map</strong> &rarr; Copy HTML and paste it here.</p>
                                    <input
                                        type="text"
                                        value={settings.googleMapsUrl || ''}
                                        onChange={e => updateSetting('googleMapsUrl', e.target.value)}
                                        placeholder="Paste Embed HTML (<iframe src=...) or Embed URL"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none transition-all"
                                    />
                                    <div className="mt-2 p-2.5 bg-gray-50 border border-gray-150 rounded-lg space-y-1">
                                        <p className="text-[10px] font-semibold text-gray-600">💡 Free 1-Click Embed Guide:</p>
                                        <ol className="text-[10px] text-gray-500 list-decimal pl-3.5 space-y-0.5">
                                            <li>Go to <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="underline text-primary">Google Maps</a> and search your property location.</li>
                                            <li>Click <strong>Share</strong> &rarr; <strong>Embed a map</strong> &rarr; Click <strong>COPY HTML</strong>.</li>
                                            <li>Paste the code into the input field above!</li>
                                        </ol>
                                    </div>
                                    {settings.googleMapsUrl && (
                                        <a href={settings.googleMapsUrl.startsWith('http') ? settings.googleMapsUrl : `https://www.google.com/maps/search/${encodeURIComponent(settings.googleMapsUrl)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#0E2A38] hover:underline font-medium">
                                            <MapPin size={11} /> Open location search on Google Maps
                                        </a>
                                    )}
                                </div>
                            </div>
                        </SectionPanel>

                        {/* ═══ DESIGN & BRANDING ═══ */}
                        <SectionPanel title="Design & Branding" icon={Palette} isOpen={!!openSections.design} onToggle={() => toggleOpen('design')}
                            isVisible={true} onToggleVisibility={() => { }}>
                            <div className="space-y-5">

                                {/* Color pickers */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Brand colours</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-1.5">Primary colour</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={settings.primary_color || '#0E2A38'}
                                                    onChange={e => updateSetting('primary_color', e.target.value)}
                                                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    value={settings.primary_color || '#0E2A38'}
                                                    onChange={e => updateSetting('primary_color', e.target.value)}
                                                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                                                    placeholder="#0E2A38"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-1.5">Accent colour</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={settings.accent_color || '#C9A646'}
                                                    onChange={e => updateSetting('accent_color', e.target.value)}
                                                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    value={settings.accent_color || '#C9A646'}
                                                    onChange={e => updateSetting('accent_color', e.target.value)}
                                                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                                                    placeholder="#C9A646"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preset palettes */}
                                    <div className="mt-3">
                                        <p className="text-[11px] text-gray-400 mb-2">Quick palettes</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { name: 'Ocean', primary: '#0E2A38', accent: '#C9A646' },
                                                { name: 'Forest', primary: '#1B4332', accent: '#95D5B2' },
                                                { name: 'Coral', primary: '#C0392B', accent: '#F39C12' },
                                                { name: 'Indigo', primary: '#312E81', accent: '#A78BFA' },
                                                { name: 'Rose', primary: '#881337', accent: '#FDA4AF' },
                                                { name: 'Slate', primary: '#1E293B', accent: '#38BDF8' },
                                            ].map(p => (
                                                <button
                                                    key={p.name}
                                                    onClick={() => { updateSetting('primary_color', p.primary); updateSetting('accent_color', p.accent); }}
                                                    title={p.name}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors text-[10px] font-semibold text-gray-600 bg-white"
                                                >
                                                    <span className="flex gap-0.5">
                                                        <span className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                                                        <span className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
                                                    </span>
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Font family */}
                                <div className="border-t border-gray-100 pt-4">
                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Font family</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { value: 'inter', label: 'Inter', desc: 'Clean & modern' },
                                            { value: 'playfair', label: 'Playfair Display', desc: 'Elegant & serif' },
                                            { value: 'poppins', label: 'Poppins', desc: 'Friendly & rounded' },
                                            { value: 'merriweather', label: 'Merriweather', desc: 'Editorial & refined' },
                                            { value: 'montserrat', label: 'Montserrat', desc: 'Bold & geometric' },
                                            { value: 'lora', label: 'Lora', desc: 'Warm & literary' },
                                        ].map(font => (
                                            <label
                                                key={font.value}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                                    (settings.fontFamily || 'inter') === font.value
                                                        ? 'border-[#0E2A38] bg-[#0E2A38]/5'
                                                        : 'border-gray-100 hover:border-gray-200 bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="fontFamily"
                                                    value={font.value}
                                                    checked={(settings.fontFamily || 'inter') === font.value}
                                                    onChange={() => updateSetting('fontFamily', font.value)}
                                                    className="shrink-0"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900">{font.label}</p>
                                                    <p className="text-[10px] text-gray-400">{font.desc}</p>
                                                </div>
                                                <span
                                                    className="text-xs text-gray-500 font-bold"
                                                    style={{
                                                        fontFamily: (font.value === 'playfair' || font.value === 'merriweather' || font.value === 'lora')
                                                            ? 'Georgia, serif' : 'system-ui, sans-serif'
                                                    }}
                                                >Aa</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Button style */}
                                <div className="border-t border-gray-100 pt-4">
                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Button style</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'rounded', label: 'Rounded', cls: 'rounded-lg' },
                                            { value: 'pill', label: 'Pill', cls: 'rounded-full' },
                                            { value: 'square', label: 'Square', cls: 'rounded-none' },
                                        ].map(style => (
                                            <button
                                                key={style.value}
                                                onClick={() => updateSetting('buttonStyle', style.value)}
                                                className={`py-2 text-xs font-semibold border transition-all ${style.cls} ${
                                                    (settings.buttonStyle || 'rounded') === style.value
                                                        ? 'bg-[#0E2A38] text-white border-[#0E2A38]'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                                }`}
                                            >
                                                {style.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Info note */}
                                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                                    <Sliders size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-blue-700 leading-relaxed">
                                        Colour and font changes apply site-wide. Hit <strong>Publish changes</strong> to make them live.
                                    </p>
                                </div>
                            </div>
                        </SectionPanel>

                    </div>
                </div>

                {/* RIGHT: live preview */}
                <div className="flex-1 bg-[#E8E8E8] overflow-hidden flex items-start justify-center p-6">
                    <div
                        className="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-500 h-full"
                        style={{ width: previewWidths[previewDevice], maxWidth: '100%' }}
                    >
                        <iframe
                            ref={iframeRef}
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title="Website preview"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
