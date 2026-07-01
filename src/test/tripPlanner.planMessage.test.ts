import { describe, it, expect } from 'vitest';
import { formatPlanMessage } from '../lib/tripPlanner/planMessage';
import type { TripPlan } from '../lib/tripPlanner/types';

const plan: TripPlan = {
  destination: 'Kodaikanal',
  startDate: '2026-07-02',
  nights: 2,
  people: 2,
  tier: 'budget',
  property: {
    id: 'catalog-8', name: 'Verdant Valley Resort', city: 'Kodaikanal', type: 'Villa',
    nightlyRate: 2500, tier: 'budget', image: 'x', source: 'catalog',
  },
  budgetBreakdown: { budget: 10000, stayCost: 5000, transportReserve: 2000, freeBudget: 3000, overBudget: false },
  itinerary: [
    { day: 1, attractions: [{ name: "Dolphin's Nose", distanceKm: 8, suggestedMins: 90 }] },
    { day: 2, attractions: [{ name: "Coaker's Walk", distanceKm: 3, suggestedMins: 45 }] },
  ],
};

describe('formatPlanMessage', () => {
  it('includes destination, property, budget breakdown and itinerary', () => {
    const msg = formatPlanMessage(plan, 'Ravi');
    expect(msg).toContain('Kodaikanal');
    expect(msg).toContain('Verdant Valley Resort');
    expect(msg).toContain('₹5,000');       // stay cost
    expect(msg).toContain('₹2,000');       // transport reserve
    expect(msg).toContain("Dolphin's Nose");
    expect(msg).toContain('Ravi');
    expect(msg).toContain('Day 1');
  });
});
