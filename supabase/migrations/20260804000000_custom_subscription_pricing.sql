-- ============================================================
-- Migration: Custom Subscription Pricing & Payment Links
-- ============================================================

ALTER TABLE IF EXISTS tenants
  ADD COLUMN IF NOT EXISTS custom_monthly_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_link_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_link_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS selected_addons text[] DEFAULT '{}';

ALTER TABLE IF EXISTS subscriptions
  ADD COLUMN IF NOT EXISTS custom_monthly_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS selected_addons text[] DEFAULT '{}';

-- Update get_subscription_info to recognize custom pricing & mode
DROP FUNCTION IF EXISTS public.get_subscription_info(uuid);
CREATE OR REPLACE FUNCTION public.get_subscription_info(p_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  plan text,
  status text,
  is_access_allowed boolean,
  expires_at timestamptz,
  grace_period_days integer,
  manual_override boolean,
  days_remaining integer,
  custom_monthly_price numeric
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
  v_custom_price numeric;
BEGIN
  SELECT 
    t.id, 
    coalesce(t.subscription_plan, t.plan, 'starter') as plan, 
    t.subscription_expires_at, 
    coalesce(t.grace_period_days, 3) as grace_period_days,
    t.manual_override,
    t.custom_monthly_price
  INTO v_tenant
  FROM tenants t
  WHERE t.id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_exp := v_tenant.subscription_expires_at;
  v_grace := v_tenant.grace_period_days;
  v_override := v_tenant.manual_override;
  v_custom_price := v_tenant.custom_monthly_price;

  -- 1. Manual Override check
  IF v_override IS TRUE THEN
    RETURN QUERY SELECT 
      p_tenant_id, 
      v_tenant.plan, 
      'manual_on'::text, 
      true, 
      v_exp, 
      v_grace, 
      true, 
      NULL::integer,
      v_custom_price;
    RETURN;
  ELSIF v_override IS FALSE THEN
    RETURN QUERY SELECT 
      p_tenant_id, 
      v_tenant.plan, 
      'manual_off'::text, 
      false, 
      v_exp, 
      v_grace, 
      false, 
      0,
      v_custom_price;
    RETURN;
  END IF;

  -- 2. Ongoing / Infinite Plan (no expiration date set)
  IF v_exp IS NULL THEN
    RETURN QUERY SELECT 
      p_tenant_id, 
      v_tenant.plan, 
      'active'::text, 
      true, 
      NULL::timestamptz, 
      v_grace, 
      NULL::boolean, 
      NULL::integer,
      v_custom_price;
    RETURN;
  END IF;

  -- 3. Calculate Expiration & Grace Period
  IF v_now <= v_exp THEN
    -- Active
    v_days := extract(day from (v_exp - v_now))::integer;
    RETURN QUERY SELECT 
      p_tenant_id, 
      v_tenant.plan, 
      'active'::text, 
      true, 
      v_exp, 
      v_grace, 
      NULL::boolean, 
      v_days,
      v_custom_price;
  ELSIF v_now <= (v_exp + (v_grace || ' days')::interval) THEN
    -- Grace Period (3 days auto-applies)
    v_days := extract(day from ((v_exp + (v_grace || ' days')::interval) - v_now))::integer;
    RETURN QUERY SELECT 
      p_tenant_id, 
      v_tenant.plan, 
      'grace_period'::text, 
      true, -- Access allowed during grace period
      v_exp, 
      v_grace, 
      NULL::boolean, 
      v_days,
      v_custom_price;
  ELSE
    -- Expired
    RETURN QUERY SELECT 
      p_tenant_id, 
      v_tenant.plan, 
      'expired'::text, 
      false, 
      v_exp, 
      v_grace, 
      NULL::boolean, 
      0,
      v_custom_price;
  END IF;
END;
$$;
