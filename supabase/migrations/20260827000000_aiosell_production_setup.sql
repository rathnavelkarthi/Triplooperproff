-- =============================================================================
-- Aiosell PRODUCTION setup
-- =============================================================================
-- This migration wires up the two Triplooper-onboarded properties to their
-- real Aiosell Hotel Codes (provided by Aiosell support during partner setup).
--
-- Partner-level credentials (AIOSELL_USERNAME / AIOSELL_PASSWORD /
-- AIOSELL_PARTNER_ID) are edge-function secrets, NOT stored here.
-- Set them once in the Supabase Dashboard → Edge Functions → Manage Secrets:
--   AIOSELL_USERNAME  = triplooper
--   AIOSELL_PASSWORD  = wrk1l659
--   AIOSELL_PARTNER_ID = triplooper
--
-- HOW FUTURE PROPERTIES ONBOARD (AUTOMATED):
--   1. Hotel owner opens Channel Manager → "Link Hotel Code"
--   2. Pastes their Aiosell Hotel Code (visible in Aiosell dashboard URL)
--   3. UI calls supabase.from('channel_connections').upsert(...)
--   4. UI fires aiosell-sync edge function (action: 'property_details', seed: true)
--      which auto-maps all room codes + rate plan codes into aiosell_room_mappings
--   5. From that point, incoming Aiosell webhooks resolve hotelCode → tenant_id
--      via channel_connections and insert/update reservations automatically.
--
-- No manual SQL is needed for properties added after today.
-- =============================================================================

-- Add the unique constraint that the schema declared but was never applied to the live DB.
-- This is needed for the UI's upsert logic (ON CONFLICT tenant_id,channel_id) to work.
ALTER TABLE channel_connections
  DROP CONSTRAINT IF EXISTS channel_connections_tenant_id_channel_id_key;
ALTER TABLE channel_connections
  ADD CONSTRAINT channel_connections_tenant_id_channel_id_key
  UNIQUE (tenant_id, channel_id);

-- ---------------------------------------------------------------------------
-- Property 1: Dreams Cottage Ooty
--   tenant_id : 81e44343-448c-4bc0-8f9c-104e2db842cb
--   hotelCode : 09c2d53550   (from Aiosell dashboard URL)
-- ---------------------------------------------------------------------------
INSERT INTO channel_connections (tenant_id, channel_id, status, property_id, api_key, sync_inventory, sync_rates, last_sync_at, updated_at)
SELECT '81e44343-448c-4bc0-8f9c-104e2db842cb', 'aiosell', 'connected', '09c2d53550', 'aiosell_cm_partner_auth', true, true, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM channel_connections
  WHERE tenant_id = '81e44343-448c-4bc0-8f9c-104e2db842cb' AND channel_id = 'aiosell'
);

UPDATE channel_connections SET
  status         = 'connected',
  property_id    = '09c2d53550',
  api_key        = 'aiosell_cm_partner_auth',
  sync_inventory = true,
  sync_rates     = true,
  last_sync_at   = now(),
  updated_at     = now()
WHERE tenant_id = '81e44343-448c-4bc0-8f9c-104e2db842cb'
  AND channel_id = 'aiosell';

-- ---------------------------------------------------------------------------
-- Property 2: Anya Paradise
--   tenant_id : a6c5e18b-d3c8-4037-ad53-ac91245ce82f
--   hotelCode : f10f45fdd0   (from Aiosell dashboard URL)
-- ---------------------------------------------------------------------------
INSERT INTO channel_connections (tenant_id, channel_id, status, property_id, api_key, sync_inventory, sync_rates, last_sync_at, updated_at)
SELECT 'a6c5e18b-d3c8-4037-ad53-ac91245ce82f', 'aiosell', 'connected', 'f10f45fdd0', 'aiosell_cm_partner_auth', true, true, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM channel_connections
  WHERE tenant_id = 'a6c5e18b-d3c8-4037-ad53-ac91245ce82f' AND channel_id = 'aiosell'
);

UPDATE channel_connections SET
  status         = 'connected',
  property_id    = 'f10f45fdd0',
  api_key        = 'aiosell_cm_partner_auth',
  sync_inventory = true,
  sync_rates     = true,
  last_sync_at   = now(),
  updated_at     = now()
WHERE tenant_id = 'a6c5e18b-d3c8-4037-ad53-ac91245ce82f'
  AND channel_id = 'aiosell';

-- ---------------------------------------------------------------------------
-- Verification: confirm both rows exist
-- ---------------------------------------------------------------------------
-- SELECT tenant_id, property_id, status, sync_inventory, sync_rates
-- FROM channel_connections
-- WHERE channel_id = 'aiosell';
-- Expected: 2 rows with status = 'connected'
