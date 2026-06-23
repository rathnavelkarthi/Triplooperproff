import { Link } from 'react-router-dom';

type FooterLink = { label: string; href: string; isRoute?: boolean };

const footerLinks: Record<string, FooterLink[]> = {
    Product: [
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/pricing', isRoute: true },
        { label: 'How It Works', href: '/#how-it-works' },
    ],
    Company: [
        { label: 'Contact', href: 'mailto:hello@triplooper.com' },
    ],
    Legal: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
    ],
};

export default function SaaSFooter() {
    return (
        <footer className="bg-foreground text-background py-16 lg:py-20">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                {/* Top */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xs">T</span>
                            </div>
                            <span className="text-base font-bold text-background tracking-tight">
                                Trip <span className="text-accent">Looper</span>
                            </span>
                        </Link>
                        <p className="text-xs text-background/25 leading-relaxed max-w-[200px]">
                            All-in-one hotel and restaurant management platform.
                        </p>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-background/30 mb-4">{category}</p>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        {link.isRoute ? (
                                            <Link
                                                to={link.href}
                                                className="text-xs text-background/40 hover:text-background/70 transition-colors duration-200"
                                            >
                                                {link.label}
                                            </Link>
                                        ) : (
                                            <a
                                                href={link.href}
                                                className="text-xs text-background/40 hover:text-background/70 transition-colors duration-200"
                                            >
                                                {link.label}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-background/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-background/20 tracking-wider">
                        &copy; {new Date().getFullYear()} Trip Looper. All rights reserved.
                    </p>
                    <Link
                        to="/admin/login"
                        className="text-[10px] text-background/20 hover:text-accent tracking-wider transition-colors duration-200"
                    >
                        Staff Portal
                    </Link>
                </div>
            </div>
        </footer>
    );
}
