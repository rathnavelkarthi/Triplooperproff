import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMDataContext';
import { supabase } from '../../lib/supabaseClient';
import { MessageSquare, Send, User, Clock, CheckCheck, Sparkles, ArrowUpRight, BedDouble, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export type DashboardGuestMessage = {
  id: number;
  tenant_id: string;
  reservation_id: string;
  sender_type: 'guest' | 'staff';
  sender_name: string;
  message: string;
  created_at: string;
  reservations?: {
    guest_name: string;
    rooms?: { room_number: string; name: string } | null;
  };
};

export default function LiveGuestChatCard() {
  const { tenant, user } = useAuth();
  const { reservations, rooms } = useCRM();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<DashboardGuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group messages by reservation_id
  const conversations = React.useMemo(() => {
    const grouped: { [resId: string]: DashboardGuestMessage[] } = {};
    messages.forEach(msg => {
      if (!grouped[msg.reservation_id]) grouped[msg.reservation_id] = [];
      grouped[msg.reservation_id].push(msg);
    });
    return grouped;
  }, [messages]);

  const conversationList = React.useMemo(() => {
    return (Object.entries(conversations) as [string, DashboardGuestMessage[]][]).map(([resId, msgs]) => {
      const lastMsg = msgs[msgs.length - 1];
      const res = reservations.find(r => r.id === resId);
      const room = res ? rooms.find(rm => rm.id === res.room_id) : null;
      
      const guestName = res?.guest || lastMsg?.sender_name || 'In-House Guest';
      const roomLabel = res?.room || (room?.room_number ? `Room ${room.room_number}` : 'Room');
      
      const unreadCount = msgs.filter(m => m.sender_type === 'guest').length;

      return {
        resId,
        guestName,
        roomLabel,
        lastMsg,
        totalMsgs: msgs.length,
        unreadCount,
        lastActivity: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
      };
    }).sort((a, b) => b.lastActivity - a.lastActivity);
  }, [conversations, reservations, rooms]);

  const loadMessages = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guest_messages')
        .select(`
          id,
          tenant_id,
          reservation_id,
          sender_type,
          sender_name,
          message,
          created_at
        `)
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as any) || []);

      if (data && data.length > 0) {
        // Auto-select latest active thread if not selected
        const lastMsg = data[data.length - 1];
        setSelectedResId(prev => prev || lastMsg.reservation_id);
      }
    } catch (err) {
      console.error('Failed to load guest messages on dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    if (!tenant?.id) return;
    const channel = supabase
      .channel('dashboard_guest_chat_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_messages',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          const newMsg = payload.new as DashboardGuestMessage;
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.sender_type === 'guest') {
            toast.info(`💬 New message from ${newMsg.sender_name}: "${newMsg.message.slice(0, 40)}..."`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id]);

  useEffect(() => {
    if (selectedResId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedResId, messages]);

  const handleSendReply = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const textToSend = customMsg || replyText.trim();
    if (!selectedResId || !textToSend || !tenant?.id || sending) return;

    setSending(true);
    if (!customMsg) setReplyText('');

    try {
      const senderName = user?.name || tenant?.business_name || 'Front Desk';
      const { error } = await supabase
        .from('guest_messages')
        .insert({
          tenant_id: tenant.id,
          reservation_id: selectedResId,
          sender_type: 'staff',
          sender_name: senderName,
          message: textToSend,
        });

      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      toast.error('Failed to send message to guest');
    } finally {
      setSending(false);
    }
  };

  const quickReplies = [
    "Hello! How may we assist you today?",
    "We have dispatched housekeeping to your room.",
    "Your room service order has been received.",
    "Certainly! We are attending to this right away.",
  ];

  const activeThread = selectedResId ? conversations[selectedResId] || [] : [];
  const activeRes = selectedResId ? reservations.find(r => r.id === selectedResId) : null;
  const activeRoom = activeRes ? rooms.find(rm => rm.id === activeRes.room_id) : null;
  const activeGuestName = activeRes?.guest || activeThread[0]?.sender_name || 'Guest';
  const activeRoomLabel = activeRes?.room || (activeRoom?.room_number ? `Room ${activeRoom.room_number}` : 'Room');

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-zinc-50/80 to-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Live Guest Helpdesk & Chat</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Real-time two-way messaging with in-house guests</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/service-requests?tab=chat')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all"
        >
          <span>Open Full Inbox</span>
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Main Body: 2 Columns (Thread List | Active Chat) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0">
        {/* Left Column: Conversations List (5 cols) */}
        <div className="md:col-span-4 border-r border-zinc-100 flex flex-col h-full overflow-hidden bg-zinc-50/40">
          <div className="p-3 border-b border-zinc-100 bg-white/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Active In-House Chats ({conversationList.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading guest chats...</div>
            ) : conversationList.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No guest messages yet</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Messages sent from the in-room Guest Portal will appear here instantly.
                </p>
              </div>
            ) : (
              conversationList.map((item) => {
                const isSelected = selectedResId === item.resId;
                return (
                  <button
                    key={item.resId}
                    onClick={() => setSelectedResId(item.resId)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-white shadow-xs border-l-4 border-black'
                        : 'hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.guestName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {item.guestName}
                        </span>
                        {item.lastMsg && (
                          <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                            {formatDistanceToNow(new Date(item.lastMsg.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded border border-gray-200 truncate">
                          {item.roomLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate leading-snug">
                        {item.lastMsg?.sender_type === 'staff' ? 'You: ' : ''}
                        {item.lastMsg?.message || 'Started chat'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window (8 cols) */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {selectedResId ? (
            <>
              {/* Chat Thread Header */}
              <div className="px-5 py-3 border-b border-zinc-100 flex justify-between items-center bg-white shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    {activeGuestName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{activeGuestName}</h4>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      <BedDouble size={12} className="text-gray-400" />
                      <span>{activeRoomLabel}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-600 font-medium">Guest In-House</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    Res ID: {selectedResId.slice(0, 10)}
                  </span>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/30">
                {activeThread.map((msg) => {
                  const isStaff = msg.sender_type === 'staff';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {isStaff ? 'Front Desk' : msg.sender_name || 'Guest'}
                        </span>
                        <span className="text-[9px] text-gray-300">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-2xs leading-relaxed ${
                          isStaff
                            ? 'bg-black text-white rounded-tr-xs'
                            : 'bg-emerald-600 text-white rounded-tl-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Replies */}
              <div className="px-4 py-2 bg-zinc-50/80 border-t border-zinc-100 flex gap-2 overflow-x-auto no-scrollbar">
                {quickReplies.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReply(undefined, q)}
                    disabled={sending}
                    className="shrink-0 text-[11px] font-medium bg-white hover:bg-zinc-100 text-gray-700 px-3 py-1.5 rounded-full border border-zinc-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    + {q}
                  </button>
                ))}
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-zinc-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${activeGuestName}...`}
                  className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:border-black focus:bg-white outline-none transition-all text-gray-900"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="bg-black hover:bg-zinc-800 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                >
                  <Send size={13} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageSquare size={32} className="mb-2 text-zinc-300" />
              <p className="text-xs font-semibold text-gray-600">Select a conversation</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                Choose a guest from the left to view messages and respond directly from the front desk.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
