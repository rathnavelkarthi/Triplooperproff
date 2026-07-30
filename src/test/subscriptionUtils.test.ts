import { describe, it, expect } from 'vitest';
import { getPropertySubscriptionDetails } from '../lib/subscriptionUtils';

describe('getPropertySubscriptionDetails', () => {
  it('calculates active subscription when expiry date is in the future', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = getPropertySubscriptionDetails('pro', futureDate, null, 3);
    
    expect(result.status).toBe('active');
    expect(result.isAccessAllowed).toBe(true);
    expect(result.daysRemaining).toBe(5);
  });

  it('calculates 3-day grace period when subscription expired 1 day ago', () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const result = getPropertySubscriptionDetails('pro', pastDate, null, 3);
    
    expect(result.status).toBe('grace_period');
    expect(result.isAccessAllowed).toBe(true); // Access MUST be allowed in grace period!
    expect(result.daysRemainingGrace).toBe(2);
  });

  it('calculates 3-day grace period when subscription expired 2 days ago', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = getPropertySubscriptionDetails('pro', pastDate, null, 3);
    
    expect(result.status).toBe('grace_period');
    expect(result.isAccessAllowed).toBe(true);
  });

  it('calculates expired when subscription ended over 3 days ago', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = getPropertySubscriptionDetails('pro', pastDate, null, 3);
    
    expect(result.status).toBe('expired');
    expect(result.isAccessAllowed).toBe(false);
  });

  it('honors manual override ON regardless of expiration', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = getPropertySubscriptionDetails('pro', pastDate, true, 3);
    
    expect(result.status).toBe('manual_on');
    expect(result.isAccessAllowed).toBe(true);
    expect(result.manualOverride).toBe(true);
  });

  it('honors manual override OFF regardless of future expiration', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = getPropertySubscriptionDetails('pro', futureDate, false, 3);
    
    expect(result.status).toBe('manual_off');
    expect(result.isAccessAllowed).toBe(false);
    expect(result.manualOverride).toBe(false);
  });
});
