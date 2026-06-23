import { lazy, Suspense } from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Footer from '../components/landing/Footer';

/* Apple font stacks from DESIGN.md */
const FONT_DISPLAY = '"SF Pro Display", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_BODY = '"SF Pro Text", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';

/* Scoped styles injected once for the landing page */
const landingStyles = `
/* ── Semantic Design Tokens ── */
.landing-root {
    /* Primary */
    --color-primary: #0071e3;
    --color-primary-hover: #0077ed;
    --color-primary-glow: rgba(0, 113, 227, 0.5);
    --color-primary-glow-strong: rgba(0, 113, 227, 0.6);

    /* Surfaces */
    --color-surface-dark: #000000;
    --color-surface-dark-alt: #0a0a0a;
    --color-surface-light: #f5f5f7;
    --color-surface-card-light: #ffffff;
    --color-surface-footer: #1d1d1f;

    /* Text */
    --color-text-primary-dark: #ffffff;
    --color-text-secondary-dark: rgba(255, 255, 255, 0.60);
    --color-text-tertiary-dark: rgba(255, 255, 255, 0.40);
    --color-text-muted-dark: rgba(255, 255, 255, 0.30);
    --color-text-primary-light: #1d1d1f;
    --color-text-secondary-light: rgba(0, 0, 0, 0.50);
    --color-text-tertiary-light: rgba(0, 0, 0, 0.40);
    --color-text-muted-light: rgba(0, 0, 0, 0.30);

    /* Semantic / Status */
    --color-success: #34C759;
    --color-warning: #FF9500;
    --color-error: #FF3B30;
    --color-info: #0071e3;

    /* Borders */
    --color-border-dark: rgba(255, 255, 255, 0.10);
    --color-border-dark-subtle: rgba(255, 255, 255, 0.06);
    --color-border-light: rgba(0, 0, 0, 0.06);
    --color-border-light-subtle: rgba(0, 0, 0, 0.04);

    /* Problem section accent colors */
    --color-accent-red: #E74C3C;
    --color-accent-orange: #F39C12;
    --color-accent-purple: #9B59B6;

    font-family: ${FONT_BODY};
}
.landing-root h1,
.landing-root h2,
.landing-root h3,
.landing-root h4,
.landing-root h5,
.landing-root h6 {
    font-family: ${FONT_DISPLAY};
    letter-spacing: -0.03em;
    line-height: 1.1;
}
.landing-root input,
.landing-root select,
.landing-root textarea,
.landing-root button {
    font-family: inherit;
}
/* Accessible focus rings */
.landing-root :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
}
.landing-root a:focus-visible,
.landing-root button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}
/* Skip link */
.skip-link {
    position: absolute;
    top: -100px;
    left: 16px;
    z-index: 9999;
    padding: 12px 24px;
    background: var(--color-primary);
    color: white;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    transition: top 0.2s ease;
}
.skip-link:focus {
    top: 16px;
}
`;

// Lazy load below-the-fold sections
const ProblemSolution = lazy(() => import('../components/landing/ProblemSolution'));
const HotelDirectory = lazy(() => import('../components/landing/HotelDirectory'));
const ModuleSection = lazy(() => import('../components/landing/ModuleSection').then(m => ({ default: m.default })));
const BookingMockup = lazy(() => import('../components/landing/ModuleSection').then(m => ({ default: m.BookingMockup })));
const CRMMockup = lazy(() => import('../components/landing/ModuleSection').then(m => ({ default: m.CRMMockup })));
const POSMockup = lazy(() => import('../components/landing/ModuleSection').then(m => ({ default: m.POSMockup })));
const AnalyticsMockup = lazy(() => import('../components/landing/ModuleSection').then(m => ({ default: m.AnalyticsMockup })));
const Testimonials = lazy(() => import('../components/landing/Testimonials'));
const Pricing = lazy(() => import('../components/landing/Pricing'));
const CTA = lazy(() => import('../components/landing/CTA'));

function SectionLoader() {
    return <div className="min-h-[500px]" aria-hidden="true" />;
}

/* ── Module section wrapper that resolves lazy mockups ── */
function ModuleSections() {
    return (
        <div id="modules">
            <Suspense fallback={<SectionLoader />}>
                <ModuleSectionWithMockup
                    label="DIRECT BOOKINGS"
                    headline="Zero-commission direct bookings."
                    bullets={[
                        '4-step booking flow with real-time availability',
                        'Occupancy-based dynamic pricing',
                        'WhatsApp confirmation on autopilot',
                    ]}
                    dark
                    bgClass="bg-black"
                    MockupComponent={BookingMockup}
                />
            </Suspense>

            <Suspense fallback={<SectionLoader />}>
                <ModuleSectionWithMockup
                    label="GUEST MANAGEMENT"
                    headline="Every guest, every detail."
                    bullets={[
                        'Guest profiles with booking history and preferences',
                        'Visual calendar with drag-and-drop reservations',
                        'GST-compliant invoices generated in one click',
                    ]}
                    reversed
                    MockupComponent={CRMMockup}
                />
            </Suspense>

            <Suspense fallback={<SectionLoader />}>
                <ModuleSectionWithMockup
                    label="RESTAURANT"
                    headline="Front desk to kitchen, connected."
                    bullets={[
                        'Dine-in, takeaway, and room service in one POS',
                        'QR-based table ordering for guests',
                        'Real-time kitchen order tracking (KOT)',
                    ]}
                    dark
                    bgClass="bg-[#0a0a0a]"
                    MockupComponent={POSMockup}
                />
            </Suspense>

            <Suspense fallback={<SectionLoader />}>
                <ModuleSectionWithMockup
                    label="INSIGHTS"
                    headline="Revenue clarity, not guesswork."
                    bullets={[
                        'Revenue, occupancy, and channel mix dashboards',
                        'Profit & Loss tracking with expense categories',
                        'Exportable reports for accountants',
                    ]}
                    reversed
                    MockupComponent={AnalyticsMockup}
                />
            </Suspense>
        </div>
    );
}

/* Helper to pass lazy-loaded mockup as ReactNode */
function ModuleSectionWithMockup({
    label, headline, bullets, dark, reversed, bgClass, MockupComponent,
}: {
    label: string;
    headline: string;
    bullets: string[];
    dark?: boolean;
    reversed?: boolean;
    bgClass?: string;
    MockupComponent: React.LazyExoticComponent<React.ComponentType>;
}) {
    return (
        <ModuleSection
            label={label}
            headline={headline}
            bullets={bullets}
            dark={dark}
            reversed={reversed}
            bgClass={bgClass}
            mockup={
                <Suspense fallback={<div className="h-[300px]" />}>
                    <MockupComponent />
                </Suspense>
            }
        />
    );
}

export default function LandingPage() {
    return (
        <div className="landing-root min-h-screen antialiased" style={{ scrollBehavior: 'smooth' }}>
            <style dangerouslySetInnerHTML={{ __html: landingStyles }} />

            {/* Skip link for keyboard navigation */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            <Navbar />

            <main id="main-content">
                <Hero />
                
                <Suspense fallback={<SectionLoader />}>
                    <HotelDirectory />
                </Suspense>

                <Suspense fallback={<SectionLoader />}>
                    <ProblemSolution />
                </Suspense>

                <div id="features">
                    <ModuleSections />
                </div>

                <Suspense fallback={<SectionLoader />}>
                    <Testimonials />
                </Suspense>

                <Suspense fallback={<SectionLoader />}>
                    <Pricing />
                </Suspense>

                <Suspense fallback={<SectionLoader />}>
                    <CTA />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
