import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, type ResourceType } from '../lib/planLimits';

describe('PLAN_LIMITS', () => {
  it('has all plan tiers including new subscription and commission models', () => {
    expect(Object.keys(PLAN_LIMITS)).toEqual([
      'starter', 'growth', 'pro', 'enterprise',
      'subscription_small', 'subscription_large', 'commission'
    ]);
  });

  it('starter has strict limits', () => {
    const s = PLAN_LIMITS.starter;
    expect(s.rooms).toBe(5);
    expect(s.reservations).toBe(20);
    expect(s.menu_items).toBe(10);
    expect(s.tables).toBe(5);
    expect(s.staff).toBe(2);
    expect(s.food_orders).toBe(20);
  });

  it('enterprise has unlimited for all resources', () => {
    const e = PLAN_LIMITS.enterprise;
    const resources: ResourceType[] = ['rooms', 'reservations', 'menu_items', 'tables', 'staff', 'food_orders'];
    for (const r of resources) {
      expect(e[r]).toBe(Infinity);
    }
  });

  it('growth limits are higher than starter', () => {
    const resources: ResourceType[] = ['rooms', 'menu_items', 'tables', 'staff'];
    for (const r of resources) {
      expect(PLAN_LIMITS.growth[r]).toBeGreaterThan(PLAN_LIMITS.starter[r]);
    }
  });

  it('pro limits are higher than growth', () => {
    const resources: ResourceType[] = ['rooms', 'menu_items', 'tables', 'staff'];
    for (const r of resources) {
      expect(PLAN_LIMITS.pro[r]).toBeGreaterThan(PLAN_LIMITS.growth[r]);
    }
  });

  it('every plan has all six resource types', () => {
    const expected: ResourceType[] = ['rooms', 'reservations', 'menu_items', 'tables', 'staff', 'food_orders'];
    for (const plan of Object.values(PLAN_LIMITS)) {
      for (const r of expected) {
        expect(plan[r]).toBeDefined();
      }
    }
  });
});
