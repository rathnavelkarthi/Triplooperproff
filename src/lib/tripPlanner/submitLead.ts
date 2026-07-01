import { supabase } from '../supabaseClient';
import type { TripPlan } from './types';
import { formatPlanMessage } from './planMessage';

export interface SubmitResult { whatsappSent: boolean; leadStored: boolean; }

export async function submitLead(plan: TripPlan, name: string, phone: string): Promise<SubmitResult> {
  let leadStored = false;
  let whatsappSent = false;

  const { error: insertError } = await supabase.from('trip_leads').insert({
    name,
    phone,
    destination: plan.destination,
    budget: plan.budgetBreakdown.budget,
    nights: plan.nights,
    people: plan.people,
    tier: plan.tier,
    property_name: plan.property.name,
    property_id: plan.property.id,
    tenant_id: plan.property.tenantId ?? null,
    plan: plan as unknown as Record<string, unknown>,
    whatsapp_sent: false,
  });
  leadStored = !insertError;

  if (plan.property.source === 'live' && plan.property.tenantId) {
    const message = formatPlanMessage(plan, name);
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { tenant_id: plan.property.tenantId, phone, message },
    });
    whatsappSent = !error && !!(data as { success?: boolean })?.success;
  }

  return { whatsappSent, leadStored };
}
