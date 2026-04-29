import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const email = 'rathnavelkarthi1@gmail.com';
  console.log(`Checking data for ${email}...`);
  
  const { data: staff } = await sb.from('staff').select('*').eq('email', email);
  console.log('staff:', staff);

  const { data: crm } = await sb.from('crm_settings').select('*');
  console.log('crm_settings:', crm);

  const { data: profiles } = await sb.from('profiles').select('*').eq('email', email);
  console.log('profiles:', profiles);
}

run();
