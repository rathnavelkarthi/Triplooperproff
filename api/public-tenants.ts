import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fxcdipysjnudeuejwuyt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_5vtNtd9IAHCjn_gspWh7Zg_sEFvLgOZ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, business_name, subdomain, business_type, hero_image_url, city, verification_status, subscription_status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public tenants:', error);
      return res.status(500).json({ error: error.message });
    }

    const tenantIds = (tenants || []).map(t => t.id);

    // Dynamically calculate starting room price & room type per tenant from rooms table
    const { data: rooms } = await supabase
      .from('rooms')
      .select('tenant_id, price_per_night, name, type, is_available')
      .in('tenant_id', tenantIds);

    const roomMap: Record<string, { minPrice: number; roomType?: string }> = {};
    if (rooms && rooms.length > 0) {
      for (const r of rooms) {
        const p = Number(r.price_per_night);
        if (!p || p <= 0) continue;
        if (!roomMap[r.tenant_id]) {
          roomMap[r.tenant_id] = { minPrice: p, roomType: r.name || r.type };
        } else {
          if (p < roomMap[r.tenant_id].minPrice) {
            roomMap[r.tenant_id].minPrice = p;
            roomMap[r.tenant_id].roomType = r.name || r.type;
          }
        }
      }
    }

    // Filter out ganesh property and return real minimum room prices
    const filteredTenants = (tenants || [])
      .filter(t => t.business_name && !t.business_name.toLowerCase().includes('ganesh'))
      .map(t => ({
        ...t,
        min_price: roomMap[t.id]?.minPrice ?? 3000,
        room_type: roomMap[t.id]?.roomType ?? (t.business_type === 'restaurant' ? 'Boutique Bistro' : 'Standard Room')
      }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    return res.status(200).json({ tenants: filteredTenants });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
