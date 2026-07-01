import type { PropertyTier, Attraction, ItineraryDay, BudgetBreakdown } from './types';

export const TIER_BANDS = { budgetMax: 3500, standardMax: 7000 } as const;
export const TRANSPORT_RESERVE_RATIO = 0.4;
const SPOTS_PER_DAY = 2;

export function tierForRate(rate: number): PropertyTier {
  if (rate <= TIER_BANDS.budgetMax) return 'budget';
  if (rate <= TIER_BANDS.standardMax) return 'standard';
  return 'premium';
}

export function buildBudgetBreakdown(budget: number, nightlyRate: number, nights: number): BudgetBreakdown {
  const stayCost = nightlyRate * nights;
  const overBudget = stayCost > budget;
  const remaining = Math.max(0, budget - stayCost);
  const transportReserve = overBudget ? 0 : Math.round(remaining * TRANSPORT_RESERVE_RATIO);
  const freeBudget = Math.max(0, remaining - transportReserve);

  let suggestion: string | undefined;
  if (overBudget) {
    suggestion = 'This property is over your budget — try a lower tier or fewer nights.';
  } else if (nightlyRate > 0 && budget - stayCost >= nightlyRate * 2) {
    const extra = Math.floor((budget - stayCost) / nightlyRate);
    suggestion = `Your budget could comfortably cover a longer stay (about ${extra} more night${extra > 1 ? 's' : ''}).`;
  }

  return { budget, stayCost, transportReserve, freeBudget, overBudget, suggestion };
}

export function spreadItinerary(attractions: Attraction[], nights: number): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  let cursor = 0;
  for (let d = 1; d <= nights; d++) {
    const slice = attractions.slice(cursor, cursor + SPOTS_PER_DAY);
    cursor += SPOTS_PER_DAY;
    days.push({ day: d, attractions: slice });
  }
  return days;
}
