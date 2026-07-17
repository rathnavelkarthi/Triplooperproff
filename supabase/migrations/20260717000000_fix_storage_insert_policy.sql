-- ============================================================
-- Fix Storage insert policy for Property Verification Documents
--
-- Previously, the insert policy on storage.objects for 'property-documents'
-- bucket checked user_properties directly, which blocked Owners/Managers from
-- uploading documents unless they had an explicit user_properties link.
--
-- This updates the policy to use the unified auth_tenant_ids() function,
-- which matches the select policy and automatically grants owners access.
-- ============================================================

drop policy if exists "property_docs_owner_insert" on storage.objects;

create policy "property_docs_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] in (
      select id::text from tenants
      where id in (select public.auth_tenant_ids())
    )
  );
