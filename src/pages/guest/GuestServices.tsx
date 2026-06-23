import React, { useState, useEffect } from 'react';
import { useGuest } from './GuestLayout';
import { supabase } from '../../lib/supabaseClient';
import { Sparkles, Trash, Plus, Check, Clock, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';

type ServiceRequest = {
  id: number;
  request_type: 'housekeeping' | 'maintenance' | 'amenity' | 'transport' | 'late_checkout' | 'other';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'urgent';
  created_at: string;
};

const REQUEST_TYPES = [
  { key: 'housekeeping', label: 'Housekeeping', desc: 'Request room cleaning, trash clearance or fresh sheets.', icon: '🧹' },
  { key: 'amenity', label: 'Room Amenities', desc: 'Need extra towels, pillows, toiletries or drinking water.', icon: '🧴' },
  { key: 'maintenance', label: 'Maintenance Fix', desc: 'Report issue with electricals, plumbing, heater, TV or AC.', icon: '🛠️' },
  { key: 'transport', label: 'Cab / Transport', desc: 'Request a taxi or help with local sightseeing arrangements.', icon: '🚕' },
  { key: 'late_checkout', label: 'Late Checkout', desc: 'Request checking out later than standard checkout time.', icon: '⏰' },
  { key: 'other', label: 'Other Requests', desc: 'Any other help or assistance you might require.', icon: '💡' },
] as const;

export default function GuestServices() {
  const { session } = useGuest();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedType, setSelectedType] = useState<typeof REQUEST_TYPES[number]['key']>('housekeeping');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');

  const loadRequests = async () => {
    if (!session?.reservation_id) return;
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('reservation_id', session.reservation_id)
        .order('id', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading service requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Enable realtime listening for updates
    if (!session?.reservation_id) return;
    const channel = supabase
      .channel('guest_services_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `reservation_id=eq.${session.reservation_id}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!description.trim()) {
      toast.error('Please enter a brief description of your request.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .insert({
          tenant_id: session.tenant_id,
          reservation_id: session.reservation_id,
          room_id: session.room_id,
          request_type: selectedType,
          description: description.trim(),
          priority,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Your request has been sent to staff.');
      setDescription('');
      setSelectedType('housekeeping');
      setPriority('normal');
      setShowNewRequest(false);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (id: number) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Request cancelled.');
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel request.');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'in_progress':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'cancelled':
        return 'bg-zinc-800 border-zinc-700 text-zinc-500';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
  };

  const getPriorityStyle = (prio: string) => {
    switch (prio) {
      case 'urgent':
        return 'text-red-400 font-semibold';
      case 'low':
        return 'text-zinc-500';
      default:
        return 'text-zinc-400';
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Room Services</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Need housekeeping, amenities or a fix? Submit a request here.</p>
        </div>
        {!showNewRequest && (
          <button
            onClick={() => setShowNewRequest(true)}
            className="bg-emerald-500 text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors active:scale-95 shadow-lg shadow-emerald-500/10"
          >
            <Plus size={18} />
            <span>New Request</span>
          </button>
        )}
      </div>

      {/* New Request Modal */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <form 
            onSubmit={handleSubmit}
            className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">New Service Request</h3>
              <button 
                type="button"
                onClick={() => setShowNewRequest(false)} 
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Request Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {REQUEST_TYPES.map(type => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setSelectedType(type.key)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        selectedType === type.key
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-zinc-900/60 border-zinc-850/60 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-xl leading-none">{type.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">{type.label}</p>
                        <p className="text-[10px] text-zinc-500 leading-snug mt-0.5 line-clamp-1">{type.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Details</label>
                <textarea
                  placeholder={
                    selectedType === 'housekeeping' ? 'e.g. Please clear the bin and provide a fresh floor towel.' :
                    selectedType === 'amenity' ? 'e.g. Need 2 bottles of water and an extra pillow.' :
                    selectedType === 'maintenance' ? 'e.g. The hot water is not working in the bathroom.' :
                    'Please describe your request details...'
                  }
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-500 focus:bg-zinc-900/80 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none transition-colors"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'normal', 'urgent'] as const).map(prio => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize border transition-all ${
                        priority === prio
                          ? prio === 'urgent'
                            ? 'bg-red-500/15 border-red-500/40 text-red-400 font-bold'
                            : prio === 'low'
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-300 font-bold'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                          : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-900 bg-zinc-900/20">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-black font-extrabold h-12 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Send Request</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests History List */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white">Your Requests</h3>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <RefreshCw size={24} className="animate-spin text-zinc-600" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-8 text-center text-zinc-500">
            <ShieldCheck size={28} className="mx-auto mb-2 text-zinc-750" />
            <p className="text-xs">No active service requests for this stay.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const reqType = REQUEST_TYPES.find(t => t.key === req.request_type);
              return (
                <div 
                  key={req.id} 
                  className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-4 flex justify-between items-start gap-4 hover:border-zinc-800 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl mt-0.5 shrink-0 bg-zinc-900 border border-zinc-800 w-11 h-11 rounded-xl flex items-center justify-center">
                      {reqType?.icon || '💡'}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-bold text-white text-sm">{reqType?.label || req.request_type}</h4>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${getPriorityStyle(req.priority)}`}>
                          • {req.priority}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 pr-2">{req.description}</p>
                      <p className="text-[10px] text-zinc-550 flex items-center gap-1 font-medium pt-1">
                        <Clock size={11} />
                        {timeAgo(req.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusStyle(req.status)}`}>
                      {req.status}
                    </span>
                    {req.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest(req.id)}
                        className="text-red-400 hover:text-red-300 font-bold text-2xs uppercase tracking-wider flex items-center gap-1 hover:bg-red-500/5 px-2 py-1 rounded-lg border border-transparent hover:border-red-500/10 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// Minimal X component since Lucide Lucide X wasn't explicitly imported
function X() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
