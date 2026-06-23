import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { ClipboardList, Play, CheckCircle2, XCircle, Clock, Shield, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';

type StaffMember = { id: string; name: string; role: string };

type ServiceRequest = {
  id: number;
  request_type: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'urgent';
  assigned_to: string | null;
  created_at: string;
  completed_at: string | null;
  reservations?: {
    id: string;
    guest_name: string;
    rooms?: {
      room_number: string;
      name: string;
    } | null;
  } | null;
};

export default function ServiceRequests() {
  const { tenant } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const loadData = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      // Fetch service requests with joined reservation & room data
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          id,
          request_type,
          description,
          status,
          priority,
          assigned_to,
          created_at,
          completed_at,
          reservations:reservation_id (
            id,
            guest_name,
            rooms:room_id (
              room_number,
              name
            )
          )
        `)
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);

      // Fetch active staff for assignment
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('tenant_id', tenant.id);
      setStaff(staffData || []);
    } catch (err: any) {
      console.error('Failed to load CRM requests:', err);
      toast.error('Failed to fetch service requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (!tenant?.id) return;
    // Set up realtime updates
    const channel = supabase
      .channel('crm_services_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id]);

  const updateStatus = async (id: number, status: ServiceRequest['status']) => {
    try {
      const updatePayload: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      if (status === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('service_requests')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;
      toast.success(`Request marked as ${status}`);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update request status');
    }
  };

  const assignStaff = async (id: number, staffName: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ assigned_to: staffName || null })
        .eq('id', id);

      if (error) throw error;
      toast.success(staffName ? `Assigned to ${staffName}` : 'Assignment removed');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to assign staff member');
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'urgent':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-2xs px-2.5 py-0.5 rounded-full font-bold uppercase">Urgent</span>;
      case 'low':
        return <span className="bg-gray-100 text-gray-600 border border-gray-200 text-2xs px-2.5 py-0.5 rounded-full font-medium">Low</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-100 text-2xs px-2.5 py-0.5 rounded-full font-semibold">Normal</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-2xs px-2.5 py-0.5 rounded-full font-semibold uppercase">Pending</span>;
      case 'in_progress':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 text-2xs px-2.5 py-0.5 rounded-full font-semibold uppercase">In Progress</span>;
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs px-2.5 py-0.5 rounded-full font-semibold uppercase">Completed</span>;
      default:
        return <span className="bg-gray-100 text-gray-500 border border-gray-250 text-2xs px-2.5 py-0.5 rounded-full font-medium uppercase">Cancelled</span>;
    }
  };

  const filteredRequests = requests.filter(req => {
    const statusMatch = filterStatus === 'all' || req.status === filterStatus;
    const prioMatch = filterPriority === 'all' || req.priority === filterPriority;
    return statusMatch && prioMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time room services, amenities, and maintenance logs</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
        <div>
          <label className="text-2xs text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:border-[#0E2A38] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="text-2xs text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">Priority</label>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:border-[#0E2A38] focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#0E2A38] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-gray-150 rounded-2xl p-16 text-center text-gray-550">
          <ClipboardList size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-semibold">No service requests found matching your filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredRequests.map(req => {
            const roomNum = req.reservations?.rooms?.room_number || 'TBD';
            const guestName = req.reservations?.guest_name || 'Guest';
            return (
              <div 
                key={req.id} 
                className="bg-white border border-gray-150 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Header info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Room {roomNum} • {guestName}</span>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5 capitalize">{req.request_type.replace('_', ' ')}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {getPriorityBadge(req.priority)}
                      {getStatusBadge(req.status)}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-3">{req.description}</p>
                </div>

                {/* Assignment & Actions */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  {/* Assigner */}
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <select
                      value={req.assigned_to || ''}
                      onChange={e => assignStaff(req.id, e.target.value)}
                      className="border border-gray-250 bg-white rounded-lg text-2xs px-2 py-1 focus:border-[#0E2A38] focus:outline-none"
                    >
                      <option value="">Assign Staff</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {req.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(req.id, 'in_progress')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Play size={12} /> Start
                      </button>
                    )}
                    {(req.status === 'pending' || req.status === 'in_progress') && (
                      <>
                        <button
                          onClick={() => updateStatus(req.id, 'completed')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <CheckCircle2 size={12} /> Complete
                        </button>
                        <button
                          onClick={() => updateStatus(req.id, 'cancelled')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Received: {formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}
                  </span>
                  {req.completed_at && (
                    <span className="text-emerald-600 font-semibold">
                      Done: {formatDistanceToNow(parseISO(req.completed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
