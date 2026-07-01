import { describe, it, expect } from 'vitest';
import { tierForRate, buildBudgetBreakdown, spreadItinerary } from '../lib/tripPlanner/budgetEngine';
import type { Attraction } from '../lib/tripPlanner/types';

describe('tierForRate', () => {
  it('classifies budget at/under 3500', () => {
    expect(tierForRate(3000)).toBe('budget');
    expect(tierForRate(3500)).toBe('budget');
  });
  it('classifies standard between 3500 and 7000', () => {
    expect(tierForRate(3501)).toBe('standard');
    expect(tierForRate(7000)).toBe('standard');
  });
  it('classifies premium above 7000', () => {
    expect(tierForRate(7001)).toBe('premium');
    expect(tierForRate(12000)).toBe('premium');
  });
});

describe('buildBudgetBreakdown', () => {
  it('computes the brief scenario: Kodaikanal 10k, 2 nights, 2500/nt', () => {
    const b = buildBudgetBreakdown(10000, 2500, 2);
    expect(b.stayCost).toBe(5000);
    expect(b.transportReserve).toBe(2000); // 40% of 5000 remaining
    expect(b.freeBudget).toBe(3000);
    expect(b.overBudget).toBe(false);
  });
  it('flags over budget when stay exceeds budget', () => {
    const b = buildBudgetBreakdown(4000, 2500, 2); // 5000 > 4000
    expect(b.overBudget).toBe(true);
    expect(b.stayCost).toBe(5000);
    expect(b.transportReserve).toBe(0);
    expect(b.freeBudget).toBe(0);
    expect(b.suggestion).toContain('lower');
  });
  it('suggests a longer stay when budget comfortably covers more nights', () => {
    const b = buildBudgetBreakdown(50000, 2500, 2); // stay 5000, huge remaining
    expect(b.suggestion).toContain('longer');
  });
});

describe('spreadItinerary', () => {
  const spots: Attraction[] = [
    { name: 'A', distanceKm: 1, suggestedMins: 30 },
    { name: 'B', distanceKm: 2, suggestedMins: 30 },
    { name: 'C', distanceKm: 3, suggestedMins: 30 },
    { name: 'D', distanceKm: 4, suggestedMins: 30 },
    { name: 'E', distanceKm: 5, suggestedMins: 30 },
  ];
  it('produces one entry per day and covers days', () => {
    const days = spreadItinerary(spots, 2); // 2 nights
    expect(days).toHaveLength(2);
    expect(days[0].day).toBe(1);
    expect(days[0].attractions.length).toBeGreaterThan(0);
  });
  it('handles empty attraction list gracefully', () => {
    const days = spreadItinerary([], 3);
    expect(days).toHaveLength(3);
    expect(days[0].attractions).toEqual([]);
  });
});
