-- ============================================================
-- Fix Tenant Owner Roles
--
-- Standalone tenant owners should be assigned the 'SUPER_ADMIN' role instead of
-- 'BUSINESS_ADMIN'. This ensures they have full access to CRM Settings
-- (Website Editor, Staff Management, Billing) and are not incorrectly routed
-- to the multi-property business module.
--
-- This migration:
-- 1. Updates public.create_tenant() to insert user_properties rows with 'SUPER_ADMIN'.
-- 2. Updates any existing B2B 'BUSINESS_ADMIN' owners in user_properties to 'SUPER_ADMIN'.
-- ============================================================

-- 1. Update public.create_tenant()
create or replace function public.create_tenant(
  p_owner_id text,
  p_business_name text,
  p_business_type text,
  p_subdomain text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into tenants (business_name, business_type, subdomain, owner_id)
  values (p_business_name, coalesce(p_business_type, 'hotel'), lower(p_subdomain), p_owner_id)
  returning id into v_id;

  insert into user_properties (user_id, tenant_id, role, is_owner)
  values (p_owner_id, v_id, 'SUPER_ADMIN', true);

  return v_id;
end;
$$;

-- 2. Migrate existing 'BUSINESS_ADMIN' roles in user_properties to 'SUPER_ADMIN'
update public.user_properties
set role = 'SUPER_ADMIN'
where role = 'BUSINESS_ADMIN';
