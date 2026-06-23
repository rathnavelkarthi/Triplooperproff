import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EMAILS_TO_DELETE = [
  'anya-paradise@easystay.property',
  'carvery-residency@easystay.property',
  'coolspotcottage@gmail.com',
  'daffodil-cottage@easystay.property',
  'green-apple-property@easystay.property',
  'jayam-castle@easystay.property',
  'moongil-illam-cottage@easystay.property',
  'nestnrest5@gmail.com',
  'pineapple-nest@easystay.property',
  'royal-park@easystay.property',
  'ramdasooty@gmail.com'
];

const SUBDOMAINS_TO_DELETE = [
  'anya-paradise',
  'carvery-residency',
  'coolspot-cottage',
  'daffodil-cottage',
  'green-apple-property',
  'jayam-castle',
  'moongil-illam-cottage',
  'nest-n-rest-cottage',
  'pineapple-nest',
  'royal-park',
  'sai-residency'
];

async function deleteStorageFolder(tenantId: string) {
  const bucketName = 'property-images';
  try {
    // List all files in the folder
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(tenantId, { limit: 100 });

    if (listError) {
      console.warn(`  ⚠ Could not list storage files for ${tenantId}:`, listError.message);
      return;
    }

    if (files && files.length > 0) {
      const pathsToDelete = files.map(file => `${tenantId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(pathsToDelete);

      if (deleteError) {
        console.warn(`  ⚠ Could not delete storage files for ${tenantId}:`, deleteError.message);
      } else {
        console.log(`  ✓ Deleted ${files.length} images from storage`);
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠ Error cleaning storage for ${tenantId}:`, err.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  TripLooper Property Cleanup Script              ║');
  console.log('║  Deleting 11 onboarded properties                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Fetch all users to map emails to IDs
  console.log('Fetching auth users...');
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (userError) {
    console.error('Failed to list auth users:', userError.message);
    process.exit(1);
  }

  const usersToDelete = userData?.users?.filter(u => 
    u.email && EMAILS_TO_DELETE.includes(u.email.toLowerCase())
  ) || [];

  console.log(`Found ${usersToDelete.length} matching auth users to delete.\n`);

  for (const subdomain of SUBDOMAINS_TO_DELETE) {
    console.log(`\n━━━ Cleaning Subdomain: ${subdomain} ━━━`);

    try {
      // 1. Get tenant details
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();

      if (tenantErr) {
        console.error(`  ✗ Error getting tenant:`, tenantErr.message);
        continue;
      }

      if (!tenant) {
        console.log(`  → Tenant with subdomain "${subdomain}" not found.`);
        continue;
      }

      const tenantId = tenant.id;
      console.log(`  Found Tenant ID: ${tenantId}`);

      // 2. Clean up storage folder
      await deleteStorageFolder(tenantId);

      // 3. Delete Rooms
      const { error: roomErr } = await supabase
        .from('rooms')
        .delete()
        .eq('tenant_id', tenantId);
      if (roomErr) console.warn(`  ⚠ Error deleting rooms:`, roomErr.message);
      else console.log('  ✓ Deleted rooms');

      // 4. Delete CMS settings
      const { error: cmsErr } = await supabase
        .from('cms_settings')
        .delete()
        .eq('tenant_id', tenantId);
      if (cmsErr) console.warn(`  ⚠ Error deleting cms settings:`, cmsErr.message);
      else console.log('  ✓ Deleted CMS settings');

      // 5. Delete user properties links
      const { error: upErr } = await supabase
        .from('user_properties')
        .delete()
        .eq('tenant_id', tenantId);
      if (upErr) console.warn(`  ⚠ Error deleting user_properties links:`, upErr.message);
      else console.log('  ✓ Deleted owner properties links');

      // 6. Delete Tenant
      const { error: delTenantErr } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      if (delTenantErr) console.error(`  ✗ Error deleting tenant row:`, delTenantErr.message);
      else console.log('  ✓ Deleted tenant row');

    } catch (err: any) {
      console.error(`  ✗ Error cleaning up property: ${err.message}`);
    }
  }

  // 7. Delete Auth users
  console.log('\n━━━ Deleting Auth Users ━━━');
  for (const u of usersToDelete) {
    try {
      const { error: delUserErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delUserErr) {
        console.error(`  ✗ Error deleting user ${u.email}:`, delUserErr.message);
      } else {
        console.log(`  ✓ Deleted Auth User: ${u.email}`);
      }
    } catch (err: any) {
      console.error(`  ✗ Error deleting user: ${err.message}`);
    }
  }

  console.log('\nCleanup script completed successfully.');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
