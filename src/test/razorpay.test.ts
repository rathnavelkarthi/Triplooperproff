import { describe, it, expect } from 'vitest';
import { PLAN_PRICES, ADDON_PRICES } from '../lib/razorpay';

describe('PLAN_PRICES', () => {
  it('has growth, pro, enterprise, and subscription/commission plans', () => {
    expect(Object.keys(PLAN_PRICES)).toContain('subscription_2700');
    expect(PLAN_PRICES.subscription_2700.monthly.amount).toBe(2700);
    expect(PLAN_PRICES.subscription_2700.yearly.amount).toBe(27000);
  });

  it('each plan has monthly and yearly pricing', () => {
    for (const [name, plan] of Object.entries(PLAN_PRICES)) {
      expect(plan.monthly).toBeDefined();
      expect(plan.yearly).toBeDefined();
      if (name !== 'commission') {
        expect(plan.monthly.amount).toBeGreaterThan(0);
        expect(plan.yearly.amount).toBeGreaterThan(0);
      }
    }
  });

  it('yearly is cheaper per month than monthly', () => {
    for (const [name, plan] of Object.entries(PLAN_PRICES)) {
      if (name === 'commission') continue;
      const monthlyAnnualized = plan.monthly.amount * 12;
      expect(plan.yearly.amount).toBeLessThan(monthlyAnnualized);
    }
  });

  it('prices increase with plan tier', () => {
    expect(PLAN_PRICES.pro.monthly.amount).toBeGreaterThan(PLAN_PRICES.growth.monthly.amount);
    expect(PLAN_PRICES.enterprise.monthly.amount).toBeGreaterThan(PLAN_PRICES.pro.monthly.amount);
  });
});

describe('ADDON_PRICES', () => {
  it('has all dashboard add-ons', () => {
    const expected = ['channel_manager', 'website', 'staff_mgmt', 'whatsapp_mgmt', 'room_mgmt', 'digital_marketing'];
    for (const key of expected) {
      expect(ADDON_PRICES[key]).toBeDefined();
    }
  });

  it('each addon has amount, display, and name', () => {
    for (const addon of Object.values(ADDON_PRICES)) {
      expect(addon.amount).toBeGreaterThan(0);
      expect(addon.display).toBeTruthy();
      expect(addon.name).toBeTruthy();
    }
  });

  it('display strings start with rupee symbol', () => {
    for (const addon of Object.values(ADDON_PRICES)) {
      expect(addon.display).toMatch(/^₹/);
    }
  });
});
