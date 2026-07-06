-- Update auth_tenant_ids to allow platform admins to access all tenants
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

-- Update create_tenant to automatically insert owner link in user_properties
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
  values (p_owner_id, v_id, 'BUSINESS_ADMIN', true);

  return v_id;
end;
$$;

-- Add policies to business_invites to allow select and update by token
create policy "invite_token_select" on public.business_invites
  for select using (true);

create policy "invite_token_update" on public.business_invites
  for update using (true);
