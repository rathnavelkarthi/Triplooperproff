import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { 
  Car, MapPin, Navigation, Compass, Calendar, 
  Clock, ShieldAlert, LogOut, CheckCircle2, RefreshCw 
} from 'lucide-react';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [duties, setDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

  // 1. Load driver session and detail
  useEffect(() => {
    const sessionStr = localStorage.getItem('driver_session');
    if (!sessionStr) {
      navigate('/driver/login');
      return;
    }
    const driverObj = JSON.parse(sessionStr);
    
    // Fetch fresh driver details to get actual status
    const fetchDriverDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', driverObj.id)
          .single();

        if (error) throw error;
        
        if (data.status === 'rejected') {
          localStorage.removeItem('driver_session');
          toast.error('Your account has been rejected.');
          navigate('/driver/login');
          return;
        }

        setDriver(data);
        loadDuties(data.id);
      } catch (err) {
        setDriver(driverObj);
        loadDuties(driverObj.id);
      }
    };

    fetchDriverDetails();
  }, [navigate]);

  // 2. Load assigned duties
  const loadDuties = async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_duties')
        .select('*')
        .eq('driver_id', driverId)
        .order('duty_date', { ascending: true });

      if (error) throw error;
      setDuties(data || []);
    } catch (err: any) {
      console.error('Failed to load duties:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Geolocation tracking
  useEffect(() => {
    if (!driver || driver.status !== 'approved') return;

    if (!('geolocation' in navigator)) {
      toast.warning('Browser does not support geolocation tracking.');
      return;
    }

    setGpsActive(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        // Update database with fresh coordinates
        try {
          await supabase
            .from('drivers')
            .update({
              latitude,
              longitude,
              location_updated_at: new Date().toISOString()
            })
            .eq('id', driver.id);
        } catch (err) {
          console.error('Failed to update live coordinates:', err);
        }
      },
      (error) => {
        console.error('Geolocation watcher error:', error);
        setGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driver]);

  // 4. Update duty status
  const handleDutyStatusChange = async (dutyId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('driver_duties')
        .update({ status: newStatus })
        .eq('id', dutyId);

      if (error) throw error;

      toast.success(`Duty marked as ${newStatus}!`);
      if (driver) loadDuties(driver.id);
    } catch (err: any) {
      toast.error('Failed to update status.');
    }
  };

  // 5. Sign Out
  const handleSignOut = () => {
    localStorage.removeItem('driver_session');
    toast.success('Logged out successfully.');
    navigate('/driver/login');
  };

  if (loading || !driver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="w-8 h-8 border-4 border-[#0E2A38] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isApproved = driver.status === 'approved';

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-150 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0E2A38] flex items-center justify-center text-white">
              <Car size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-[#0E2A38] text-base leading-tight">{driver.name}</h1>
              <p className="text-xs text-gray-400 font-medium">{driver.car_number}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50/20 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Verification banner if pending */}
        {!isApproved && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <ShieldAlert size={36} className="text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Verification Pending</h3>
              <p className="text-xs text-amber-800/80 leading-relaxed mt-0.5">
                Your driver partner profile is under review by the Triplooper Admin team. Once approved, you will be able to see active duties and start sharing your live browser location.
              </p>
            </div>
          </div>
        )}

        {/* GPS Live Tracker Dashboard Widget */}
        {isApproved && (
          <div className="bg-white border border-gray-250/40 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gpsActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${gpsActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <h2 className="text-sm font-bold text-[#0E2A38] uppercase tracking-wider">Live GPS Tracking</h2>
              </div>
              <p className="text-xs text-gray-400 max-w-lg leading-relaxed">
                Sharing location with Triplooper central dispatcher. Keep this browser window open during transit so properties can track their guests' arrival.
              </p>
            </div>

            {coords ? (
              <div className="flex gap-4">
                <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex items-center gap-3">
                  <Navigation size={18} className="text-[#0E2A38] rotate-45" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Latitude</span>
                    <span className="text-xs font-mono font-bold text-[#0E2A38]">{coords.lat.toFixed(6)}</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex items-center gap-3">
                  <Compass size={18} className="text-[#0E2A38]" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Longitude</span>
                    <span className="text-xs font-mono font-bold text-[#0E2A38]">{coords.lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Fetching GPS coordinates...
              </div>
            )}
          </div>
        )}

        {/* Assigned Duties list */}
        {isApproved && (
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-[#0E2A38]">My Duty Assignments</h2>
            
            {duties.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-3xl text-sm text-gray-400">
                No active transfer duties assigned to you yet. Check back later!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {duties.map(duty => {
                  const isPending = duty.status === 'pending';
                  const isActive = duty.status === 'active';
                  const isCompleted = duty.status === 'completed';

                  return (
                    <motion.div
                      key={duty.id}
                      className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between space-y-6 ${
                        isActive ? 'border-[#0E2A38] ring-4 ring-[#0E2A38]/5' : 'border-gray-250/30'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
                            isActive ? 'bg-amber-100 text-amber-800' :
                            isCompleted ? 'bg-emerald-100 text-emerald-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {duty.status}
                          </span>
                          
                          <span className="text-[11px] text-gray-400 font-mono">ID: {duty.id.substring(0, 8)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-4">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar size={14} className="text-gray-400" />
                            <span>{new Date(duty.duty_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={14} className="text-gray-400" />
                            <span>{duty.duty_time || '—'}</span>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <div className="flex gap-2">
                            <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">Pickup Location</span>
                              <span className="text-xs font-bold text-[#0E2A38]">{duty.pickup_location}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <MapPin size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">Drop Location</span>
                              <span className="text-xs font-bold text-[#0E2A38]">{duty.drop_location}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isCompleted && (
                        <div className="pt-4 border-t border-gray-50 flex gap-3">
                          {isPending && (
                            <button
                              onClick={() => handleDutyStatusChange(duty.id, 'active')}
                              className="w-full py-2.5 bg-[#0E2A38] text-white hover:bg-[#1a3d4f] rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              Start Transit
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => handleDutyStatusChange(duty.id, 'completed')}
                              className="w-full py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              Complete Transit
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
