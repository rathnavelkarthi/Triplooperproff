-- Add slot booking columns to reservations table for manual and express slot stays
alter table reservations
  add column if not exists slot_type text default 'Full Stay',
  add column if not exists slot_start_time text,
  add column if not exists slot_end_time text,
  add column if not exists synced_with_channels boolean default true,
  add column if not exists last_channel_sync_at timestamptz default now();

create index if not exists idx_reservations_slot_type on reservations(tenant_id, slot_type);
