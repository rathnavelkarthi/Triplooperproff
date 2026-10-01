import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ClerkProvider } from '@clerk/react';
import SaaSNavbar from './components/saas/SaaSNavbar';
import SaaSFooter from './components/saas/SaaSFooter';

import { AuthProvider } from './context/AuthContext';
import { CRMProvider } from './context/CRMDataContext';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from 'sonner';
import { getSubdomain } from './hooks/useSubdomain';

let CLERK_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '') as string;

// Sanitize/normalize Clerk key (removes trailing NUL bytes, whitespace, and fixes JAC typo)
if (CLERK_KEY) {
  CLERK_KEY = CLERK_KEY.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  if (CLERK_KEY.startsWith('pk_live_') && CLERK_KEY.endsWith('JAC')) {
    CLERK_KEY = CLERK_KEY.slice(0, -3) + 'JA==';
  }
}

// Debug Clerk key
console.log('=== APP INITIALIZATION ===');
console.log('Clerk Key available:', !!CLERK_KEY);
console.log('Clerk Key (first 10 chars):', CLERK_KEY?.substring(0, 10) + '...');
console.log('Clerk Key type:', CLERK_KEY?.startsWith('pk_live_') ? 'LIVE' : 'TEST');
console.log('Environment mode:', import.meta.env.MODE);
console.log('==========================');

// Clerk configuration with AGGRESSIVE FIX for double-dot bug
console.log('=== CLERK CONFIG ===');
console.log('Key type:', CLERK_KEY?.startsWith('pk_live_') ? 'LIVE' : 'TEST');
console.log('Key start:', CLERK_KEY?.substring(0, 30));

// AGGRESSIVE FIX: Completely override Clerk's script loading for live keys
if (CLERK_KEY?.startsWith('pk_live_') && typeof window !== 'undefined') {
  console.log('Applying aggressive fix for Clerk double-dot and domain typos...');
  
  // 1. Intercept script tag creation to fix dynamic script loading of chunks
  const originalCreateElement = document.createElement;
  document.createElement = function(this: Document, tagName: string, options?: ElementCreationOptions): HTMLElement {
    const element = originalCreateElement.call(this, tagName, options);
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name: string, value: string) {
        if (name.toLowerCase() === 'src' && typeof value === 'string') {
          value = value
            .replace('clerk.easystay.com', 'clerk.triplooper.com')
            .replace('clerk.esaystay.com', 'clerk.triplooper.com')
            .replace('clerk..esaystay.com', 'clerk.triplooper.com')
            .replace('clerk..easystay.com', 'clerk.triplooper.com')
            .replace('clerk..triplooper.com', 'clerk.triplooper.com');
        }
        return originalSetAttribute.call(this, name, value);
      };

      Object.defineProperty(element, 'src', {
        get() {
          return this.getAttribute('src') || '';
        },
        set(value) {
          if (typeof value === 'string') {
            value = value
              .replace('clerk.easystay.com', 'clerk.triplooper.com')
              .replace('clerk.esaystay.com', 'clerk.triplooper.com')
              .replace('clerk..esaystay.com', 'clerk.triplooper.com')
              .replace('clerk..easystay.com', 'clerk.triplooper.com')
              .replace('clerk..triplooper.com', 'clerk.triplooper.com');
          }
          this.setAttribute('src', value);
        },
        configurable: true,
        enumerable: true
      });
    }
    return element;
  };

  // 2. Preload Clerk JS from correct URL BEFORE Clerk tries to load it
  const preloadScript = document.createElement('script');
  preloadScript.setAttribute('src', 'https://clerk.triplooper.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js');
  preloadScript.async = true;
  preloadScript.id = 'clerk-js-preload';
  preloadScript.onload = () => console.log('✅ Clerk JS preloaded successfully');
  preloadScript.onerror = (e) => console.error('❌ Failed to preload Clerk JS:', e);
  document.head.appendChild(preloadScript);
  
  // 3. Monkey patch fetch/XMLHttpRequest to intercept Clerk's requests
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && (
      input.includes('clerk..esaystay.com') || 
      input.includes('clerk.easystay.com') || 
      input.includes('clerk..easystay.com') || 
      input.includes('clerk.esaystay.com') || 
      input.includes('clerk..triplooper.com')
    )) {
      const fixedUrl = input
        .replace('clerk..esaystay.com', 'clerk.triplooper.com')
        .replace('clerk.easystay.com', 'clerk.triplooper.com')
        .replace('clerk..easystay.com', 'clerk.triplooper.com')
        .replace('clerk.esaystay.com', 'clerk.triplooper.com')
        .replace('clerk..triplooper.com', 'clerk.triplooper.com');
      console.log('FIXING fetch URL:', input, '→', fixedUrl);
      return originalFetch.call(this, fixedUrl, init);
    }
    return originalFetch.call(this, input, init);
  };
  
  // 4. Monkey patch XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  (XMLHttpRequest.prototype as any).open = function(method: string, url: string | URL, ...args: any[]) {
    if (typeof url === 'string' && (
      url.includes('clerk..esaystay.com') || 
      url.includes('clerk.easystay.com') || 
      url.includes('clerk..easystay.com') || 
      url.includes('clerk.esaystay.com') || 
      url.includes('clerk..triplooper.com')
    )) {
      const fixedUrl = url
        .replace('clerk..esaystay.com', 'clerk.triplooper.com')
        .replace('clerk.easystay.com', 'clerk.triplooper.com')
        .replace('clerk..easystay.com', 'clerk.triplooper.com')
        .replace('clerk.esaystay.com', 'clerk.triplooper.com')
        .replace('clerk..triplooper.com', 'clerk.triplooper.com');
      console.log('FIXING XHR URL:', url, '→', fixedUrl);
      return originalXHROpen.call(this, method, fixedUrl, ...args);
    }
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  // 5. Create a custom Clerk loader that bypasses the bug
  (window as any).__clerk_custom_loader = {
    load: () => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.setAttribute('src', 'https://clerk.triplooper.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js');
        script.async = true;
        script.onload = () => {
          console.log('✅ Custom Clerk loader succeeded');
          resolve(true);
        };
        script.onerror = (e) => {
          console.error('❌ Custom Clerk loader failed:', e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    }
  };
}

