/**
 * TripLooper → Triplooper Property Onboarding Script
 * 
 * Reads property data from the triplooper data folder, creates:
 *  - Supabase Auth user (owner account with password)
 *  - Tenant record (the property)
 *  - user_properties link (owner → property)
 *  - Rooms with images uploaded to Supabase Storage
 *  - CMS settings (hero title, address, etc.)
 * 
 * Run: npx tsx scripts/onboard-properties.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Config ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = path.resolve(process.cwd(), 'triplooper data');
const STORAGE_BUCKET = 'property-images';

// ── Property definitions (parsed from data.txt files) ───────────

interface PropertyDef {
  folderName: string;
  displayName: string;
  roomType: string;
  amenities: string[];
  numRooms: number;
  maxGuests: number;
  address: string;
  pricePerNight: number;
  ownerEmail: string | null;   // from TripLooper user dump
  ownerName: string | null;
  ownerPhone: string | null;
  propertyImgFolder: string;   // 'property img' or 'cottage img'
}

const PROPERTIES: PropertyDef[] = [
  {
    folderName: 'anya paradise',
    displayName: 'Anya Paradise',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'tv'],
    numRooms: 6,
    maxGuests: 18,
    address: '47/A Bishop Down, Ooty',
    pricePerNight: 3400,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'carvery residency',
    displayName: 'Carvery Residency',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'shower', 'tv', 'room service'],
    numRooms: 5,
    maxGuests: 10,
    address: '980/8 Hollywoods, Ooty Lake, Ooty',
    pricePerNight: 2500,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'coolspot cottage',
    displayName: 'Coolspot Cottage',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'tv', 'shower', 'balcony'],
    numRooms: 9,
    maxGuests: 18,
    address: 'Near HMT Gate, Ooty',
    pricePerNight: 3999,
    ownerEmail: 'coolspotcottage@gmail.com',
    ownerName: 'Saravanan Sk',
    ownerPhone: '9042737424',
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'daffodil cottage',
    displayName: 'Daffodil Cottage',
    roomType: 'Deluxe Villa',
    amenities: ['wifi', 'parking', 'king size bed'],
    numRooms: 3,
    maxGuests: 5,
    address: '980/5,6 Hollywood Hills, Woodcock Road, Near Ooty Lake, Ooty',
    pricePerNight: 4000,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'green apple property',
    displayName: 'Green Apple Property',
    roomType: 'Standard',
    amenities: ['wifi', 'tv', 'parking', 'king size bed'],
    numRooms: 10,
    maxGuests: 20,
    address: '77, Main Bazaar, Ooty',
    pricePerNight: 2000,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'jayam castle',
    displayName: 'Jayam Castle',
    roomType: 'Deluxe',
    amenities: ['wifi', 'tv', 'bathroom', 'shower', 'room service'],
    numRooms: 3,
    maxGuests: 9,
    address: '980/8 Holly Woods, Ooty Lake, Ooty',
    pricePerNight: 2500,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'mooongil illam',
    displayName: 'Moongil Illam Cottage',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'tv'],
    numRooms: 12,
    maxGuests: 20,
    address: '980/20 Moongil Illam, Woodcock Road, Marys Hill, Ooty',
    pricePerNight: 2500,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'cottage img',  // uses "cottage img" not "property img"
  },
  {
    folderName: 'nest n rest cottage',
    displayName: 'Nest N Rest Cottage',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'balcony', 'shower', 'sofa', 'king size bed', 'room service'],
    numRooms: 6,
    maxGuests: 18,
    address: 'Khandal Bridal Path, Near Getzee School Back Side, Ooty',
    pricePerNight: 2500,
    ownerEmail: 'nestnrest5@gmail.com',
    ownerName: 'Nest N Rest',
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'pineapple nest',
    displayName: 'Pineapple Nest',
    roomType: 'Deluxe',
    amenities: ['wifi', 'tv', 'balcony', 'shower', 'room service'],
    numRooms: 7,
    maxGuests: 21,
    address: '980/5 Hollywood Hills, Woodcock Road, Ooty',
    pricePerNight: 2500,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'royal park',
    displayName: 'Royal Park',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'king size bed', 'tv'],
    numRooms: 15,
    maxGuests: 30,
    address: 'Main Bus Stand, Railway Station, Ooty',
    pricePerNight: 1200,
    ownerEmail: null,
    ownerName: null,
    ownerPhone: null,
    propertyImgFolder: 'property img',
  },
  {
    folderName: 'sai residency',
    displayName: 'Sai Residency',
    roomType: 'Deluxe',
    amenities: ['wifi', 'parking', 'tv', 'king size bed'],
    numRooms: 11,
    maxGuests: 22,
    address: 'Near Siva Shakti Hospital, Ooty',
    pricePerNight: 1500,
    ownerEmail: 'ramdasooty@gmail.com',
    ownerName: 'Ramdas',
    ownerPhone: null,
    propertyImgFolder: 'cottage img',  // uses "cottage img" not "property img"
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';

  const pick = (chars: string) => chars[crypto.randomInt(chars.length)];

  // Guarantee at least one of each type
  const parts = [pick(upper), pick(upper), pick(lower), pick(lower), pick(lower),
    pick(digits), pick(digits), pick(special)];

  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join('');
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

function getImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .map(f => path.join(dir, f));
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

// ── Main ────────────────────────────────────────────────────────

interface CredentialEntry {
  property: string;
  subdomain: string;
  email: string;
  password: string;
  loginUrl: string;
  siteUrl: string;
  rooms: number;
  imagesUploaded: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

async function ensureStorageBucket() {
  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
  });
  if (error && !error.message.includes('already exists')) {
    console.error('Failed to create storage bucket:', error.message);
  }
}

async function uploadImage(filePath: string, storagePath: string): Promise<string | null> {
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = getMimeType(filePath);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  if (error) {
    console.warn(`  ⚠ Upload failed for ${path.basename(filePath)}: ${error.message}`);
    return null;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function onboardProperty(prop: PropertyDef): Promise<CredentialEntry> {
  const subdomain = slugify(prop.displayName);
  const password = generatePassword();
  const email = prop.ownerEmail || `${subdomain}@triplooper.property`;
  const ownerName = prop.ownerName || `${prop.displayName} Owner`;

  console.log(`\n━━━ ${prop.displayName} ━━━`);
  console.log(`  Email: ${email}`);
  console.log(`  Subdomain: ${subdomain}`);

  const result: CredentialEntry = {
    property: prop.displayName,
    subdomain,
    email,
    password,
    loginUrl: 'https://esaystay.com/admin/login',
    siteUrl: `https://esaystay.com/site/${subdomain}`,
    rooms: prop.numRooms,
    imagesUploaded: 0,
    status: 'success',
  };

  try {
    // ── 1. Create auth user ──────────────────────────────────
    let userId: string;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: ownerName, phone: prop.ownerPhone },
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
        console.log('  → User exists, finding existing ID...');
        const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = (users?.users as any[])?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!existing) throw new Error(`User exists but couldn't find them: ${authError.message}`);
        userId = existing.id;
        // Update password so the credentials report is accurate
        await supabase.auth.admin.updateUserById(userId, { password });
      } else {
        throw authError;
      }
    } else {
      userId = authData.user.id;
    }
    console.log(`  ✓ Auth user: ${userId}`);

    // ── 2. Create tenant ─────────────────────────────────────
    let tenantId: string;

    // Check if tenant with this subdomain exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (existingTenant) {
      tenantId = existingTenant.id;
      console.log(`  → Tenant exists: ${tenantId}`);
    } else {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          owner_id: userId,
          business_name: prop.displayName,
          business_type: 'hotel',
          subdomain,
          template: 'luxury',
          plan: 'starter',
          is_active: true,
          feature_toggles: {
            dashboard: true, reservations: true, calendar: true,
            guests: true, rooms: true, channel_manager: true,
            payments: false, invoices: false, expenses: false,
            profit_loss: false, reports: true, pos: false,
            menu_manager: false, food_orders: false, tables: false,
            inventory: false, website_editor: true, rooms_cms: true,
            pricing_rules: true, booking_settings: true, whatsapp: true,
            staff: true, billing: true, server_orders: false,
          },
        })
        .select('id')
        .single();

      if (tenantError) throw tenantError;
      tenantId = newTenant!.id;
      console.log(`  ✓ Tenant created: ${tenantId}`);
    }

    // ── 3. Link owner to tenant ──────────────────────────────
    const { error: linkError } = await supabase
      .from('user_properties')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'SUPER_ADMIN',
        is_owner: true,
      }, { onConflict: 'user_id,tenant_id' });

    if (linkError && !linkError.message.includes('duplicate')) {
      console.warn(`  ⚠ Link error: ${linkError.message}`);
    } else {
      console.log('  ✓ Owner linked');
    }

    // ── 4. Upload images ─────────────────────────────────────
    const propImgDir = path.join(DATA_DIR, prop.folderName, prop.propertyImgFolder);
    const roomImgDir = path.join(DATA_DIR, prop.folderName, 'room img');

    const propImgFiles = getImageFiles(propImgDir);
    const roomImgFiles = getImageFiles(roomImgDir);

    console.log(`  Uploading ${propImgFiles.length} property + ${roomImgFiles.length} room images...`);

    const propImageUrls: string[] = [];
    for (const img of propImgFiles) {
      const storagePath = `${tenantId}/property/${path.basename(img)}`;
      const url = await uploadImage(img, storagePath);
      if (url) propImageUrls.push(url);
    }

    const roomImageUrls: string[] = [];
    for (const img of roomImgFiles) {
      const storagePath = `${tenantId}/rooms/${path.basename(img)}`;
      const url = await uploadImage(img, storagePath);
      if (url) roomImageUrls.push(url);
    }

    result.imagesUploaded = propImageUrls.length + roomImageUrls.length;
    console.log(`  ✓ ${result.imagesUploaded} images uploaded`);

    // ── 5. Update tenant hero image ──────────────────────────
    if (propImageUrls.length > 0) {
      await supabase
        .from('tenants')
        .update({ hero_image_url: propImageUrls[0] })
        .eq('id', tenantId);
    }

    // ── 6. Create rooms ──────────────────────────────────────
    // Check if rooms already exist for this tenant
    const { data: existingRooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('tenant_id', tenantId);

    if (existingRooms && existingRooms.length > 0) {
      console.log(`  → ${existingRooms.length} rooms already exist, skipping`);
    } else {
      const occupancyPerRoom = Math.ceil(prop.maxGuests / prop.numRooms);

      // Distribute room images across rooms
      const imagesPerRoom: string[][] = Array.from({ length: prop.numRooms }, () => []);
      roomImageUrls.forEach((url, i) => {
        imagesPerRoom[i % prop.numRooms].push(url);
      });

      const roomInserts = [];
      for (let i = 0; i < prop.numRooms; i++) {
        const roomNum = (101 + i).toString();
        roomInserts.push({
          tenant_id: tenantId,
          room_number: roomNum,
          name: `${prop.roomType} Room ${roomNum}`,
          type: prop.roomType,
          description: `${prop.roomType} room at ${prop.displayName}, ${prop.address}`,
          price_per_night: prop.pricePerNight,
          max_occupancy: occupancyPerRoom,
          amenities: prop.amenities,
          images: imagesPerRoom[i].length > 0 ? imagesPerRoom[i] : (roomImageUrls.length > 0 ? [roomImageUrls[0]] : []),
          is_available: true,
          status: 'Available',
          cleaning_status: 'Clean',
        });
      }

      const { error: roomError } = await supabase.from('rooms').insert(roomInserts);
      if (roomError) {
        console.warn(`  ⚠ Room creation error: ${roomError.message}`);
        result.status = 'partial';
      } else {
        console.log(`  ✓ ${prop.numRooms} rooms created`);
      }
    }

    // ── 7. CMS settings ──────────────────────────────────────
    const settingsToUpsert = [
      { tenant_id: tenantId, setting_key: 'heroTitle', setting_value: prop.displayName },
      { tenant_id: tenantId, setting_key: 'heroSubtitle', setting_value: `Welcome to ${prop.displayName} — your home in the Nilgiris` },
      { tenant_id: tenantId, setting_key: 'contactAddress', setting_value: prop.address },
      { tenant_id: tenantId, setting_key: 'contactPhone', setting_value: prop.ownerPhone || '' },
      { tenant_id: tenantId, setting_key: 'contactEmail', setting_value: email },
      { tenant_id: tenantId, setting_key: 'aboutText', setting_value: `${prop.displayName} is a ${prop.roomType.toLowerCase()} property located at ${prop.address}. We have ${prop.numRooms} rooms and can accommodate up to ${prop.maxGuests} guests.` },
    ];

    // Use upsert — if the table supports it via tenant_id + setting_key
    for (const s of settingsToUpsert) {
      const { error: sErr } = await supabase
        .from('cms_settings')
        .upsert(s, { onConflict: 'tenant_id,setting_key' });
      if (sErr) {
        // Try settings table instead
        await supabase.from('settings').upsert(
          { setting_key: s.setting_key, setting_value: s.setting_value },
          { onConflict: 'setting_key' }
        );
      }
    }
    console.log('  ✓ CMS settings saved');

  } catch (err: any) {
    console.error(`  ✗ FAILED: ${err.message}`);
    result.status = 'failed';
    result.error = err.message;
  }

  return result;
}

// ── Run ─────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  TripLooper → Triplooper Property Onboarding    ║');
  console.log('║  11 properties • Ooty, Tamil Nadu               ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nData folder: ${DATA_DIR}`);
  console.log(`Supabase: ${SUPABASE_URL}`);

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`\n✗ Data folder not found: ${DATA_DIR}`);
    process.exit(1);
  }

  await ensureStorageBucket();

  const results: CredentialEntry[] = [];

  for (const prop of PROPERTIES) {
    const entry = await onboardProperty(prop);
    results.push(entry);
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║  ONBOARDING COMPLETE                             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const succeeded = results.filter(r => r.status === 'success').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log(`✓ Success: ${succeeded}  ⚠ Partial: ${partial}  ✗ Failed: ${failed}\n`);

  // Print credentials table
  console.log('┌──────────────────────────┬─────────────────────────────────┬──────────────┐');
  console.log('│ Property                 │ Email                           │ Password     │');
  console.log('├──────────────────────────┼─────────────────────────────────┼──────────────┤');
  for (const r of results) {
    const prop = r.property.padEnd(24);
    const email = r.email.padEnd(31);
    const pwd = r.status === 'failed' ? '(failed)'.padEnd(12) : r.password.padEnd(12);
    console.log(`│ ${prop} │ ${email} │ ${pwd} │`);
  }
  console.log('└──────────────────────────┴─────────────────────────────────┴──────────────┘');

  // Save credentials report
  const reportPath = path.resolve(process.cwd(), 'scripts', 'credentials-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nCredentials saved to: ${reportPath}`);

  // Also save a human-readable version for WhatsApp/email
  const readablePath = path.resolve(process.cwd(), 'scripts', 'credentials-readable.txt');
  let readable = 'Triplooper Property Login Credentials\n';
  readable += '====================================\n\n';
  for (const r of results) {
    if (r.status === 'failed') continue;
    readable += `${r.property}\n`;
    readable += `  Login: ${r.loginUrl}\n`;
    readable += `  Email: ${r.email}\n`;
    readable += `  Password: ${r.password}\n`;
    readable += `  Your website: ${r.siteUrl}\n`;
    readable += `  Rooms: ${r.rooms}\n`;
    readable += '\n';
  }
  fs.writeFileSync(readablePath, readable);
  console.log(`Readable credentials: ${readablePath}`);
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
