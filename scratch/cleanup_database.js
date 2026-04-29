
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

async function cleanup() {
  console.log('Starting cleanup...');

  // 1. Find all businesses NOT owned by the admin
  const { data: businesses, error: bError } = await supabase
    .from('businesses')
    .select('id, owner_id, contact_email');
    
  if (bError) {
    console.error('Error fetching businesses:', bError);
    return;
  }

  const businessesToDelete = businesses.filter(b => b.contact_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());
  const businessIds = businessesToDelete.map(b => b.id);
  const ownerIds = businessesToDelete.map(b => b.owner_id);

  console.log(`Found ${businessesToDelete.length} businesses to delete.`);

  // 2. Find all tenants NOT owned by the admin
  const { data: tenants, error: tError } = await supabase
    .from('tenants')
    .select('id, owner_id, custom_email');

  if (tError) {
    console.error('Error fetching tenants:', tError);
    return;
  }

  const tenantsToDelete = tenants.filter(t => 
    t.custom_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && 
    t.owner_id !== businesses.find(b => b.contact_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())?.owner_id
  );
  const tenantIds = tenantsToDelete.map(t => t.id);

  console.log(`Found ${tenantsToDelete.length} tenants to delete.`);

  // 3. Perform Deletions (Cascading order)
  
  if (tenantIds.length > 0) {
    console.log('Cleaning up tenant-related data...');
    await supabase.from('staff').delete().in('tenant_id', tenantIds);
    await supabase.from('subscriptions').delete().in('tenant_id', tenantIds);
    await supabase.from('reservations').delete().in('tenant_id', tenantIds);
    await supabase.from('expenses').delete().in('tenant_id', tenantIds);
    await supabase.from('channel_connections').delete().in('tenant_id', tenantIds);
    await supabase.from('channel_sync_logs').delete().in('tenant_id', tenantIds);
    await supabase.from('tenants').delete().in('id', tenantIds);
  }

  if (ownerIds.length > 0) {
    console.log('Cleaning up user-related data...');
    await supabase.from('user_properties').delete().in('user_id', ownerIds);
    await supabase.from('businesses').delete().in('owner_id', ownerIds);
  }

  // 4. Delete Invites
  console.log('Cleaning up business invites...');
  const { error: inviteError } = await supabase
    .from('business_invites')
    .delete()
    .neq('email', ADMIN_EMAIL);
    
  if (inviteError) console.error('Error deleting invites:', inviteError);

  console.log('Cleanup finished.');
}

cleanup();
