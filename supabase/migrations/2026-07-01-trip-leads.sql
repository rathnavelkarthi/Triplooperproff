create table if not exists public.trip_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  destination text,
  budget integer,
  nights integer,
  people integer,
  tier text,
  property_name text,
  property_id text,
  tenant_id uuid references public.tenants(id) on delete set null,
  plan jsonb,
  whatsapp_sent boolean not null default false
);

alter table public.trip_leads enable row level security;

-- Public planner: anyone may create a lead.
create policy "trip_leads_insert_anon"
  on public.trip_leads for insert
  to anon, authenticated
  with check (true);

-- Reads restricted to authenticated users (platform admin / owning tenant handled app-side).
create policy "trip_leads_select_authenticated"
  on public.trip_leads for select
  to authenticated
  using (true);