// Clerk configuration - Use minimal config and let our fixes handle it
const clerkConfig = {
  publishableKey: CLERK_KEY,
  signInUrl: '/admin/login',
  signUpUrl: '/signup',
  afterSignInUrl: '/admin/dashboard',
  afterSignUpUrl: '/admin/dashboard',
  afterSignOutUrl: '/admin/login',
  // Use headless mode and provide custom loader
  clerkJSVariant: 'headless',
  // Try to disable Clerk's auto-loading and use our custom loader
  ...(CLERK_KEY?.startsWith('pk_live_') && {
    // These options might help bypass the bug
    sdkMetadata: {
      name: 'clerk.react',
      version: '6.0.1',
    }
  }),
  appearance: {
    variables: {
      colorPrimary: '#0E2A38',
      colorBackground: '#ffffff',
      colorInputBackground: '#FDFBF7',
      colorInputText: '#0E2A38',
      colorText: '#0E2A38',
      colorTextSecondary: '#5A6B72',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      borderRadius: '16px',
    },
    elements: {
      card: 'shadow-[0_20px_50px_rgba(14,42,56,0.08)] border border-[#E7E1D6]',
      socialButtonsBlockButton: 'border border-[#E7E1D6] hover:bg-[#FDFBF7] transition-all',
      formButtonPrimary: 'bg-[#0E2A38] hover:bg-[#1a3d4f] text-white transition-all font-bold',
      footerActionLink: 'text-[#C9A646] hover:text-[#B08B47] font-bold',
    }
  }
};

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const key = 'chunk_reload_retry';
    try {
      const component = await factory();
      sessionStorage.removeItem(key);
      return component;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

// Lazy load route components
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const SaaSHome = lazyWithRetry(() => import('./pages/SaaSHome'));
const PricingPage = lazyWithRetry(() => import('./pages/PricingPage'));
const Signup = lazyWithRetry(() => import('./pages/Signup'));
const TenantSite = lazyWithRetry(() => import('./pages/TenantSite'));
const RoomDetail = lazyWithRetry(() => import('./pages/RoomDetail'));
const Login = lazyWithRetry(() => import('./pages/crm/Login'));
const CRMApp = lazyWithRetry(() => import('./components/crm/CRMApp'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const SSOCallback = lazyWithRetry(() => import('./pages/SSOCallback'));
const TableOrder = lazyWithRetry(() => import('./pages/TableOrder'));
const DriverRegister = lazyWithRetry(() => import('./pages/driver/DriverRegister'));
const DriverLogin = lazyWithRetry(() => import('./pages/driver/DriverLogin'));
const DriverDashboard = lazyWithRetry(() => import('./pages/driver/DriverDashboard'));

// Guest portal
const GuestLayout = lazyWithRetry(() => import('./pages/guest/GuestLayout'));
const GuestPortal = lazyWithRetry(() => import('./pages/guest/GuestPortal'));
const GuestFoodOrder = lazyWithRetry(() => import('./pages/guest/GuestFoodOrder'));
const GuestServices = lazyWithRetry(() => import('./pages/guest/GuestServices'));
const GuestBill = lazyWithRetry(() => import('./pages/guest/GuestBill'));
const GuestChat = lazyWithRetry(() => import('./pages/guest/GuestChat'));
const GuestAccount = lazyWithRetry(() => import('./pages/GuestAccount'));

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

                    {/* Explicit preview and order routes */}
                    <Route path="/site/:subdomain" element={<TenantSite />} />
                    <Route path="/site/:subdomain/room/:roomId" element={<RoomDetail />} />
                    <Route path="/order/:subdomain/:tableId" element={<TableOrder />} />
                    
                    {/* Guest Portal on subdomain */}
                    <Route path="/guest/portal" element={<Navigate to="/my-stays" replace />} />
                    <Route path="/guest" element={<Navigate to="/my-stays" replace />} />
                    <Route path="/guest/:token" element={<GuestLayout />}>
                      <Route index element={<GuestPortal />} />
                      <Route path="food" element={<GuestFoodOrder />} />
                      <Route path="services" element={<GuestServices />} />
                      <Route path="bill" element={<GuestBill />} />
                      <Route path="chat" element={<GuestChat />} />
                    </Route>
                    {/* Guest Account — booking history */}
                    <Route path="/my-stays" element={<GuestAccount />} />
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

                  {/* Pricing page redirects to B2B portal */}
                  <Route path="/pricing" element={<Signup />} />

                  {/* Public table ordering (QR code) */}
                  <Route path="/order/:subdomain/:tableId" element={<TableOrder />} />

                  {/* Tenant websites */}
                  <Route path="/site/:subdomain" element={<TenantSite />} />
                  <Route path="/site/:subdomain/room/:roomId" element={<RoomDetail />} />

                    {/* Guest Portal on main domain */}
                    <Route path="/guest/portal" element={<Navigate to="/my-stays" replace />} />
                    <Route path="/guest" element={<Navigate to="/my-stays" replace />} />
                    <Route path="/guest/:token" element={<GuestLayout />}>
                      <Route index element={<GuestPortal />} />
                      <Route path="food" element={<GuestFoodOrder />} />
                      <Route path="services" element={<GuestServices />} />
                      <Route path="bill" element={<GuestBill />} />
                      <Route path="chat" element={<GuestChat />} />
                    </Route>

                  {/* Guest Account — booking history and invoice download */}
                  <Route path="/my-stays" element={<GuestAccount />} />

                  {/* Signup */}
                  <Route path="/signup" element={<Signup />} />

                  {/* SSO callback (Google OAuth) */}
                  <Route path="/sso-callback" element={<SSOCallback />} />

                  {/* Driver Routes */}
                  <Route path="/driver/register" element={<DriverRegister />} />
                  <Route path="/driver/login" element={<DriverLogin />} />
                  <Route path="/driver/dashboard" element={<DriverDashboard />} />

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
