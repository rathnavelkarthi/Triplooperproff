-- Aiosell channel manager integration.
-- Adds per-tenant room/rateplan code mapping and the reservation columns the
-- inbound booking webhook needs to be idempotent and store OTA-only data.
--
-- Partner-level Aiosell auth (Basic Auth username/password + partner id) is a
-- SINGLE Triplooper-wide credential set stored in edge-function secrets, NOT in
-- the DB. Per-tenant config (which hotelCode maps to which tenant) reuses the
-- existing channel_connections table with channel_id = 'aiosell'.

-- ---------------------------------------------------------------------------
-- Room / rate-plan code mapping
-- ---------------------------------------------------------------------------
-- Aiosell identifies rooms and rate plans by opaque string codes returned from
-- the property_details API. We map each (roomCode, rateplanCode) pair back to a
-- local rooms row so pushes and inbound bookings can be translated both ways.
create table if not exists aiosell_room_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id bigint references rooms(id) on delete set null,
  room_code text not null,                 -- Aiosell roomCode
  rateplan_code text not null,             -- Aiosell rateplanCode
  rateplan_name text,                      -- human label from property_details
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, room_code, rateplan_code)
);

alter table aiosell_room_mappings enable row level security;
create policy "Tenants manage own aiosell mappings" on aiosell_room_mappings
  for all using (tenant_id = auth.uid()::uuid);

create index if not exists idx_aiosell_room_mappings_tenant
  on aiosell_room_mappings(tenant_id);
create index if not exists idx_aiosell_room_mappings_lookup
  on aiosell_room_mappings(tenant_id, room_code, rateplan_code);

-- ---------------------------------------------------------------------------
-- Reservation columns for OTA bookings arriving via the webhook
-- ---------------------------------------------------------------------------
-- channel_booking_id = the OTA's bookingId. Unique per tenant so book/modify/
-- cancel and duplicate webhook deliveries resolve to the same reservation row.
alter table reservations
  add column if not exists channel_booking_id text,
  add column if not exists cm_booking_id text,           -- Aiosell cmBookingId
  add column if not exists special_requests text,        -- OTA free text, stored raw
  add column if not exists pah boolean,                  -- pay-at-hotel flag
  add column if not exists currency text,
  add column if not exists commission numeric(10,2),
  add column if not exists raw_payload jsonb;            -- full webhook body for audit

create unique index if not exists uq_reservations_channel_booking
  on reservations(tenant_id, channel_booking_id)
  where channel_booking_id is not null;
