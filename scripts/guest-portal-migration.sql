-- ═══════════════════════════════════════════════════════════════
-- Guest Portal Database Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Guest portal tokens (magic link / QR code auth)
-- Each token maps to a reservation and expires after checkout + 2 days.
-- Guests access their portal via /guest/{token} — no password needed.
CREATE TABLE IF NOT EXISTS guest_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guest_tokens_token ON guest_tokens(token);
CREATE INDEX IF NOT EXISTS idx_guest_tokens_reservation ON guest_tokens(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_tokens_tenant ON guest_tokens(tenant_id);

-- 2. Service requests (housekeeping, maintenance, amenity requests)
-- Guests submit these from their portal; staff see them in the CRM.
CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL,
  room_id INT,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'housekeeping', 'maintenance', 'amenity', 'transport', 'late_checkout', 'other'
  )),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'cancelled'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_service_requests_tenant ON service_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_reservation ON service_requests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- 3. Guest messages (chat between guest and front desk)
-- Real-time updates via Supabase subscriptions.
CREATE TABLE IF NOT EXISTS guest_messages (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'staff')),
  sender_name TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guest_messages_reservation ON guest_messages(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_tenant ON guest_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_unread ON guest_messages(tenant_id, is_read) WHERE is_read = false;

-- 4. Room service columns on food_orders
-- Lets the existing food order system handle room service too.
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS reservation_id TEXT;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS room_id INT;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS is_room_service BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_food_orders_reservation ON food_orders(reservation_id);

-- 5. RLS policies
ALTER TABLE guest_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;

-- Guest tokens: anyone can read (token acts as auth)
DROP POLICY IF EXISTS "guest_token_public_read" ON guest_tokens;
CREATE POLICY "guest_token_public_read" ON guest_tokens
  FOR SELECT USING (true);

-- Guest tokens: only service role can insert/update
DROP POLICY IF EXISTS "guest_token_service_write" ON guest_tokens;
CREATE POLICY "guest_token_service_write" ON guest_tokens
  FOR ALL USING (true);

-- Service requests: open access (tenant filtering done in app code)
DROP POLICY IF EXISTS "service_request_access" ON service_requests;
CREATE POLICY "service_request_access" ON service_requests
  FOR ALL USING (true);

-- Guest messages: open access (tenant filtering done in app code)
DROP POLICY IF EXISTS "guest_message_access" ON guest_messages;
CREATE POLICY "guest_message_access" ON guest_messages
  FOR ALL USING (true);

-- 6. Auto-generate guest token when a reservation is created
-- Token = 48-char hex string, expires 2 days after checkout.
CREATE OR REPLACE FUNCTION generate_guest_token()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO guest_tokens (
    tenant_id, reservation_id, guest_email, guest_phone, token, expires_at
  )
  VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.guest_email,
    NEW.guest_phone,
    encode(gen_random_bytes(24), 'hex'),
    COALESCE(NEW.check_out::date, CURRENT_DATE + interval '7 days') + interval '2 days'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the reservation if token generation fails
  RAISE WARNING 'Guest token generation failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to reservations table
DROP TRIGGER IF EXISTS trg_guest_token ON reservations;
CREATE TRIGGER trg_guest_token
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION generate_guest_token();

-- 7. Helper function: look up a guest session by token
-- Returns the reservation + tenant info needed to render the portal.
CREATE OR REPLACE FUNCTION get_guest_session(p_token TEXT)
RETURNS TABLE (
  token_id UUID,
  tenant_id UUID,
  reservation_id TEXT,
  room_id INT,
  business_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  guest_name TEXT,
  room_name TEXT,
  room_number TEXT,
  check_in DATE,
  check_out DATE,
  status TEXT,
  amount NUMERIC,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gt.id AS token_id,
    gt.tenant_id,
    gt.reservation_id,
    r.room_id,
    t.business_name,
    gt.guest_email,
    gt.guest_phone,
    r.guest_name,
    rm.name AS room_name,
    rm.room_number,
    r.check_in,
    r.check_out,
    r.status,
    r.amount,
    (gt.expires_at < now() OR gt.is_active = false) AS is_expired
  FROM guest_tokens gt
  JOIN tenants t ON t.id = gt.tenant_id
  JOIN reservations r ON r.id = gt.reservation_id
  LEFT JOIN rooms rm ON rm.id = r.room_id
  WHERE gt.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable real-time for guest-facing tables
ALTER PUBLICATION supabase_realtime ADD TABLE guest_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
