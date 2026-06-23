import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Stays', href: '#hotel-explorer' },
    { label: 'Modules', href: '#modules' },
    { label: 'Pricing', href: '#pricing' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('');

    const updateActiveSection = useCallback(() => {
        const sections = ['pricing', 'modules', 'features', 'hotel-explorer'];
        for (const id of sections) {
            const el = document.getElementById(id);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= 120 && rect.bottom > 120) {
                    setActiveSection(`#${id}`);
                    return;
                }
            }
        }
        setActiveSection('');
    }, []);

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 40);
            updateActiveSection();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [updateActiveSection]);

    // Close mobile menu on screen resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        setMobileOpen(false);
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="fixed top-0 left-0 right-0 z-50"
        >
            <motion.div
                animate={{
                    backgroundColor: scrolled ? 'rgba(10,10,10,0.85)' : 'rgba(0,0,0,0)',
                    backdropFilter: scrolled ? 'saturate(180%) blur(20px)' : 'none',
                    WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(20px)' : 'none',
                    borderBottomColor: scrolled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0)',
                }}
                transition={{ duration: 0.3 }}
                className="border-b border-transparent"
            >
                <div className="max-w-[980px] mx-auto px-6 flex items-center justify-between"
                    style={{ height: scrolled ? 54 : 64, transition: 'height 0.3s ease' }}
                >
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0">
                        <div className="w-7 h-7 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold leading-none">T</span>
                        </div>
                        <span className="text-white text-[15px] font-semibold tracking-tight">
                            Trip Looper
                        </span>
                    </Link>

                    {/* Center links — desktop */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={(e) => handleAnchor(e, link.href)}
                                className={`text-[13px] transition-colors duration-200 tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:rounded-sm px-1 py-0.5 ${
                                    activeSection === link.href
                                        ? 'text-[var(--color-primary)] font-semibold'
                                        : 'text-white/70 hover:text-white'
                                }`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Right — desktop */}
                    <div className="hidden md:flex items-center gap-5">
                        <Link
                            to="/admin/login"
                            className="text-[13px] text-white/60 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:rounded-sm px-1 py-0.5"
                        >
                            Sign In
                        </Link>
                        <a
                            href="https://wa.me/919345244727?text=Hi%2C%20I%20want%20to%20learn%20about%20Trip%20Looper"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:scale-[1.02] active:scale-[0.98] px-[18px] py-[8px] rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(0,113,227,0.4)] hover:shadow-[0_0_40px_rgba(0,113,227,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
                        >
                            Start Free
                        </a>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden text-white/80 hover:text-white p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:rounded-lg"
                        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </motion.div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="md:hidden overflow-hidden bg-black/95 backdrop-blur-xl border-b border-white/[0.08]"
                    >
                        <div className="px-6 py-5 flex flex-col gap-4 max-h-[calc(100vh-64px)] overflow-y-auto">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={(e) => handleAnchor(e, link.href)}
                                    className="text-[15px] text-white/70 hover:text-white transition-colors py-1"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                                <Link
                                    to="/admin/login"
                                    className="text-[15px] text-white/60 hover:text-white transition-colors py-1"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <a
                                    href="https://wa.me/919345244727?text=Hi%2C%20I%20want%20to%20learn%20about%20Trip%20Looper"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[15px] text-center font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-5 py-2.5 rounded-full transition-all duration-200"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Start Free
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
