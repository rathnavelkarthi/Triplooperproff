import type React from 'react';
import { Role } from '../../../context/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  CreditCard,
  BarChart3,
  UserCog,
  ListTodo,
  Layers,
  Globe,
  Tag,
  CalendarCheck,
  Waypoints,
  MessageSquare,
  UtensilsCrossed,
  ClipboardList,
  Armchair,
  Package,
  Calculator,
  Shield,
  Briefcase,
  Plus,
} from 'lucide-react';

export type BusinessType = 'hotel' | 'restaurant' | 'combined';
export type NavGroup =
  | 'Overview'
  | 'Hotel'
  | 'Restaurant'
  | 'Finance'
  | 'Settings'
  | 'Business'
  | 'Platform';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
  businessTypes: BusinessType[];
  group: NavGroup;
  featureKey?: string;
}

export const navItems: NavItem[] = [
  // Overview
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTANT', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Overview', featureKey: 'dashboard' },
  { name: 'Guests', path: '/admin/guests', icon: Users, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Overview', featureKey: 'guests' },

  // Hotel
  { name: 'Channel Manager', path: '/admin/channels', icon: Waypoints, roles: ['SUPER_ADMIN', 'MANAGER', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'channel_manager' },
  { name: 'Reservations', path: '/admin/reservations', icon: ListTodo, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'reservations' },
  { name: 'Calendar View', path: '/admin/calendar', icon: CalendarDays, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'calendar' },
  { name: 'Rooms', path: '/admin/rooms', icon: BedDouble, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'rooms' },
  { name: 'Service Requests', path: '/admin/service-requests', icon: ClipboardList, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'reservations' },

  // Restaurant
  { name: 'Server Orders', path: '/admin/server-orders', icon: ListTodo, roles: ['SUPER_ADMIN', 'MANAGER', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'server_orders' },
  { name: 'Point of Sale', path: '/admin/pos', icon: Calculator, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'pos' },
  { name: 'Menu Manager', path: '/admin/menu', icon: UtensilsCrossed, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Restaurant', featureKey: 'menu_manager' },
  { name: 'Food Orders', path: '/admin/food-orders', icon: ClipboardList, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Restaurant', featureKey: 'food_orders' },
  { name: 'Tables', path: '/admin/tables', icon: Armchair, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'tables' },
  { name: 'Inventory', path: '/admin/inventory', icon: Package, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'inventory' },

  // Finance
  { name: 'Reports', path: '/admin/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ACCOUNTANT'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Finance', featureKey: 'reports' },

  // Settings
  { name: 'Website Editor', path: '/admin/website-editor', icon: Globe, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'website_editor' },
  { name: 'Rooms CMS', path: '/admin/rooms-cms', icon: Layers, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'combined'], group: 'Settings', featureKey: 'rooms_cms' },
  { name: 'Pricing Rules', path: '/admin/pricing', icon: Tag, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'combined'], group: 'Settings', featureKey: 'pricing_rules' },
  { name: 'Booking Settings', path: '/admin/booking-settings', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'combined'], group: 'Settings', featureKey: 'booking_settings' },
  { name: 'WhatsApp', path: '/admin/whatsapp', icon: MessageSquare, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'whatsapp' },
  { name: 'Staff Management', path: '/admin/staff', icon: UserCog, roles: ['SUPER_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'staff' },
  { name: 'Billing', path: '/admin/billing', icon: CreditCard, roles: ['SUPER_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'billing' },

  // Business (only for BUSINESS_ADMIN)
  { name: 'My Properties', path: '/admin/business', icon: Briefcase, roles: ['BUSINESS_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Business' },
  { name: 'Create Property', path: '/admin/business/create', icon: Plus, roles: ['BUSINESS_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Business' },

  // Platform (only for platform admin)
  { name: 'Platform Admin', path: '/admin/platform', icon: Shield, roles: ['PLATFORM_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Platform' },
];

export const typeLabel: Record<BusinessType, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  combined: 'Hotel + Restaurant',
};

export const groupOrder: NavGroup[] = ['Platform', 'Business', 'Overview', 'Hotel', 'Restaurant', 'Finance', 'Settings'];
