import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { ClipboardList, MessageSquare, Play, CheckCircle2, XCircle, Clock, Shield, AlertTriangle, User, RefreshCw, Send, ArrowLeft } from 'lucide-react';
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

type GuestMessage = {
  id: number;
  reservation_id: string;
  sender_type: 'guest' | 'staff';
  sender_name: string;
  message: string;
  created_at: string;
  reservations?: {
    guest_name: string;
    rooms?: { room_number: string } | null;
  };
};

export default function ServiceRequests() {
  const { tenant, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'chat'>('requests');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Helpdesk Chat State
  const [conversations, setConversations] = useState<{ [resId: string]: GuestMessage[] }>({});
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      // 1. Fetch service requests
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

      // 2. Fetch guest messages
      const { data: msgData, error: msgError } = await supabase
        .from('guest_messages')
        .select(`
          id,
          reservation_id,
          sender_type,
          sender_name,
          message,
          created_at,
          reservations:reservation_id (
            guest_name,
            rooms:room_id (
              room_number
            )
          )
        `)
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });

      if (!msgError && msgData) {
        const grouped: { [resId: string]: GuestMessage[] } = {};
        (msgData as any[]).forEach(msg => {
          if (!grouped[msg.reservation_id]) grouped[msg.reservation_id] = [];
          grouped[msg.reservation_id].push(msg);
        });
        setConversations(grouped);
        if (!selectedResId && Object.keys(grouped).length > 0) {
          setSelectedResId(Object.keys(grouped)[0]);
        }
      }

      // 3. Fetch active staff
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
    // Set up realtime updates for requests & messages
    const channel = supabase
      .channel('crm_services_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_messages',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => loadData()
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedResId || !replyText.trim() || sendingReply) return;

    const messageText = replyText.trim();
    setReplyText('');
    setSendingReply(true);

    try {
      const senderName = user?.name || tenant?.business_name || 'Front Desk';
      const { error } = await supabase
        .from('guest_messages')
        .insert({
          tenant_id: tenant.id,
          reservation_id: selectedResId,
          sender_type: 'staff',
          sender_name: senderName,
          message: messageText,
        });

      if (error) throw error;
      toast.success('Reply sent to guest');
      loadData();
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const statusMatch = filterStatus === 'all' || req.status === filterStatus;
    const prioMatch = filterPriority === 'all' || req.priority === filterPriority;
    return statusMatch && prioMatch;
  });

  const totalUnreadMessages = (Object.values(conversations) as GuestMessage[][]).reduce((acc: number, msgs: GuestMessage[]) => {
    return acc + msgs.filter(m => m.sender_type === 'guest').length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Services & Helpdesk</h1>
          <p className="text-sm text-gray-500 mt-1">Manage guest housekeeping requests, amenities, and live reception chat</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'requests' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardList size={14} /> Service Requests
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chat' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare size={14} /> Reception Helpdesk
              {totalUnreadMessages > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {totalUnreadMessages}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 text-xs font-medium"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* TAB 1: SERVICE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
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
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-base">{req.request_type}</span>
                            {getPriorityBadge(req.priority)}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Room {roomNum} • {guestName}
                          </p>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>

                      {req.description && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          {req.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock size={13} />
                        <span>{formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(req.id, 'in_progress')}
                            className="px-3 py-1.5 bg-sky-50 text-sky-700 font-semibold rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1"
                          >
                            <Play size={12} /> Accept
                          </button>
                        )}
                        {req.status === 'in_progress' && (
                          <button
                            onClick={() => updateStatus(req.id, 'completed')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} /> Complete
                          </button>
                        )}
                        {req.status !== 'completed' && req.status !== 'cancelled' && (
                          <button
                            onClick={() => updateStatus(req.id, 'cancelled')}
                            className="px-3 py-1.5 bg-gray-50 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEPTION HELPDESK / GUEST CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">
          {/* Conversation List */}
          <div className="border-r border-gray-200 bg-gray-50/50 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <MessageSquare size={16} className="text-[#C9A646]" />
                Active Guest Chats
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{Object.keys(conversations).length} active conversations</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {Object.keys(conversations).length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No guest messages received yet.
                </div>
              ) : (
                (Object.entries(conversations) as [string, GuestMessage[]][]).map(([resId, msgs]) => {
                  const lastMsg = msgs[msgs.length - 1];
                  const guestName = lastMsg?.reservations?.guest_name || lastMsg?.sender_name || 'Guest';
                  const roomNum = lastMsg?.reservations?.rooms?.room_number || '';
                  const isSelected = selectedResId === resId;

                  return (
                    <button
                      key={resId}
                      onClick={() => setSelectedResId(resId)}
                      className={`w-full text-left p-4 transition-colors flex flex-col gap-1 ${
                        isSelected ? 'bg-white border-l-4 border-[#0E2A38] shadow-2xs' : 'hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">
                          {guestName} {roomNum ? `(Room ${roomNum})` : ''}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {lastMsg ? formatDistanceToNow(parseISO(lastMsg.created_at), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {lastMsg ? `${lastMsg.sender_type === 'staff' ? 'You: ' : ''}${lastMsg.message}` : ''}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Thread */}
          <div className="md:col-span-2 flex flex-col bg-white">
            {selectedResId && conversations[selectedResId] ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">
                      {conversations[selectedResId][0]?.reservations?.guest_name || 'Guest'}
                      {conversations[selectedResId][0]?.reservations?.rooms?.room_number && 
                        ` • Room ${conversations[selectedResId][0]?.reservations?.rooms?.room_number}`
                      }
                    </h4>
                    <span className="text-2xs text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Guest Portal Connected
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">#{selectedResId}</span>
                </div>

                {/* Message History */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] bg-slate-50/50">
                  {conversations[selectedResId].map(msg => {
                    const isStaff = msg.sender_type === 'staff';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-gray-400">{msg.sender_name}</span>
                          <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(parseISO(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs ${
                          isStaff 
                            ? 'bg-[#0E2A38] text-white rounded-br-xs' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs shadow-2xs'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatScrollRef} />
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="p-3 border-t border-gray-200 flex items-center gap-2 bg-white">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type reply to guest..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0E2A38]"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send size={13} /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <MessageSquare size={36} className="text-gray-300 mb-2" />
                <p className="text-xs font-semibold">Select a conversation from the left to read and reply.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
