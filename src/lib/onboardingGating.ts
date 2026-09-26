/**
 * Onboarding and Gating Logic for Triplooper CRM
 *
 * Enforces the strict sequential onboarding flow:
 * 1. User signs up and registers a property (verification_status = 'pending').
 * 2. User is locked to /admin/verification to upload government trade authorization & compliance docs.
 * 3. Platform Admin reviews and approves the property (verification_status = 'approved').
 * 4. Once approved, if payment setup is pending (payment_setup = false), user is locked
 *    to /admin/billing-setup (Payment Wall) to select plan & setup Auto-Pay mandate.
 * 5. After payment / mandate setup (payment_setup = true or commission chosen), user
 *    is granted full access to the CRM dashboard.
 */

export interface GateTenant {
  verification_status?: 'pending' | 'approved' | 'rejected' | string | null;
  payment_setup?: boolean | null;
  plan?: string | null;
  subscription_plan?: string | null;
  subscription_expires_at?: string | null;
  manual_override?: boolean | null;
  is_active?: boolean;
  created_at?: string | null;
}

export interface GateCheckParams {
  userRole?: string | null;
  tenant?: GateTenant | null;
  subInfo?: {
    isAccessAllowed: boolean;
  } | null;
}

export type GateRoute = '/admin/verification' | '/admin/billing-setup' | null;

export function evaluateOnboardingGates(params: GateCheckParams): {
  needsVerification: boolean;
  needsBillingSetup: boolean;
  targetRoute: GateRoute;
} {
  const { userRole, tenant, subInfo } = params;

  // 1. Platform admins and users without a tenant are not gated by property onboarding
  if (userRole === 'PLATFORM_ADMIN' || !tenant) {
    return {
      needsVerification: false,
      needsBillingSetup: false,
      targetRoute: null,
    };
  }

  // 2. Verification Gate:
  // Property owner whose tenant is not approved yet must complete verification first.
  // They should NOT see the payment wall until the platform admin accepts/approves them.
  const needsVerification =
    tenant.verification_status !== undefined &&
    tenant.verification_status !== null &&
    tenant.verification_status !== 'approved';

  if (needsVerification) {
    return {
      needsVerification: true,
      needsBillingSetup: false,
      targetRoute: '/admin/verification',
    };
  }

  // 3. Billing Setup Gate:
  // Once property is approved, check if payment setup is complete.
  // Bypass if:
  // - payment_setup is already true
  // - tenant chose 'commission' plan
  // - manual override is explicitly granted (manual_override === true)
  // - tenant has an active paid subscription plan with valid access allowed
  const plan = tenant.plan || 'starter';
  const isPaidPlanTier =
    plan === 'subscription' ||
    plan === 'subscription_custom' ||
    plan.startsWith('sub_') ||
    plan.startsWith('subscription_') ||
    plan === 'growth' ||
    plan === 'pro' ||
    plan === 'enterprise';

  const hasActivePaidSubscription =
    isPaidPlanTier &&
    !!subInfo &&
    subInfo.isAccessAllowed &&
    (Boolean(tenant.subscription_expires_at) || tenant.manual_override === true);

  const needsBillingSetup =
    tenant.payment_setup === false &&
    tenant.manual_override !== true &&
    plan !== 'commission' &&
    !hasActivePaidSubscription;

  return {
    needsVerification: false,
    needsBillingSetup,
    targetRoute: needsBillingSetup ? '/admin/billing-setup' : null,
  };
}
