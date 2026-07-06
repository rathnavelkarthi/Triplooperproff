-- ============================================================
-- Property document verification (manual admin review gate)
--
-- Flow:
--   1. A newly signed-up property is created with
--      verification_status = 'pending'.
--   2. The owner is locked to /admin/verification and must upload a
--      government trade authorization document into the private
--      'property-documents' storage bucket; a row is recorded in
--      property_documents.
--   3. The platform admin reviews the document in PlatformAdmin and
--      either approves (verification_status='approved', verified_at set)
--      or rejects (verification_status='rejected', verification_reason set).
--   4. The owner receives an approval/rejection email (Resend).
--
-- Only after 'approved' can the owner reach the rest of the CRM.
-- ============================================================

-- 1. Tenant verification columns ----------------------------------------
alter table if exists tenants
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_reason text,
  add column if not exists verified_at timestamptz;

-- Constrain to known states (drop-then-add so re-runs are safe).
alter table if exists tenants
  drop constraint if exists tenants_verification_status_check;
alter table if exists tenants
  add constraint tenants_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected'));

-- Existing/live properties are grandfathered in as approved so this
-- migration does not lock out anyone who is already operating.
update tenants set verification_status = 'approved', verified_at = now()
where verification_status = 'pending' and is_active = true
  and created_at < now();

-- 1b. Ensure the auth_tenant_ids() helper exists ------------------------
-- Normally defined in 20260704000000_enable_rls.sql, but that RLS migration
-- may not have been applied yet (it is meant to be rolled out carefully on
-- staging first). Define it idempotently here so this migration is
-- self-contained and does not fail with "function auth_tenant_ids() does
-- not exist". `create or replace` is a no-op refresh if it already exists.
create or replace function public.auth_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
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

-- 2. property_documents table -------------------------------------------
create table if not exists property_documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  doc_type    text not null default 'govt_trade_authorization',
  file_path   text not null,          -- storage object path in the bucket
  file_name   text,
  uploaded_by text,                    -- clerk user id / owner id
  uploaded_at timestamptz not null default now()
);

create index if not exists property_documents_tenant_idx
  on property_documents(tenant_id);

alter table if exists property_documents enable row level security;

-- Owner may read/insert their own tenant's documents. Uses the same
-- auth_tenant_ids() helper defined in 20260704000000_enable_rls.sql.
drop policy if exists "property_documents_owner_rw" on property_documents;
create policy "property_documents_owner_rw" on property_documents
  for all
  using (tenant_id in (select public.auth_tenant_ids()))
  with check (tenant_id in (select public.auth_tenant_ids()));

-- 3. Private storage bucket for documents -------------------------------
-- Documents are sensitive: bucket is PRIVATE (public=false). Owners upload
-- and read their own; the platform admin reads via the service-role key.
insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do nothing;

-- Owners can manage files under a folder named after a tenant_id they own.
-- Path convention: <tenant_id>/<doc_type>-<timestamp>.<ext>
drop policy if exists "property_docs_owner_insert" on storage.objects;
create policy "property_docs_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] in (
      select tenant_id::text from user_properties
      where user_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "property_docs_owner_select" on storage.objects;
create policy "property_docs_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] in (
      select tenant_id::text from user_properties
      where user_id = (auth.jwt() ->> 'sub')
    )
  );
