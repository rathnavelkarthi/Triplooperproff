import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Inject luxury fonts and bespoke design system styles
const masterStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
  
  .font-playfair {
    font-family: 'Playfair Display', Georgia, serif;
  }
  
  .font-inter {
    font-family: 'Inter', -apple-system, sans-serif;
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
    background: rgba(11, 60, 43, 0.1);
    border-radius: 2px;
  }
  .luxury-slider::-webkit-slider-thumb {
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: #0B3B2B;
    border: 2px solid #C5A059;
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

  const properties = [
    { name: "Anya Paradise", loc: "Pondicherry", rooms: 15, x: 260, y: 190 },
    { name: "Sai Residency", loc: "Chennai", rooms: 22, x: 280, y: 140 },
    { name: "Coolspot Cottage", loc: "Ooty", rooms: 9, x: 190, y: 250 },
    { name: "Daffodil Cottage", loc: "Kodaikanal", rooms: 12, x: 200, y: 280 },
    { name: "Carvery Residency", loc: "Pondicherry", rooms: 18, x: 255, y: 205 },
    { name: "Mooongil Illam", loc: "Pondicherry", rooms: 10, x: 245, y: 180 },
    { name: "Jayam Castle", loc: "Yercaud", rooms: 14, x: 215, y: 210 },
    { name: "Green Apple Property", loc: "Madurai", rooms: 16, x: 210, y: 310 },
    { name: "Nest N Rest Cottage", loc: "Ooty", rooms: 6, x: 180, y: 240 },
    { name: "Pineapple Nest", loc: "Coimbatore", rooms: 8, x: 175, y: 265 },
    { name: "Royal Park", loc: "Chennai", rooms: 30, x: 290, y: 130 }
  ];

  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All Stays");
  const [searchDestination, setSearchDestination] = useState("");
  const [likes, setLikes] = useState<Record<number, boolean>>({});

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProperties = useMemo(() => {
    return initialProperties.filter(p => {
      const matchCategory = activeCategoryFilter === "All Stays" || p.tag === activeCategoryFilter;
      const matchSearch = p.name.toLowerCase().includes(searchDestination.toLowerCase()) || p.loc.toLowerCase().includes(searchDestination.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategoryFilter, searchDestination]);

  return (
    <div 
      ref={containerRef}
      className="font-inter bg-[#FDFBF7] text-[#0A1612] min-h-screen antialiased selection:bg-[#C5A059] selection:text-white overflow-x-hidden"
    >
      <div className="noise-grain" />

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 bg-[#FDFBF7]/85 backdrop-blur-xl border-b border-[#C5A059]/10 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-2 group">
              <span className="font-playfair text-xl font-bold tracking-widest text-[#0B3B2B]">
                TRIP<span className="text-[#C5A059] font-extrabold">LOOPER</span>
              </span>
            </a>
            
            <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-widest text-[#0B3B2B]/75 uppercase">
              <a href="#marketplace" className="hover:text-[#C5A059] transition-colors">Marketplace</a>
              <a href="#categories" className="hover:text-[#C5A059] transition-colors">Categories</a>
              <a href="#why-switch" className="hover:text-[#C5A059] transition-colors">Owner Story</a>
              <a href="#os-diagram" className="hover:text-[#C5A059] transition-colors">The Platform</a>
              <a href="#india-network" className="hover:text-[#C5A059] transition-colors">Our Network</a>
              <a href="#pricing" className="hover:text-[#C5A059] transition-colors">Pricing</a>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5">
            <button 
              onClick={() => navigate('/admin/login')}
              className="text-xs font-bold tracking-widest uppercase text-[#0B3B2B]/75 hover:text-[#C5A059] transition-colors px-3 py-2"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold text-xs tracking-widest uppercase px-6 py-3 rounded-xl transition-all shadow-md shadow-[#0B3B2B]/10 active:scale-95 flex items-center gap-1.5 border border-[#C5A059]/10"
            >
              <span>Operator Trial</span>
              <ArrowRight size={13} className="text-[#C5A059]" />
            </button>
          </div>

          <button 
            className="md:hidden text-[#0B3B2B]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
            className="md:hidden fixed inset-x-0 top-20 bg-[#FDFBF7] border-b border-[#C5A059]/10 z-40 p-6 flex flex-col gap-6"
          >
            <a href="#marketplace" onClick={() => setMobileMenuOpen(false)} className="text-[#0B3B2B] font-bold text-lg">Marketplace</a>
            <a href="#categories" onClick={() => setMobileMenuOpen(false)} className="text-[#0B3B2B] font-bold text-lg">Categories</a>
            <a href="#why-switch" onClick={() => setMobileMenuOpen(false)} className="text-[#0B3B2B] font-bold text-lg">Owner Story</a>
            <a href="#os-diagram" onClick={() => setMobileMenuOpen(false)} className="text-[#0B3B2B] font-bold text-lg">The Platform</a>
            <a href="#india-network" onClick={() => setMobileMenuOpen(false)} className="text-[#0B3B2B] font-bold text-lg">Our Network</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[#0B3B2B] font-bold text-lg">Pricing</a>
            
            <div className="h-px bg-[#C5A059]/10 my-1" />
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/admin/login'); }}
                className="w-full text-center py-3 text-[#0B3B2B] font-bold border border-[#C5A059]/20 rounded-xl"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                className="w-full text-center py-3 bg-[#0B3B2B] text-white font-extrabold rounded-xl"
              >
                Start Free Trial
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO SECTION (Cinematic resort dream + search) ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#FAF9F6]">
        {/* Drone luxury stay backdrop */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&q=90" 
            alt="Luxury Maldives Stays" 
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-[#FAF9F6]/30 to-[#FAF9F6]/20" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C5A059]/40 bg-[#FDFBF7]/90 text-[#0B3B2B] text-xs font-bold tracking-widest uppercase shadow-sm"
          >
            <Award size={14} className="text-[#C5A059]" />
            Hospitality Commerce Operating System
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-playfair text-4xl sm:text-6xl lg:text-7xl font-semibold text-[#0B3B2B] leading-[1.08] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
          >
            Run your <span className="italic font-normal text-[#FAF9F6]">entire</span> hospitality <br />
            business from <span className="italic font-normal text-[#C5A059]">one platform.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[#FAF9F6] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-light font-inter"
          >
            A unified booking engine, PMS room planner, POS diner, and automatic WhatsApp messaging core tailored for independent boutique hotels, cottages, and resorts.
          </motion.p>

          {/* Airbnb-style Integrated Search Console */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-4xl mx-auto bg-white/95 border border-[#C5A059]/20 rounded-3xl p-4.5 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-left items-center"
          >
            <div className="p-3 border-r border-[#C5A059]/10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#C5A059] block mb-1">Destination</span>
              <div className="flex items-center gap-2">
                <Search size={14} className="text-[#0B3B2B]" />
                <input 
                  type="text" 
                  placeholder="e.g. Pondicherry" 
                  value={searchDestination}
                  onChange={e => setSearchDestination(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#0B3B2B] placeholder-[#0B3B2B]/40 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="p-3 border-r border-[#C5A059]/10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#C5A059] block mb-1">Check In</span>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#0B3B2B]" />
                <span className="text-xs font-bold text-[#0B3B2B]">26 Jun 2026</span>
              </div>
            </div>

            <div className="p-3 border-r border-[#C5A059]/10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#C5A059] block mb-1">Stay Category</span>
              <div className="flex items-center gap-2">
                <Hotel size={14} className="text-[#0B3B2B]" />
                <span className="text-xs font-bold text-[#0B3B2B]">Beach Villa</span>
              </div>
            </div>

            <div className="p-2.5">
              <a 
                href="#marketplace"
                className="w-full bg-[#0B3B2B] hover:bg-[#115C43] text-white text-xs font-bold py-3.5 px-5 rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0B3B2B]/10 active:scale-98"
              >
                <Search size={14} className="text-[#C5A059]" />
                <span>Search Stays</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE PROPERTY MARKETPLACE (Airbnb-Style, 20+ stays) ── */}
      <section id="marketplace" className="py-24 bg-[#FDFBF7] relative grid-light-sand">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Live Marketplace directory</span>
              <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B] leading-none">
                Explore stays powered by <span className="italic font-light text-[#C5A059]">TripLooper</span>
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm font-light">
                Secure direct checkout guaranteed. Every booking on these cards goes 100% direct to the stay operator.
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbars shrink-0">
              {["All Stays", "Beachfront", "Mountain View", "Heritage Quarter", "Eco Stays", "City Center"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveCategoryFilter(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    activeCategoryFilter === tab 
                      ? 'border-[#0B3B2B] bg-[#0B3B2B] text-white shadow-md shadow-[#0B3B2B]/10' 
                      : 'border-[#C5A059]/20 bg-[#FAF9F6] text-[#0B3B2B]/75 hover:border-[#0B3B2B]/35'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filteredProperties.map(p => (
              <div 
                key={p.id}
                onClick={() => {
                  if (p.subdomain) {
                    navigate(`/site/${p.subdomain}`);
                  } else {
                    toast.info(`Simulated: Redirecting to direct stay URL for ${p.name}`);
                  }
                }}
                className="group cursor-pointer space-y-3 relative"
              >
                {/* Image container */}
                <div className="relative aspect-[1.1] w-full rounded-2xl overflow-hidden bg-zinc-100 shadow-sm border border-[#C5A059]/10">
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Heart button */}
                  <button 
                    onClick={(e) => toggleLike(p.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-sm hover:scale-105 active:scale-95 transition-all text-zinc-700"
                  >
                    <Heart size={14} className={likes[p.id] ? "fill-red-500 text-red-500" : "text-zinc-800"} />
                  </button>

                  <span className="absolute bottom-3 left-3 bg-[#0B3B2B]/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-[#C5A059]/30">
                    {p.tag}
                  </span>
                </div>

                {/* Card metadata (Airbnb layout) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-playfair text-base font-bold text-[#0B3B2B] leading-snug group-hover:text-[#C5A059] transition-colors">{p.name}</h4>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#0A1612]">
                      <Star size={12} className="text-[#C5A059] fill-[#C5A059]" />
                      {p.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C5A059] font-semibold">{p.type} • {p.loc}</p>
                  <div className="flex justify-between items-baseline pt-1 border-t border-[#C5A059]/5 mt-2">
                    <span className="text-[12px] font-extrabold text-[#0B3B2B]">₹{p.price.toLocaleString('en-IN')}<span className="text-[9px] font-normal text-zinc-550">/night</span></span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-800 font-bold border border-emerald-500/20 px-2 py-0.5 rounded">Book Direct</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-20 border border-dashed border-[#C5A059]/20 rounded-3xl bg-[#FAF9F6]">
              <span className="text-zinc-400 text-xs italic">No stays matching search keywords found in marketplace.</span>
            </div>
          )}

        </div>
      </section>

      {/* ── SECTION 3: PROPERTY CATEGORIES ── */}
      <section id="categories" className="py-24 bg-[#FAF9F6] border-t border-[#C5A059]/10">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Stay configurations</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Handcrafted for every <span className="italic font-light text-[#C5A059]">stay category</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light leading-relaxed">
              We sync inventory, bookings, and billing folios with optimized layouts for all property categories.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Luxury Villas", desc: "Private pools & customizable add-ons", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" },
              { title: "Beach Resorts", desc: "Interactive map beachbeds & beachfront invoicing", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80" },
              { title: "Mountain Retreats", desc: "Room heaters & trail schedule notifications", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80" },
              { title: "Boutique Hotels", desc: "Express check-in & WhatsApp notifications link", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80" }
            ].map((cat, idx) => (
              <div 
                key={idx}
                className="group relative h-[380px] rounded-3xl overflow-hidden shadow-md border border-[#C5A059]/10 cursor-pointer"
              >
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 space-y-1.5 text-left">
                  <h4 className="font-playfair text-xl font-bold text-white leading-tight">{cat.title}</h4>
                  <p className="text-zinc-300 text-xs font-light">{cat.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C5A059] uppercase tracking-widest pt-2.5">
                    Explore stays <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── SECTION 4: WHY OWNERS SWITCH (Storytelling - DARK EMERALD ACCENT) ── */}
      <section id="why-switch" className="py-24 bg-[#0B251E] text-[#FAF9F6] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] grid-bg-dark bg-white" />
        
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          
          <div className="space-y-6">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">The Disconnected Struggle</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold leading-tight">
              Hospitality is broken <br />
              by <span className="italic font-light text-[#C5A059]">software silos</span>
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed font-light font-inter">
              Hotels struggle to balance multiple legacy applications. OTAs charge up to 20% in booking commissions, while manual spreadsheets and offline systems leak profits.
            </p>

            <div className="space-y-4 pt-4 text-left">
              <div className="flex gap-4 items-start bg-black/20 p-4.5 rounded-2xl border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Patchwork Solutions</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 font-light leading-normal">Mismatched inventory logs result in overbookings and billing errors during guest checkout.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-black/20 p-4.5 rounded-2xl border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Unified Direct Commerce</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 font-light leading-normal">TripLooper routes everything through your direct booking channel, retaining commissions and automating guest touchpoints.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            {/* Visual before vs after */}
            <div className="w-full max-w-[420px] bg-zinc-950/70 border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
              <span className="text-[9px] text-[#C5A059] font-extrabold uppercase tracking-widest">Operational Contrast</span>
              
              <div className="space-y-4 font-mono text-[10px]">
                <div className="space-y-2 border-b border-white/5 pb-4">
                  <span className="text-red-400 block font-bold">⚠️ WITHOUT TRIPLOOPER OS</span>
                  <div className="p-2.5 bg-red-950/10 border border-red-950/40 rounded-xl flex justify-between">
                    <span className="text-zinc-500">Booking.com Invoices</span>
                    <span className="text-red-400 font-bold">-₹14,200 (18%)</span>
                  </div>
                  <div className="p-2.5 bg-red-950/10 border border-red-950/40 rounded-xl flex justify-between">
                    <span className="text-zinc-500">Manual billing error</span>
                    <span className="text-red-400 font-bold">KOT ticket lost</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-emerald-400 block font-bold">✨ WITH TRIPLOOPER OS</span>
                  <div className="p-2.5 bg-emerald-950/10 border border-emerald-950/40 rounded-xl flex justify-between">
                    <span className="text-zinc-400">Direct booking payments</span>
                    <span className="text-emerald-400 font-bold">₹75,000 (0% Loss)</span>
                  </div>
                  <div className="p-2.5 bg-emerald-950/10 border border-emerald-950/40 rounded-xl flex justify-between">
                    <span className="text-zinc-400">WhatsApp check-in links</span>
                    <span className="text-emerald-400 font-bold">Auto sent ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 5: INTERACTIVE BOOKING ENGINE ── */}
      <section className="py-24 bg-[#FDFBF7] border-y border-[#C5A059]/10">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Direct conversion engine</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B] leading-tight">
              Cinematic booking <br />
              <span className="italic font-light text-[#C5A059]">experience</span>
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed font-light">
              Make room reservation fast and delightful. An elegant, mobile-responsive checkout flow styled to match luxury stays.
            </p>
            <ul className="space-y-3.5 text-xs text-[#0B3B2B]/75 font-medium">
              <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" /> Direct payment splits with customizable packages</li>
              <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" /> Dynamic availability checks prevent room locks</li>
              <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" /> Auto-generates guest check-in portal token</li>
            </ul>
          </div>

          <div className="lg:col-span-7 flex justify-center">
            <InteractiveBookingShowcase />
          </div>

        </div>
      </section>

      {/* ── SECTION 6: TRIPLOOPER OS DIAGRAM (DARK EMERALD ACCENT) ── */}
      <section id="os-diagram" className="py-24 bg-[#0B251E] text-[#FAF9F6] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] grid-bg-dark bg-white" />
        
        <div className="max-w-7xl mx-auto px-6 w-full text-center relative z-10 mb-12 space-y-3">
          <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase block">Visual OS Architecture</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-white">
            Unified Hospitality <span className="italic font-light text-[#C5A059]">Engine</span>
          </h2>
          <p className="text-zinc-300 text-xs sm:text-sm max-w-xl mx-auto font-light">
            TripLooper links your bookings database directly to housekeeping grids, restaurant terminals, and automatic messaging bots.
          </p>
        </div>

        <div className="max-w-6xl mx-auto flex items-center justify-center relative min-h-[420px]">
          <ExplodedDashboard />
        </div>
      </section>

      {/* ── SECTION 7: GUEST JOURNEY HORIZONTAL TIMELINE ── */}
      <section className="py-24 bg-[#FDFBF7] border-y border-[#C5A059]/10">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">The Guest Experience</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              The connected guest <span className="italic font-light text-[#C5A059]">lifecycle</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light leading-relaxed">
              Track how TripLooper manages guest stays autonomously, from reservation checks to final billing.
            </p>
          </div>

          <InteractiveGuestJourney />

        </div>
      </section>

      {/* ── SECTION 8: PROPERTY SHOWCASE MASONRY GALLERY (Dream Travel Stays) ── */}
      <section className="py-24 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Luxe Stay Showcase</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Inspiring travel <span className="italic font-light text-[#C5A059]">desire</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light">
              See the outstanding properties that trust TripLooper to coordinate their guest rooms.
            </p>
          </div>

          {/* Masonry image stack grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-4">
              <img src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&q=80" alt="Resort" className="w-full aspect-[0.75] object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
              <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80" alt="Suite Loft" className="w-full aspect-square object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
            </div>
            <div className="space-y-4 pt-8">
              <img src="https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=80" alt="Cottage Valleys" className="w-full aspect-square object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
              <img src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80" alt="Lodge Orchard" className="w-full aspect-[1.3] object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
            </div>
            <div className="space-y-4">
              <img src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80" alt="Beachfront House" className="w-full aspect-[1.1] object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
              <img src="https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=600&q=80" alt="Luxury Villa" className="w-full aspect-[0.7] object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
            </div>
            <div className="space-y-4 pt-6">
              <img src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80" alt="Mist resort" className="w-full aspect-square object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
              <img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80" alt="Farmhouse" className="w-full aspect-[1.2] object-cover rounded-3xl border border-[#C5A059]/10 shadow-sm" />
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 9: RESTAURANT POS INTERACTIVE ── */}
      <section className="py-24 bg-[#FDFBF7] border-y border-[#C5A059]/10">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3B2B]/5 border border-[#C5A059]/25 text-[#0B3B2B] flex items-center justify-center">
              <Coffee size={20} className="text-[#C5A059]" />
            </div>
            <h3 className="font-playfair text-3xl font-semibold text-[#0B3B2B] leading-tight">
              Integrated Food & Beverage <br />
              <span className="italic font-light text-[#C5A059]">Restaurant POS</span>
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed font-light">
              Send kitchen order tickets (KOT) directly from rooms or tables. Guests place orders using QR menus, and charges update instantly on their main bill sheet.
            </p>
            <ul className="space-y-3.5 text-xs text-[#0B3B2B]/75 font-medium">
              <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" /> Auto prints tickets to the kitchen router</li>
              <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" /> Link menu items to room folios dynamically</li>
              <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" /> Supports split billing & digital UPI codes</li>
            </ul>
          </div>

          <div className="lg:col-span-7 flex justify-center">
            <InteractivePOSShowcase />
          </div>

        </div>
      </section>

      {/* ── SECTION 10: INDIA PROPERTY MAP NETWORK ── */}
      <section id="india-network" className="py-24 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-5 space-y-8">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Stay networks</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Active properties <br />
              spanning <span className="italic font-light text-[#C5A059]">South India</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light leading-relaxed">
              We sync inventory across guest cottages, resorts, and city suites daily in Tamil Nadu, Pondicherry, Ooty, and Madurai.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#C5A059]/10">
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#0B3B2B] tracking-tight">10,000+</span>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Rooms Coordinated</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#0B3B2B] tracking-tight">₹50Cr+</span>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Direct revenue processed</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#0B3B2B] tracking-tight">100,000+</span>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Direct Bookings</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#0B3B2B] tracking-tight">99.99%</span>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Uptime guarantee</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex justify-center">
            {/* Elegant light map visualization */}
            <div className="w-full max-w-[480px] aspect-square bg-[#FAF9F6] border border-[#C5A059]/30 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={12} className="animate-pulse" />
                Live Network Node map
              </span>

              <div className="relative flex-1 w-full flex items-center justify-center select-none pt-4">
                <svg viewBox="0 0 400 400" className="w-full h-full opacity-70">
                  <path 
                    d="M 120 40 L 250 80 L 320 150 L 340 280 L 280 380 L 210 390 L 190 350 L 160 300 L 120 280 L 100 200 L 110 100 Z" 
                    fill="none" 
                    stroke="rgba(11, 59, 43, 0.08)" 
                    strokeWidth="3" 
                  />
                  <path 
                    d="M 120 40 L 250 80 L 320 150 L 340 280 L 280 380 L 210 390 L 190 350 L 160 300 L 120 280 L 100 200 L 110 100 Z" 
                    fill="none" 
                    stroke="#0B3B2B" 
                    strokeWidth="1.2" 
                    strokeOpacity="0.3" 
                    strokeDasharray="5, 8" 
                  />
                  
                  {/* Pulse stay pins */}
                  {properties.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="3" fill="#C5A059" />
                      <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="#C5A059" strokeWidth="0.5" className="animate-ping" style={{ animationDuration: `${2.5 + (idx % 3)}s` }} />
                    </g>
                  ))}
                </svg>

                {/* Map labels */}
                <div className="absolute top-12 right-12 bg-white/95 border border-[#C5A059]/30 p-2.5 rounded-xl text-left shadow-sm">
                  <p className="text-[10px] font-bold text-[#0B3B2B]">Anya Paradise</p>
                  <p className="text-[8px] text-[#C5A059] font-bold">15 Rooms • Direct Invoicing On</p>
                </div>
                
                <div className="absolute bottom-16 left-16 bg-white/95 border border-[#C5A059]/30 p-2.5 rounded-xl text-left shadow-sm">
                  <p className="text-[10px] font-bold text-[#0B3B2B]">Coolspot Cottage</p>
                  <p className="text-[8px] text-zinc-500">9 Rooms • Ooty stay</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t border-[#C5A059]/10 pt-3 mt-4">
                <span>Active direct bookings metrics</span>
                <span>South region nodes</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 11: REVENUE CALCULATOR ── */}
      <section className="py-24 bg-[#FDFBF7] border-y border-[#C5A059]/10">
        <div className="max-w-4xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Savings & Margin calculator</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Calculate your <span className="italic font-light text-[#C5A059]">recovered yields</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light">
              Drag the sliders below to estimate direct channel profit gains and commissions saved.
            </p>
          </div>

          <RevenueSimulator />

        </div>
      </section>

      {/* ── SECTION 12: TRIPLOOPER AI (Apple-Style, LIGHT MINIMALIST) ── */}
      <section className="py-24 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          
          {/* AI Interface Box */}
          <div className="relative flex justify-center items-center h-[380px]">
            <div className="absolute w-[300px] h-[300px] border border-[#C5A059]/20 rounded-full animate-spin [animation-duration:40s] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#C5A059] absolute -top-1.5" />
            </div>

            <div className="relative w-[340px] bg-white border border-[#C5A059]/20 rounded-3xl p-5.5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <span className="text-[10px] font-extrabold text-[#0B3B2B] tracking-wider flex items-center gap-1.5 uppercase">
                  <Bot size={13} className="text-[#C5A059]" />
                  TripLooper AI
                </span>
                <span className="text-[9px] text-[#C5A059] font-bold">ACTIVE FORECAST</span>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-[#FDFBF7] rounded-xl text-[10.5px] border border-[#C5A059]/10 text-left">
                  <span className="text-[8px] text-[#C5A059] font-black uppercase tracking-wider block mb-1">Occupancy Forecast</span>
                  <p className="text-[#0B3B2B] font-light leading-normal">
                    "Ooty festival dates detected. Occupancy gap is forecasted to drop to 8% next week. Suggest launching target WhatsApp concierge upsell for <b>Coolspot Cottage</b> keys."
                  </p>
                </div>
                
                <button 
                  onClick={() => toast.success("TripLooper AI dynamic recommendation applied")}
                  className="w-full bg-[#0B3B2B] hover:bg-[#115C43] text-white text-xs font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wider shadow-sm"
                >
                  Apply AI pricing rule
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Intelligence engine</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B] leading-tight">
              Hospitality Intelligence, <br />
              <span className="italic font-light text-[#C5A059]">Fully Automated</span>
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed font-light">
              TripLooper AI runs in the background. It models local stay demand vectors, guest query reviews, and schedules WhatsApp messages to secure room reservations.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-5 pt-4">
              {[
                { title: "Review Sentiment Mining", desc: "Monitors guest feedback logs automatically" },
                { title: "WhatsApp AI Concierge", desc: "Answers guest check-in questions instantly" },
                { title: "Revenue Yield Optimizations", desc: "Adjusts ADR according to regional stay demands" },
                { title: "In-stay Upsell Engine", desc: "Triggers room service coffee offers during stays" }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="text-xs font-bold text-[#0B3B2B]">{item.title}</h4>
                  <p className="text-[11px] text-zinc-400 font-light leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 13: SUCCESS STORIES WITH REAL PROPERTIES ── */}
      <section className="py-24 bg-[#FDFBF7] border-t border-[#C5A059]/10">
        <div className="max-w-6xl mx-auto px-6 space-y-20">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Operator feedback</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Proven growth from <span className="italic font-light text-[#C5A059]">active stays</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light">
              Real case studies from hotel owners coordinating their stays with TripLooper.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Direct bookings increased by 35% in our first month. The WhatsApp magic check-in link means our reception is practically hands-off now.",
                owner: "Saravanan Sk",
                stay: "Coolspot Cottage",
                rooms: "9 Rooms",
                stat: "+35% Direct Bookings"
              },
              {
                quote: "Room service used to require dedicated servers answering phones. Now guests scan the QR code, order, and the charges drop on their bill instantly.",
                owner: "Ramdas",
                stay: "Sai Residency",
                rooms: "11 Rooms",
                stat: "Saved 18 Hours / Wk"
              },
              {
                quote: "No double booking issues since setup. The real-time synchronization is fast, and our P&L reports are exportable for taxation in one click.",
                owner: "Nest N Rest Operator",
                stay: "Nest N Rest Cottage",
                rooms: "6 Rooms",
                stat: "Zero Overbookings"
              }
            ].map((story, idx) => (
              <div 
                key={idx}
                className="bg-white border border-[#C5A059]/10 p-7 rounded-3xl shadow-sm hover:border-[#0B3B2B]/30 transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} className="text-[#C5A059] fill-[#C5A059]" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed italic font-light">"{story.quote}"</p>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-[#C5A059]/10">
                  <div>
                    <h4 className="text-xs font-bold text-[#0B3B2B]">{story.owner}</h4>
                    <p className="text-[10px] text-zinc-400">{story.stay} • {story.rooms}</p>
                  </div>
                  <span className="text-[10px] bg-[#0B3B2B]/5 text-[#0B3B2B] font-extrabold px-2.5 py-1 rounded-full border border-[#C5A059]/20">
                    {story.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── SECTION 14: PRICING (WARM WHITE GLASSMORPHISM) ── */}
      <section id="pricing" className="py-24 bg-[#FAF9F6] border-y border-[#C5A059]/10">
        <div className="max-w-6xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Transparent Pricing</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Bespoke value-driven <span className="italic font-light text-[#C5A059]">plans</span>
            </h2>
            <p className="text-sm text-zinc-500 font-light">
              No complex setup fees or locking agreements. Choose annual billing to save 20%.
            </p>
          </div>

          <PricingPlan />

        </div>
      </section>

      {/* ── SECTION 15: FAQ Accordion ── */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="max-w-3xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs text-[#C5A059] font-extrabold tracking-widest uppercase">Hospitality Questions</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-semibold text-[#0B3B2B]">
              Frequently Asked <span className="italic font-light text-[#C5A059]">Queries</span>
            </h2>
          </div>

          <HospitalityFAQ />

        </div>
      </section>

      {/* ── SECTION 16: FINAL CTA (Luxury Resort Visual Backdrop) ── */}
      <section className="relative py-32 overflow-hidden bg-[#0A1612]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=1600&q=90" 
            alt="Luxury Aman Resort Pool" 
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1612] via-black/30 to-black/20" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <h2 className="font-playfair text-3xl sm:text-6xl font-semibold text-white leading-tight">
            Your resort deserves better <br />
            than <span className="italic font-normal text-[#C5A059]">disconnected software.</span>
          </h2>
          
          <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed font-light font-inter">
            Scale direct reservations, automate check-ins, and orchestrate food orderings from a single direct-commerce operating system.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => navigate('/signup')}
              className="bg-[#C5A059] hover:bg-[#D4AF37] text-white font-bold text-xs tracking-widest uppercase px-8 py-4.5 rounded-2xl transition-all shadow-xl hover:scale-[1.01] active:scale-[0.98] flex items-center gap-2 border border-[#C5A059]/20"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={14} />
            </button>
            <button 
              onClick={() => {
                toast.success("We'll reach out to schedule a custom demo shortly!");
              }}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-8 py-4.5 rounded-2xl transition-all active:scale-[0.98] text-xs font-bold tracking-widest uppercase"
            >
              Book Custom Demo
            </button>
          </div>

          <div className="flex justify-center items-center gap-8 pt-8 text-[11px] text-zinc-400 uppercase tracking-widest font-semibold">
            <span>Setup in under 15 min</span>
            <span>•</span>
            <span>No credit card needed</span>
            <span>•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[#FAF9F6] border-t border-[#C5A059]/20 py-16 text-xs text-zinc-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          
          <div className="space-y-4 col-span-2 md:col-span-1">
            <span className="font-playfair text-base font-black tracking-widest text-[#0B3B2B]">
              TRIP<span className="text-[#C5A059]">LOOPER</span>
            </span>
            <p className="leading-relaxed text-zinc-500 font-light">
              The operating system for independent boutique hotels, cottages, and resorts.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-[#0B3B2B] uppercase tracking-wider text-[10px]">Product</h4>
            <ul className="space-y-2 font-light">
              <li><a href="#marketplace" className="hover:text-[#C5A059]">Marketplace</a></li>
              <li><a href="#simulator" className="hover:text-[#C5A059]">ROI Calculator</a></li>
              <li><a href="#pricing" className="hover:text-[#C5A059]">Pricing</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-[#0B3B2B] uppercase tracking-wider text-[10px]">Legal</h4>
            <ul className="space-y-2 font-light">
              <li><a href="#" className="hover:text-[#C5A059]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#C5A059]">Terms of Service</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-[#0B3B2B] uppercase tracking-wider text-[10px]">Contact</h4>
            <ul className="space-y-2 text-[#0B3B2B]/75 font-mono">
              <li>support@triplooper.com</li>
              <li>+91 90427 37424</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-[#C5A059]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          <p>© {new Date().getFullYear()} TripLooper. All rights reserved.</p>
          <p>Handcrafted for luxury stay operators.</p>
        </div>
      </footer>

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
        <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-[#C5A059]/20">
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
function ExplodedDashboard() {
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
          <Database className="text-[#C5A059]" size={16} />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Master Database Core</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-1">
            <span className="text-[18px] font-bold text-white tracking-tight">100% Synced</span>
            <p className="text-[9px] text-[#C5A059] font-mono">11 stays coordinated</p>
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
              stroke="rgba(197, 160, 89, 0.2)"
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
            className="absolute w-[180px] bg-zinc-950/70 border border-white/10 p-4 rounded-xl shadow-xl z-20 flex gap-3 items-center backdrop-blur-md cursor-pointer hover:border-[#C5A059] transition-colors duration-300"
            onClick={() => toast.info(`Explored Module: ${m.name}`)}
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
              <Icon className="text-[#C5A059]" size={16} />
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
function InteractiveBookingShowcase() {
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
    <div className="w-full max-w-[440px] bg-white border border-[#C5A059]/20 rounded-3xl p-5 shadow-xl relative text-left">
      <div className="flex justify-between items-center pb-3.5 border-b border-[#C5A059]/10">
        <span className="text-[10px] text-[#0B3B2B] font-extrabold uppercase tracking-widest">Anya Paradise Engine</span>
        <span className="text-[10px] text-zinc-400">Secure Direct Checkout</span>
      </div>

      {step === 0 && (
        <div className="space-y-4 pt-4">
          <label className="text-[10px] text-[#0B3B2B] uppercase font-black">Select Stay Category</label>
          <div className="grid grid-cols-2 gap-3">
            {['Deluxe Villa', 'Luxury Suite'].map(c => (
              <button 
                key={c}
                onClick={() => setRoomType(c)}
                className={`p-3 text-xs font-bold rounded-xl border text-left transition-all ${roomType === c ? 'border-[#0B3B2B] bg-[#0B3B2B]/5 text-[#0B3B2B]' : 'border-zinc-100 bg-[#FAF9F6] text-zinc-500'}`}
              >
                {c}
                <span className="block text-[10px] text-[#C5A059] font-normal mt-0.5">{c === 'Deluxe Villa' ? '₹4,500/N' : '₹7,500/N'}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-[#0B3B2B] uppercase font-black">Stay Days</label>
            <div className="flex items-center gap-3">
              {[2, 3, 5].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border text-center transition-all ${days === d ? 'border-[#0B3B2B] bg-[#0B3B2B]/5 text-[#0B3B2B]' : 'border-zinc-100 bg-[#FAF9F6] text-zinc-500'}`}
                >
                  {d} Nights
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setStep(1)}
            className="w-full bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            Configure add-ons <ArrowRight size={14} />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 pt-4">
          <label className="text-[10px] text-[#0B3B2B] uppercase font-black">Add-on Experiences</label>
          <div className="space-y-2">
            <div 
              onClick={() => setExtras({ ...extras, spa: !extras.spa })}
              className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${extras.spa ? 'border-[#0B3B2B] bg-[#0B3B2B]/5' : 'border-zinc-100 bg-[#FAF9F6]'}`}
            >
              <div>
                <p className="text-xs font-bold text-[#0B3B2B]">Full Body Aromatherapy</p>
                <p className="text-[9px] text-zinc-500">1 Session • Spa Wellness</p>
              </div>
              <span className="text-xs font-bold text-[#C5A059]">+₹2,000</span>
            </div>

            <div 
              onClick={() => setExtras({ ...extras, dinner: !extras.dinner })}
              className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${extras.dinner ? 'border-[#0B3B2B] bg-[#0B3B2B]/5' : 'border-zinc-100 bg-[#FAF9F6]'}`}
            >
              <div>
                <p className="text-xs font-bold text-[#0B3B2B]">Gourmet Dinner Package</p>
                <p className="text-[9px] text-zinc-500">Buffet Dinners daily</p>
              </div>
              <span className="text-xs font-bold text-[#C5A059]">+₹1,200/N</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[#C5A059]/10">
            <span className="text-xs text-zinc-400 font-semibold">Total Amount</span>
            <span className="text-lg font-black text-[#0B3B2B]">₹{price.toLocaleString('en-IN')}</span>
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
              className="flex-1 bg-[#0B3B2B] text-white py-3 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#115C43]"
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
function InteractiveGuestJourney() {
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
    <div className="w-full max-w-[520px] mx-auto bg-white border border-[#C5A059]/20 rounded-3xl p-6 shadow-md relative flex flex-col justify-between text-left">
      <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-6">
        <Activity size={12} /> Guest Lifecycle logs
      </span>

      <div className="space-y-4">
        {journey.map((node, idx) => (
          <div 
            key={idx}
            onClick={() => setActiveNode(idx)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-4 ${activeNode === idx ? 'border-[#0B3B2B]/40 bg-[#0B3B2B]/5' : 'border-zinc-100 bg-[#FAF9F6]/40 hover:border-zinc-200'}`}
          >
            <div className="flex flex-col items-center shrink-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${activeNode === idx ? 'bg-[#0B3B2B] text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                {idx + 1}
              </span>
              {idx < journey.length - 1 && <div className="w-px h-10 bg-zinc-100 mt-2" />}
            </div>
            <div>
              <div className="flex justify-between items-baseline gap-2">
                <h4 className="text-xs font-bold text-[#0B3B2B] leading-none">{node.title}</h4>
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
function InteractivePOSShowcase() {
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
    <div className="w-full max-w-[440px] bg-white border border-[#C5A059]/20 rounded-3xl p-5 shadow-xl relative text-left">
      <div className="flex justify-between items-center pb-3.5 border-b border-[#C5A059]/10">
        <span className="text-[10px] text-[#0B3B2B] font-extrabold uppercase tracking-widest flex items-center gap-1">
          <Coffee size={12} className="text-[#C5A059]" /> Table 04 POS Terminal
        </span>
        <span className="text-[9px] text-zinc-400">Room Folio Link: On</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-4">
        {menu.map((m, i) => (
          <button
            key={i}
            onClick={() => addItem(m)}
            className="p-3 text-[11px] font-bold text-zinc-650 border border-zinc-100 bg-[#FAF9F6] rounded-xl hover:border-[#0B3B2B]/30 hover:bg-[#0B3B2B]/2 text-left transition-colors"
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
                  <span className="font-bold text-[#0B3B2B]">₹{item.price}</span>
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
              <span className="font-black text-[#0B3B2B]">₹{total}</span>
            </div>
            
            <button 
              onClick={sendOrder}
              className="w-full bg-[#0B3B2B] text-white py-3 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#115C43]"
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
function RevenueSimulator() {
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
    <div className="bg-white border border-[#C5A059]/20 rounded-3xl p-6 md:p-8 grid md:grid-cols-12 gap-8 shadow-md text-left">
      
      {/* Sliders Left */}
      <div className="md:col-span-7 space-y-6">
        <h3 className="text-base font-bold text-[#0B3B2B] flex items-center gap-2 uppercase tracking-wider text-xs border-b border-zinc-100 pb-3">
          <Calculator size={14} className="text-[#C5A059]" /> Adjust stay indicators
        </h3>
        
        {/* Rooms Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400 font-medium">Total Keys / Rooms</span>
            <span className="text-[#0B3B2B] font-bold">{rooms} Rooms</span>
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
            <span className="text-[#0B3B2B] font-bold">₹{adr.toLocaleString('en-IN')}</span>
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
            <span className="text-[#0B3B2B] font-bold">{occupancy}%</span>
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
      <div className="md:col-span-5 bg-[#FAF9F6] border border-[#C5A059]/10 p-6 rounded-2xl flex flex-col justify-between space-y-6">
        <div className="space-y-4 text-left">
          <div>
            <span className="text-[9px] text-[#C5A059] uppercase tracking-widest font-extrabold">Estimated annual revenue</span>
            <p className="text-2xl font-black text-[#0B3B2B] tracking-tight mt-0.5">
              ₹<AnimatedNumber value={stats.annualBaseRevenue} />
            </p>
          </div>

          <div className="pt-4 border-t border-[#C5A059]/10 flex justify-between items-center text-xs">
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

        <div className="bg-[#0B3B2B]/5 border border-[#C5A059]/20 p-4.5 rounded-xl text-center space-y-1">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#0B3B2B]">Net direct channel savings</span>
          <p className="text-xl font-black text-[#0B3B2B] tracking-tight">
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
function PricingPlan() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const basePrice = billingCycle === 'annual' ? 3999 : 4999;
  const roomSurcharge = billingCycle === 'annual' ? 120 : 150;

  return (
    <div className="space-y-10 max-w-xl mx-auto">
      
      {/* Toggle */}
      <div className="flex justify-center">
        <div className="bg-[#FAF9F6]/60 border border-[#C5A059]/20 p-1.5 rounded-2xl flex gap-1.5 backdrop-blur-md shadow-inner">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[#0B3B2B] text-white shadow-sm'
                : 'text-zinc-550 hover:text-zinc-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-[#0B3B2B] text-white shadow-sm'
                : 'text-zinc-550 hover:text-zinc-700'
            }`}
          >
            Annual
            <span className="text-[8px] bg-[#C5A059] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Deluxe Package Card */}
      <div className="relative bg-white border border-[#C5A059]/20 rounded-3xl p-8 shadow-md flex flex-col justify-between space-y-6 overflow-hidden">
        <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#C5A059] text-white font-extrabold text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border border-[#FAF9F6]/20">
          Super Operator Pack
        </div>

        <div className="space-y-4 text-left">
          <div>
            <h3 className="text-xl font-bold text-[#0B3B2B] tracking-tight">Enterprise Operating System</h3>
            <p className="text-xs text-zinc-500 mt-1 font-light leading-normal">Unified hospitality commerce software for boutique stays, cottages, resorts, and residencies.</p>
          </div>

          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-4xl font-black text-[#0B3B2B] tracking-tight">₹{basePrice.toLocaleString('en-IN')}</span>
            <span className="text-xs text-zinc-400">/month base</span>
          </div>
          
          <p className="text-[10px] text-zinc-450 font-mono">+ ₹{roomSurcharge}/room per month (pay only for active rooms in PMS)</p>

          <div className="h-px bg-zinc-100 my-4" />

          {/* Core features */}
          <ul className="space-y-3.5 text-xs text-zinc-650 font-light">
            {[
              'Unlimited direct booking engine bookings',
              'Real-time Channel Manager (2-way OTA sync)',
              'Guest Portal with magic checkout and billing links',
              'Restaurant POS (dine-in, table order, room service)',
              'WhatsApp message reminders & verification alerts',
              'Multi-user operational permission access roles',
              'Exportable Profit & Loss reports for tax filing'
            ].map((f, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <a
            href="/signup"
            className="w-full bg-[#0B3B2B] hover:bg-[#115C43] text-white font-black h-13 rounded-2xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight size={14} />
          </a>
          <p className="text-center text-[10px] text-zinc-400">Cancel or scale down your active keys at any point.</p>
        </div>

      </div>

    </div>
  );
}

// FAQ Accordion subcomponent
function HospitalityFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Can TripLooper sync with Booking.com and Airbnb in real-time?",
      a: "Yes, our built-in 2-way Channel Manager keeps your rooms inventory synced across all major OTAs (Booking.com, Agoda, Airbnb, and Expedia) automatically in under 5 seconds to prevent overbookings."
    },
    {
      q: "How does the guest self check-in link work?",
      a: "As soon as a direct reservation is placed or imported, TripLooper's WhatsApp bot triggers a pre-arrival message containing a magic link token. Guests upload their IDs and register on their phones, updating room housekeeping status to Checked In instantly."
    },
    {
      q: "Can room service charges be posted directly to room bills?",
      a: "Absolutely. When guests scan their room's dine-in QR menu, they select items and click order. The KOT compiles in the kitchen, and POS charges drop onto their guest bill folio immediately."
    },
    {
      q: "Is there a long-term contract or setup fee?",
      a: "No long contracts. We offer a simple 14-day free trial. After that, you pay a flat monthly or annual base fee + a surcharge per room key. You only pay for active rooms you manage."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <div 
          key={idx} 
          className="border border-[#C5A059]/20 rounded-2xl bg-white shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full px-6 py-4.5 text-left font-playfair font-bold text-sm sm:text-base text-[#0B3B2B] flex justify-between items-center hover:text-[#C5A059] transition-colors"
          >
            <span>{faq.q}</span>
            <ChevronDown 
              size={18} 
              className={`text-[#C5A059] transition-transform duration-350 ${openIndex === idx ? 'rotate-180' : ''}`} 
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
