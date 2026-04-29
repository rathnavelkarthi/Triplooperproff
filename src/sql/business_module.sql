-- =============================================================
-- Business Module Migration
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Businesses table (the operator/reseller entity)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  contact_email TEXT,
  max_properties INT DEFAULT 5,
  max_rooms_per_property INT DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  invited_by TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Business invites (track pending invitations from platform admin)
CREATE TABLE IF NOT EXISTS business_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  max_properties INT DEFAULT 5,
  max_rooms_per_property INT DEFAULT 15,
  status TEXT DEFAULT 'pending',
  invited_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- 3. Add business columns to tenants (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='business_id') THEN
    ALTER TABLE tenants ADD COLUMN business_id UUID REFERENCES businesses(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='managed_by_business') THEN
    ALTER TABLE tenants ADD COLUMN managed_by_business BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='feature_toggles') THEN
    ALTER TABLE tenants ADD COLUMN feature_toggles JSONB DEFAULT '{
      "dashboard": true,
      "reservations": true,
      "calendar": true,
      "guests": true,
      "rooms": true,
      "channel_manager": true,
      "payments": false,
      "invoices": false,
      "expenses": false,
      "profit_loss": false,
      "reports": true,
      "pos": true,
      "menu_manager": true,
      "food_orders": true,
      "tables": true,
      "inventory": true,
      "website_editor": true,
      "rooms_cms": true,
      "pricing_rules": true,
      "booking_settings": true,
      "whatsapp": true,
      "staff": true,
      "billing": true,
      "server_orders": true
    }'::jsonb;
  END IF;
END $$;

-- 4. RLS policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_invites ENABLE ROW LEVEL SECURITY;

-- Business owners see their own businesses
DROP POLICY IF EXISTS "business_owner_access" ON businesses;
CREATE POLICY "business_owner_access" ON businesses
  FOR ALL USING (owner_id = auth.uid()::text);

-- Platform admin can see all invites (handled via service role in practice)
-- Regular users see invites sent to their email
DROP POLICY IF EXISTS "invite_recipient_access" ON business_invites;
CREATE POLICY "invite_recipient_access" ON business_invites
  FOR SELECT USING (email = auth.email());

-- Allow anyone to INSERT invites (Platform admin gate is enforced via the UI / Route guard)
DROP POLICY IF EXISTS "invite_insert_access" ON business_invites;
CREATE POLICY "invite_insert_access" ON business_invites
  FOR INSERT WITH CHECK (true);

-- Allow updating invites (for the invite acceptance flow)
DROP POLICY IF EXISTS "invite_update_access" ON business_invites;
CREATE POLICY "invite_update_access" ON business_invites
  FOR UPDATE USING (true);

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenants_business_id ON tenants(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_invites_email ON business_invites(email);
CREATE INDEX IF NOT EXISTS idx_business_invites_token ON business_invites(token);
