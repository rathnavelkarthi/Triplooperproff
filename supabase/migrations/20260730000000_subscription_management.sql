-- ============================================================
-- Migration: Subscription Management, 3-Day Grace Period & Manual Override
-- Run this in Supabase SQL Editor or apply via Supabase CLI
-- ============================================================

-- 1. Add subscription tracking & manual override columns to tenants table
ALTER TABLE IF EXISTS tenants
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS manual_override boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS manual_override_reason text;

-- 2. Create or update subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  grace_period_days integer DEFAULT 3,
  manual_override boolean DEFAULT null,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read their subscriptions
DROP POLICY IF EXISTS "subscriptions_read_policy" ON subscriptions;
CREATE POLICY "subscriptions_read_policy" ON subscriptions
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.auth_tenant_ids())
    OR (auth.jwt() ->> 'email') IN ('rathnavelkarthi1@gmail.com', 'admin@triplooper.com')
    OR EXISTS (
      SELECT 1 FROM staff WHERE staff.id::text = auth.uid()::text AND staff.role = 'platform_admin'
    )
  );

-- RLS: Platform admin / service role full write access
DROP POLICY IF EXISTS "subscriptions_write_policy" ON subscriptions;
CREATE POLICY "subscriptions_write_policy" ON subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. SQL helper function to evaluate subscription status with 3-day grace period
CREATE OR REPLACE FUNCTION public.get_subscription_info(p_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  plan text,
  status text,
  is_access_allowed boolean,
  expires_at timestamptz,
  grace_period_days integer,
  manual_override boolean,
  days_remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_now timestamptz := now();
  v_exp timestamptz;
  v_grace int;
  v_override boolean;
  v_status text;
  v_allowed boolean;
  v_days int;
BEGIN
  SELECT 
    t.id, 
    coalesce(t.subscription_plan, t.plan, 'starter') as plan, 
    t.subscription_expires_at, 
    coalesce(t.grace_period_days, 3) as grace_period_days,
    t.manual_override
  INTO v_tenant
  FROM tenants t
  WHERE t.id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_exp := v_tenant.subscription_expires_at;
  v_grace := v_tenant.grace_period_days;
  v_override := v_tenant.manual_override;

  -- 1. Manual Override check
  IF v_override IS TRUE THEN
    v_status := 'manual_on';
    v_allowed := true;
    v_days := null;
  ELSIF v_override IS FALSE THEN
    v_status := 'manual_off';
    v_allowed := false;
    v_days := 0;
  ELSIF v_exp IS NULL THEN
    v_status := 'active';
    v_allowed := true;
    v_days := null;
  ELSIF v_now <= v_exp THEN
    v_status := 'active';
    v_allowed := true;
    v_days := extract(day from (v_exp - v_now))::int;
  ELSIF v_now <= (v_exp + (v_grace || ' days')::interval) THEN
    -- In 3-day Grace Period -> access allowed!
    v_status := 'grace_period';
    v_allowed := true;
    v_days := extract(day from ((v_exp + (v_grace || ' days')::interval) - v_now))::int;
  ELSE
    -- Grace period expired
    v_status := 'expired';
    v_allowed := false;
    v_days := 0;
  END IF;

  RETURN QUERY SELECT 
    v_tenant.id, 
    v_tenant.plan, 
    v_status, 
    v_allowed, 
    v_exp, 
    v_grace, 
    v_override, 
    v_days;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_info(uuid) TO authenticated;
