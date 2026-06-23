import React, { useState, useEffect, useRef } from 'react';
import { useGuest } from './GuestLayout';
import { supabase } from '../../lib/supabaseClient';
import { Send, User, MessageSquare, Clock, Shield } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Message = {
  id: number;
  sender_type: 'guest' | 'staff';
  sender_name: string;
  message: string;
  created_at: string;
};

export default function GuestChat() {
  const { session } = useGuest();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!session?.reservation_id) return;
    try {
      const { data, error } = await supabase
        .from('guest_messages')
        .select('*')
        .eq('reservation_id', session.reservation_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  };

  useEffect(() => {
    loadMessages();

    // Enable realtime listening for new chat messages
    if (!session?.reservation_id) return;
    const channel = supabase
      .channel('guest_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_messages',
          filter: `reservation_id=eq.${session.reservation_id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !text.trim() || sending) return;

    const messageText = text.trim();
    setText('');
    setSending(true);

    try {
      const { error } = await supabase
        .from('guest_messages')
        .insert({
          tenant_id: session.tenant_id,
          reservation_id: session.reservation_id,
          sender_type: 'guest',
          sender_name: session.guest_name,
          message: messageText,
        });

      if (error) throw error;
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatMsgTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'hh:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[70vh] md:h-[75vh] bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
      
      {/* Chat Header */}
      <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
          <MessageSquare size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">Reception Helpdesk</h3>
          <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Front Desk is Online
          </p>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-3">
            <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 text-zinc-650 rounded-2xl flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">No messages yet</p>
              <p className="text-[10px] text-zinc-550 mt-1 leading-normal">
                Send a message to request early check-in details, ask a query, or chat directly with the front desk staff.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isGuest = msg.sender_type === 'guest';
            return (
              <div 
                key={msg.id || index} 
                className={`flex gap-3 max-w-[85%] ${isGuest ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                  isGuest 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {isGuest ? <User size={14} /> : <Shield size={14} />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isGuest
                      ? 'bg-emerald-500 text-black font-medium rounded-tr-none'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}>
                    {msg.message}
                  </div>
                  <div className={`text-[9px] text-zinc-500 flex items-center gap-1 ${isGuest ? 'justify-end' : ''}`}>
                    <Clock size={10} />
                    {formatMsgTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSend}
        className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex gap-2"
      >
        <input
          type="text"
          placeholder="Type your message to front desk..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-black w-11 h-11 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 shadow-lg shadow-emerald-500/10"
        >
          <Send size={16} />
        </button>
      </form>

    </div>
  );
}
