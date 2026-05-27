import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ClerkProvider } from '@clerk/react';
import SaaSNavbar from './components/saas/SaaSNavbar';
import SaaSFooter from './components/saas/SaaSFooter';

// New Apple-inspired landing page
const LandingPage = lazy(() => import('./pages/LandingPage'));
import { AuthProvider } from './context/AuthContext';
import { CRMProvider } from './context/CRMDataContext';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from 'sonner';
import { getSubdomain } from './hooks/useSubdomain';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Debug Clerk key
console.log('=== APP INITIALIZATION ===');
console.log('Clerk Key available:', !!CLERK_KEY);
console.log('Clerk Key (first 10 chars):', CLERK_KEY?.substring(0, 10) + '...');
console.log('Clerk Key type:', CLERK_KEY?.startsWith('pk_live_') ? 'LIVE' : 'TEST');
console.log('Environment mode:', import.meta.env.MODE);
console.log('==========================');

// Clerk configuration - SIMPLIFIED
// The issue is Clerk constructing clerk..esaystay.com (double dots)
// This seems to be a Clerk bug with custom domains
console.log('=== CLERK CONFIG ===');
console.log('Key type:', CLERK_KEY?.startsWith('pk_live_') ? 'LIVE' : 'TEST');
console.log('Key start:', CLERK_KEY?.substring(0, 30));

// For now, use minimal configuration
// Clerk should handle custom domains automatically from the key
const clerkConfig = {
  publishableKey: CLERK_KEY,
  signInUrl: '/admin/login',
  signUpUrl: '/signup',
  afterSignInUrl: '/admin/dashboard',
  afterSignUpUrl: '/admin/dashboard',
  afterSignOutUrl: '/admin/login',
  // DO NOT set domain property - let Clerk handle it from the key
  // clerkJSVariant: 'headless', // Try without this first
};

// Lazy load route components
const SaaSHome = lazy(() => import('./pages/SaaSHome'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const Signup = lazy(() => import('./pages/Signup'));
const TenantSite = lazy(() => import('./pages/TenantSite'));
const RoomDetail = lazy(() => import('./pages/RoomDetail'));
const Login = lazy(() => import('./pages/crm/Login'));
const CRMApp = lazy(() => import('./components/crm/CRMApp'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SSOCallback = lazy(() => import('./pages/SSOCallback'));
const TableOrder = lazy(() => import('./pages/TableOrder'));

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const hostSubdomain = getSubdomain();

  if (hostSubdomain) {
    return (
      <ClerkProvider {...clerkConfig}>
        <HelmetProvider>
          <AuthProvider>
            <CRMProvider>
              <Router basename="/">
                <ScrollToTop />
                <Toaster position="top-right" richColors closeButton />
                <div className="noise-overlay"></div>

                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Tenant Site Routes */}
                    <Route path="/" element={<TenantSite />} />
                    <Route path="/room/:roomId" element={<RoomDetail />} />
                    {/* SSO callback must exist on subdomains too — if Google redirects here we still need to finish the handshake */}
                    <Route path="/sso-callback" element={<SSOCallback />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Router>
            </CRMProvider>
          </AuthProvider>
        </HelmetProvider>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider {...clerkConfig}>
      <HelmetProvider>
        <AuthProvider>
          <CRMProvider>
            <Router basename="/">
              <ScrollToTop />
              <Toaster position="top-right" richColors closeButton />
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-sm focus:text-sm focus:font-semibold">
                Skip to content
              </a>
              <div className="noise-overlay"></div>

              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* New Apple-inspired landing page */}
                  <Route path="/" element={<LandingPage />} />

                  {/* Pricing page */}
                  <Route path="/pricing" element={
                    <div className="min-h-screen flex flex-col font-sans text-foreground bg-background">
                      <SaaSNavbar />
                      <main id="main-content" className="flex-grow">
                        <PricingPage />
                      </main>
                      <SaaSFooter />
                    </div>
                  } />

                  {/* Public table ordering (QR code) */}
                  <Route path="/order/:subdomain/:tableId" element={<TableOrder />} />

                  {/* Tenant websites */}
                  <Route path="/site/:subdomain" element={<TenantSite />} />
                  <Route path="/site/:subdomain/room/:roomId" element={<RoomDetail />} />

                  {/* Signup */}
                  <Route path="/signup" element={<Signup />} />

                  {/* SSO callback (Google OAuth) */}
                  <Route path="/sso-callback" element={<SSOCallback />} />

                  {/* CRM admin routes */}
                  <Route path="/admin/login" element={<Login />} />
                  <Route path="/admin/*" element={<CRMApp />} />

                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
          </CRMProvider>
        </AuthProvider>
      </HelmetProvider>
    </ClerkProvider>
  );
}
