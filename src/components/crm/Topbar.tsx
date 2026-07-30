import { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, Plus, Menu, LogOut, CheckCheck, 
  Calendar, Utensils, Building2, AlertCircle, X, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMDataContext';
import { getPropertySubscriptionDetails } from '../../lib/subscriptionUtils';
import { motion, AnimatePresence } from 'motion/react';
import QuickCheckoutModal from './QuickCheckoutModal';

interface TopbarProps {
  onMenuClick: () => void;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'food' | 'verification' | 'subscription' | 'system';
  link: string;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, tenant, hasPermission } = useAuth();
  const { reservations, foodOrders } = useCRM();
  const navigate = useNavigate();
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('triplooper_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save read notification IDs
  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('triplooper_read_notifications', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save notification state', err);
      }
    }
  };

  const markAllAsRead = (allNotifications: NotificationItem[]) => {
    const allIds = Array.from(new Set([...readIds, ...allNotifications.map(n => n.id)]));
    setReadIds(allIds);
    try {
      localStorage.setItem('triplooper_read_notifications', JSON.stringify(allIds));
    } catch (err) {
      console.error('Failed to save notification state', err);
    }
  };

  // Generate dynamic system notifications
  const generateNotifications = (): NotificationItem[] => {
    const list: NotificationItem[] = [];

    // 1. Subscription & Grace Period Alerts
    if (tenant) {
      const subDetails = getPropertySubscriptionDetails(
        tenant.plan,
        tenant.subscription_expires_at,
        tenant.manual_override,
        tenant.grace_period_days || 3,
        tenant.is_active
      );

      if (subDetails.status === 'grace_period') {
        list.push({
          id: `sub-grace-${tenant.id}`,
          title: '3-Day Subscription Grace Period Active',
          message: `Your subscription has ended. You have ${subDetails.daysRemainingGrace || 3} days left in grace period.`,
          timestamp: 'Action Needed',
          read: readIds.includes(`sub-grace-${tenant.id}`),
          type: 'subscription',
          link: '/admin/billing'
        });
      } else if (subDetails.status === 'expired') {
        list.push({
          id: `sub-expired-${tenant.id}`,
          title: 'Subscription Expired',
          message: 'Your subscription period has ended. Please renew to keep full access.',
          timestamp: 'Expired',
          read: readIds.includes(`sub-expired-${tenant.id}`),
          type: 'subscription',
          link: '/admin/billing'
        });
      }
    }

    // 2. Property Verification Notices
    if (tenant && tenant.verification_status) {
      if (tenant.verification_status === 'pending') {
        list.push({
          id: `ver-pending-${tenant.id}`,
          title: 'Verification In Review',
          message: 'Your uploaded government trade authorization documents are being reviewed by platform admins.',
          timestamp: 'Today',
          read: readIds.includes(`ver-pending-${tenant.id}`),
          type: 'verification',
          link: '/admin/verification'
        });
      } else if (tenant.verification_status === 'rejected') {
        list.push({
          id: `ver-rejected-${tenant.id}`,
          title: 'Document Verification Notice',
          message: tenant.verification_reason || 'Please re-upload a clear copy of your trade authorization license.',
          timestamp: 'Action Required',
          read: readIds.includes(`ver-rejected-${tenant.id}`),
          type: 'verification',
          link: '/admin/verification'
        });
      }
    }

    // 3. Pending Kitchen / POS Orders
    const pendingOrders = (foodOrders || []).filter(o => o.status === 'Pending' || o.status === 'Preparing');
    if (pendingOrders.length > 0) {
      const latest = pendingOrders[0];
      list.push({
        id: `food-order-${latest.id}`,
        title: `${pendingOrders.length} Active Kitchen Order${pendingOrders.length > 1 ? 's' : ''}`,
        message: `Order #${latest.id.substring(0, 6)} for Table ${latest.table_number || '1'} is pending preparation.`,
        timestamp: 'Just now',
        read: readIds.includes(`food-order-${latest.id}`),
        type: 'food',
        link: '/admin/food-orders'
      });
    }

    // 4. Recent Reservations
    const activeRes = (reservations || [])
      .filter(r => r.status !== 'Cancelled')
      .slice(0, 3);

    activeRes.forEach(r => {
      list.push({
        id: `res-${r.id}`,
        title: `Reservation: ${r.guest}`,
        message: `Stay in ${r.room} for ${r.checkIn || 'upcoming dates'}. Status: ${r.status}`,
        timestamp: r.checkIn || 'Upcoming',
        read: readIds.includes(`res-${r.id}`),
        type: 'booking',
        link: '/admin/reservations'
      });
    });

    // Fallback notification if empty
    if (list.length === 0) {
      list.push({
        id: 'sys-welcome',
        title: 'System Operational',
        message: 'All PMS operations, room bookings, and POS servers are functioning smoothly.',
        timestamp: 'Today',
        read: readIds.includes('sys-welcome'),
        type: 'system',
        link: '/admin/dashboard'
      });
    }

    return list;
  };

  const notifications = generateNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="h-20 bg-white/60 backdrop-blur-2xl border-b border-gray-200/50 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">

        <div className="flex items-center gap-6 flex-1">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 focus:outline-none transition-colors"
          >
            <Menu size={24} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search operations, guests, or IDs..."
              className="w-full pl-11 pr-4 py-2.5 bg-white/50 border border-gray-200/60 rounded-full text-sm font-medium focus:bg-white focus:border-[#C9A646] focus:ring-4 focus:ring-[#C9A646]/10 outline-none transition-all shadow-inner placeholder-gray-400"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 lg:gap-8">
          {hasPermission(['SUPER_ADMIN', 'MANAGER', 'RECEPTION']) && (
            <div className="hidden sm:flex items-center gap-3">
              <motion.button
                onClick={() => setShowCheckout(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#0E2A38] px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all shadow-sm border border-gray-200"
              >
                <LogOut size={14} className="text-[#C9A646]" />
                Quick Check Out
              </motion.button>
              <motion.button
                onClick={() => navigate('/admin/reservations?action=new')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 bg-[#0E2A38] hover:bg-[#091b24] text-[#C9A646] px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all shadow-md hover:shadow-lg border border-[#0E2A38]"
              >
                <Plus size={14} />
                Quick Booking
              </motion.button>
            </div>
          )}

          {hasPermission(['SUPER_ADMIN', 'MANAGER', 'RECEPTION']) && (
            <div className="sm:hidden flex items-center gap-2">
              <button
                onClick={() => setShowCheckout(true)}
                className="flex items-center justify-center bg-white text-[#0E2A38] p-2.5 rounded-full font-semibold transition-all shadow-sm border border-gray-200"
              >
                <LogOut size={18} className="text-[#C9A646]" />
              </button>
              <button
                onClick={() => navigate('/admin/reservations?action=new')}
                className="flex items-center justify-center bg-[#0E2A38] text-[#C9A646] p-2.5 rounded-full font-semibold transition-all shadow-md"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          {/* Interactive Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-full hover:bg-gray-100/80 transition-all text-gray-500 hover:text-gray-900 focus:outline-none"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-red-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-[#0E2A38]" />
                      <h3 className="font-bold text-[#0E2A38] text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead(notifications)}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n) => {
                      const isUnread = !n.read;
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            setShowNotifications(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`p-4 flex items-start gap-3 hover:bg-gray-50/80 transition-colors cursor-pointer relative ${
                            isUnread ? 'bg-blue-50/30' : 'bg-white'
                          }`}
                        >
                          {/* Icon Container */}
                          <div className={`p-2 rounded-xl shrink-0 ${
                            n.type === 'booking' ? 'bg-blue-50 text-blue-600' :
                            n.type === 'food' ? 'bg-amber-50 text-amber-600' :
                            n.type === 'subscription' ? 'bg-red-50 text-red-600' :
                            n.type === 'verification' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {n.type === 'booking' && <Calendar size={16} />}
                            {n.type === 'food' && <Utensils size={16} />}
                            {n.type === 'subscription' && <AlertCircle size={16} />}
                            {n.type === 'verification' && <Building2 size={16} />}
                            {n.type === 'system' && <Bell size={16} />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className={`text-xs font-bold truncate ${isUnread ? 'text-[#0E2A38]' : 'text-gray-700'}`}>
                                {n.title}
                              </h4>
                              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                {n.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                          </div>

                          {/* Unread Dot */}
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/admin/reservations');
                      }}
                      className="text-[11px] font-bold text-gray-600 hover:text-[#0E2A38] transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <span>View All System Activity</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4 pl-4 lg:pl-8 border-l border-gray-200/60">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Active Workspace</p>
            </div>
            <motion.img
              whileHover={{ scale: 1.05 }}
              src={user?.avatar}
              alt={user?.name}
              className="w-9 h-9 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 cursor-pointer object-cover"
            />
          </div>
        </div>

      </header>

      <QuickCheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} />
    </>
  );
}
