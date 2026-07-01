import type { Attraction } from './types';

export const ATTRACTIONS: Record<string, Attraction[]> = {
  Kodaikanal: [
    { name: "Coaker's Walk", distanceKm: 3, suggestedMins: 45 },
    { name: "Dolphin's Nose", distanceKm: 8, suggestedMins: 90 },
    { name: "Pillar Rocks", distanceKm: 10, suggestedMins: 60 },
    { name: "Kodaikanal Lake", distanceKm: 1, suggestedMins: 60 },
    { name: "Bryant Park", distanceKm: 1, suggestedMins: 45 },
    { name: "Silver Cascade Falls", distanceKm: 8, suggestedMins: 30 },
  ],
  Ooty: [
    { name: "Botanical Gardens", distanceKm: 3, suggestedMins: 90 },
    { name: "Ooty Lake", distanceKm: 2, suggestedMins: 60 },
    { name: "Doddabetta Peak", distanceKm: 10, suggestedMins: 60 },
    { name: "Nilgiri Mountain Railway", distanceKm: 1, suggestedMins: 120 },
    { name: "Rose Garden", distanceKm: 2, suggestedMins: 45 },
    { name: "Tea Museum", distanceKm: 4, suggestedMins: 45 },
  ],
  Pondicherry: [
    { name: "Promenade Beach", distanceKm: 2, suggestedMins: 60 },
    { name: "Auroville", distanceKm: 12, suggestedMins: 120 },
    { name: "French Quarter", distanceKm: 1, suggestedMins: 90 },
    { name: "Paradise Beach", distanceKm: 8, suggestedMins: 120 },
    { name: "Sri Aurobindo Ashram", distanceKm: 1, suggestedMins: 45 },
    { name: "Rock Beach", distanceKm: 2, suggestedMins: 45 },
  ],
  Chennai: [
    { name: "Marina Beach", distanceKm: 4, suggestedMins: 60 },
    { name: "Kapaleeshwarar Temple", distanceKm: 5, suggestedMins: 60 },
    { name: "Fort St. George", distanceKm: 6, suggestedMins: 60 },
    { name: "Government Museum", distanceKm: 5, suggestedMins: 90 },
    { name: "Marundeeswarar Temple", distanceKm: 12, suggestedMins: 45 },
    { name: "San Thome Basilica", distanceKm: 5, suggestedMins: 45 },
  ],
};

export function getAttractions(city: string): Attraction[] {
  return ATTRACTIONS[city] ?? [];
}
