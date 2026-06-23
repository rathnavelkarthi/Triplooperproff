import { useState } from 'react';
import { Menu, X, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PricingHeroNavbar() {
    const [isOpen, setIsOpen] = useState(false);

    // 8 circles around (16,16) with radius 10, plus center circle. Casing matches (x,y)
    const petals = [
        { cx: 26, cy: 16 },
        { cx: 23.07, cy: 23.07 },
        { cx: 16, cy: 26 },
        { cx: 8.93, cy: 23.07 },
        { cx: 6, cy: 16 },
        { cx: 8.93, cy: 8.93 },
        { cx: 16, cy: 6 },
        { cx: 23.07, cy: 8.93 },
        { cx: 16, cy: 16 } // center circle
    ];

    const logoSvg = (
        <svg viewBox="0 0 32 32" className="w-7 h-7 sm:w-8 sm:h-8 fill-[#ef4d23] shrink-0">
            {petals.map((p, idx) => (
                <circle key={idx} cx={p.cx} cy={p.cy} r={3.5} />
            ))}
        </svg>
    );

    return (
        <header className="relative w-full flex justify-center pt-4 sm:pt-6 px-3 sm:px-4 z-40">
            <div className="bg-white rounded-full shadow-sm border border-neutral-200 pl-4 pr-2 py-2 w-full max-w-[760px] flex items-center justify-between relative">
                
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2" aria-label="Trip Looper Home">
                    {logoSvg}
                    <span className="text-sm font-bold text-neutral-900 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Trip Looper
                    </span>
                </Link>

                {/* Desktop Links */}
                <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-neutral-600">
                    <Link to="/" className="hover:text-neutral-900 flex items-center gap-1 transition-colors">
                        Home
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 shrink-0" />
                    </Link>
                    <a href="#features" className="hover:text-neutral-900 transition-colors">
                        Features
                    </a>
                    <a href="#hotel-explorer" className="hover:text-neutral-900 transition-colors">
                        Book Stay
                    </a>
                    <Link to="/pricing" className="text-[#ef4d23] font-semibold flex items-center gap-0.5 hover:text-[#d63f1a] transition-colors">
                        Pricing
                        <ChevronDown size={14} className="mt-0.5" />
                    </Link>
                </nav>

                {/* Right Cluster */}
                <div className="flex items-center gap-3 ml-auto md:ml-0">
                    <button className="hidden md:flex text-neutral-400 hover:text-neutral-600 p-2 relative cursor-pointer" aria-label="Shopping Cart">
                        <ShoppingCart size={18} />
                    </button>
                    
                    {/* Get early access CTA */}
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 bg-[#ef4d23] hover:bg-[#d63f1a] active:scale-[0.98] text-white text-xs sm:text-[13px] font-semibold pl-4 pr-1.5 py-1.5 rounded-full transition-all shadow-sm"
                    >
                        <span className="hidden sm:inline">Get early access</span>
                        <span className="inline sm:hidden">Early access</span>
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <ChevronRight size={13} className="text-white" />
                        </span>
                    </Link>

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-neutral-500 hover:text-neutral-800 focus:outline-none cursor-pointer"
                        aria-label="Toggle menu"
                    >
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Dropdown Panel */}
                {isOpen && (
                    <div className="absolute top-full left-2 right-2 mt-2 bg-white rounded-2xl shadow-lg border border-neutral-200 p-4 z-50 flex flex-col gap-3 md:hidden">
                        <Link to="/" onClick={() => setIsOpen(false)} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1 flex items-center justify-between border-b border-neutral-100">
                            Home
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                        </Link>
                        <a href="#features" onClick={() => setIsOpen(false)} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1 border-b border-neutral-100 block">
                            Features
                        </a>
                        <a href="#hotel-explorer" onClick={() => setIsOpen(false)} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1 border-b border-neutral-100 block">
                            Book Stay
                        </a>
                        <Link to="/pricing" onClick={() => setIsOpen(false)} className="text-sm font-bold text-[#ef4d23] hover:text-[#d63f1a] py-1 flex items-center justify-between">
                            Pricing
                            <ChevronDown size={14} />
                        </Link>
                    </div>
                )}

            </div>
        </header>
    );
}
