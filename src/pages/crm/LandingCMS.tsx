import React, { useState } from 'react';
import { Save, Image as ImageIcon, Check, Building, Globe, MessageSquare, Phone, MapPin, Plus, X } from 'lucide-react';
import { useCRM, PageContent } from '../../context/CRMDataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, setForceFreshToken } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import WhatsAppSettings from '../../components/crm/WhatsAppSettings';

export default function LandingCMS() {
    const { pageContent, updatePageContent } = useCRM();
    const { tenant } = useAuth();
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'contact' | 'attractions' | 'whatsapp'>('hero');

    // Nearby Attractions state
    const [attractionsList, setAttractionsList] = useState<string[]>([]);
    const [attractionInput, setAttractionInput] = useState('');
    const [savingAttractions, setSavingAttractions] = useState(false);

    // Load existing attractions from cms_settings on mount
    useState(() => {
        if (!tenant?.id) return;
        supabase.from('cms_settings').select('setting_value').eq('tenant_id', tenant.id).eq('setting_key', 'nearby_attractions').maybeSingle().then(({ data }) => {
            if (data?.setting_value) {
                try { setAttractionsList(JSON.parse(data.setting_value)); } catch {}
            }
        });
    });

    const addAttraction = () => {
        const val = attractionInput.trim();
        if (!val || attractionsList.includes(val)) return;
        setAttractionsList(prev => [...prev, val]);
        setAttractionInput('');
    };

    const removeAttraction = (name: string) => setAttractionsList(prev => prev.filter(a => a !== name));

    const saveAttractions = async () => {
        if (!tenant?.id) return;
        setSavingAttractions(true);
        await supabase.from('cms_settings').upsert({
            tenant_id: tenant.id,
            setting_key: 'nearby_attractions',
            setting_value: JSON.stringify(attractionsList)
        }, { onConflict: 'tenant_id,setting_key' });
        setSavingAttractions(false);
        toast.success('Nearby attractions saved');
    };

    // Helper to get current content value safely
    const getContent = (section: string, key: string, field: 'content_text' | 'image_url' = 'content_text') => {
        const block = pageContent.find(p => p.section === section && p.block_key === key);
        return block ? block[field] : '';
    };

    // Local state for editing fields
    const [heroTitle, setHeroTitle] = useState(getContent('hero', 'title') || `Welcome to ${tenant?.business_name || 'Our Resort'}`);
    const [heroSubtitle, setHeroSubtitle] = useState(getContent('hero', 'subtitle') || 'Experience Tranquility & Comfort');
    const [heroBtn, setHeroBtn] = useState(getContent('hero', 'button_text') || 'Book Your Stay');

    const [aboutHeading, setAboutHeading] = useState(getContent('about', 'heading') || 'Your Home by the Sea');
    const [aboutBody, setAboutBody] = useState(getContent('about', 'body') || `${tenant?.business_name || 'Our Resort'} is a peaceful retreat...`);

    const [contactEmail, setContactEmail] = useState(getContent('contact', 'email') || '');
    const [contactPhone, setContactPhone] = useState(getContent('contact', 'phone') || '');
    const [contactWhatsapp, setContactWhatsapp] = useState(getContent('contact', 'whatsapp') || '');
    const [contactAddress, setContactAddress] = useState(getContent('contact', 'address') || '');

    const handleSaveSection = (section: string) => {
        if (section === 'hero') {
            updatePageContent('hero', 'title', { content_text: heroTitle });
            updatePageContent('hero', 'subtitle', { content_text: heroSubtitle });
            updatePageContent('hero', 'button_text', { content_text: heroBtn });
        } else if (section === 'about') {
            updatePageContent('about', 'heading', { content_text: aboutHeading });
            updatePageContent('about', 'body', { content_text: aboutBody });
        } else if (section === 'contact') {
            updatePageContent('contact', 'email', { content_text: contactEmail });
            updatePageContent('contact', 'phone', { content_text: contactPhone });
            updatePageContent('contact', 'whatsapp', { content_text: contactWhatsapp });
            updatePageContent('contact', 'address', { content_text: contactAddress });
        }
        toast.success(`${section.toUpperCase()} section saved`);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: string, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const blockId = `${section}-${key}`;
        setIsUploading(blockId);
        const toastId = toast.loading('Uploading image...');

        try {
            const ext = file.name.split('.').pop();
            const filePath = `${tenant?.id}/${section}-${key}-${Date.now()}.${ext}`;

            setForceFreshToken(true);
            const { error } = await supabase.storage.from('site-assets').upload(filePath, file, { upsert: true });
            setForceFreshToken(false);
            if (error) {
                toast.error('Upload failed: ' + error.message, { id: toastId });
                return;
            }

            const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            updatePageContent(section, key, { image_url: data.publicUrl });
            toast.success('Image updated successfully', { id: toastId });
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Network error during upload', { id: toastId });
        } finally {
            setIsUploading(null);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-serif font-bold text-[#0E2A38]">Landing Page CMS</h1>
                <p className="text-gray-500 mt-1">Control the text and images displayed on the main website.</p>
            </div>

            <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto rounded-t-2xl">
                <button
                    onClick={() => setActiveTab('hero')}
                    className={`px-4 py-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${activeTab === 'hero' ? 'border-[#0E2A38] text-[#0E2A38]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Globe size={18} /> Hero Banner
                </button>
                <button
                    onClick={() => setActiveTab('about')}
                    className={`px-4 py-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${activeTab === 'about' ? 'border-[#0E2A38] text-[#0E2A38]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Building size={18} /> About Section
                </button>
                <button
                    onClick={() => setActiveTab('contact')}
                    className={`px-4 py-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${activeTab === 'contact' ? 'border-[#0E2A38] text-[#0E2A38]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Phone size={18} /> Contact Info
                </button>
                <button
                    onClick={() => setActiveTab('attractions')}
                    className={`px-4 py-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${activeTab === 'attractions' ? 'border-[#0E2A38] text-[#0E2A38]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <MapPin size={18} /> Nearby Spots
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`px-4 py-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${activeTab === 'whatsapp' ? 'border-[#0E2A38] text-[#0E2A38]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <MessageSquare size={18} /> WhatsApp
                </button>
            </div>

            {/* Hero Section settings */}
            {activeTab === 'hero' && (
                <section className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold font-serif text-[#0E2A38]">Hero Section</h2>
                        <button
                            onClick={() => handleSaveSection('hero')}
                            className="flex items-center gap-2 bg-[#0E2A38] text-[#C9A646] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#091b24] transition-colors"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Main Title</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none"
                                    value={heroTitle}
                                    onChange={(e) => setHeroTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Subtitle</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none"
                                    value={heroSubtitle}
                                    onChange={(e) => setHeroSubtitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Button Text</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none"
                                    value={heroBtn}
                                    onChange={(e) => setHeroBtn(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Hero Background Image</label>
                            <div className="relative aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group">
                                {getContent('hero', 'bgImage', 'image_url') ? (
                                    <img src={getContent('hero', 'bgImage', 'image_url')} className="w-full h-full object-cover" alt="Hero background" />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="text-gray-400 mx-auto mb-2" size={32} />
                                        <p className="text-sm font-medium text-gray-500">No image uploaded</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <label className="cursor-pointer bg-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg text-gray-800 flex items-center gap-2 hover:bg-gray-100">
                                        <ImageIcon size={16} /> {isUploading === 'hero-bgImage' ? 'Uploading...' : 'Change Image'}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'hero', 'bgImage')} disabled={isUploading === 'hero-bgImage'} />
                                    </label>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Recommended size: 1920x1080px (Darkened automatically in UI)</p>
                        </div>
                    </div>
                </section>
            )}

            {/* About Section settings */}
            {activeTab === 'about' && (
                <section className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold font-serif text-[#0E2A38]">About Section</h2>
                        <button
                            onClick={() => handleSaveSection('about')}
                            className="flex items-center gap-2 bg-[#0E2A38] text-[#C9A646] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#091b24] transition-colors"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Section Heading</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none"
                                    value={aboutHeading}
                                    onChange={(e) => setAboutHeading(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">About Body Text</label>
                                <textarea
                                    rows={5}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none resize-none"
                                    value={aboutBody}
                                    onChange={(e) => setAboutBody(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">About Image</label>
                            <div className="relative aspect-square md:aspect-auto md:h-[220px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group">
                                {getContent('about', 'aboutImage', 'image_url') ? (
                                    <img src={getContent('about', 'aboutImage', 'image_url')} className="w-full h-full object-cover" alt="About Resort" />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="text-gray-400 mx-auto mb-2" size={32} />
                                        <p className="text-sm font-medium text-gray-500">No image uploaded</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <label className="cursor-pointer bg-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg text-gray-800 flex items-center gap-2 hover:bg-gray-100">
                                        <ImageIcon size={16} /> {isUploading === 'about-aboutImage' ? 'Uploading...' : 'Change Image'}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'about', 'aboutImage')} disabled={isUploading === 'about-aboutImage'} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Contact Info Section */}
            {activeTab === 'contact' && (
                <section className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold font-serif text-[#0E2A38]">Contact Information</h2>
                        <button
                            onClick={() => handleSaveSection('contact')}
                            className="flex items-center gap-2 bg-[#0E2A38] text-[#C9A646] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#091b24] transition-colors"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Public Email Address</label>
                                <input
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none transition-all"
                                    placeholder={`e.g. hello@${tenant?.business_name?.toLowerCase().replace(/\s+/g, '') || 'hotel'}.com`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Public Phone Number</label>
                                <input
                                    type="tel"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none transition-all"
                                    placeholder="e.g. +91 98765 43210"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">WhatsApp Number</label>
                                <input
                                    type="tel"
                                    value={contactWhatsapp}
                                    onChange={(e) => setContactWhatsapp(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none transition-all"
                                    placeholder="e.g. +91 98765 43210 (Defaults to Phone)"
                                />
                                <p className="text-xs text-gray-400 mt-1">Used for the "Order via WhatsApp" button.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Physical Address</label>
                            <textarea
                                rows={2}
                                value={contactAddress}
                                onChange={(e) => setContactAddress(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none transition-all resize-none"
                                placeholder="Enter the full physical address..."
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* WhatsApp Settings Section */}
            {activeTab === 'whatsapp' && (
                <section className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-xl font-bold font-serif text-[#0E2A38]">WhatsApp Automation</h2>
                        <p className="text-sm text-gray-500 mt-1">Configure automated messages for bookings and reviews.</p>
                    </div>

                    <div className="p-6">
                        <WhatsAppSettings />
                    </div>
                </section>
            )}

            {/* Nearby Attractions Section */}
            {activeTab === 'attractions' && (
                <section className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold font-serif text-[#0E2A38]">Nearby Spots &amp; Tourist Destinations</h2>
                            <p className="text-sm text-gray-500 mt-0.5">These appear on your property's booking page to help guests plan their visit.</p>
                        </div>
                        <button
                            onClick={saveAttractions}
                            disabled={savingAttractions}
                            className="flex items-center gap-2 bg-[#0E2A38] text-[#C9A646] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#091b24] transition-colors disabled:opacity-50"
                        >
                            <Save size={16} /> {savingAttractions ? 'Saving...' : 'Save'}
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Add new spot input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={attractionInput}
                                onChange={e => setAttractionInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttraction(); } }}
                                placeholder="e.g. Auroville Beach, Matrimandir, French Quarter..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C9A646] outline-none text-sm"
                            />
                            <button
                                onClick={addAttraction}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#C9A646] text-[#0E2A38] rounded-xl font-bold text-sm hover:bg-[#b8953e] transition-colors"
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>

                        {/* Chip list */}
                        {attractionsList.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {attractionsList.map(name => (
                                    <span
                                        key={name}
                                        className="inline-flex items-center gap-1.5 bg-[#0E2A38]/5 border border-[#0E2A38]/10 text-[#0E2A38] text-xs font-semibold px-3 py-1.5 rounded-xl"
                                    >
                                        <MapPin size={11} className="text-[#C9A646]" />
                                        {name}
                                        <button onClick={() => removeAttraction(name)} className="text-gray-400 hover:text-red-500 transition-colors ml-1">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                                <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400">No attractions added yet. Add nearby beaches, temples, markets, or tourist spots above.</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

        </div>
    );
}
