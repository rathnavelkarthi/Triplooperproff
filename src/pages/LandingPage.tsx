import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import TripPlannerWizard from '../components/tripPlanner/TripPlannerWizard';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';
import { 
  ArrowRight, Play, ChevronRight, Star, Clock, 
  Percent, ArrowUpRight, Sparkles, Zap, Shield, 
  Check, MessageSquare, Coffee, Layers, Users, 
  BedDouble, ClipboardList, Waypoints, Calculator, 
  Smartphone, BarChart3, Database, Menu, X, CheckCircle2,
  MapPin, Activity, TrendingUp, Bot, Calendar, Hotel,
  Laptop, ShoppingCart, DollarSign, ArrowDown, HelpCircle,
  RefreshCw, LaptopIcon, Heart, Search, ChevronDown, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

// Inject luxury fonts and bespoke design system styles
const masterStyles = `
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 100px;
  }

  .font-playfair {
    font-family: 'Playfair Display', Georgia, serif;
  }

  /* Body face unified with the rest of the app (Plus Jakarta Sans).
     Class name kept as .font-inter to avoid churning every call site. */
  .font-inter {
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  }

  .noise-grain {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    content: "";
    opacity: 0.02;
    z-index: 999;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  /* Ken Burns luxury zoom */
  @keyframes kenburns {
    0% { transform: scale(1) translate(0, 0); }
    50% { transform: scale(1.08) translate(-1%, -0.5%); }
    100% { transform: scale(1) translate(0, 0); }
  }
  .animate-kenburns {
    animation: kenburns 45s ease-in-out infinite;
  }

  /* Paper texture overlay style */
  .luxury-paper-bg {
    background-color: #FDFBF7;
    background-image: radial-gradient(circle at 50% 50%, rgba(253, 251, 247, 0.75) 0%, rgba(250, 249, 246, 1) 100%);
    position: relative;
  }
  .luxury-paper-bg::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.015;
    pointer-events: none;
    z-index: 1;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  /* Luxury inputs & glass styling */
  .glassmorphic-search {
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1.5px solid rgba(201, 166, 70, 0.35);
    box-shadow: 0 30px 70px rgba(14, 42, 56, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .glassmorphic-search:hover {
    border-color: rgba(201, 166, 70, 0.55);
    box-shadow: 0 35px 80px rgba(14, 42, 56, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.75);
  }
  .search-input-group {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .search-input-group:focus-within {
    background: rgba(201, 166, 70, 0.04);
  }

  .nav-link {
    position: relative;
    transition: color 0.3s ease;
  }
  .nav-link::after {
    content: '';
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 1px;
    bottom: -4px;
    left: 0;
    background-color: #C9A646;
    transform-origin: bottom right;
    transition: transform 0.25s ease-out;
  }
  .nav-link:hover::after {
    transform: scaleX(1);
    transform-origin: bottom left;
  }

  /* Custom styling for inputs */
  .luxury-slider {
    -webkit-appearance: none;
    width: 100%;
    background: transparent;
  }
  .luxury-slider:focus {
    outline: none;
  }
  .luxury-slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 3px;
    cursor: pointer;
    background: rgba(14, 42, 56, 0.1);
    border-radius: 2px;
  }
  .luxury-slider::-webkit-slider-thumb {
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: #0E2A38;
    border: 2px solid #C9A646;
    cursor: pointer;
    -webkit-appearance: none;
    margin-top: -5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    transition: transform 0.1s ease;
  }
  .luxury-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  /* Grid styles */
  .grid-light-sand {
    background-image: linear-gradient(to right, rgba(197, 168, 128, 0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(197, 168, 128, 0.06) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  /* Hide scrollbars */
  .no-scrollbars::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbars {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll parameters for parallax sequence
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Inject Styles on mounting
  useEffect(() => {
    const sheet = document.createElement('style');
    sheet.innerHTML = masterStyles;
    document.head.appendChild(sheet);
    return () => {
      document.head.removeChild(sheet);
    };
  }, []);

  // 20+ Real-looking Property Cards for Live Property Marketplace
  const initialProperties = [
    { id: 1, name: "Anya Paradise", loc: "Pondicherry", type: "Luxury Beach Villa", price: 6500, rating: "4.95", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80", tag: "Beachfront", subdomain: "anyaparadise" },
    { id: 2, name: "Coolspot Cottage", loc: "Ooty", type: "Heritage Mountain Retreat", price: 4200, rating: "4.89", image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80", tag: "Mountain View", subdomain: "coolspot-cottage" },
    { id: 3, name: "Jayam Castle", loc: "Yercaud", type: "Boutique Forest Lodge", price: 3800, rating: "4.90", image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80", tag: "Forest Edge", subdomain: "jayam-castle" },
    { id: 4, name: "Green Apple Property", loc: "Madurai", type: "Premium Stay", price: 3500, rating: "4.85", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", tag: "City Center", subdomain: "green-apple-property" },
    { id: 5, name: "Carvery Residency", loc: "Pondicherry", type: "French Quarter Inn", price: 5800, rating: "4.92", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", tag: "Heritage Quarter", subdomain: "carvery-residency" },
    { id: 6, name: "Royal Park", loc: "Chennai", type: "Executive Suite", price: 7200, rating: "4.88", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", tag: "Premium Suite", subdomain: "royal-park" },
    { id: 7, name: "Solitude Beach House", loc: "Pondicherry", type: "Private Beachfront Villa", price: 12000, rating: "4.98", image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80", tag: "Beachfront" },
    { id: 8, name: "Verdant Valley Resort", loc: "Kodaikanal", type: "Hillside Plantation Villa", price: 9500, rating: "4.94", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", tag: "Mountain View" },
    { id: 9, name: "Golden Crest Bistro & Inn", loc: "Ooty", type: "Boutique Farmhouse", price: 6000, rating: "4.91", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80", tag: "Eco Stays" },
    { id: 10, name: "Moongil Illam Cottage", loc: "Pondicherry", type: "Bamboo Design Villa", price: 5200, rating: "4.87", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", tag: "Eco Stays", subdomain: "moongil-illam-cottage" },
    { id: 11, name: "Nest N Rest Cottage", loc: "Ooty", type: "Cozy Wood Cabin", price: 3900, rating: "4.83", image: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&q=80", tag: "Mountain View", subdomain: "nest-n-rest-cottage" },
    { id: 12, name: "Pineapple Nest", loc: "Coimbatore", type: "Modern Loft Stay", price: 4000, rating: "4.86", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", tag: "City Center", subdomain: "pineapple-nest" },
    { id: 13, name: "Sai Residency", loc: "Ooty", type: "Classic Hill Cottage", price: 4500, rating: "4.93", image: "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&q=80", tag: "Mountain View", subdomain: "sai-residency" },
    { id: 14, name: "Coral Reef Resort", loc: "Pondicherry", type: "Coastal Luxury Stay", price: 10500, rating: "4.96", image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&q=80", tag: "Beachfront" },
    { id: 15, name: "Emerald Glade Villa", loc: "Yercaud", type: "Orchard Manor", price: 8000, rating: "4.92", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", tag: "Eco Stays" },
    { id: 16, name: "Whispering Pines", loc: "Kodaikanal", type: "Pine Ridge Cabin", price: 5500, rating: "4.89", image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80", tag: "Mountain View" },
    { id: 17, name: "Pondy Heights", loc: "Pondicherry", type: "Rooftop Pool Penthouse", price: 6800, rating: "4.88", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80", tag: "Heritage Quarter" },
    { id: 18, name: "Hilltop Sanctuary", loc: "Ooty", type: "Vintage Estate Bungalow", price: 11000, rating: "4.97", image: "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=800&q=80", tag: "Mountain View" },
    { id: 19, name: "Kaveri Breeze Hotel", loc: "Tiruchirappalli", type: "Boutique Riverside Stay", price: 3900, rating: "4.84", image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80", tag: "Heritage Quarter" },
    { id: 20, name: "Silver Linings Villa", loc: "Coimbatore", type: "Luxury Foothill Villa", price: 8500, rating: "4.91", image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80", tag: "Eco Stays" }
  ];

  const [propertiesList, setPropertiesList] = useState<any[]>(initialProperties);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All Stays");
  const [activeDestinationFilter, setActiveDestinationFilter] = useState("All Destinations");
  const [searchDestination, setSearchDestination] = useState("");
  const [likes, setLikes] = useState<Record<number | string, boolean>>({});

  useEffect(() => {
    async function loadRealProperties() {
      try {
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, business_name, subdomain, business_type, hero_image_url, city')
          .eq('is_active', true)
          .eq('verification_status', 'approved');

        if (tenantsError) throw tenantsError;
        if (!tenantsData || tenantsData.length === 0) return;

        const { data: testimonialsData } = await supabase
          .from('testimonials')
          .select('tenant_id, rating');

        const { data: roomsData } = await supabase
          .from('rooms')
          .select('tenant_id, price_per_night, type')
          .eq('is_available', true);

        const tenantRooms: Record<string, typeof roomsData> = {};
        roomsData?.forEach(r => {
          if (!tenantRooms[r.tenant_id]) tenantRooms[r.tenant_id] = [];
          tenantRooms[r.tenant_id].push(r);
        });

        const tenantRatings: Record<string, number[]> = {};
        testimonialsData?.forEach(t => {
          if (!tenantRatings[t.tenant_id]) tenantRatings[t.tenant_id] = [];
          tenantRatings[t.tenant_id].push(t.rating);
        });

        const realProps = tenantsData.map((t, index) => {
          const ratings = tenantRatings[t.id] || [];
          const avgRating = ratings.length > 0
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
            : (4.7 + (index * 0.05) % 0.3).toFixed(2);

          const rooms = tenantRooms[t.id] || [];
          const minPrice = rooms.length > 0
            ? Math.min(...rooms.map(r => Number(r.price_per_night)))
            : 3500 + (index * 500) % 3000;

          const roomTypes = rooms.map(r => r.type).filter(Boolean);
          const typeLabel = roomTypes[0] || (t.business_type === 'restaurant' ? 'Boutique Bistro' : 'Premium Residency');
          
          const tags = ['Beachfront', 'Mountain View', 'Forest Edge', 'City Center', 'Eco Stays'];
          const tag = tags[index % tags.length];

          return {
            id: t.id,
            name: t.business_name,
            loc: t.city || 'India',
            type: typeLabel,
            price: minPrice,
            rating: avgRating,
            image: t.hero_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
            tag: tag,
            subdomain: t.subdomain
          };
        });

        realProps.sort((a, b) => Number(b.rating) - Number(a.rating));
        setPropertiesList(realProps);
      } catch (err) {
        console.error('Failed to load real properties:', err);
      }
    }
    loadRealProperties();
  }, []);

  const toggleLike = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProperties = useMemo(() => {
    return propertiesList.filter(p => {
      const matchCategory = activeCategoryFilter === "All Stays" || p.tag === activeCategoryFilter;
      const matchDestination = activeDestinationFilter === "All Destinations" || p.loc.toLowerCase() === activeDestinationFilter.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(searchDestination.toLowerCase()) || p.loc.toLowerCase().includes(searchDestination.toLowerCase());
      return matchCategory && matchDestination && matchSearch;
    });
  }, [propertiesList, activeCategoryFilter, activeDestinationFilter, searchDestination]);
  return (
    <div 
      ref={containerRef}
      className="font-inter bg-[#FDFBF7] text-[#0A1612] min-h-screen antialiased selection:bg-[#C9A646] selection:text-white overflow-x-hidden"
    >
      <Helmet>
        <title>Triplooper — All-in-One Hotel & Restaurant Management Platform</title>
        <meta name="description" content="Manage your hotel or restaurant from one system. Direct booking engine, POS, room inventory, billing, guest WhatsApp portal, and analytics — all connected in real time." />
        <link rel="canonical" href="https://triplooper.com/" />
        
        {/* OpenGraph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Triplooper" />
        <meta property="og:title" content="Triplooper — All-in-One Hotel & Restaurant Management Platform" />
        <meta property="og:description" content="Manage your hotel or restaurant from one system. Direct booking engine, POS, room inventory, billing, guest WhatsApp portal, and analytics." />
        <meta property="og:url" content="https://triplooper.com/" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Triplooper — All-in-One Hotel & Restaurant Management Platform" />
        <meta name="twitter:description" content="Manage your hotel or restaurant from one system. Direct booking engine, POS, room inventory, billing, guest WhatsApp portal, and analytics." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80" />

        {/* Geographic / Local SEO Metadata */}
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Chennai, Tamil Nadu, India" />
        <meta name="geo.position" content="13.0827;80.2707" />
        <meta name="ICBM" content="13.0827, 80.2707" />

        {/* JSON-LD Structured Data for Search & Generative Engine Optimization (GEO) */}
        <script type="application/ld+json">{JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Triplooper",
            "operatingSystem": "Web, iOS, Android",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Hospitality Management System",
            "url": "https://triplooper.com",
            "description": "All-in-One Hotel & Restaurant Management Platform featuring direct booking engine, POS, room inventory, billing, guest WhatsApp portal, and analytics.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "INR"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Triplooper",
            "url": "https://triplooper.com",
            "logo": "https://triplooper.com/logo.png"
          }
        ])}</script>
      </Helmet>

      <div className="noise-grain" />

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <nav className="fixed top-4 left-4 right-4 md:left-6 md:right-6 bg-[#FDFBF7]/80 backdrop-blur-xl border border-[#C9A646]/20 z-50 transition-all duration-500 rounded-3xl shadow-[0_15px_40px_rgba(11,59,43,0.06)] max-w-7xl mx-auto">
        <div className="px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-2 group">
              <span className="font-playfair text-xl font-bold tracking-widest text-[#C9A646]">
                TRIPLOOPER
              </span>
            </a>
            
            <div className="hidden md:flex items-center gap-8 text-[11px] font-bold tracking-widest text-[#0E2A38]/75 uppercase">
              <a href="#marketplace" className="nav-link hover:text-[#C9A646] transition-colors">MARKETPLACE</a>
              <a href="#categories" className="nav-link hover:text-[#C9A646] transition-colors">CATEGORIES</a>
              <a href="#why-switch" className="nav-link hover:text-[#C9A646] transition-colors">OWNER STORY</a>
              <a href="#os-diagram" className="nav-link hover:text-[#C9A646] transition-colors">THE PLATFORM</a>
              <a href="#india-network" className="nav-link hover:text-[#C9A646] transition-colors">OUR NETWORK</a>
              <a href="#pricing" className="nav-link hover:text-[#C9A646] transition-colors">PRICING</a>
              <button onClick={() => navigate('/my-stays')} className="nav-link hover:text-[#C9A646] transition-colors text-left uppercase font-bold tracking-widest text-[11px]">MY STAYS</button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5">
            <button 
              onClick={() => navigate('/admin/login')}
              className="text-[11px] font-bold tracking-widest uppercase text-[#0E2A38]/75 hover:text-[#C9A646] transition-colors px-3 py-2"
            >
              SIGN IN
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-[#0E2A38] hover:bg-[#123545] text-white font-bold text-[11px] tracking-widest uppercase px-6 py-3 rounded-xl transition-all shadow-md shadow-[#0E2A38]/10 active:scale-95 flex items-center gap-2 border border-[#C9A646]/10"
            >
              <span>JOIN TRIPLOOPER</span>
              <ArrowRight size={12} className="text-[#C9A646]" />
            </button>
          </div>

          <button 
            className="md:hidden text-[#0E2A38]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed inset-x-4 top-24 bg-[#FDFBF7]/95 backdrop-blur-xl border border-[#C9A646]/20 z-40 p-6 flex flex-col gap-6 rounded-3xl shadow-xl"
          >
            <a href="#marketplace" onClick={() => setMobileMenuOpen(false)} className="text-[#0E2A38] font-bold text-lg">Marketplace</a>
            <a href="#categories" onClick={() => setMobileMenuOpen(false)} className="text-[#0E2A38] font-bold text-lg">Categories</a>
            <a href="#why-switch" onClick={() => setMobileMenuOpen(false)} className="text-[#0E2A38] font-bold text-lg">Owner Story</a>
            <a href="#os-diagram" onClick={() => setMobileMenuOpen(false)} className="text-[#0E2A38] font-bold text-lg">The Platform</a>
            <a href="#india-network" onClick={() => setMobileMenuOpen(false)} className="text-[#0E2A38] font-bold text-lg">Our Network</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[#0E2A38] font-bold text-lg">Pricing</a>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/my-stays'); }} className="text-[#0E2A38] font-bold text-lg text-left">My Stays</button>
            
            <div className="h-px bg-[#C9A646]/10 my-1" />
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/admin/login'); }}
                className="w-full text-center py-3 text-[#0E2A38] font-bold border border-[#C9A646]/20 rounded-xl"
              >
                SIGN IN
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                className="w-full text-center py-3 bg-[#0E2A38] text-white font-extrabold rounded-xl"
              >
                JOIN TRIPLOOPER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO SECTION (Cinematic resort dream + search) ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#FAF9F6]">
        {/* Drone luxury stay backdrop */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=90" 
            alt="Luxury Maldives Stays" 
            className="w-full h-full object-cover opacity-85 animate-kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-[#FAF9F6]/20 to-[#FAF9F6]/10" />
          <div className="absolute inset-0 bg-black/15" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A646]/40 bg-[#FDFBF7]/90 text-[#0E2A38] text-[10px] font-bold tracking-widest uppercase shadow-sm font-mono"
          >
            <Award size={13} className="text-[#C9A646]" />
            Hospitality Commerce Operating System
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-playfair text-4xl sm:text-6xl lg:text-7xl font-semibold text-white leading-[1.08] tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          >
            Explore & book <span className="italic font-playfair font-normal text-[#FAF9F6] drop-shadow-md">boutique stays</span> <br />
            directly from <span className="italic font-playfair font-normal text-[#C9A646] drop-shadow-md">local hosts.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[#FAF9F6] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-light font-inter"
          >
            Find curated hotels, cottages, and villas across India. Secure direct checkout guaranteed.
          </motion.p>

          {/* Button row for Book Stays and Join Triplooper */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <a 
              href="#marketplace"
              className="bg-[#C9A646] hover:bg-[#b08b47] text-[#0E2A38] font-extrabold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-[#C9A646]/10"
            >
              <Search size={14} className="text-[#0E2A38]" />
              <span>Book a Stay</span>
            </a>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl transition-all backdrop-blur-md border border-white/20 active:scale-95 flex items-center gap-2"
            >
              <span>Join Triplooper (Host Stays)</span>
              <ArrowRight size={14} className="text-[#C9A646]" />
            </button>
          </motion.div>

          {/* Booking.com/Agoda-style High-Density Search Console */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-5xl mx-auto glassmorphic-search rounded-[28px] p-3 grid grid-cols-1 md:grid-cols-12 gap-3 text-left items-center relative font-inter"
          >
            {/* Destination */}
            <div className="p-3 border-b md:border-b-0 md:border-r border-[#C9A646]/10 md:col-span-4 search-input-group rounded-2xl hover:bg-white/40">
              <span className="text-[9px] uppercase tracking-[0.1em] font-extrabold text-[#C9A646] block mb-1">Destination</span>
              <div className="flex items-center gap-2">
                <Search size={14} className="text-[#0E2A38] shrink-0" />
                <input 
                  type="text" 
                  placeholder="Where are you going?" 
                  value={searchDestination}
                  onChange={e => setSearchDestination(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#0E2A38] placeholder-zinc-400 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Check In */}
            <div className="p-3 border-b md:border-b-0 md:border-r border-[#C9A646]/10 md:col-span-2 search-input-group rounded-2xl hover:bg-white/40">
              <span className="text-[9px] uppercase tracking-[0.1em] font-extrabold text-[#C9A646] block mb-1 font-mono">Check In</span>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#0E2A38] shrink-0" />
                <input 
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={checkIn}
                  onChange={e => {
                    setCheckIn(e.target.value);
                    const nextDay = new Date(e.target.value);
                    nextDay.setDate(nextDay.getDate() + 1);
                    if (new Date(checkOut) <= new Date(e.target.value)) {
                      setCheckOut(nextDay.toISOString().split('T')[0]);
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-[#0E2A38] focus:outline-none w-full cursor-pointer"
                />
              </div>
            </div>

            {/* Check Out */}
            <div className="p-3 border-b md:border-b-0 md:border-r border-[#C9A646]/10 md:col-span-2 search-input-group rounded-2xl hover:bg-white/40">
              <span className="text-[9px] uppercase tracking-[0.1em] font-extrabold text-[#C9A646] block mb-1 font-mono">Check Out</span>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#0E2A38] shrink-0" />
                <input 
                  type="date"
                  min={checkIn ? (() => {
                    const next = new Date(checkIn);
                    next.setDate(next.getDate() + 1);
                    return next.toISOString().split('T')[0];
                  })() : new Date().toISOString().split('T')[0]}
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#0E2A38] focus:outline-none w-full cursor-pointer"
                />
              </div>
            </div>

            {/* Guests & Rooms */}
            <div 
              className="p-3 border-b md:border-b-0 md:border-r border-[#C9A646]/10 md:col-span-2 relative cursor-pointer select-none search-input-group rounded-2xl hover:bg-white/40"
              onClick={() => setGuestDropdownOpen(!guestDropdownOpen)}
            >
              <span className="text-[9px] uppercase tracking-[0.1em] font-extrabold text-[#C9A646] block mb-1">Guests & Rooms</span>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#0E2A38] shrink-0" />
                <span className="text-xs font-bold text-[#0E2A38] truncate">
                  {adults + children} Guests, {rooms} Room{rooms > 1 ? 's' : ''}
                </span>
              </div>

              {/* Guest selection popover */}
              <AnimatePresence>
                {guestDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={e => e.stopPropagation()}
                    className="absolute top-full mt-3 left-0 right-0 md:left-auto md:-right-6 md:w-80 bg-white border border-[#C9A646]/25 rounded-3xl p-5 shadow-2xl z-50 text-left space-y-4 font-inter border-2 animate-in fade-in duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#0E2A38]">Adults</p>
                        <p className="text-[9px] text-zinc-400 font-light mt-0.5">Age 13 or above</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setAdults(prev => Math.max(1, prev - 1))}
                          className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#0E2A38] w-4 text-center">{adults}</span>
                        <button 
                          type="button"
                          onClick={() => setAdults(prev => prev + 1)}
                          className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#0E2A38]">Children</p>
                        <p className="text-[9px] text-zinc-400 font-light mt-0.5">Age 0 - 12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setChildren(prev => Math.max(0, prev - 1))}
                          className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#0E2A38] w-4 text-center">{children}</span>
                        <button 
                          type="button"
                          onClick={() => setChildren(prev => prev + 1)}
                          className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#0E2A38]">Rooms</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setRooms(prev => Math.max(1, prev - 1))}
                          className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#0E2A38] w-4 text-center">{rooms}</span>
                        <button 
                          type="button"
                          onClick={() => setRooms(prev => prev + 1)}
                          className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setGuestDropdownOpen(false)}
                      className="w-full bg-[#0E2A38] text-white text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-[#123545] transition-colors"
                    >
                      Apply
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Buttons */}
            <div className="p-1 md:col-span-2 flex flex-col gap-2">
              <button 
                type="button"
                onClick={() => {
                  const el = document.getElementById('marketplace');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full bg-[#0E2A38] hover:bg-[#123545] text-white text-[11px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0E2A38]/10 active:scale-98 cursor-pointer"
              >
                <Search size={13} className="text-[#C9A646]" />
                <span>Search Stays</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsPlannerOpen(true)}
                className="w-full bg-gradient-to-r from-[#C9A646] to-[#B08B47] hover:opacity-90 text-white text-[10px] font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md active:scale-98 cursor-pointer uppercase tracking-wider"
              >
                <Sparkles size={11} />
                <span>Plan with AI</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE PROPERTY MARKETPLACE (Airbnb-Style, 20+ stays) ── */}
      <section id="marketplace" className="py-24 luxury-paper-bg relative grid-light-sand border-t border-[#C9A646]/15">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 text-left">
                <span className="text-[10px] text-[#C9A646] font-medium tracking-[0.25em] uppercase font-mono">Live Marketplace directory</span>
                <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0E2A38] leading-none">
                  Explore stays powered by <span className="italic font-light text-[#C9A646]">TripLooper</span>
                </h2>
                <p className="text-zinc-500 text-xs sm:text-sm font-light">
                  Secure direct checkout guaranteed. Every booking on these cards goes 100% direct to the stay operator.
                </p>
              </div>

              {/* Category tabs */}
              <div className="flex flex-col gap-2 shrink-0">
                <span className="text-[9px] text-[#C9A646] font-extrabold uppercase tracking-wider text-left md:text-right">Filter by category</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbars">
                  {["All Stays", "Beachfront", "Mountain View", "Heritage Quarter", "Eco Stays", "City Center"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveCategoryFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                        activeCategoryFilter === tab 
                          ? 'border-[#0E2A38] bg-[#0E2A38] text-white shadow-md shadow-[#0E2A38]/10' 
                          : 'border-[#C9A646]/20 bg-[#FAF9F6] text-[#0E2A38]/75 hover:border-[#0E2A38]/35 hover:bg-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Destination tabs */}
            <div className="flex flex-col gap-2 border-t border-[#C9A646]/10 pt-4">
              <span className="text-[9px] text-[#C9A646] font-extrabold uppercase tracking-wider text-left">Explore Destinations</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbars">
                {["All Destinations", "Pondicherry", "Ooty", "Kodaikanal", "Yercaud", "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"].map(dest => (
                  <button
                    key={dest}
                    onClick={() => setActiveDestinationFilter(dest)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      activeDestinationFilter === dest 
                        ? 'border-[#C9A646] bg-[#C9A646] text-white shadow-md shadow-[#C9A646]/10' 
                        : 'border-[#C9A646]/20 bg-white text-zinc-700 hover:border-[#C9A646]/40 hover:bg-zinc-50'
                    }`}
                  >
                    {dest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Properties Grid with Masonry Variety (Featured Double Cards) */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {filteredProperties.map((p, idx) => {
              const originalPrice = Math.round(p.price * 1.15);
              const reviewCount = (p.id * 17) % 120 + 30;
              const ratingText = Number(p.rating) >= 4.9 ? "Exceptional" : Number(p.rating) >= 4.8 ? "Superb" : "Excellent";
              
              // Dynamic Host profiles
              const hostNames = ["Ananya S.", "Karan M.", "Vikram R.", "Priya D.", "Rohan K.", "Aditi V."];
              const hostPhotos = [
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80",
                "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&q=80",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80"
              ];
              const hostName = hostNames[p.id % hostNames.length];
              const hostPhoto = hostPhotos[p.id % hostPhotos.length];

              // Render a Featured Double Card every 5th item
              if (idx % 5 === 4) {
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      if (p.subdomain) {
                        navigate(`/site/${p.subdomain}?checkIn=${checkIn}&checkOut=${checkOut}`);
                      } else {
                        toast.info(`Simulated: Redirecting to direct stay URL for ${p.name}`);
                      }
                    }}
                    className="group bg-white border border-[#C9A646]/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-[0_20px_50px_rgba(197,160,89,0.12)] hover:-translate-y-1.5 transition-all duration-350 flex flex-col md:flex-row md:col-span-2 cursor-pointer relative font-inter text-left"
                  >
                    {/* Visual Badge overlay */}
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-[#C9A646] to-[#B08B47] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10 border border-white/20 shadow-md">
                      Featured Experience
                    </div>

                    {/* Image half */}
                    <div className="relative w-full md:w-1/2 h-64 md:h-auto overflow-hidden bg-zinc-100 border-b md:border-b-0 md:border-r border-[#C9A646]/10">
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      
                      {/* Wishlist Heart */}
                      <button 
                        onClick={(e) => toggleLike(p.id, e)}
                        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center border border-white shadow-sm hover:scale-110 hover:bg-white active:scale-90 transition-all z-10"
                      >
                        <Heart size={13} className={likes[p.id] ? "fill-red-500 text-red-500" : "text-zinc-700"} />
                      </button>
                    </div>

                    {/* Content half */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-6">
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] text-[#C9A646] font-bold tracking-wide uppercase">{p.type} · {p.loc}</span>
                            <h4 className="font-playfair text-xl font-extrabold text-[#0E2A38] leading-snug group-hover:text-[#C9A646] transition-colors mt-0.5">{p.name}</h4>
                          </div>
                          
                          {/* Rating badge */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-[#0E2A38]/5 px-2 py-1 rounded-xl border border-[#C9A646]/20">
                            <div className="text-right">
                              <span className="text-[10px] font-black text-[#0E2A38] block leading-none">{ratingText}</span>
                              <span className="text-[8px] text-zinc-400 block font-light mt-0.5">{reviewCount} reviews</span>
                            </div>
                            <div className="bg-[#0E2A38] text-white font-extrabold text-[11px] w-7 h-7 rounded-lg border border-[#C9A646]/20 flex items-center justify-center shadow-sm">
                              {p.rating}
                            </div>
                          </div>
                        </div>

                        {/* Host Profile */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <img 
                            src={hostPhoto} 
                            alt={hostName} 
                            className="w-5 h-5 rounded-full object-cover border border-[#C9A646]/30"
                          />
                          <span className="text-[10px] text-zinc-550 font-medium">Hosted by {hostName}</span>
                          <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                          <span className="text-[8px] uppercase tracking-wider text-emerald-600 font-bold">Verified Host</span>
                        </div>

                        <p className="text-xs text-zinc-500 font-light leading-relaxed">
                          Experience premium direct-host booking at {p.name}. Located in the heart of scenic {p.loc}, featuring handcrafted hospitality and direct checkout advantages.
                        </p>

                        {/* Advantages list */}
                        <div className="space-y-1.5 pt-1 text-[10px] text-left">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span>Free Cancellation & Direct Messaging</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#C9A646] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646] shrink-0"></span>
                            <span>100% Direct Room Folio Invoicing</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing footer */}
                      <div className="pt-4 border-t border-zinc-100 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 line-through block leading-none">₹{originalPrice.toLocaleString('en-IN')}</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-black text-[#0E2A38] tracking-tight">₹{p.price.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-zinc-400 font-normal">/night</span>
                          </div>
                          <span className="text-[8px] text-zinc-400 block font-light mt-0.5">Includes taxes & fees</span>
                        </div>

                        <button className="bg-[#0E2A38] hover:bg-[#123545] text-white text-xs font-bold uppercase tracking-wider py-3 px-5 rounded-2xl border border-[#C9A646]/20 transition-all duration-300 shadow-md">
                          Reserve Direct
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Otherwise render standard high-conversion card
              return (
                <div 
                  key={p.id}
                  onClick={() => {
                    if (p.subdomain) {
                      navigate(`/site/${p.subdomain}?checkIn=${checkIn}&checkOut=${checkOut}`);
                    } else {
                      toast.info(`Simulated: Redirecting to direct stay URL for ${p.name}`);
                    }
                  }}
                  className="group bg-white border border-[#C9A646]/15 rounded-3xl overflow-hidden shadow-sm hover:shadow-[0_20px_50px_rgba(11,59,43,0.06)] hover:-translate-y-1.5 transition-all duration-350 flex flex-col h-full cursor-pointer relative font-inter text-left"
                >
                  {/* Image banner */}
                  <div className="relative aspect-[1.2] w-full overflow-hidden bg-zinc-100 border-b border-[#C9A646]/10">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Heart button */}
                    <button 
                      onClick={(e) => toggleLike(p.id, e)}
                      className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center border border-white shadow-sm hover:scale-110 hover:bg-white active:scale-90 transition-all z-10 text-zinc-700"
                    >
                      <Heart size={13} className={likes[p.id] ? "fill-red-500 text-red-500" : "text-zinc-800"} />
                    </button>

                    {/* Badge */}
                    <span className="absolute bottom-3.5 left-3.5 bg-[#0E2A38]/90 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-[#C9A646]/30">
                      {p.tag}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-4.5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-playfair text-base font-extrabold text-[#0E2A38] leading-tight group-hover:text-[#C9A646] transition-colors line-clamp-1">{p.name}</h4>
                        
                        {/* Booking.com Rating */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] font-black text-[#0E2A38] block leading-none">{ratingText}</span>
                            <span className="text-[8px] text-zinc-400 block font-light mt-0.5">{reviewCount} reviews</span>
                          </div>
                          <div className="bg-[#0E2A38] text-white font-extrabold text-[11px] w-7 h-7 rounded-lg border border-[#C9A646]/20 flex items-center justify-center shadow-sm">
                            {p.rating}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-[#C9A646] font-bold tracking-wide uppercase">{p.type} · {p.loc}</p>

                      {/* Host details */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <img 
                          src={hostPhoto} 
                          alt={hostName} 
                          className="w-4 h-4 rounded-full object-cover border border-[#C9A646]/30"
                        />
                        <span className="text-[9px] text-zinc-555 font-light font-inter">Hosted by {hostName}</span>
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        <span className="text-[8px] uppercase tracking-wider text-emerald-600 font-bold font-inter">Verified</span>
                      </div>
                      
                      {/* Advantages */}
                      <div className="space-y-1 pt-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>Free Cancellation</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>No prepayment needed</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#C9A646] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646] shrink-0"></span>
                          <span>100% Direct to Host</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="pt-3 border-t border-zinc-100 flex items-end justify-between text-left">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-zinc-400 line-through block leading-none">₹{originalPrice.toLocaleString('en-IN')}</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-base font-black text-[#0E2A38] tracking-tight">₹{p.price.toLocaleString('en-IN')}</span>
                          <span className="text-[9px] text-zinc-400 font-normal">/night</span>
                        </div>
                        <span className="text-[8px] text-zinc-400 block font-light leading-none">Taxes & fees included</span>
                      </div>
                      
                      <button className="bg-[#0E2A38] hover:bg-[#123545] text-white text-[10px] font-bold uppercase tracking-wider py-2.5 px-3.5 rounded-xl border border-[#C9A646]/20 transition-all duration-300 shadow-sm shadow-[#0E2A38]/5">
                        Book Direct
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-20 border border-dashed border-[#C9A646]/20 rounded-3xl bg-[#FAF9F6]">
              <span className="text-zinc-400 text-xs italic">No stays matching search keywords found in marketplace.</span>
            </div>
          )}

        </div>
      </section>

      {/* ── SECTION 3: PROPERTY CATEGORIES ── */}
      <section id="categories" className="py-24 bg-[#FDFBF7]/95 relative border-t border-[#C9A646]/15 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6]/50 via-[#C9A646]/2 to-[#FAF9F6]/50 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 space-y-12 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] text-[#C9A646] font-medium tracking-[0.25em] uppercase font-mono">Stay configurations</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0E2A38]">
              Handcrafted for every <span className="italic font-light text-[#C9A646]">stay category</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light leading-relaxed">
              We sync inventory, bookings, and billing folios with optimized layouts for all property categories.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Luxury Villas", desc: "Private pools & customizable add-ons", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" },
              { title: "Beach Resorts", desc: "Interactive beachbeds & beachfront invoicing", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80" },
              { title: "Mountain Retreats", desc: "Room heaters & trail schedule notifications", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80" },
              { title: "Boutique Hotels", desc: "Express check-in & WhatsApp notification links", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80" }
            ].map((cat, idx) => (
              <div 
                key={idx}
                className="group relative h-[380px] rounded-[28px] overflow-hidden shadow-md border border-[#C9A646]/15 cursor-pointer"
              >
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 space-y-1.5 text-left">
                  <h4 className="font-playfair text-xl font-bold text-white leading-tight">{cat.title}</h4>
                  <p className="text-zinc-300 text-xs font-light">{cat.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C9A646] uppercase tracking-widest pt-2.5">
                    Explore stays <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── SECTION 4: OWNER STORY (Why Switch) ── */}
      <section id="why-switch" className="py-24 bg-[#0E2A38] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(201,166,70,0.1),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center relative z-10">
          <div className="md:col-span-5 space-y-6">
            <ScrollStoryText scrollYProgress={scrollYProgress} />
          </div>
          <div className="md:col-span-7 flex justify-center">
            <ScrollStoryVisual scrollYProgress={scrollYProgress} />
          </div>
        </div>
      </section>

      {/* ── SECTION 5: THE PLATFORM (OS Diagram) ── */}
      <section id="os-diagram" className="py-24 bg-[#FDFBF7] border-t border-[#C9A646]/15 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] text-[#C9A646] font-medium tracking-[0.25em] uppercase font-mono">Unified Architecture</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0E2A38]">
              The direct hospitality <span className="italic font-light text-[#C9A646]">operating system</span>
            </h2>
            <p className="text-sm text-zinc-550 font-light">
              TripLooper replaces up to 8 fragmented legacy tools with one beautifully integrated live engine.
            </p>
          </div>
          <div className="h-[450px] relative">
            <ExplodedDashboard />
          </div>
        </div>
      </section>

      {/* ── SECTION 6: OUR NETWORK / INTEGRATIVE EXPERIENCE ── */}
      <section id="india-network" className="py-24 bg-[#FAF9F6] border-t border-[#C9A646]/15 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] text-[#C9A646] font-medium tracking-[0.25em] uppercase font-mono">Bespoke Guest Journeys</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0E2A38]">
              Seamless flow from <span className="italic font-light text-[#C9A646]">booking to bill</span>
            </h2>
            <p className="text-sm text-zinc-550 font-light">
              Explore how TripLooper coordinates the booking engine, dine-in POS food orders, and WhatsApp notifications.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Booking Engine */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-xs font-bold text-[#0E2A38] uppercase tracking-wider font-mono">01. Direct Booking Engine</span>
              <InteractiveBookingShowcase />
            </div>
            
            {/* Guest Journey */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-xs font-bold text-[#0E2A38] uppercase tracking-wider font-mono">02. Automated Lifecycle logs</span>
              <InteractiveGuestJourney />
            </div>

            {/* POS Showcase */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-xs font-bold text-[#0E2A38] uppercase tracking-wider font-mono">03. In-stay QR Food Orders</span>
              <InteractivePOSShowcase />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: PRICING & REVENUE SIMULATOR ── */}
      <section id="pricing" className="py-24 bg-[#FDFBF7] border-t border-[#C9A646]/15 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] text-[#C9A646] font-medium tracking-[0.25em] uppercase font-mono">Pricing & Yield Calculator</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0E2A38]">
              Recover your revenue <span className="italic font-light text-[#C9A646]">leakage</span>
            </h2>
            <p className="text-sm text-zinc-550 font-light">
              See what you save by migrating from high-commission OTAs to direct-to-host reservations.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <PricingPlan />
            </div>
            <div className="lg:col-span-7">
              <RevenueSimulator />
            </div>
          </div>
          
          {/* FAQ Accordion */}
          <div className="max-w-3xl mx-auto pt-10 space-y-6">
            <h3 className="font-playfair text-2xl font-bold text-[#0E2A38] text-center">Frequently Asked Questions</h3>
            <HospitalityFAQ />
          </div>
        </div>
      </section>

      {/* ── SECTION 8: PROPERTY SHOWCASE MASONRY GALLERY (Dream Travel Stays) ── */}
      <section className="py-24 luxury-paper-bg border-t border-[#C9A646]/15 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 space-y-12 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] text-[#C9A646] font-medium tracking-[0.25em] uppercase font-mono">Luxe Stay Showcase</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0E2A38]">
              Inspiring travel <span className="italic font-light text-[#C9A646]">desire</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light">
              See the outstanding properties that trust TripLooper to coordinate their guest rooms.
            </p>
          </div>

          {/* Masonry image stack grid with round-28px corners & hover zooms */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&q=80" alt="Resort" className="w-full aspect-[0.75] object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80" alt="Suite Loft" className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=80" alt="Cottage Valleys" className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80" alt="Lodge Orchard" className="w-full aspect-[1.3] object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80" alt="Beachfront House" className="w-full aspect-[1.1] object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=600&q=80" alt="Luxury Villa" className="w-full aspect-[0.7] object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
            <div className="space-y-4 pt-6">
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80" alt="Mist resort" className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="overflow-hidden rounded-[28px] border border-[#C9A646]/15 shadow-sm group">
                <img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80" alt="Farmhouse" className="w-full aspect-[1.2] object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[#0E2A38] border-t border-[#C9A646]/30 pt-20 pb-12 text-xs text-zinc-300 relative z-10 font-inter">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-[#C9A646]/10">
          
          {/* Logo & Description */}
          <div className="space-y-4 md:col-span-4 text-left">
            <span className="font-playfair text-xl font-bold tracking-widest text-white block font-inter">
              TRIP<span className="text-[#C9A646]">LOOPER</span>
            </span>
            <p className="leading-relaxed text-zinc-400 font-light max-w-sm">
              Collapsing fragmented pipelines into a single source of direct-booking truth. The direct commerce platform for independent luxury properties, villas, and boutique hotels.
            </p>
            <div className="flex gap-4.5 items-center pt-2">
              {/* Trust emblems */}
              <span className="text-[9px] tracking-widest uppercase text-[#C9A646] border border-[#C9A646]/40 px-3 py-1.5 rounded-full font-mono font-bold">
                Condé Nast Partner
              </span>
              <span className="text-[9px] tracking-widest uppercase text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-full font-mono">
                Direct Host Trust
              </span>
            </div>
          </div>

          {/* Featured Locations */}
          <div className="space-y-4 md:col-span-2 text-left">
            <h4 className="font-bold text-white uppercase tracking-wider text-[9px] font-mono">Luxe Locations</h4>
            <ul className="space-y-2.5 text-zinc-400 font-light">
              <li><a href="#marketplace" onClick={() => setSearchDestination('Pondicherry')} className="hover:text-[#C9A646] transition-colors">Pondicherry Coast</a></li>
              <li><a href="#marketplace" onClick={() => setSearchDestination('Ooty')} className="hover:text-[#C9A646] transition-colors">Ooty Pine Valleys</a></li>
              <li><a href="#marketplace" onClick={() => setSearchDestination('Kodaikanal')} className="hover:text-[#C9A646] transition-colors">Kodaikanal Valley</a></li>
              <li><a href="#marketplace" onClick={() => setSearchDestination('Madurai')} className="hover:text-[#C9A646] transition-colors">Madurai Heritage</a></li>
            </ul>
          </div>

          {/* Product Links */}
          <div className="space-y-4 md:col-span-2 text-left">
            <h4 className="font-bold text-white uppercase tracking-wider text-[9px] font-mono">Platform</h4>
            <ul className="space-y-2.5 text-zinc-400 font-light">
              <li><a href="#marketplace" className="hover:text-[#C9A646] transition-colors">Stays Directory</a></li>
              <li><a href="/pricing" className="hover:text-[#C9A646] transition-colors">B2B Core System</a></li>
              <li><a href="/signup" className="hover:text-[#C9A646] transition-colors">Partner Signup</a></li>
              <li><a href="#" className="hover:text-[#C9A646] transition-colors">Owner Story</a></li>
            </ul>
          </div>

          {/* Newsletter Signup */}
          <div className="space-y-4 md:col-span-4 text-left font-inter">
            <h4 className="font-bold text-white uppercase tracking-wider text-[9px] font-mono">Triplooper Club</h4>
            <p className="text-zinc-400 font-light leading-relaxed">
              Subscribe to unlock private catalogs and 15% direct booking savings alerts.
            </p>
            <form onSubmit={e => { e.preventDefault(); toast.success("Subscribed to Triplooper Club!"); }} className="space-y-2.5">
              <input 
                type="email" 
                required 
                placeholder="Enter email address" 
                className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-[#C9A646] transition-all placeholder-zinc-500"
              />
              <button 
                type="submit" 
                className="w-full h-11 bg-[#C9A646] hover:bg-[#b08b47] text-[#0E2A38] font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98"
              >
                Join Private Club
              </button>
            </form>
          </div>

        </div>

        {/* Bottom footer credit bar */}
        <div className="max-w-7xl mx-auto px-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          <div className="flex gap-6 items-center flex-wrap justify-center sm:justify-start">
            <p>© {new Date().getFullYear()} TripLooper. All rights reserved.</p>
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
          </div>
          <p className="text-zinc-650">Handcrafted for premium independent stay operators.</p>
        </div>
      </footer>

      {/* Floating Plan with AI Button */}
      <button
        type="button"
        onClick={() => setIsPlannerOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-[#0E2A38] hover:bg-[#123545] text-white px-5 py-4 rounded-full border border-[#C9A646]/20 shadow-[0_10px_30px_rgba(11,59,43,0.3)] transition-all duration-300 font-bold text-xs uppercase tracking-wider font-mono hover:scale-105 active:scale-95 group cursor-pointer"
      >
        <div className="relative">
          <Calendar size={16} className="text-white shrink-0 group-hover:rotate-6 transition-transform" />
          <Sparkles size={9} className="absolute -top-1 -right-1 text-[#C9A646] animate-bounce" />
        </div>
        <span>Plan with AI</span>
      </button>

      {/* AI Trip Planner Full-Screen Wizard Overlay */}
      <AnimatePresence>
        {isPlannerOpen && (
          <TripPlannerWizard onClose={() => setIsPlannerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SUBCOMPONENTS ──────────────────────────────────────────

// Scroll Story Text Selector (Updates text during sticky scroll)
function ScrollStoryText({ scrollYProgress }: { scrollYProgress: any }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    return scrollYProgress.onChange((v: number) => {
      // Map progress over the Story section
      const storyVal = v;
      if (storyVal < 0.35) {
        setPhase(0);
      } else if (storyVal >= 0.35 && storyVal < 0.48) {
        setPhase(1);
      } else {
        setPhase(2);
      }
    });
  }, [scrollYProgress]);

  const phases = [
    {
      title: "The Legacy Disconnection",
      desc: "Property owners juggle three different legacy PMS platforms, offline Excel sheets, a manual kitchen log, and mismatched room inventory databases. Complicated workflows leak up to 18% of revenue directly into OTA channel commissions.",
      badge: "State 01: Fragmented Chaos"
    },
    {
      title: "The Operating System Convergence",
      desc: "TripLooper collapses all disconnected pipelines into a single source of truth. Booking engines, check-in portals, room status, billing invoices, and WhatsApp notification alerts pull data instantly from a unified state manager.",
      badge: "State 02: Real-time Convergence"
    },
    {
      title: "Automated Growth Engine",
      desc: "Direct guest reservations scale upwards. In-room QR food orders drop directly into the chef's POS and compile instantly onto the guest's folio invoice. Digital keys are auto-assigned via secure WhatsApp check-in tokens.",
      badge: "State 03: Unified Control"
    }
  ];

  const current = phases[phase];

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={phase}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
        className="space-y-4 text-left"
      >
        <span className="text-[10px] bg-[#C9A646]/10 text-[#C9A646] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-[#C9A646]/20">
          {current.badge}
        </span>
        <h3 className="font-playfair text-2xl font-bold text-white">{current.title}</h3>
        <p className="text-zinc-350 text-xs sm:text-sm leading-relaxed font-light">{current.desc}</p>
      </motion.div>
    </AnimatePresence>
  );
}

// Scroll Story Visual Element
function ScrollStoryVisual({ scrollYProgress }: { scrollYProgress: any }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    return scrollYProgress.onChange((v: number) => {
      if (v < 0.35) {
        setPhase(0);
      } else if (v >= 0.35 && v < 0.48) {
        setPhase(1);
      } else {
        setPhase(2);
      }
    });
  }, [scrollYProgress]);

  if (phase === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-2 gap-4 w-full max-w-[440px]"
      >
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl shadow-2xl relative select-none">
          <span className="text-[8px] font-mono text-red-400 uppercase font-black">Legacy PMS terminal</span>
          <div className="h-16 mt-2 bg-zinc-950/60 rounded-lg flex items-center justify-center border border-white/5">
            <span className="text-[10px] text-zinc-650">Out of Sync • Offline</span>
          </div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl shadow-2xl relative select-none">
          <span className="text-[8px] font-mono text-red-400 uppercase font-black">Booking Channel (OTA)</span>
          <div className="h-16 mt-2 bg-zinc-950/60 rounded-lg flex flex-col items-center justify-center border border-white/5 p-2">
            <span className="text-[10px] text-red-400 font-bold">-18% Commission</span>
            <span className="text-[8px] text-zinc-550">₹8,450 leaked today</span>
          </div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl shadow-2xl relative col-span-2 select-none">
          <span className="text-[8px] font-mono text-red-400 uppercase font-black">Guest Registration logs</span>
          <div className="mt-2 text-[10px] font-mono text-zinc-555 space-y-1">
            <p>• Room 104 check-in details missing</p>
            <p>• Room 202 duplicate checkout key warning</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (phase === 1) {
    return (
      <div className="relative w-[300px] h-[300px] flex items-center justify-center">
        {/* Core glowing spinner */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute w-[200px] h-[200px] border border-dashed border-emerald-400/40 rounded-full flex items-center justify-center"
        >
          <div className="w-4 h-4 rounded-full bg-emerald-400 absolute -top-2" />
        </motion.div>
        
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_#10b981] animate-ping" />
        <div className="w-12 h-12 rounded-full bg-zinc-950 border-2 border-emerald-400 flex items-center justify-center absolute z-10">
          <Layers className="text-emerald-400" size={18} />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[460px] bg-zinc-950/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/20 shadow-2xl relative text-left"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Anya Paradise (Live OS)</span>
        </div>
        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full">Connected</span>
      </div>

      <div className="pt-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
            <span className="text-[8px] text-zinc-500 uppercase font-black">Occupancy</span>
            <p className="text-sm font-bold text-white mt-0.5">92%</p>
          </div>
          <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
            <span className="text-[8px] text-zinc-500 uppercase font-black">Today ADR</span>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">₹4,200</p>
          </div>
          <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
            <span className="text-[8px] text-zinc-550 uppercase font-black">Saved OTA</span>
            <p className="text-sm font-bold text-amber-300 mt-0.5">₹14,500</p>
          </div>
        </div>

        <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 text-[10px] space-y-1.5 font-mono">
          <p className="flex justify-between">
            <span className="text-zinc-550">✓ Room 102 ordered Breakfast</span>
            <span className="text-emerald-400">+₹850</span>
          </p>
          <p className="flex justify-between">
            <span className="text-zinc-550">✓ Guest Sarah J. checked in</span>
            <span className="text-zinc-400">Via WhatsApp</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// 3D Exploded Dashboard Component (Scroll linked modules splitting)
export function ExplodedDashboard() {
  const modules = [
    { id: 'engine', name: 'Booking Engine', desc: 'Direct Conversion', icon: Zap, x: -260, y: -90, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'pms', name: 'PMS System', desc: 'Room Allocation Grid', icon: BedDouble, x: 0, y: -130, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'crm', name: 'Guest CRM', desc: 'Magic Link Profiles', icon: Users, x: 260, y: -90, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'pos', name: 'Restaurant POS', desc: 'Kitchen ordering (KOT)', icon: Coffee, x: -300, y: 30, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'analytics', name: 'Yield Analytics', desc: 'ADR pricing optimization', icon: BarChart3, x: 300, y: 30, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'whatsapp', name: 'WhatsApp Bot', desc: 'Autosending alerts', icon: MessageSquare, x: -260, y: 140, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'channel', name: 'Channel Manager', desc: '2-way OTA Synchronization', icon: Waypoints, x: 0, y: 150, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
    { id: 'inventory', name: 'Lock & Inventory', desc: 'Rate Parity Guard', icon: ClipboardList, x: 260, y: 140, color: 'from-[#FAF9F6]/20 to-transparent', border: 'border-white/10' },
  ];

  return (
    <div style={{ perspective: "1500px" }} className="w-full h-full relative flex items-center justify-center overflow-visible select-none py-10">
      
      {/* Central Core Memory (PMS Database) */}
      <div 
        className="w-[280px] sm:w-[320px] aspect-[1.7] bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl relative z-10 flex flex-col justify-between backdrop-blur-md"
      >
        <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
          <Database className="text-[#C9A646]" size={16} />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Master Database Core</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-1">
            <span className="text-[18px] font-bold text-white tracking-tight">100% Synced</span>
            <p className="text-[9px] text-[#C9A646] font-mono">11 stays coordinated</p>
          </div>
        </div>
        <div className="flex justify-between items-center text-[9px] text-zinc-500 pt-2 border-t border-white/5">
          <span>SUPABASE LIVE</span>
          <span>SSL LINKED</span>
        </div>
      </div>

      {/* Connection Lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {modules.map((m, i) => {
          const startX = 576; // center
          const startY = 210; 
          const targetX = startX + m.x;
          const targetY = startY + m.y;
          
          return (
            <path 
              key={i}
              d={`M ${startX} ${startY} L ${targetX} ${targetY}`}
              stroke="rgba(201, 166, 70, 0.2)"
              strokeWidth="1.2"
              strokeDasharray="4, 4"
              fill="none"
            />
          );
        })}
      </svg>

      {/* Floating panels */}
      {modules.map((m) => {
        const Icon = m.icon;
        
        return (
          <div 
            key={m.id}
            style={{
              transform: `translate3d(${m.x}px, ${m.y}px, 0px)`,
            }}
            className="absolute w-[180px] bg-zinc-950/70 border border-white/10 p-4 rounded-xl shadow-xl z-20 flex gap-3 items-center backdrop-blur-md cursor-pointer hover:border-[#C9A646] transition-colors duration-300"
            onClick={() => toast.info(`Explored Module: ${m.name}`)}
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
              <Icon className="text-[#C9A646]" size={16} />
            </div>
            <div className="text-left">
              <h4 className="text-[11px] font-bold text-white leading-tight">{m.name}</h4>
              <p className="text-[9px] text-zinc-400 leading-tight mt-0.5">{m.desc}</p>
            </div>
          </div>
        );
      })}

    </div>
  );
}

// Interactive Direct Booking Engine Showcase (Airbnb style)
export function InteractiveBookingShowcase() {
  const [step, setStep] = useState(0);
  const [roomType, setRoomType] = useState('Deluxe Villa');
  const [days, setDays] = useState(3);
  const [extras, setExtras] = useState({ spa: false, dinner: false });

  const price = useMemo(() => {
    const base = roomType === 'Deluxe Villa' ? 4500 : 7500;
    let total = base * days;
    if (extras.spa) total += 2000;
    if (extras.dinner) total += 1200 * days;
    return total;
  }, [roomType, days, extras]);

  return (
    <div className="w-full max-w-[440px] bg-white border border-[#C9A646]/20 rounded-3xl p-5 shadow-xl relative text-left">
      <div className="flex justify-between items-center pb-3.5 border-b border-[#C9A646]/10">
        <span className="text-[10px] text-[#0E2A38] font-extrabold uppercase tracking-widest">Anya Paradise Engine</span>
        <span className="text-[10px] text-zinc-400">Secure Direct Checkout</span>
      </div>

      {step === 0 && (
        <div className="space-y-4 pt-4">
          <label className="text-[10px] text-[#0E2A38] uppercase font-black">Select Stay Category</label>
          <div className="grid grid-cols-2 gap-3">
            {['Deluxe Villa', 'Luxury Suite'].map(c => (
              <button 
                key={c}
                onClick={() => setRoomType(c)}
                className={`p-3 text-xs font-bold rounded-xl border text-left transition-all ${roomType === c ? 'border-[#0E2A38] bg-[#0E2A38]/5 text-[#0E2A38]' : 'border-zinc-100 bg-[#FAF9F6] text-zinc-500'}`}
              >
                {c}
                <span className="block text-[10px] text-[#C9A646] font-normal mt-0.5">{c === 'Deluxe Villa' ? '₹4,500/N' : '₹7,500/N'}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-[#0E2A38] uppercase font-black">Stay Days</label>
            <div className="flex items-center gap-3">
              {[2, 3, 5].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border text-center transition-all ${days === d ? 'border-[#0E2A38] bg-[#0E2A38]/5 text-[#0E2A38]' : 'border-zinc-100 bg-[#FAF9F6] text-zinc-500'}`}
                >
                  {d} Nights
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setStep(1)}
            className="w-full bg-[#0E2A38] hover:bg-[#123545] text-white font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            Configure add-ons <ArrowRight size={14} />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 pt-4">
          <label className="text-[10px] text-[#0E2A38] uppercase font-black">Add-on Experiences</label>
          <div className="space-y-2">
            <div 
              onClick={() => setExtras({ ...extras, spa: !extras.spa })}
              className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${extras.spa ? 'border-[#0E2A38] bg-[#0E2A38]/5' : 'border-zinc-100 bg-[#FAF9F6]'}`}
            >
              <div>
                <p className="text-xs font-bold text-[#0E2A38]">Full Body Aromatherapy</p>
                <p className="text-[9px] text-zinc-500">1 Session • Spa Wellness</p>
              </div>
              <span className="text-xs font-bold text-[#C9A646]">+₹2,000</span>
            </div>

            <div 
              onClick={() => setExtras({ ...extras, dinner: !extras.dinner })}
              className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${extras.dinner ? 'border-[#0E2A38] bg-[#0E2A38]/5' : 'border-zinc-100 bg-[#FAF9F6]'}`}
            >
              <div>
                <p className="text-xs font-bold text-[#0E2A38]">Gourmet Dinner Package</p>
                <p className="text-[9px] text-zinc-500">Buffet Dinners daily</p>
              </div>
              <span className="text-xs font-bold text-[#C9A646]">+₹1,200/N</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[#C9A646]/10">
            <span className="text-xs text-zinc-400 font-semibold">Total Amount</span>
            <span className="text-lg font-black text-[#0E2A38]">₹{price.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setStep(0)}
              className="flex-1 border border-zinc-150 text-zinc-400 py-3 text-xs font-bold rounded-xl"
            >
              Back
            </button>
            <button 
              onClick={() => {
                toast.success(`Booking simulated! Direct folio total: ₹${price.toLocaleString('en-IN')}`);
                setStep(0);
              }}
              className="flex-1 bg-[#0E2A38] text-white py-3 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#123545]"
            >
              Checkout Direct
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive Guest Journey Component
export function InteractiveGuestJourney() {
  const [activeNode, setActiveNode] = useState(0);

  const journey = [
    {
      title: "Direct Reservation",
      desc: "Guest books deluxe stay at Mooongil Illam. Zero OTA commission is lost. Database auto-allocates key.",
      timestamp: "Tuesday, 10:14 AM"
    },
    {
      title: "Pre-arrival WhatsApp Link",
      desc: "WhatsApp triggers automatically with the guest's unique check-in portal token (/guest/ab8cf2).",
      timestamp: "Wednesday, 12:00 PM"
    },
    {
      title: "Digital Check-in Completed",
      desc: "Guest uploads ID documentation via mobile check-in. Room status changes to 'Checked In' on PMS.",
      timestamp: "Thursday, 2:15 PM"
    },
    {
      title: "F&B Room Service",
      desc: "Guest orders dinner by scanning room QR code. Charges post instantly to room folio sheet.",
      timestamp: "Thursday, 8:30 PM"
    },
    {
      title: "One-Click Magic checkout",
      desc: "Guest reviews final compiled bill, settles via UPI, and receives digital invoice PDF.",
      timestamp: "Sunday, 11:00 AM"
    }
  ];

  return (
    <div className="w-full max-w-[520px] mx-auto bg-white border border-[#C9A646]/20 rounded-3xl p-6 shadow-md relative flex flex-col justify-between text-left">
      <span className="text-[10px] text-[#C9A646] font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-6">
        <Activity size={12} /> Guest Lifecycle logs
      </span>

      <div className="space-y-4">
        {journey.map((node, idx) => (
          <div 
            key={idx}
            onClick={() => setActiveNode(idx)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-4 ${activeNode === idx ? 'border-[#0E2A38]/40 bg-[#0E2A38]/5' : 'border-zinc-100 bg-[#FAF9F6]/40 hover:border-zinc-200'}`}
          >
            <div className="flex flex-col items-center shrink-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${activeNode === idx ? 'bg-[#0E2A38] text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                {idx + 1}
              </span>
              {idx < journey.length - 1 && <div className="w-px h-10 bg-zinc-100 mt-2" />}
            </div>
            <div>
              <div className="flex justify-between items-baseline gap-2">
                <h4 className="text-xs font-bold text-[#0E2A38] leading-none">{node.title}</h4>
                <span className="text-[9px] text-zinc-400 font-mono">{node.timestamp}</span>
              </div>
              {activeNode === idx && (
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed font-light font-inter">{node.desc}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive POS Dine-In Order Showcase
export function InteractivePOSShowcase() {
  const [selectedItems, setSelectedItems] = useState<{name: string, price: number}[]>([]);
  const [orderSent, setOrderSent] = useState(false);

  const menu = [
    { name: "Espresso Single", price: 160 },
    { name: "Avocado Toast Special", price: 380 },
    { name: "Belgian Chocolate Waffles", price: 350 },
    { name: "Paneer Tikka Platter", price: 420 }
  ];

  const addItem = (item: {name: string, price: number}) => {
    setSelectedItems([...selectedItems, item]);
    setOrderSent(false);
  };

  const removeItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const total = selectedItems.reduce((acc, curr) => acc + curr.price, 0);

  const sendOrder = () => {
    if (selectedItems.length === 0) return;
    setOrderSent(true);
    toast.success("Order sent to kitchen! Charges added to room bill.");
    setSelectedItems([]);
  };

  return (
    <div className="w-full max-w-[440px] bg-white border border-[#C9A646]/20 rounded-3xl p-5 shadow-xl relative text-left">
      <div className="flex justify-between items-center pb-3.5 border-b border-[#C9A646]/10">
        <span className="text-[10px] text-[#0E2A38] font-extrabold uppercase tracking-widest flex items-center gap-1">
          <Coffee size={12} className="text-[#C9A646]" /> Table 04 POS Terminal
        </span>
        <span className="text-[9px] text-zinc-400">Room Folio Link: On</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-4">
        {menu.map((m, i) => (
          <button
            key={i}
            onClick={() => addItem(m)}
            className="p-3 text-[11px] font-bold text-zinc-650 border border-zinc-100 bg-[#FAF9F6] rounded-xl hover:border-[#0E2A38]/30 hover:bg-[#0E2A38]/2 text-left transition-colors"
          >
            {m.name}
            <span className="block text-[9px] text-zinc-400 font-normal mt-0.5">₹{m.price}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3.5">
        <span className="text-[10px] text-zinc-400 uppercase font-black block">Active Order Folio</span>
        
        {selectedItems.length === 0 ? (
          <div className="h-16 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
            <span className="text-[10px] text-zinc-400 italic">
              {orderSent ? "🎉 Order sent to KOT printer!" : "Select food items to add to room folio"}
            </span>
          </div>
        ) : (
          <div className="max-h-24 overflow-y-auto space-y-2 scrollbar-none">
            {selectedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-600 font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#0E2A38]">₹{item.price}</span>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 font-black text-xs">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedItems.length > 0 && (
          <>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-100">
              <span className="text-zinc-450">Total POS charge</span>
              <span className="font-black text-[#0E2A38]">₹{total}</span>
            </div>
            
            <button 
              onClick={sendOrder}
              className="w-full bg-[#0E2A38] text-white py-3 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#123545]"
            >
              Print KOT & Charge Folio
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Interactive Revenue Simulator Component
export function RevenueSimulator() {
  const [rooms, setRooms] = useState(30);
  const [adr, setAdr] = useState(3500);
  const [occupancy, setOccupancy] = useState(70);

  const stats = useMemo(() => {
    const totalPotentialRooms = rooms * 365;
    const occupiedRooms = totalPotentialRooms * (occupancy / 100);
    const annualBaseRevenue = occupiedRooms * adr;
    
    // OTA Leak calculations: assuming 60% of bookings currently come from OTAs (Booking.com, Agoda)
    const otaBookingsRevenue = annualBaseRevenue * 0.6;
    // OTA commission is average 18%
    const otaCommissionsLost = otaBookingsRevenue * 0.18;
    
    // TripLooper recovers 65% of those commission losses by routing guests to direct booking
    const directRecoveredSavings = otaCommissionsLost * 0.65;
    
    return {
      annualBaseRevenue,
      otaCommissionsLost,
      directRecoveredSavings
    };
  }, [rooms, adr, occupancy]);

  return (
    <div className="bg-white border border-[#C9A646]/20 rounded-3xl p-6 md:p-8 grid md:grid-cols-12 gap-8 shadow-md text-left">
      
      {/* Sliders Left */}
      <div className="md:col-span-7 space-y-6">
        <h3 className="text-base font-bold text-[#0E2A38] flex items-center gap-2 uppercase tracking-wider text-xs border-b border-zinc-100 pb-3">
          <Calculator size={14} className="text-[#C9A646]" /> Adjust stay indicators
        </h3>
        
        {/* Rooms Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 font-medium">Total Keys / Rooms</span>
            <span className="text-[#0E2A38] font-bold">{rooms} Rooms</span>
          </div>
          <input
            type="range"
            min="5"
            max="120"
            value={rooms}
            onChange={e => setRooms(Number(e.target.value))}
            className="w-full luxury-slider"
          />
        </div>

        {/* ADR Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 font-medium">Average Daily Rate (ADR)</span>
            <span className="text-[#0E2A38] font-bold">₹{adr.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min="1000"
            max="15000"
            step="250"
            value={adr}
            onChange={e => setAdr(Number(e.target.value))}
            className="w-full luxury-slider"
          />
        </div>

        {/* Occupancy Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 font-medium">Occupancy Ratio</span>
            <span className="text-[#0E2A38] font-bold">{occupancy}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={occupancy}
            onChange={e => setOccupancy(Number(e.target.value))}
            className="w-full luxury-slider"
          />
        </div>
      </div>

      {/* Calculations Right */}
      <div className="md:col-span-5 bg-[#FAF9F6] border border-[#C9A646]/10 p-6 rounded-2xl flex flex-col justify-between space-y-6">
        <div className="space-y-4 text-left">
          <div>
            <span className="text-[9px] text-[#C9A646] uppercase tracking-widest font-extrabold">Estimated annual revenue</span>
            <p className="text-2xl font-black text-[#0E2A38] tracking-tight mt-0.5">
              ₹<AnimatedNumber value={stats.annualBaseRevenue} />
            </p>
          </div>

          <div className="pt-4 border-t border-[#C9A646]/10 flex justify-between items-center text-xs">
            <span className="text-zinc-400">OTA Commission Leakage</span>
            <span className="font-semibold text-red-500">
              -₹<AnimatedNumber value={stats.otaCommissionsLost} />
            </span>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-zinc-400">TripLooper Savings (65%)</span>
            <span className="font-bold text-emerald-600">
              +₹<AnimatedNumber value={stats.directRecoveredSavings} />
            </span>
          </div>
        </div>

        <div className="bg-[#0E2A38]/5 border border-[#C9A646]/20 p-4.5 rounded-xl text-center space-y-1">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#0E2A38]">Net direct channel savings</span>
          <p className="text-xl font-black text-[#0E2A38] tracking-tight">
            ₹<AnimatedNumber value={stats.directRecoveredSavings} />/yr
          </p>
        </div>
      </div>

    </div>
  );
}

// Smooth animated counter utility
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    
    const duration = 800; // ms
    const startTime = performance.now();
    let animationFrameId: number;
    
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * ease);
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(update);
      }
    };
    
    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <span>{displayValue.toLocaleString('en-IN')}</span>;
}

// Pricing plan component
export function PricingPlan() {
  return (
    <div className="space-y-10 max-w-xl mx-auto">
      
      {/* Deluxe Package Card */}
      <div className="relative bg-white border border-[#C9A646]/20 rounded-3xl p-8 shadow-md flex flex-col justify-between space-y-6 overflow-hidden">
        <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#C9A646] text-white font-extrabold text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border border-[#FAF9F6]/20">
          Commission Only
        </div>

        <div className="space-y-4 text-left">
          <div>
            <h3 className="text-xl font-bold text-[#0E2A38] tracking-tight">Full Enterprise Operating System</h3>
            <p className="text-xs text-[#0E2A38] mt-2 font-bold leading-normal">For a flat 12% commission, you get all of these premium features unlocked with zero upfront cost:</p>
          </div>

          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-4xl font-black text-[#0E2A38] tracking-tight">12%</span>
            <span className="text-xs text-zinc-400">commission per booking</span>
          </div>
          
          <p className="text-[10px] text-zinc-450 font-mono">₹0 Upfront Setup Cost. Pay only as you receive bookings through Triplooper.</p>

          <div className="h-px bg-zinc-100 my-4" />

          {/* Core features */}
          <ul className="space-y-3.5 text-xs text-zinc-650 font-light">
            {[
              'Direct Booking Engine & Custom Website',
              'Real-time Channel Manager (2-way OTA sync)',
              'Guest Portal with magic Aadhaar verification & check-in',
              'Restaurant POS (dine-in, table order, room service)',
              'WhatsApp message reminders & verification alerts',
              'Multi-user operational permission access roles',
              'Exportable Profit & Loss reports for tax filing',
              'Unlimited active room keys & staff accounts'
            ].map((f, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <CheckCircle2 size={16} className="text-[#C9A646] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <a
            href="/signup"
            className="w-full bg-[#0E2A38] hover:bg-[#123545] text-white font-black h-13 rounded-2xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Get Started for Free</span>
            <ArrowRight size={14} />
          </a>
          <p className="text-center text-[10px] text-zinc-400">Zero upfront fees. Create multiple properties under one account.</p>
        </div>

      </div>
    </div>
  );
}

// FAQ Accordion subcomponent
export function HospitalityFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Can Triplooper sync with Booking.com and Airbnb in real-time?",
      a: "Yes, our built-in 2-way Channel Manager keeps your rooms inventory synced across all major OTAs (Booking.com, Agoda, Airbnb, and Expedia) automatically in under 5 seconds to prevent overbookings."
    },
    {
      q: "How does the guest self check-in link work?",
      a: "As soon as a direct reservation is placed or imported, Triplooper's WhatsApp bot triggers a pre-arrival message containing a magic link token. Guests upload their IDs and register on their phones, updating room housekeeping status to Checked In instantly."
    },
    {
      q: "Can room service charges be posted directly to room bills?",
      a: "Absolutely. When guests scan their room's dine-in QR menu, they select items and click order. The KOT compiles in the kitchen, and POS charges drop onto their guest bill folio immediately."
    },
    {
      q: "Is there a monthly subscription fee or setup charge?",
      a: "No. Triplooper has zero monthly fees, setup costs, or licensing surcharges. We operate strictly on a 12% commission of the revenue generated by the hotel through bookings placed on the platform."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <div 
          key={idx} 
          className="border border-[#C9A646]/20 rounded-2xl bg-white shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full px-6 py-4.5 text-left font-playfair font-bold text-sm sm:text-base text-[#0E2A38] flex justify-between items-center hover:text-[#C9A646] transition-colors"
          >
            <span>{faq.q}</span>
            <ChevronDown 
              size={18} 
              className={`text-[#C9A646] transition-transform duration-350 ${openIndex === idx ? 'rotate-180' : ''}`} 
            />
          </button>
          
          <AnimatePresence>
            {openIndex === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-zinc-500 font-light leading-relaxed border-t border-zinc-100 font-inter">
                  {faq.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
