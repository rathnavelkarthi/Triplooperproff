import { useState, useEffect, ReactNode } from 'react';

/* ─────────────────────────────────────────────
   FadeIn — wrapper that fades children in after
   a configurable delay (ms) and duration (ms)
   ───────────────────────────────────────────── */
function FadeIn({
    children,
    delay = 0,
    duration = 1000,
}: {
    children: ReactNode;
    delay?: number;
    duration?: number;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    return (
        <div
            className="transition-opacity"
            style={{
                opacity: visible ? 1 : 0,
                transitionDuration: `${duration}ms`,
            }}
        >
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   AnimatedHeading — character-by-character
   reveal with staggered translateX + opacity
   ───────────────────────────────────────────── */
function AnimatedHeading({ text }: { text: string }) {
    const [fired, setFired] = useState(false);
    const charDelay = 30;
    const initialDelay = 200;

    useEffect(() => {
        const t = setTimeout(() => setFired(true), initialDelay);
        return () => clearTimeout(t);
    }, []);

    const lines = text.split('\n');

    return (
        <>
            {lines.map((line, lineIndex) => {
                const lineStartOffset = lines
                    .slice(0, lineIndex)
                    .reduce((sum, l) => sum + l.length, 0);

                return (
                    <span key={lineIndex} className="block">
                        {line.split('').map((char, charIndex) => {
                            const totalIndex = lineStartOffset + charIndex;
                            const d = totalIndex * charDelay;
                            const isSpace = char === ' ';

                            return (
                                <span
                                    key={`${lineIndex}-${charIndex}`}
                                    className="inline-block"
                                    style={{
                                        opacity: fired ? 1 : 0,
                                        transform: fired
                                            ? 'translateX(0)'
                                            : 'translateX(-18px)',
                                        transition: `opacity 500ms ${d}ms, transform 500ms ${d}ms`,
                                    }}
                                >
                                    {isSpace ? '\u00A0' : char}
                                </span>
                            );
                        })}
                    </span>
                );
            })}
        </>
    );
}

/* ═══════════════════════════════════════════════
   Hero — full-viewport video background,
   liquid-glass navbar, animated heading
   ═══════════════════════════════════════════════ */
export default function Hero() {
    return (
        <section className="relative w-full h-screen overflow-hidden bg-black">

            {/* Background Video — raw, NO overlay, NO dimming */}
            <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            >
                <source
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
                    type="video/mp4"
                />
            </video>

            {/* Content layer */}
            <div className="relative z-10 flex flex-col h-full pt-16">

                {/* ── Hero content — pushed to bottom ── */}
                <div className="flex-1 flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16">
                    <div className="lg:grid lg:grid-cols-2 lg:items-end">

                        {/* Left column */}
                        <div>
                            <h1
                                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal mb-4 text-white"
                                style={{ letterSpacing: '-0.04em' }}
                            >
                                <AnimatedHeading text={"Your entire hotel.\nOne screen."} />
                            </h1>

                            <FadeIn delay={800} duration={1000}>
                                <p className="text-base md:text-lg text-gray-300 mb-5">
                                    Bookings, POS, guests, revenue — everything connected, everything real-time. Manage your hotel and restaurant from one place.
                                </p>
                            </FadeIn>

                            <FadeIn delay={1200} duration={1000}>
                                <div className="flex flex-wrap gap-4">
                                    <a
                                        href="https://wa.me/919345244727?text=Hi%2C%20I%20want%20to%20learn%20about%20Trip%20Looper"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200"
                                    >
                                        Start Free Trial
                                    </a>
                                    <a
                                        href="#features"
                                        className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
                                    >
                                        Watch Demo
                                    </a>
                                </div>
                            </FadeIn>
                        </div>

                        {/* Right column — tag */}
                        <FadeIn delay={1400} duration={1000}>
                            <div className="flex items-end justify-start lg:justify-end mt-8 lg:mt-0">
                                <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl">
                                    <span className="text-lg md:text-xl lg:text-2xl font-light text-white">
                                        Bookings. POS. Analytics.
                                    </span>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>

            </div>
        </section>
    );
}
