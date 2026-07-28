-- Aiosell inbound data push tables.
-- Used by the aiosell-inbound edge function to store inventory & rates
-- pushed FROM Aiosell TO Triplooper (reverse direction from the PMS push).

-- Room-level inventory snapshots received from Aiosell via inbound webhook.
-- One row per (tenant, room_code, date).
create table if not exists room_inventory (
  id            bigint generated always as identity primary key,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  room_code     text not null,
  date          date not null,
  available     int,                  -- nullable: null means unknown/not provided
  restrictions  jsonb,                -- room-level restrictions (stopSell, minStay, etc.)
  raw_source    text default 'aiosell_inbound',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Unique constraint for upsert: one inventory record per (tenant, room, date)
create unique index if not exists idx_room_inventory_uid
  on room_inventory(tenant_id, room_code, date);

-- Rate snapshots received from Aiosell via inbound webhook.
-- One row per (tenant, room_code, rateplan_code, date).
create table if not exists room_rates (
  id            bigint generated always as identity primary key,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  room_code     text not null,
  rateplan_code text not null,
  date          date not null,
  rate          numeric(12,2),        -- nullable: null means unknown/not provided
  restrictions  jsonb,                -- rateplan-level restrictions
  raw_source    text default 'aiosell_inbound',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Unique constraint for upsert: one rate record per (tenant, room, rateplan, date)
create unique index if not exists idx_room_rates_uid
  on room_rates(tenant_id, room_code, rateplan_code, date);

-- Enable RLS
alter table room_inventory enable row level security;
alter table room_rates enable row level security;

-- RLS: tenants can read their own data
create policy "Tenants read own room_inventory"
  on room_inventory for select
  using ( tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid );

create policy "Tenants read own room_rates"
  on room_rates for select
  using ( tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid );

-- Service role (edge function) can insert/update
-- (RLS is bypassed for service_role, so these aren't strictly needed but included
--  for clarity / potential future use with non-service-role callers.)
