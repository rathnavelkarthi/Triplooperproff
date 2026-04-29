
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'rathnavelkarthi1@gmail.com';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, business_name, owner_id, custom_email');
    
  if (error) {
    console.error(error);
    return;
  }

  console.log('Current Tenants:');
  tenants.forEach(t => {
    console.log(`- [${t.id}] ${t.business_name} | Owner: ${t.owner_id} | Email: ${t.custom_email}`);
  });
  
  const adminTenant = tenants.find(t => t.custom_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (adminTenant) {
    console.log(`\nADMIN OWNER_ID: ${adminTenant.owner_id}`);
  } else {
    console.log(`\nADMIN NOT FOUND BY EMAIL ${ADMIN_EMAIL}`);
  }
}

inspect();
