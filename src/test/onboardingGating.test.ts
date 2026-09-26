import { describe, it, expect } from 'vitest';
import { evaluateOnboardingGates } from '../lib/onboardingGating';

describe('evaluateOnboardingGates', () => {
  it('locks unverified property owners to /admin/verification before payment wall', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'pending',
        payment_setup: false,
        plan: 'starter',
      },
      subInfo: { isAccessAllowed: true },
    });

    expect(result.needsVerification).toBe(true);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBe('/admin/verification');
  });

  it('keeps rejected property owners on /admin/verification to allow re-upload', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'rejected',
        payment_setup: false,
        plan: 'starter',
      },
    });

    expect(result.needsVerification).toBe(true);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBe('/admin/verification');
  });

  it('triggers payment wall /admin/billing-setup after platform admin accepts/approves property', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'approved',
        payment_setup: false,
        plan: 'starter',
      },
      // Even if starter returns isAccessAllowed true from subscriptionUtils,
      // it is not a paid subscription and payment_setup is false
      subInfo: { isAccessAllowed: true },
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(true);
    expect(result.targetRoute).toBe('/admin/billing-setup');
  });

  it('grants full CRM dashboard access once payment setup is completed', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'approved',
        payment_setup: true,
        plan: 'starter',
      },
      subInfo: { isAccessAllowed: true },
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBeNull();
  });

  it('bypasses payment wall if property opted for commission-only plan', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'approved',
        payment_setup: false,
        plan: 'commission',
      },
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBeNull();
  });

  it('bypasses payment wall if platform admin granted manual override', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'approved',
        payment_setup: false,
        plan: 'starter',
        manual_override: true,
      },
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBeNull();
  });

  it('bypasses payment wall if property already has an active paid subscription with expiration date', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: {
        verification_status: 'approved',
        payment_setup: false,
        plan: 'sub_1year',
        subscription_expires_at: new Date(Date.now() + 300 * 86400000).toISOString(),
      },
      subInfo: { isAccessAllowed: true },
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBeNull();
  });

  it('exempts PLATFORM_ADMIN from both verification and billing setup gates', () => {
    const result = evaluateOnboardingGates({
      userRole: 'PLATFORM_ADMIN',
      tenant: {
        verification_status: 'pending',
        payment_setup: false,
        plan: 'starter',
      },
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBeNull();
  });

  it('handles null tenant gracefully', () => {
    const result = evaluateOnboardingGates({
      userRole: 'SUPER_ADMIN',
      tenant: null,
    });

    expect(result.needsVerification).toBe(false);
    expect(result.needsBillingSetup).toBe(false);
    expect(result.targetRoute).toBeNull();
  });
});
