import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const tenantId = 'ea474adf-6f09-4620-981e-e187816b7a18';
  console.log(`Checking tenant_id ${tenantId}...`);
  
  const { data: tenants } = await sb.from('tenants').select('*').eq('id', tenantId);
  console.log('tenants:', tenants);

  const { data: crm } = await sb.from('crm_settings').select('*').eq('tenant_id', tenantId);
  console.log('crm_settings:', crm);
  
  const { data: b } = await sb.from('businesses').select('*').eq('id', tenantId);
  console.log('businesses:', b);
}

run();
