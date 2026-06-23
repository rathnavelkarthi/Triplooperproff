import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const navLinks = [
    { name: 'Features', href: '/#features' },
    { name: 'How it Works', href: '/#how-it-works' },
    { name: 'Testimonials', href: '/#testimonials' },
    { name: 'Pricing', href: '/#pricing' },
];

export default function SaaSNavbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (href: string) => {
        setIsMobileMenuOpen(false);
        if (href.startsWith('/#')) {
            const el = document.getElementById(href.substring(2));
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                ? 'bg-white/80 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] py-3'
                : 'bg-transparent py-5'
                }`}
        >
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Wordmark */}
                    <Link to="/" className="flex items-center gap-2 z-50 relative">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Zap size={16} className="text-white fill-current" />
                        </div>
                        <span className="text-lg font-bold text-foreground tracking-tight">
                            Trip Looper
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.href}
                                onClick={() => handleNavClick(link.href)}
                                className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors duration-200"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex items-center gap-3 ml-4">
                            <a
                                href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20Trip%20Looper"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-foreground border border-foreground/15 px-4 py-2 rounded-lg hover:border-foreground/30 transition-all duration-200"
                            >
                                Book a Demo
                            </a>
                            <Link
                                to="/admin/login"
                                className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-all duration-200"
                            >
                                Log in
                            </Link>
                            <Link
                                to="/signup"
                                className="text-sm font-semibold text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg transition-all duration-200 shadow-sm"
                            >
                                Start Free
                            </Link>
                        </div>
                    </nav>

                    {/* Mobile toggle */}
                    <button
                        className="md:hidden z-50 p-2 text-foreground"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-2xl shadow-lg py-6 px-6 flex flex-col gap-1 md:hidden border-t border-foreground/5"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.href}
                                onClick={() => handleNavClick(link.href)}
                                className="block text-foreground/70 text-base font-medium py-3 hover:text-foreground transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-foreground/5">
                            <a
                                href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20Trip%20Looper"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-center text-foreground border border-foreground/15 px-6 py-3 rounded-lg font-semibold text-sm"
                            >
                                Book a Demo
                            </a>
                            <Link
                                to="/admin/login"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-center text-foreground font-semibold text-sm hover:text-foreground/80 py-2"
                            >
                                Log in
                            </Link>
                            <Link
                                to="/signup"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-center text-white bg-primary px-6 py-3 rounded-lg font-semibold text-sm shadow-sm"
                            >
                                Start Free
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
