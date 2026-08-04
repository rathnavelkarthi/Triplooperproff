import { describe, it, expect } from 'vitest';
import { PLAN_PRICES, ADDON_PRICES } from '../lib/razorpay';

describe('PLAN_PRICES', () => {
  it('has sub_1year, sub_6months, sub_3months, sub_1month and commission plans', () => {
    expect(Object.keys(PLAN_PRICES)).toContain('sub_1year');
    expect(Object.keys(PLAN_PRICES)).toContain('sub_6months');
    expect(Object.keys(PLAN_PRICES)).toContain('sub_3months');
    expect(Object.keys(PLAN_PRICES)).toContain('sub_1month');
    expect(PLAN_PRICES.sub_1year.monthly.amount).toBe(1999);
    expect(PLAN_PRICES.sub_6months.monthly.amount).toBe(2300);
    expect(PLAN_PRICES.sub_3months.monthly.amount).toBe(2500);
    expect(PLAN_PRICES.sub_1month.monthly.amount).toBe(2700);
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

  it('yearly is cheaper per month than monthly for tiered plans', () => {
    expect(PLAN_PRICES.growth.yearly.amount).toBeLessThan(PLAN_PRICES.growth.monthly.amount * 12);
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
