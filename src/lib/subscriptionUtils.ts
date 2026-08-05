/**
 * Subscription & Grace Period Utility Module for Triplooper
 * Handles subscription status calculation, 3-day grace period logic, and manual overrides.
 */

export type SubscriptionStatusType = 'active' | 'grace_period' | 'expired' | 'manual_on' | 'manual_off';

export interface PropertySubscription {
  plan: string;
  status: SubscriptionStatusType;
  statusLabel: string;
  badgeBg: string;
  badgeText: string;
  isAccessAllowed: boolean;
  expiresAt: string | null;
  gracePeriodDays: number;
  manualOverride: boolean | null;
  daysRemaining: number | null;
  daysRemainingGrace: number | null;
}

export const PLAN_NAMES: Record<string, string> = {
  sub_1year: '1 Year Plan (₹1,999/mo + 18% GST)',
  sub_6months: '6 Months Plan (₹2,300/mo + 18% GST)',
  sub_3months: '3 Months Plan (₹2,500/mo + 18% GST)',
  sub_1month: '1 Month Plan (₹2,700/mo + 18% GST)',
  commission: '12% Commission Only (Trial / PMS Mode)',
  subscription: 'Subscribed Plan (Full Access + 12% Commission)',
  subscription_custom: 'Custom Subscribed Plan (Tax Inclusive + 12% Commission)',
  starter: 'Starter Plan',
  growth: 'Growth Plan',
  pro: 'Pro Plan',
  enterprise: 'Enterprise Plan',
  subscription_2700: 'Subscription (₹2,700/mo)',
  subscription_small: 'Subscription (Standard Plan)',
  subscription_large: 'Subscription (Unlimited Rooms)',
};

/**
 * Calculate subscription details considering:
 * 1. Manual override (true = ON, false = OFF, null = Auto)
 * 2. Subscription expiration date
 * 3. 3-day Grace Period after subscription ends
 */
export function getPropertySubscriptionDetails(
  plan: string = 'starter',
  expiresAt?: string | null,
  manualOverride?: boolean | null,
  gracePeriodDays: number = 3,
  tenantIsActive: boolean = true,
  createdAt?: string | null
): PropertySubscription {
  const currentPlan = plan || 'starter';

  // Infer default expiration window if no explicit expiration date is passed in DB
  const isSubscriptionPlan = currentPlan === 'subscription_custom' || 
                             currentPlan === 'subscription' || 
                             currentPlan.startsWith('sub_') || 
                             currentPlan.startsWith('subscription_');

  let defaultDays = 30;
  if (currentPlan === 'sub_1year') defaultDays = 365;
  else if (currentPlan === 'sub_6months') defaultDays = 180;
  else if (currentPlan === 'sub_3months') defaultDays = 90;

  const resolvedExpiresAt = expiresAt || (isSubscriptionPlan 
    ? new Date((createdAt ? new Date(createdAt).getTime() : Date.now()) + defaultDays * 24 * 60 * 60 * 1000).toISOString() 
    : null);

  const now = new Date();
  let daysLeft: number | null = null;
  if (resolvedExpiresAt) {
    const expDate = new Date(resolvedExpiresAt);
    const diffTime = expDate.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
  }

  // 1. Manual Override ON
  if (manualOverride === true) {
    return {
      plan: currentPlan,
      status: 'manual_on',
      statusLabel: daysLeft !== null 
        ? `Subscription Active (Manual ON — ${daysLeft}d left)`
        : 'Subscription Active (Manual Override ON)',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeText: daysLeft !== null ? `Manual ON (${daysLeft}d left)` : 'Manual ON',
      isAccessAllowed: true,
      expiresAt: resolvedExpiresAt,
      gracePeriodDays,
      manualOverride: true,
      daysRemaining: daysLeft,
      daysRemainingGrace: null,
    };
  }

  // 2. Manual Override OFF
  if (manualOverride === false) {
    return {
      plan: currentPlan,
      status: 'manual_off',
      statusLabel: 'Subscription Disabled (Manual Override OFF)',
      badgeBg: 'bg-red-100 text-red-800 border-red-300',
      badgeText: 'Manual OFF',
      isAccessAllowed: false,
      expiresAt: resolvedExpiresAt,
      gracePeriodDays,
      manualOverride: false,
      daysRemaining: 0,
      daysRemainingGrace: 0,
    };
  }

  // 3. No expiration date set -> Ongoing plan
  if (!resolvedExpiresAt) {
    return {
      plan: currentPlan,
      status: tenantIsActive ? 'active' : 'expired',
      statusLabel: tenantIsActive ? 'Active Subscription' : 'Inactive',
      badgeBg: tenantIsActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200',
      badgeText: tenantIsActive ? 'Active' : 'Inactive',
      isAccessAllowed: tenantIsActive,
      expiresAt: null,
      gracePeriodDays,
      manualOverride: null,
      daysRemaining: null,
      daysRemainingGrace: null,
    };
  }

  // 4. Expiration date is present
  const expDate = new Date(resolvedExpiresAt);
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  if (diffDays >= 0) {
    const activeDays = Math.ceil(diffDays);
    return {
      plan: currentPlan,
      status: 'active',
      statusLabel: `Active (${activeDays} ${activeDays === 1 ? 'day' : 'days'} left)`,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeText: `Active (${activeDays}d left)`,
      isAccessAllowed: true,
      expiresAt: resolvedExpiresAt,
      gracePeriodDays,
      manualOverride: null,
      daysRemaining: activeDays,
      daysRemainingGrace: null,
    };
  }

  // Check 3-day Grace Period
  const daysPastExpiry = Math.abs(diffDays);
  if (daysPastExpiry <= gracePeriodDays) {
    const graceDaysLeft = Math.max(1, Math.ceil(gracePeriodDays - daysPastExpiry));
    return {
      plan: currentPlan,
      status: 'grace_period',
      statusLabel: `3-Day Grace Period (${graceDaysLeft} ${graceDaysLeft === 1 ? 'day' : 'days'} left)`,
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
      badgeText: `Grace Period (${graceDaysLeft}d left)`,
      isAccessAllowed: true,
      expiresAt: resolvedExpiresAt,
      gracePeriodDays,
      manualOverride: null,
      daysRemaining: 0,
      daysRemainingGrace: graceDaysLeft,
    };
  }

  // Expired
  const overdueDays = Math.floor(daysPastExpiry - gracePeriodDays);
  return {
    plan: currentPlan,
    status: 'expired',
    statusLabel: `Subscription Expired (${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} ago)`,
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    badgeText: 'Expired',
    isAccessAllowed: false,
    expiresAt: resolvedExpiresAt,
    gracePeriodDays,
    manualOverride: null,
    daysRemaining: 0,
    daysRemainingGrace: 0,
  };
}
