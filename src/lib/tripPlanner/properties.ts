import { supabase } from '../supabaseClient';
import { tierForRate } from './budgetEngine';
import { CATALOG_PROPERTIES, type CatalogProperty } from './catalog';
import type { PlannerProperty } from './types';

export function catalogToPlanner(c: CatalogProperty): PlannerProperty {
  return {
    id: `catalog-${c.id}`,
    name: c.name,
    city: c.city,
    type: c.type,
    nightlyRate: c.nightlyRate,
    tier: tierForRate(c.nightlyRate),
    image: c.image,
    rating: c.rating,
    source: 'catalog',
    subdomain: c.subdomain,
  };
}

/** Live properties win; for any city that has no live listing, keep catalog entries. */
export function mergeSources(live: PlannerProperty[], catalog: PlannerProperty[]): PlannerProperty[] {
  const liveCities = new Set(live.map(p => p.city.toLowerCase()));
  const catalogFallback = catalog.filter(p => !liveCities.has(p.city.toLowerCase()));
  return [...live, ...catalogFallback];
}

async function fetchLiveProperties(): Promise<PlannerProperty[]> {
  try {
    const { data: tenants, error: tErr } = await supabase
      .from('tenants')
      .select('id, business_name, business_type, subdomain, hero_image_url, city, whatsapp_enabled')
      .eq('is_active', true);
    if (tErr || !tenants) return [];

    const { data: rooms } = await supabase.from('rooms').select('tenant_id, price_per_night');

    return tenants
      .map((t): PlannerProperty | null => {
        const tRooms = (rooms || []).filter(r => r.tenant_id === t.id);
        if (tRooms.length === 0) return null; // no bookable rooms -> skip
        const nightlyRate = Math.min(...tRooms.map(r => r.price_per_night));
        const city = (t as { city?: string }).city || '';
        if (!city) return null; // can't place on map without a city
        return {
          id: `live-${t.id}`,
          name: t.business_name,
          city,
          type: t.business_type || 'Stay',
          nightlyRate,
          tier: tierForRate(nightlyRate),
          image: t.hero_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
          source: 'live',
          subdomain: t.subdomain,
          tenantId: t.id,
        };
      })
      .filter((p): p is PlannerProperty => p !== null);
  } catch {
    return [];
  }
}

export async function getProperties(city?: string): Promise<PlannerProperty[]> {
  const live = await fetchLiveProperties();
  const catalog = CATALOG_PROPERTIES.map(catalogToPlanner);
  let all = mergeSources(live, catalog);
  if (city && city !== 'Anywhere') {
    all = all.filter(p => p.city.toLowerCase() === city.toLowerCase());
  }
  return all.sort((a, b) => a.nightlyRate - b.nightlyRate);
}

/** Cities that have at least one property, for the destination step. */
export async function getDestinations(): Promise<string[]> {
  const all = await getProperties();
  return Array.from(new Set(all.map(p => p.city))).sort();
}
