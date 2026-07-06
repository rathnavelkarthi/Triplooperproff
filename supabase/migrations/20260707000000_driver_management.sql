-- ============================================================
-- Driver Management Database Schema
-- ============================================================

-- 1. Create drivers table ------------------------------------------------
create table if not exists drivers (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  email               text unique not null,
  phone               text not null,
  password            text not null,
  car_photo           text,
  car_number          text,
  license_info        text,
  status              text not null default 'pending',
  latitude            numeric(10,8),
  longitude           numeric(11,8),
  location_updated_at timestamptz,
  created_at          timestamptz not null default now()
);

-- Constrain status values
alter table if exists drivers
  drop constraint if exists drivers_status_check;
alter table if exists drivers
  add constraint drivers_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Enable Row Level Security (RLS)
alter table drivers enable row level security;

-- Policies for drivers (Allowing public reads & updates for easy onboarding/login simulation)
drop policy if exists "drivers_public_all" on drivers;
create policy "drivers_public_all" on drivers
  for all
  using (true)
  with check (true);

-- 2. Create driver_duties table ------------------------------------------
create table if not exists driver_duties (
  id                uuid primary key default gen_random_uuid(),
  driver_id         uuid not null references drivers(id) on delete cascade,
  tenant_id         uuid references tenants(id) on delete cascade,
  booking_id        text references reservations(id) on delete set null,
  duty_date         date not null,
  duty_time         text,
  pickup_location   text,
  drop_location     text,
  status            text not null default 'pending',
  created_at        timestamptz not null default now()
);

-- Constrain duty status values
alter table if exists driver_duties
  drop constraint if exists driver_duties_status_check;
alter table if exists driver_duties
  add constraint driver_duties_status_check
  check (status in ('pending', 'active', 'completed', 'cancelled'));

-- Enable RLS
alter table driver_duties enable row level security;

drop policy if exists "driver_duties_public_all" on driver_duties;
create policy "driver_duties_public_all" on driver_duties
  for all
  using (true)
  with check (true);

-- 3. Seed mock driver data ------------------------------------------------
insert into drivers (id, name, email, phone, password, car_number, car_photo, license_info, status)
values 
  ('d1000000-0000-0000-0000-000000000001', 'Rajesh Kumar', 'rajesh@triplooper.com', '9876543210', 'password123', 'DL-3C-AB-1234', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500', 'DL-98765432109', 'approved'),
  ('d2000000-0000-0000-0000-000000000002', 'Amit Singh', 'amit@triplooper.com', '9988776655', 'password123', 'HR-26-CD-5678', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500', 'DL-88776655443', 'pending')
on conflict (email) do nothing;

-- Seed mock duty data
insert into driver_duties (id, driver_id, duty_date, duty_time, pickup_location, drop_location, status)
values 
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', current_date, '14:30', 'Indira Gandhi International Airport (DEL)', 'Ganesh Residence, Saket', 'pending'),
  ('e2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', current_date + 1, '10:00', 'Ganesh Residence, Saket', 'Nizamuddin Railway Station', 'pending')
on conflict do nothing;
