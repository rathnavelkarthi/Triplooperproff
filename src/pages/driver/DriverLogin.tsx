import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Car, Mail, Lock, ArrowRight, ShieldAlert } from 'lucide-react';

export default function DriverLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      // Direct query from drivers table
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error || !data) {
        throw new Error('No driver account found with this email.');
      }

      if (data.password !== password) {
        throw new Error('Incorrect password. Please try again.');
      }

      if (data.status === 'rejected') {
        throw new Error('Your driver profile has been rejected. Contact Triplooper support for details.');
      }

      // Store driver session in localstorage
      localStorage.setItem('driver_session', JSON.stringify(data));
      toast.success(`Welcome back, ${data.name}!`);
      
      navigate('/driver/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F9FB] to-[#EEF1F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E2A38]/5 border border-[#0E2A38]/10 text-xs font-semibold text-[#0E2A38]">
          <Car size={14} /> Triplooper Partners
        </div>
        <h2 className="text-3xl font-extrabold text-[#0E2A38]">Driver Portal</h2>
        <p className="text-sm text-gray-500">Log in to view transfer bookings, coordinate pickup duties, and update GPS status.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 border border-gray-100 shadow-sm rounded-3xl sm:px-10"
        >
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="driver@example.com"
                  className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0E2A38] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1a3d4f] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? 'Logging you in...' : 'Sign In'}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            Don't have a partner account?{' '}
            <Link to="/driver/register" className="text-[#0E2A38] font-bold hover:underline">
              Register as driver
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
