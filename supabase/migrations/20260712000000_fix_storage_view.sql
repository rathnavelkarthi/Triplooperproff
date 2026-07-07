-- ============================================================
-- Fix Storage select policy for Platform Admins
--
-- Previously, the select policy on storage.objects for 'property-documents'
-- bucket checked user_properties directly, which blocked Platform Admins from
-- viewing/downloading verification documents uploaded by other tenants.
--
-- This updates the policy to use the unified auth_tenant_ids() function,
-- which automatically grants platform admins access to all tenants.
-- ============================================================

drop policy if exists "property_docs_owner_select" on storage.objects;

create policy "property_docs_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] in (
      select id::text from tenants
      where id in (select public.auth_tenant_ids())
    )
  );
