import React from 'react';
import { Link } from 'react-router-dom';

type FooterLink = { label: string; href: string; isRoute?: boolean };

const footerLinks: Record<string, FooterLink[]> = {
    Product: [
        { label: 'Features', href: '#features' },
        { label: 'Modules', href: '#modules' },
        { label: 'Pricing', href: '#pricing' },
    ],
    Company: [
        { label: 'Contact', href: 'mailto:hello@triplooper.com' },
    ],
    Legal: [
        { label: 'Privacy Policy', href: '/privacy', isRoute: true },
        { label: 'Terms of Service', href: '/terms', isRoute: true },
    ],
};

export default function Footer() {
    const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href.startsWith('#')) {
            e.preventDefault();
            document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <footer className="bg-[#1d1d1f] py-14 lg:py-16">
            <div className="max-w-[980px] mx-auto px-6">
                {/* Top */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 bg-[#0071e3] rounded-md flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold leading-none">T</span>
                            </div>
                            <span className="text-white/80 text-[14px] font-semibold tracking-tight">
                                Trip Looper
                            </span>
                        </Link>
                        <p className="text-[12px] text-white/30 leading-relaxed max-w-[200px]">
                            All-in-one hotel &amp; restaurant management platform.
                        </p>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([group, links]) => (
                        <div key={group}>
                            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-3">
                                {group}
                            </p>
                            <ul className="space-y-2">
                                {links.map(link => (
                                    <li key={link.label}>
                                        {link.isRoute ? (
                                            <Link
                                                to={link.href}
                                                className="text-[13px] text-white/40 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:rounded-sm"
                                            >
                                                {link.label}
                                            </Link>
                                        ) : (
                                            <a
                                                href={link.href}
                                                onClick={(e) => handleAnchor(e, link.href)}
                                                className="text-[13px] text-white/40 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:rounded-sm"
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

                {/* Divider */}
                <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-white/20">
                        &copy; {new Date().getFullYear()} Trip Looper. All rights reserved.
                    </p>
                    <Link
                        to="/admin/login"
                        className="text-[10px] text-white/15 hover:text-[#0071e3] tracking-wider transition-colors duration-200"
                    >
                        Staff Portal
                    </Link>
                </div>
            </div>
        </footer>
    );
}
