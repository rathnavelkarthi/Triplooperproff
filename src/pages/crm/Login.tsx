import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useClerk, useSignIn } from '@clerk/react';
import { motion } from 'motion/react';
import posthog from 'posthog-js';

/* ─────────────────────────────────────────────────────────────
   Imagery — served from the Unsplash CDN (same external-CDN model
   the app already uses for Clerk / Supabase / Google Fonts).
   ───────────────────────────────────────────────────────────── */
const U = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const BRAND_IMG = U('1571003123894-1f0594d2b5d9', 1400); // luxury resort pool at dusk
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// --- Reusable Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.579 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.783 1.401 8.168L12 18.896l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192z" />
  </svg>
);

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, type = "text", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const currentType = isPassword && showPassword ? "text" : type;

    return (
      <div className="relative w-full group">
        <input
          ref={ref}
          type={currentType}
          id={props.id || label}
          className={`peer w-full bg-[#0E2A38]/30 border border-[#AAB8C5]/20 rounded-lg px-4 pt-6 pb-2 text-[#F7F4EF] placeholder-transparent outline-none transition-all duration-300 focus:border-[#C9A646]/50 focus:bg-[#0E2A38]/50 focus:ring-1 focus:ring-[#C9A646]/40 hover:border-[#AAB8C5]/40 shadow-inner hover:-translate-y-[1px] ${className}`}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={props.id || label}
          className="absolute text-[14px] text-[#AAB8C5] duration-300 transform -translate-y-3 scale-[0.85] top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-[0.85] peer-focus:-translate-y-3 peer-focus:text-[#F7F4EF] pointer-events-none"
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AAB8C5] hover:text-[#F7F4EF] transition-colors"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// --- Main Login Page Component ---
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, login, loginAsDemo } = useAuth();
  const clerk = useClerk();
  const { signIn, fetchStatus } = useSignIn();
  const signInLoaded = !!signIn && fetchStatus !== 'fetching';
  const navigate = useNavigate();

  const signInRef = useRef(signIn);
  const signInLoadedRef = useRef(signInLoaded);
  signInRef.current = signIn;
  signInLoadedRef.current = signInLoaded;

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (user) {
      if (user.role === 'PLATFORM_ADMIN') {
        navigate('/admin/platform', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      posthog.capture('admin_login_success', { method: 'email' });
      posthog.identify(email);
      navigate('/admin/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const ready = await new Promise<boolean>((resolve) => {
        if (signInRef.current) return resolve(true);
        const start = Date.now();
        const iv = setInterval(() => {
          if (signInRef.current) { clearInterval(iv); resolve(true); }
          else if (Date.now() - start > 10000) { clearInterval(iv); resolve(false); }
        }, 100);
      });

      if (!ready || !signIn) {
        setError('Authentication service failed to load. Please refresh the page.');
        setGoogleLoading(false);
        return;
      }

      // Check if Google OAuth is configured
      if (!clerk.loaded) {
        setError('Authentication service not ready. Please wait a moment and try again.');
        setGoogleLoading(false);
        return;
      }

      // Always run OAuth on the apex domain (e.g. triplooper.com), never a tenant subdomain
      // (e.g. saffronspice.triplooper.com), because the apex is where /admin/* lives and where
      // Clerk's allowed origins are configured. Otherwise Google → Clerk → subdomain
      // gets stuck redirecting because the apex's signed-in session isn't visible there.
      const apexOrigin = (() => {
        const { protocol, hostname, port } = window.location;
        const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
        if (isLocalhost) return window.location.origin;
        const parts = hostname.split('.');
        // For host like saffronspice.triplooper.com → keep the last two parts (triplooper.com)
        // If it's a vercel domain, keep the whole hostname as the apex
        const apexHost = hostname.endsWith('.vercel.app') ? hostname : (parts.length > 2 ? parts.slice(-2).join('.') : hostname);
        return `${protocol}//${apexHost}${port ? `:${port}` : ''}`;
      })();

      try {
        await (signIn as any).authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: `${apexOrigin}/sso-callback`,
          redirectUrlComplete: `${apexOrigin}/admin/dashboard`,
        });
      } catch (ssoError: any) {
        // Alternative: Use Clerk's built-in OAuth
        if (clerk.openSignIn) {
          await clerk.openSignIn({
            forceRedirectUrl: `${apexOrigin}/admin/dashboard`,
            fallbackRedirectUrl: `${apexOrigin}/admin/dashboard`,
          });
        } else {
          throw ssoError;
        }
      }
    } catch (err: any) {
      // User-friendly error messages
      let errorMessage = 'Google sign in failed.';
      if (err?.code === 'oauth_provider_not_configured') {
        errorMessage = 'Google OAuth is not configured in Clerk Dashboard. Please contact administrator.';
      } else if (err?.code === 'invalid_redirect_url') {
        errorMessage = 'Redirect URL not configured in Clerk Dashboard.';
      } else if (err?.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      }

      setError(errorMessage);
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (clerk.openSignIn) {
      const apexOrigin = (() => {
        const { protocol, hostname, port } = window.location;
        const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
        if (isLocalhost) return window.location.origin;
        const parts = hostname.split('.');
        const apexHost = hostname.endsWith('.vercel.app') ? hostname : (parts.length > 2 ? parts.slice(-2).join('.') : hostname);
        return `${protocol}//${apexHost}${port ? `:${port}` : ''}`;
      })();
      clerk.openSignIn({
        initialValues: { emailAddress: email },
        forceRedirectUrl: `${apexOrigin}/admin/dashboard`,
        fallbackRedirectUrl: `${apexOrigin}/admin/dashboard`,
      });
    } else {
      window.open("https://wa.me/919345244727?text=Hi%2C%20I%20need%20help%20resetting%20my%20Triplooper%20password", "_blank");
    }
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    loginAsDemo();
    // Redirect happens automatically via useEffect, but let's be explicit
    setTimeout(() => navigate('/admin/dashboard'), 500);
  };

  const features = [
    'Real-time reservation sync',
    'Multi-role access control',
    'Direct billing and invoicing',
    'Your own website and subdomain',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#071A24] relative overflow-hidden font-sans selection:bg-[#C9A646]/30"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="preconnect" href="https://images.unsplash.com" />

      {/* ────────── LEFT: CINEMATIC BRAND PANEL ────────── */}
      <div className="relative w-full md:w-[48%] lg:w-[52%] order-2 md:order-1 min-h-[55vh] md:min-h-screen overflow-hidden">
        {/* Photograph + brand scrims */}
        <div className="absolute inset-0">
          <motion.img
            src={BRAND_IMG}
            alt="A luxury resort at dusk"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: 'easeOut' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,27,38,0.62) 0%, rgba(14,42,56,0.80) 55%, rgba(7,26,36,0.94) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,27,38,0.30) 0%, rgba(8,27,38,0.55) 100%)' }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(75% 60% at 15% 12%, rgba(201,166,70,0.22) 0%, transparent 55%)' }} />
          <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.10]" style={{ backgroundImage: GRAIN, backgroundSize: '140px 140px' }} />
        </div>

        <div className="relative z-10 h-full p-8 md:p-14 lg:px-20 flex flex-col justify-between min-h-[55vh] md:min-h-screen">
          {/* Top: wordmark + tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] mb-8 border" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#C9A646', backdropFilter: 'blur(6px)' }}>
              Operations Portal
            </span>
            <h1 className="font-playfair text-[38px] md:text-[46px] lg:text-[54px] font-black text-[#F7F4EF] leading-[1.02] tracking-tight mb-3">
              TRIP<span className="text-[#C9A646]">LOOPER</span>
            </h1>
            <p className="text-[#D9E0E5]/85 font-light text-[17px] md:text-[19px] tracking-wide max-w-[420px] leading-relaxed">
              Manage your property, bookings, inventory, billing, and team — from one refined system.
            </p>
          </motion.div>

          {/* Middle: feature list */}
          <motion.ul
            className="my-10 space-y-4 max-w-[400px]"
            initial="hidden"
            animate="show"
          >
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                className="flex items-center gap-3.5 group"
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300" style={{ background: 'rgba(201,166,70,0.12)', borderColor: 'rgba(201,166,70,0.4)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C9A646" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span className="text-[14px] md:text-[15px] font-normal tracking-wide text-[#D9E0E5]/85 group-hover:text-[#F7F4EF] transition-colors duration-300">{feature}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Bottom: floating glass proof-card + footer */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <div className="rounded-2xl border p-5 max-w-[420px]" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-1 mb-2.5" style={{ color: '#C9A646' }} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((s) => <StarIcon key={s} />)}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#F7F4EF]/90 italic font-light">
                “We replaced five tools with Triplooper. Direct bookings jumped 40% in the first quarter.”
              </p>
              <div className="mt-3.5 flex items-center gap-3">
                <img src={U('1507003211169-0a1dd7228f2d', 96)} alt="" className="w-8 h-8 rounded-full object-cover border" style={{ borderColor: 'rgba(201,166,70,0.4)' }} loading="lazy" />
                <div className="text-[12px]">
                  <p className="font-semibold text-[#F7F4EF] leading-tight">Rajiv Sharma</p>
                  <p className="text-[#AAB8C5]">Boutique Hotel, Jaipur</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-5 border-t border-[#AAB8C5]/10">
              <Link
                to="/"
                className="text-[12px] md:text-[13px] font-medium text-[#C9A646] hover:text-[#F7F4EF] tracking-wide transition-colors"
              >
                ← Back to triplooper.com
              </Link>
              <p className="text-[10px] font-semibold text-[#AAB8C5]/50 tracking-[0.18em] uppercase text-right leading-relaxed m-0">
                &copy; {new Date().getFullYear()} Triplooper
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ────────── RIGHT: LOGIN PANEL ────────── */}
      <div className="relative w-full md:w-[52%] lg:w-[48%] flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-20 min-h-[45vh] md:min-h-screen order-1 md:order-2 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(160deg, #0E2A38 0%, #071A24 100%)' }} />
        <div className="absolute inset-0 z-0 opacity-[0.04] mix-blend-overlay pointer-events-none" style={{ backgroundImage: GRAIN, backgroundSize: '140px 140px' }} />
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-[110px] opacity-30 pointer-events-none z-0" style={{ background: '#C9A646' }} />
        <div className="absolute -bottom-32 -left-16 w-[380px] h-[380px] rounded-full blur-[120px] opacity-20 pointer-events-none z-0" style={{ background: '#0E2A38' }} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] p-8 sm:p-10 rounded-2xl relative overflow-hidden z-10"
          style={{ background: 'rgba(14,42,56,0.35)', border: '1px solid rgba(170,184,197,0.12)', backdropFilter: 'blur(20px)', boxShadow: '0 40px 120px rgba(0,0,0,0.35)' }}
        >
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none" />
          <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)' }} />

          <div className="mb-8">
            <h2 className="font-playfair text-[30px] font-bold text-[#F7F4EF] tracking-tight m-0">
              Welcome back
            </h2>
            <p className="text-[#AAB8C5] mt-2 text-[14px] font-light tracking-wide m-0">
              Sign in to your dashboard.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-[13px] text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            <Input
              label="Email address"
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="space-y-4">
              <Input
                label="Password"
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-start px-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[12px] font-medium text-[#AAB8C5] hover:text-[#F7F4EF] transition-colors duration-200 bg-transparent border-none cursor-pointer p-0"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div className="pt-4">
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full overflow-hidden text-[#071A24] font-bold tracking-wide py-3.5 px-6 rounded-lg transition-all duration-200 border border-transparent shadow-[0_8px_24px_rgba(201,166,70,0.28)] hover:shadow-[0_12px_36px_rgba(201,166,70,0.4)] disabled:opacity-50"
                style={{ background: 'linear-gradient(180deg, #D8B85A 0%, #C9A646 100%)' }}
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </motion.button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#AAB8C5]/10" />
            <span className="text-[11px] text-[#AAB8C5]/40 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[#AAB8C5]/10" />
          </div>

          {/* Google login */}
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-[#AAB8C5]/15 bg-white/5 hover:bg-white/10 hover:border-[#AAB8C5]/30 transition-all text-[#F7F4EF] text-sm font-medium disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </motion.button>


          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#AAB8C5]/70">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#C9A646] hover:text-[#F7F4EF] font-medium transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
