import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, invokeMock } = vi.hoisted(() => ({ insertMock: vi.fn(), invokeMock: vi.fn() }));
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
    functions: { invoke: invokeMock },
  },
}));

import { submitLead } from '../lib/tripPlanner/submitLead';
import type { TripPlan } from '../lib/tripPlanner/types';

const basePlan: TripPlan = {
  destination: 'Ooty', startDate: '2026-07-02', nights: 2, people: 2, tier: 'standard',
  property: { id: 'live-x', name: 'Live Hotel', city: 'Ooty', type: 'Hotel', nightlyRate: 5000, tier: 'standard', image: 'x', source: 'live', tenantId: 'tenant-1' },
  budgetBreakdown: { budget: 20000, stayCost: 10000, transportReserve: 4000, freeBudget: 6000, overBudget: false },
  itinerary: [],
};

beforeEach(() => { insertMock.mockReset().mockResolvedValue({ error: null }); invokeMock.mockReset().mockResolvedValue({ data: { success: true }, error: null }); });

describe('submitLead', () => {
  it('inserts a lead and sends WhatsApp when property is a live tenant', async () => {
    const res = await submitLead(basePlan, 'Ravi', '9876543210');
    expect(insertMock).toHaveBeenCalledOnce();
    expect(invokeMock).toHaveBeenCalledWith('send-whatsapp', expect.objectContaining({
      body: expect.objectContaining({ tenant_id: 'tenant-1', phone: '9876543210' }),
    }));
    expect(res.whatsappSent).toBe(true);
  });

  it('inserts a lead but skips WhatsApp for catalog-only property', async () => {
    const catalogPlan = { ...basePlan, property: { ...basePlan.property, source: 'catalog' as const, tenantId: undefined } };
    const res = await submitLead(catalogPlan, 'Ravi', '9876543210');
    expect(insertMock).toHaveBeenCalledOnce();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(res.whatsappSent).toBe(false);
  });
});
