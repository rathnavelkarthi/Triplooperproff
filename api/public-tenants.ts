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

    // Filter out ganesh property
    const filteredTenants = (tenants || []).filter(t => 
      t.business_name && !t.business_name.toLowerCase().includes('ganesh')
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json({ tenants: filteredTenants });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
