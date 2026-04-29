
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'rathnavelkarthi1@gmail.com';

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findAdmin() {
  const { data: businesses } = await supabase
    .from('businesses')
    .select('owner_id, contact_email');
    
  console.log('Businesses:');
  businesses?.forEach(b => console.log(`- ${b.contact_email} | Owner: ${b.owner_id}`));
}

findAdmin();
