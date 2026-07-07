-- ============================================================
-- Staff RLS access fix
--
-- Staff members authenticate via Supabase Auth. Their JWT `sub` claim is the
-- auth user id, which (by create-staff / delete-staff edge functions) equals
-- their staff.id. Previously auth_tenant_ids() only resolved a caller's tenants
-- via user_properties or tenant ownership — a staff member has NEITHER, so the
-- staff and tenants RLS policies returned zero rows. On login, loadProperties()
-- could not read the staff row or its tenant, and the user fell through to
-- BUSINESS_ADMIN with no tenant and got bounced out of their CRM.
--
-- This adds a staff branch: a caller may access the tenant of the staff row
-- whose id matches their JWT sub. This unblocks the `staff` and `tenants`
-- policies (both keyed on auth_tenant_ids()) so staff land in their own hotel.
-- ============================================================
create or replace function public.auth_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from tenants
  where (auth.jwt() ->> 'email') in ('rathnavelkarthi1@gmail.com', 'admin@triplooper.com')
  union
  select up.tenant_id
  from user_properties up
  where up.user_id = (auth.jwt() ->> 'sub')
  union
  select t.id
  from tenants t
  where t.owner_id = (auth.jwt() ->> 'sub')
  union
  -- Staff: the auth user id (JWT sub) matches staff.id. Resolve their tenant.
  select s.tenant_id
  from staff s
  where s.id::text = (auth.jwt() ->> 'sub')
$$;

revoke all on function public.auth_tenant_ids() from public;
grant execute on function public.auth_tenant_ids() to authenticated;
