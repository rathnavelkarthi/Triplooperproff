import { useState, useEffect, createContext, useContext } from 'react';
import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Coffee, Shield, Calendar, Receipt, MessageSquare, Menu, X, ArrowLeft } from 'lucide-react';

export interface GuestSession {
  token_id: string;
  tenant_id: string;
  reservation_id: string;
  room_id: number | null;
  business_name: string;
  guest_email: string;
  guest_phone: string;
  guest_name: string;
  room_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  status: string;
  amount: number;
  is_expired: boolean;
}

const GuestContext = createContext<{
  session: GuestSession | null;
  token: string | null;
  loading: boolean;
} | null>(null);

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}

export default function GuestLayout() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      setError('Invalid guest token URL.');
      setLoading(false);
      return;
    }

    async function fetchSession() {
      try {
        setLoading(true);
        // Call the database function
        const { data, error: rpcError } = await supabase.rpc('get_guest_session', {
          p_token: token
        });

        if (rpcError) throw rpcError;

        if (!data || data.length === 0) {
          setError('We couldn\'t find a valid stay linked to this link. It might have expired or been deactivated.');
        } else {
          const guestSession = data[0] as GuestSession;
          if (guestSession.is_expired) {
            setError('This guest portal link has expired. Portal access ends 2 days after checkout.');
          } else {
            setSession(guestSession);
          }
        }
      } catch (err: any) {
        console.error('Error fetching guest session:', err);
        setError('Failed to load your stay details. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm tracking-wide animate-pulse">Setting up your guest portal...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={28} />
          </div>
          <h2 className="text-2xl font-semibold mb-3 tracking-tight">Access Expired or Invalid</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">{error || 'This link is no longer active.'}</p>
          <a
            href="https://triplooper.com"
            className="inline-flex w-full items-center justify-center bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-black font-semibold h-12 rounded-xl text-sm shadow-lg shadow-emerald-500/10"
          >
            Visit Triplooper
          </a>
        </div>
      </div>
    );
  }

  // Active navigation helper
  const navItems = [
    { label: 'My Stay', path: `/guest/${token}`, icon: Calendar },
    { label: 'Room Service', path: `/guest/${token}/food`, icon: Coffee },
    { label: 'Request Service', path: `/guest/${token}/services`, icon: Shield },
    { label: 'Running Bill', path: `/guest/${token}/bill`, icon: Receipt },
    { label: 'Chat', path: `/guest/${token}/chat`, icon: MessageSquare },
  ];

  const currentTab = navItems.find(item => location.pathname === item.path) || navItems[0];

  return (
    <GuestContext.Provider value={{ session, token: token || null, loading }}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col pb-24 md:pb-0 md:pl-64">
        
        {/* Navigation - Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-zinc-900 border-r border-zinc-800 z-30">
          <div className="p-6 border-b border-zinc-800">
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {session.business_name}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Guest Portal</p>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">Room {session.room_number || 'TBD'}</p>
            <p className="text-xs font-semibold text-zinc-400 mt-0.5">{session.guest_name}</p>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {location.pathname !== `/guest/${token}` && (
              <button 
                onClick={() => navigate(`/guest/${token}`)}
                className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold tracking-tight text-white line-clamp-1">{session.business_name}</h1>
              <p className="text-2xs text-emerald-400 font-medium">Room {session.room_number || 'TBD'} • {session.guest_name}</p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:py-10">
          <Outlet context={{ session, token }} />
        </main>

        {/* Navigation - Mobile Bottom Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-lg border-t border-zinc-800/60 z-30 px-2 py-3 flex justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  isActive ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <Icon size={20} className={isActive ? 'scale-110 text-emerald-400 transition-transform' : ''} />
                <span className="text-[10px] font-medium tracking-wide">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </GuestContext.Provider>
  );
}
