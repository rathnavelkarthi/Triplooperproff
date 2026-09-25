-- =============================================================================
-- 20260925000000_restore_anya_paradise_and_fix_property_create.sql
-- 1. Restore Anya Paradise tenant, business, rooms, settings, and channel connections
-- 2. Create create_business_property security-definer RPC to fix RLS coercion error
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Restore Anya Paradise
-- -----------------------------------------------------------------------------

-- Ensure Anya Paradise business exists
INSERT INTO businesses (id, name, owner_id, contact_email, max_properties, max_rooms_per_property, is_active)
VALUES (
  '69c97272-a245-4096-be63-95f8a8daaed2',
  'Anya Paradise Group',
  'user_3HD7QvIDUfHXEqtH4XvcIjjrqVj',
  'triplooperin@gmail.com',
  10,
  20,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true;

-- Upsert Anya Paradise tenant
INSERT INTO tenants (
  id,
  business_name,
  business_type,
  subdomain,
  template,
  plan,
  owner_id,
  business_id,
  managed_by_business,
  is_active,
  verification_status,
  subscription_status,
  hero_image_url,
  city,
  max_rooms
)
VALUES (
  'a6c5e18b-d3c8-4037-ad53-ac91245ce82f',
  'Anya Paradise',
  'hotel',
  'anyaparadise',
  'luxury',
  'growth',
  'user_3HD7QvIDUfHXEqtH4XvcIjjrqVj',
  '69c97272-a245-4096-be63-95f8a8daaed2',
  true,
  true,
  'approved',
  'active',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
  'Pondicherry',
  10
)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  subdomain = EXCLUDED.subdomain,
  is_active = true,
  verification_status = 'approved',
  subscription_status = 'active',
  owner_id = EXCLUDED.owner_id,
  business_id = EXCLUDED.business_id,
  managed_by_business = true;

-- Link owner in user_properties
INSERT INTO user_properties (user_id, tenant_id, role, is_owner)
VALUES (
  'user_3HD7QvIDUfHXEqtH4XvcIjjrqVj',
  'a6c5e18b-d3c8-4037-ad53-ac91245ce82f',
  'SUPER_ADMIN',
  true
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Rooms for Anya Paradise (Room 101)
INSERT INTO rooms (
  tenant_id,
  room_number,
  name,
  type,
  description,
  price_per_night,
  max_occupancy,
  amenities,
  images,
  status,
  cleaning_status,
  is_available,
  show_on_website
)
SELECT
  'a6c5e18b-d3c8-4037-ad53-ac91245ce82f',
  '101',
  'Luxury Beachfront Villa',
  'Luxury Beach Villa',
  'Spacious beachfront villa with panoramic ocean views, private sundeck, and premium amenities.',
  6500,
  4,
  ARRAY['wifi', 'parking', 'tv', 'ac', 'room_service', 'ocean_view'],
  ARRAY['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80'],
  'available',
  'clean',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM rooms
  WHERE tenant_id = 'a6c5e18b-d3c8-4037-ad53-ac91245ce82f'
    AND room_number = '101'
);

-- Rooms for Anya Paradise (Room 102)
INSERT INTO rooms (
  tenant_id,
  room_number,
  name,
  type,
  description,
  price_per_night,
  max_occupancy,
  amenities,
  images,
  status,
  cleaning_status,
  is_available,
  show_on_website
)
SELECT
  'a6c5e18b-d3c8-4037-ad53-ac91245ce82f',
  '102',
  'Deluxe Ocean Suite',
  'Deluxe Suite',
  'Elegant ocean-facing suite with private balcony and direct beach access.',
  5200,
  2,
  ARRAY['wifi', 'parking', 'tv', 'ac', 'room_service'],
  ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'],
  'available',
  'clean',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM rooms
  WHERE tenant_id = 'a6c5e18b-d3c8-4037-ad53-ac91245ce82f'
    AND room_number = '102'
);

-- Settings for Anya Paradise
INSERT INTO settings (tenant_id, setting_key, setting_value)
VALUES
  ('a6c5e18b-d3c8-4037-ad53-ac91245ce82f', 'address', '47/A Bishop Down, Beach Road, Pondicherry'),
  ('a6c5e18b-d3c8-4037-ad53-ac91245ce82f', 'phone', '+91 95354 60833'),
  ('a6c5e18b-d3c8-4037-ad53-ac91245ce82f', 'aboutText', 'Anya Paradise is a boutique luxury beach villa nestled along the serene coastline of Pondicherry.'),
  ('a6c5e18b-d3c8-4037-ad53-ac91245ce82f', 'primary_color', '#0E2A38')
ON CONFLICT (tenant_id, setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value;

-- Channel connection for Anya Paradise (Aiosell)
INSERT INTO channel_connections (
  tenant_id, channel_id, status, property_id, api_key, sync_inventory, sync_rates, last_sync_at, updated_at
)
VALUES (
  'a6c5e18b-d3c8-4037-ad53-ac91245ce82f',
  'aiosell',
  'connected',
  'f10f45fdd0',
  'aiosell_cm_partner_auth',
  true,
  true,
  now(),
  now()
)
ON CONFLICT (tenant_id, channel_id) DO UPDATE SET
  status = 'connected',
  property_id = 'f10f45fdd0',
  sync_inventory = true,
  sync_rates = true,
  last_sync_at = now(),
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Security-Definer RPC for creating business properties
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_business_property(
  p_business_id uuid,
  p_creator_user_id text,
  p_owner_id text,
  p_business_name text,
  p_business_type text,
  p_subdomain text,
  p_feature_toggles jsonb default '{}'::jsonb,
  p_template text default 'modern',
  p_plan text default 'growth'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO tenants (
    business_name,
    business_type,
    subdomain,
    owner_id,
    business_id,
    managed_by_business,
    feature_toggles,
    template,
    plan,
    is_active,
    verification_status
  )
  VALUES (
    p_business_name,
    COALESCE(p_business_type, 'hotel'),
    lower(p_subdomain),
    p_owner_id,
    p_business_id,
    true,
    COALESCE(p_feature_toggles, '{}'::jsonb),
    COALESCE(p_template, 'modern'),
    COALESCE(p_plan, 'growth'),
    true,
    'pending'
  )
  RETURNING id INTO v_id;

  -- 1. Insert property owner as SUPER_ADMIN
  INSERT INTO user_properties (user_id, tenant_id, role, is_owner)
  VALUES (p_owner_id, v_id, 'SUPER_ADMIN', true)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- 2. Insert creator business admin (if distinct from owner)
  IF p_creator_user_id IS NOT NULL AND p_creator_user_id <> p_owner_id THEN
    INSERT INTO user_properties (user_id, tenant_id, role, is_owner)
    VALUES (p_creator_user_id, v_id, 'BUSINESS_ADMIN', false)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;

  -- 3. Default settings
  INSERT INTO settings (tenant_id, setting_key, setting_value)
  VALUES (v_id, 'primary_color', '#0E2A38')
  ON CONFLICT (tenant_id, setting_key) DO NOTHING;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_property(uuid, text, text, text, text, text, jsonb, text, text) TO anon, authenticated;
