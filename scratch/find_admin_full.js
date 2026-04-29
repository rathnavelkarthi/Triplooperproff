
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findAdmin() {
  console.log('Searching for admin records...');
  
  // Look for any user_properties
  const { data: userProps } = await supabase.from('user_properties').select('*');
  console.log('\nUser Properties:');
  userProps?.forEach(p => console.log(`- User: ${p.user_id} | Tenant: ${p.tenant_id}`));

  // Look for any businesses
  const { data: businesses } = await supabase.from('businesses').select('*');
  console.log('\nBusinesses:');
  businesses?.forEach(b => console.log(`- Email: ${b.contact_email} | Owner: ${b.owner_id}`));
}

findAdmin();
