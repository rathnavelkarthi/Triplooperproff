import { motion } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

const testimonials = [
    {
        quote: 'We dropped three separate tools the first week. Trip Looper replaced everything.',
        name: 'Arjun Reddy',
        hotel: 'Seaside Residency',
        location: 'Pondicherry',
        gradient: 'from-[#0071e3] to-[#00c6ff]',
    },
    {
        quote: 'OTA commissions were eating 22% of revenue. Now guests book direct on our own site.',
        name: 'Meera Nair',
        hotel: 'Palm Grove Resort',
        location: 'Kochi',
        gradient: 'from-[#FF9500] to-[#FFD60A]',
    },
    {
        quote: 'The restaurant POS connected to hotel billing was a game changer for our operations.',
        name: 'Vikram Singh',
        hotel: 'Hotel Majestic',
        location: 'Jaipur',
        gradient: 'from-[#34C759] to-[#30D158]',
    },
];

export default function Testimonials() {
    const reduced = useReducedMotion();
    return (
        <section id="testimonials" className="relative py-24 lg:py-32 bg-[#f5f5f7] overflow-hidden">
            {/* Light section depth gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-40 pointer-events-none" />
            <div className="relative z-10 max-w-[980px] mx-auto px-6">
                <motion.div
                    initial={reduced ? {} : { opacity: 0, y: 20 }}
                    whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={spring}
                    className="text-center mb-14"
                >
                    <p className="text-[12px] font-semibold text-black/30 uppercase tracking-[0.2em] mb-3">
                        Trusted by hoteliers
                    </p>
                    <h2 className="text-[32px] md:text-[38px] lg:text-[42px] font-bold text-[var(--color-text-primary-light)] tracking-[-0.03em] leading-tight">
                        Hotels that switched<br className="hidden md:block" /> never looked back.
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={t.name}
                            initial={reduced ? {} : { opacity: 0, y: 20 }}
                            whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ ...spring, delay: i * 0.1 }}
                            whileHover={reduced ? {} : { y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white rounded-2xl p-8 border border-black/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_60px_rgba(0,0,0,0.1)] transition-all duration-300"
                        >
                            <p className="text-[15px] text-[var(--color-text-primary-light)]/80 leading-relaxed italic mb-5">
                                &ldquo;{t.quote}&rdquo;
                            </p>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shrink-0`}>
                                    <span className="text-[13px] font-bold text-white">{t.name[0]}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary-light)] truncate">{t.name}</p>
                                    <p className="text-[11px] text-black/40 truncate">{t.hotel}, {t.location}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
