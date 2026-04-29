const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateSubdomain(name) {
    if (!name) return 'tenant-' + Math.random().toString(36).substring(7);
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function fixSubdomains() {
    console.log('Fetching tenants...');
    const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, business_name, subdomain');

    if (error) {
        console.error('Error fetching tenants:', error);
        return;
    }

    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
        if (!tenant.subdomain) {
            const newSubdomain = generateSubdomain(tenant.business_name);
            console.log(`Fixing tenant "${tenant.business_name}" (${tenant.id}): NULL -> ${newSubdomain}`);
            
            const { error: updateError } = await supabase
                .from('tenants')
                .update({ subdomain: newSubdomain })
                .eq('id', tenant.id);

            if (updateError) {
                console.error(`Failed to update tenant ${tenant.id}:`, updateError);
            } else {
                console.log(`Successfully updated tenant ${tenant.id}.`);
            }
        } else {
            console.log(`Tenant "${tenant.business_name}" already has subdomain: ${tenant.subdomain}`);
        }
    }

    console.log('Finished fixing subdomains.');
}

fixSubdomains();
