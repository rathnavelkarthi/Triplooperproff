-- ============================================================
-- 20260704000000_enable_rls.sql
-- FIX for WEB-002 (Web App Pentest): RLS was enabled on ZERO tables,
-- so the public anon key granted full read/write on every tenant's data.
--
-- STRATEGY: deny-by-default.
--   Enabling RLS with NO permissive policy means the `anon` and
--   `authenticated` roles get ZERO direct access to base tables via PostgREST.
--   Legitimate access continues to work because:
--     * Public/guest flows go through SECURITY DEFINER RPCs
--       (get_tenant_site, get_room_detail, get_guest_session,
--        create_public_booking, check_room_availability, apply_coupon,
--        create_table_reservation) which run as the definer and bypass RLS.
--     * Privileged CRM/admin ops go through Edge Functions using the
--       service_role key (delete-user, create-staff, send-whatsapp),
--       and service_role bypasses RLS by design.
--
-- ⚠️ IMPORTANT — READ BEFORE APPLYING:
--   This app authenticates CRM users via CLERK, not Supabase Auth. Every
--   direct `supabase.from('...')` call in the SPA currently uses the ANON
--   key (Supabase sees it as anonymous). Enabling deny-by-default RLS WILL
--   break any screen that reads/writes base tables DIRECTLY rather than via
--   an RPC or Edge Function — this includes large parts of the CRM and the
--   guest portal (see docs/WEBAPP-PENTEST-REPORT.md, "direct .from() reads").
--
--   The correct long-term fix is to wire Clerk → Supabase (JWT template with
--   a verified `tenant_id`/`sub` claim) and then add tenant-scoped policies
--   like the commented template at the bottom. Until that is done, the direct
--   reads must be migrated to SECURITY DEFINER RPCs.
--
--   => Apply this to a STAGING project first and confirm every screen works
--      before production. Do NOT assume it is drop-in safe.
-- ============================================================

-- Enable RLS on every application table. No permissive policy = deny all
-- direct role access; definer RPCs and service_role continue to function.
alter table if exists businesses               enable row level security;
alter table if exists tenants                  enable row level security;
alter table if exists user_properties          enable row level security;
alter table if exists business_invites         enable row level security;
alter table if exists staff                    enable row level security;
alter table if exists rooms                    enable row level security;
alter table if exists reservations             enable row level security;
alter table if exists guest_tokens             enable row level security;
alter table if exists service_requests         enable row level security;
alter table if exists guest_messages           enable row level security;
alter table if exists page_content             enable row level security;
alter table if exists settings                 enable row level security;
alter table if exists cms_settings             enable row level security;
alter table if exists testimonials             enable row level security;
alter table if exists gallery_images           enable row level security;
alter table if exists room_pricing             enable row level security;
alter table if exists coupons                  enable row level security;
alter table if exists menu_categories          enable row level security;
alter table if exists menu_items               enable row level security;
alter table if exists restaurant_tables        enable row level security;
alter table if exists food_orders              enable row level security;
alter table if exists food_order_items         enable row level security;
alter table if exists food_inventory           enable row level security;
alter table if exists table_reservations       enable row level security;
alter table if exists expenses                 enable row level security;
alter table if exists subscriptions            enable row level security;
alter table if exists channel_connections      enable row level security;
alter table if exists channel_sync_logs        enable row level security;
alter table if exists whatsapp_scheduled_messages enable row level security;
alter table if exists trip_leads               enable row level security;

-- Force RLS even for the table owner role, closing the definer/owner gap.
-- (service_role still bypasses; SECURITY DEFINER functions still work.)
alter table if exists tenants            force row level security;
alter table if exists user_properties    force row level security;
alter table if exists staff              force row level security;
alter table if exists reservations       force row level security;
alter table if exists guest_messages     force row level security;
alter table if exists expenses           force row level security;

-- Remove the dangerous blanket-allow policies from the old "clerk_rls_bypass"
-- and "fix_invite_rls" scripts if they were ever applied. USING (true) exposes
-- everything and must not survive this migration.
drop policy if exists "business_owner_access"     on businesses;
drop policy if exists "user_properties_access"     on user_properties;
drop policy if exists "tenants_access"             on tenants;
drop policy if exists "invite_token_lookup"        on business_invites;
drop policy if exists "invite_token_update"        on business_invites;
drop policy if exists "invite_insert_access"       on business_invites;
drop policy if exists "invite_update_access"       on business_invites;

-- ============================================================
-- TENANT-SCOPED POLICIES
-- Requires Clerk→Supabase third-party auth configured first
-- (see docs/CLERK-SUPABASE-SETUP.md). The Clerk `sub` claim = the app's
-- user_id / owner_id (TEXT). Apply on STAGING and verify every screen.
--
-- Helper: the set of tenant_ids the current JWT user may access.
-- SECURITY DEFINER so it can read user_properties despite that table's own RLS.
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
$$;

revoke all on function public.auth_tenant_ids() from public;
grant execute on function public.auth_tenant_ids() to authenticated;

-- Membership tables ------------------------------------------------
create policy "up_self" on user_properties
  for select using (user_id = (auth.jwt() ->> 'sub'));

create policy "tenants_member_rw" on tenants
  for all using (id in (select public.auth_tenant_ids()))
  with check (id in (select public.auth_tenant_ids()));

create policy "businesses_owner_rw" on businesses
  for all using (owner_id = (auth.jwt() ->> 'sub'))
  with check (owner_id = (auth.jwt() ->> 'sub'));

-- Generic tenant-scoped tables. Same policy shape: row's tenant_id must be one
-- the caller belongs to. Applied FOR ALL (select/insert/update/delete).
do $$
declare
  tbl text;
  tenant_tables text[] := array[
    'staff','rooms','reservations','service_requests','guest_messages',
    'page_content','settings','cms_settings','testimonials','gallery_images',
    'room_pricing','coupons','menu_categories','menu_items','restaurant_tables',
    'food_orders','food_order_items','food_inventory','table_reservations',
    'expenses','subscriptions','channel_connections','channel_sync_logs',
    'whatsapp_scheduled_messages'
  ];
begin
  foreach tbl in array tenant_tables loop
    execute format($f$
      create policy %I on %I
        for all
        using (tenant_id in (select public.auth_tenant_ids()))
        with check (tenant_id in (select public.auth_tenant_ids()));
    $f$, tbl || '_tenant_rw', tbl);
  end loop;
end $$;

-- NOTES / intentionally NOT auto-policied:
--   * business_invites, guest_tokens, trip_leads: accessed via token/RPC flows,
--     not user-scoped. Keep deny-by-default (RLS on, no policy) and reach them
--     through SECURITY DEFINER RPCs or an Edge Function. Add bespoke policies
--     only after reviewing each flow.
--   * Public tenant site / guest portal: continue to use get_tenant_site(),
--     get_room_detail(), get_guest_session() definer RPCs for anonymous reads.
-- ============================================================
