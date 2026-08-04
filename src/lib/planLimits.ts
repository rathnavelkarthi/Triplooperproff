import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMDataContext';

export type ResourceType = 'rooms' | 'reservations' | 'menu_items' | 'tables' | 'staff' | 'food_orders';

const UNLIMITED = Infinity;

export const PLAN_LIMITS: Record<string, Record<ResourceType, number>> = {
    subscription: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    subscription_custom: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    sub_1year: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    sub_6months: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    sub_3months: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    sub_1month: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    commission: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    starter: { rooms: 5, reservations: 20, menu_items: 10, tables: 5, staff: 2, food_orders: 20 },
    growth: { rooms: 30, reservations: UNLIMITED, menu_items: 50, tables: 20, staff: 5, food_orders: UNLIMITED },
    pro: { rooms: 75, reservations: UNLIMITED, menu_items: 200, tables: 50, staff: 15, food_orders: UNLIMITED },
    enterprise: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    subscription_2700: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    subscription_small: { rooms: 10, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
    subscription_large: { rooms: UNLIMITED, reservations: UNLIMITED, menu_items: UNLIMITED, tables: UNLIMITED, staff: UNLIMITED, food_orders: UNLIMITED },
};

const PLAN_LABELS: Record<string, string> = {
    subscription: 'Subscribed Plan (Unlimited Rooms + 12% Commission)',
    subscription_custom: 'Custom Subscribed Plan (Tax Inclusive + 12% Commission)',
    sub_1year: '1 Year Plan (₹1,999/mo + 18% GST)',
    sub_6months: '6 Months Plan (₹2,300/mo + 18% GST)',
    sub_3months: '3 Months Plan (₹2,500/mo + 18% GST)',
    sub_1month: '1 Month Plan (₹2,700/mo + 18% GST)',
    commission: '12% Commission Only (Trial / PMS Mode)',
    starter: 'Starter',
    growth: 'Growth',
    pro: 'Pro',
    enterprise: 'Enterprise',
    subscription_2700: 'Subscription (₹2,700/mo)',
    subscription_small: 'Subscription (Max 10 Rooms)',
    subscription_large: 'Subscription (Unlimited Rooms)',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
    rooms: 'rooms',
    reservations: 'reservations this month',
    menu_items: 'menu items',
    tables: 'tables',
    staff: 'staff members',
    food_orders: 'food orders this month',
};

export function usePlanLimits() {
    const { tenant } = useAuth();
    const { rooms, reservations, menuItems, restaurantTables, staff, foodOrders } = useCRM();

    const planKey = tenant?.plan || 'commission';
    const plan = PLAN_LABELS[planKey] || planKey;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.commission;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const counts: Record<ResourceType, number> = {
        rooms: rooms.length,
        reservations: reservations.filter(r => r.checkIn >= monthStart).length,
        menu_items: menuItems.length,
        tables: restaurantTables.length,
        staff: staff.length,
        food_orders: foodOrders.filter(o => o.created_at >= monthStart).length,
    };

    const canAdd = (resource: ResourceType): boolean => counts[resource] < limits[resource];
    const limitFor = (resource: ResourceType): number => limits[resource];
    const currentCount = (resource: ResourceType): number => counts[resource];
    const labelFor = (resource: ResourceType): string => RESOURCE_LABELS[resource];

    return { plan, canAdd, limitFor, currentCount, labelFor };
}
