import { describe, it, expect } from 'vitest';
import { catalogToPlanner, mergeSources } from '../lib/tripPlanner/properties';
import type { PlannerProperty } from '../lib/tripPlanner/types';
import { CATALOG_PROPERTIES } from '../lib/tripPlanner/catalog';

describe('catalogToPlanner', () => {
  it('normalizes a catalog entry with correct tier and source', () => {
    const p = catalogToPlanner(CATALOG_PROPERTIES[1]); // Coolspot Cottage, Ooty, 4200
    expect(p.city).toBe('Ooty');
    expect(p.nightlyRate).toBe(4200);
    expect(p.tier).toBe('standard');
    expect(p.source).toBe('catalog');
    expect(p.subdomain).toBe('coolspot-cottage');
    expect(p.tenantId).toBeUndefined();
  });
});

describe('mergeSources', () => {
  const live: PlannerProperty[] = [
    { id: 't1', name: 'Live Ooty Hotel', city: 'Ooty', type: 'Hotel', nightlyRate: 5000, tier: 'standard', image: 'x', source: 'live', tenantId: 't1' },
  ];
  it('keeps live properties and fills cities that have no live listing from catalog', () => {
    const merged = mergeSources(live, CATALOG_PROPERTIES.map(catalogToPlanner));
    const ootyLive = merged.filter(p => p.city === 'Ooty' && p.source === 'live');
    const ootyCatalog = merged.filter(p => p.city === 'Ooty' && p.source === 'catalog');
    expect(ootyLive).toHaveLength(1);
    expect(ootyCatalog).toHaveLength(0); // Ooty covered by live -> catalog Ooty dropped
    const pondy = merged.filter(p => p.city === 'Pondicherry');
    expect(pondy.every(p => p.source === 'catalog')).toBe(true); // no live Pondy
  });
});
