import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Modules', href: '#modules' },
    { label: 'Pricing', href: '#pricing' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('');

    const updateActiveSection = useCallback(() => {
        const sections = ['pricing', 'modules', 'features'];
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
                    backgroundColor: scrolled ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.6)',
                    backdropFilter: 'saturate(180%) blur(20px)',
                    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                }}
                transition={{ duration: 0.3 }}
                className="border-b border-white/[0.08]"
            >
                <div className="max-w-[980px] mx-auto px-6 flex items-center justify-between"
                    style={{ height: scrolled ? 48 : 56, transition: 'height 0.3s ease' }}
                >
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0">
                        <div className="w-7 h-7 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold leading-none">E</span>
                        </div>
                        <span className="text-white text-[15px] font-semibold tracking-tight">
                            EasyStay
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
                                        ? 'text-white font-medium'
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
                        <Link
                            to="/admin/login"
                            className="text-[13px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:scale-[1.02] active:scale-[0.98] px-[18px] py-[8px] rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(0,113,227,0.4)] hover:shadow-[0_0_40px_rgba(0,113,227,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
                        >
                            Start Free
                        </Link>
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
                        <div className="px-6 py-5 flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={(e) => handleAnchor(e, link.href)}
                                    className="text-[15px] text-white/70 hover:text-white transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                                <Link
                                    to="/admin/login"
                                    className="text-[15px] text-white/60 hover:text-white transition-colors"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/admin/login"
                                    className="text-[15px] text-center font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-5 py-2.5 rounded-full transition-all duration-200"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Start Free
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
