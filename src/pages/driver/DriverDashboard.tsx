import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { 
  Car, MapPin, Navigation, Compass, Calendar, 
  Clock, ShieldAlert, LogOut, CheckCircle2, RefreshCw,
  Plus, Trash2, Save, CreditCard, DollarSign, Layers, Check
} from 'lucide-react';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [duties, setDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'duties' | 'cms'>('duties');

  // CMS Profile States
  const [nearbySpots, setNearbySpots] = useState<string[]>([]);
  const [newNearbySpot, setNewNearbySpot] = useState('');

  const [pickupDropServices, setPickupDropServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');

  const [travelLocations, setTravelLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');

  // Payment and Pricing States
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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

  // Populate CMS state fields when driver details are loaded
  useEffect(() => {
    if (driver) {
      setNearbySpots(driver.nearby_spots || []);
      setPickupDropServices(driver.pickup_drop_services || []);
      setTravelLocations(driver.travel_locations || []);
      
      const pd = driver.payment_details || {};
      setUpiId(pd.upi_id || '');
      setBankName(pd.bank_name || '');
      setAccountNumber(pd.account_number || '');
      setIfscCode(pd.ifsc_code || '');
      setHourlyRate(pd.hourly_rate || 0);
      setOvertimeRate(pd.overtime_rate || 0);
    }
  }, [driver]);

  // Tag helper functions
  const addNearbySpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNearbySpot.trim() && !nearbySpots.includes(newNearbySpot.trim())) {
      setNearbySpots(prev => [...prev, newNearbySpot.trim()]);
    }
    setNewNearbySpot('');
  };

  const removeNearbySpot = (spot: string) => {
    setNearbySpots(prev => prev.filter(s => s !== spot));
  };

  const addService = (e: React.FormEvent) => {
    e.preventDefault();
    if (newService.trim() && !pickupDropServices.includes(newService.trim())) {
      setPickupDropServices(prev => [...prev, newService.trim()]);
    }
    setNewService('');
  };

  const removeService = (service: string) => {
    setPickupDropServices(prev => prev.filter(s => s !== service));
  };

  const addLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocation.trim() && !travelLocations.includes(newLocation.trim())) {
      setTravelLocations(prev => [...prev, newLocation.trim()]);
    }
    setNewLocation('');
  };

  const removeLocation = (loc: string) => {
    setTravelLocations(prev => prev.filter(l => l !== loc));
  };

  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;

    setIsSaving(true);
    const toastId = toast.loading('Saving service profile...');
    try {
      const updatedPaymentDetails = {
        upi_id: upiId.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        hourly_rate: Number(hourlyRate),
        overtime_rate: Number(overtimeRate)
      };

      const { error } = await supabase
        .from('drivers')
        .update({
          nearby_spots: nearbySpots,
          pickup_drop_services: pickupDropServices,
          travel_locations: travelLocations,
          payment_details: updatedPaymentDetails
        })
        .eq('id', driver.id);

      if (error) throw error;

      // Update local state
      setDriver((prev: any) => ({
        ...prev,
        nearby_spots: nearbySpots,
        pickup_drop_services: pickupDropServices,
        travel_locations: travelLocations,
        payment_details: updatedPaymentDetails
      }));

      toast.success('Service profile updated successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update service profile.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

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

        {/* Tab Selector */}
        {isApproved && (
          <div className="flex border-b border-gray-200 gap-2 mb-2">
            <button
              onClick={() => setActiveTab('duties')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'duties'
                  ? 'border-[#0E2A38] text-[#0E2A38]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Calendar size={16} /> My Duties
            </button>
            <button
              onClick={() => setActiveTab('cms')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'cms'
                  ? 'border-[#0E2A38] text-[#0E2A38]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Layers size={16} /> Service Profile (CMS)
            </button>
          </div>
        )}

        {/* GPS Live Tracker Dashboard Widget */}
        {isApproved && activeTab === 'duties' && (
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
        {isApproved && activeTab === 'duties' && (
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

        {/* Service Profile / CMS Tab */}
        {isApproved && activeTab === 'cms' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-250/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-8"
          >
            <div>
              <h2 className="text-xl font-extrabold text-[#0E2A38]">Service Profile & CMS Settings</h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Configure your partner driver profile. This information is shared with cottages and guests to plan local sightseeing, transfers, and billing.
              </p>
            </div>

            <form onSubmit={handleSaveCMS} className="space-y-8">
              
              {/* Coverage & Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-150 pb-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#0E2A38] uppercase tracking-wider">Locations / spots where vehicle can travel</h3>
                  <p className="text-xs text-gray-400 font-medium">Add regions where you are willing to drive (e.g. Ooty, Coonoor, Kodaikanal, Pondicherry)</p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add travel location..."
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                    />
                    <button
                      type="button"
                      onClick={addLocation}
                      className="bg-[#0E2A38] text-white hover:bg-[#1a3d4f] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {travelLocations.map(loc => (
                      <span key={loc} className="inline-flex items-center gap-1 bg-[#0E2A38]/5 text-[#0E2A38] px-3 py-1.5 rounded-full text-xs font-medium">
                        {loc}
                        <button type="button" onClick={() => removeLocation(loc)} className="text-gray-400 hover:text-red-500 ml-1">
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                    {travelLocations.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No travel locations added yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#0E2A38] uppercase tracking-wider">Nearby Spots</h3>
                  <p className="text-xs text-gray-400 font-medium">Add popular visitor points near your base location (e.g. Botanical Garden, Lake, Viewpoint)</p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add nearby spot..."
                      value={newNearbySpot}
                      onChange={e => setNewNearbySpot(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                    />
                    <button
                      type="button"
                      onClick={addNearbySpot}
                      className="bg-[#0E2A38] text-white hover:bg-[#1a3d4f] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {nearbySpots.map(spot => (
                      <span key={spot} className="inline-flex items-center gap-1 bg-[#0E2A38]/5 text-[#0E2A38] px-3 py-1.5 rounded-full text-xs font-medium">
                        {spot}
                        <button type="button" onClick={() => removeNearbySpot(spot)} className="text-gray-400 hover:text-red-500 ml-1">
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                    {nearbySpots.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No nearby spots added yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Services & Transfer offerings */}
              <div className="space-y-4 border-b border-gray-150 pb-8">
                <h3 className="text-sm font-bold text-[#0E2A38] uppercase tracking-wider">Pickup & Drop Services</h3>
                <p className="text-xs text-gray-400 font-medium">Select or add specific transfer services you support (e.g. Airport Transfer, Station Pickup, Resort Dropoff)</p>

                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Add transfer service..."
                    value={newService}
                    onChange={e => setNewService(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="bg-[#0E2A38] text-white hover:bg-[#1a3d4f] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {pickupDropServices.map(service => (
                    <span key={service} className="inline-flex items-center gap-1 bg-[#0E2A38]/5 text-[#0E2A38] px-3 py-1.5 rounded-full text-xs font-medium">
                      {service}
                      <button type="button" onClick={() => removeService(service)} className="text-gray-400 hover:text-red-500 ml-1">
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                  {pickupDropServices.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No services listed yet.</p>
                  )}
                </div>
              </div>

              {/* Payments and Hourly Pricing */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-[#0E2A38] uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={18} /> Payments & Pricing Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Bank Account & UPI */}
                  <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-150">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bank Details & UPI</h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">UPI ID</label>
                      <input
                        type="text"
                        placeholder="e.g. rajesh@upi"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC0001234"
                          value={ifscCode}
                          onChange={e => setIfscCode(e.target.value)}
                          className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 501002930219"
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/10"
                      />
                    </div>
                  </div>

                  {/* Right Column: Pricing & Hourly Charges */}
                  <div className="space-y-4 bg-amber-50/20 p-6 rounded-2xl border border-amber-500/10">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign size={14} /> Pricing & Hourly Rates
                    </h4>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800/80 uppercase mb-1">Standard Hourly Charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Standard rate per hour (e.g. ₹200)"
                        value={hourlyRate || ''}
                        onChange={e => setHourlyRate(Number(e.target.value))}
                        className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/10 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800/80 uppercase mb-1">Overtime Extra Charge (₹/hour)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Extra charge per hour for overtime (e.g. ₹350)"
                        value={overtimeRate || ''}
                        onChange={e => setOvertimeRate(Number(e.target.value))}
                        className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/10 font-bold text-red-700 bg-red-500/5"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-150 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0E2A38] text-white hover:bg-[#1a3d4f] px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> {isSaving ? 'Saving service profile...' : 'Save Profile Changes'}
                </button>
              </div>

            </form>
          </motion.div>
        )}

      </div>
    </div>
  );
}
