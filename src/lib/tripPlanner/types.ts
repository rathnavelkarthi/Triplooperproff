export type PropertyTier = 'budget' | 'standard' | 'premium';

export interface PlannerProperty {
  id: string;
  name: string;
  city: string;
  type: string;
  nightlyRate: number;
  tier: PropertyTier;
  image: string;
  rating?: string;
  source: 'live' | 'catalog';
  subdomain?: string;
  tenantId?: string;
}

export interface Attraction {
  name: string;
  distanceKm: number;
  suggestedMins: number;
  note?: string;
}

export interface ItineraryDay {
  day: number;
  attractions: Attraction[];
}

export interface BudgetBreakdown {
  budget: number;
  stayCost: number;
  transportReserve: number;
  freeBudget: number;
  overBudget: boolean;
  suggestion?: string;
}

export interface TripPlan {
  destination: string;
  startDate: string; // ISO yyyy-mm-dd
  nights: number;
  people: number;
  tier: PropertyTier;
  property: PlannerProperty;
  budgetBreakdown: BudgetBreakdown;
  itinerary: ItineraryDay[];
}

export interface WizardState {
  destination?: string;
  budget?: number;
  nights?: number;
  people?: number;
  tier?: PropertyTier;
  property?: PlannerProperty;
  startDate?: string;
}
