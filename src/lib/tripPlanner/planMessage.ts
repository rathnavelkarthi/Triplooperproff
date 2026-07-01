import type { TripPlan } from './types';

// Plain-text rupee formatting for WhatsApp (formatINR emits an HTML entity, unusable here).
function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatPlanMessage(plan: TripPlan, guestName: string): string {
  const { destination, startDate, nights, people, property, budgetBreakdown, itinerary } = plan;
  const lines: string[] = [];
  lines.push(`🌴 *Your Triplooper Plan — ${destination}*`);
  lines.push('');
  lines.push(`Hi ${guestName}! Here's your trip plan:`);
  lines.push('');
  lines.push(`📍 Destination: ${destination}`);
  lines.push(`🗓️ Start: ${startDate} · ${nights} night${nights > 1 ? 's' : ''} · ${people} guest${people > 1 ? 's' : ''}`);
  lines.push(`🏠 Stay: ${property.name} (${property.type}) — ${inr(property.nightlyRate)}/night`);
  lines.push('');
  lines.push(`💰 *Budget*`);
  lines.push(`• Stay: ${inr(budgetBreakdown.stayCost)}`);
  lines.push(`• Cab / transport reserve: ${inr(budgetBreakdown.transportReserve)}`);
  lines.push(`• Free for food & activities: ${inr(budgetBreakdown.freeBudget)}`);
  lines.push('');
  if (itinerary.length && itinerary.some(d => d.attractions.length)) {
    lines.push(`🗺️ *Suggested Itinerary*`);
    for (const day of itinerary) {
      if (!day.attractions.length) continue;
      lines.push(`Day ${day.day}:`);
      for (const a of day.attractions) {
        lines.push(`  • ${a.name} (~${a.distanceKm}km, ~${a.suggestedMins} min)`);
      }
    }
    lines.push('');
  }
  lines.push(`We'll reach out to confirm. Safe travels! ✨`);
  return lines.join('\n');
}
