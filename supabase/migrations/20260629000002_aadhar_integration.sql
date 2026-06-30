-- Triplooper — Aadhar & Guest Profile Integration schema and functions
-- 
-- 1. Alter reservations table to include aadhar verification columns
alter table reservations add column if not exists aadhar_url text;
alter table reservations add column if not exists aadhar_number text;
alter table reservations add column if not exists aadhar_extracted_age integer;
alter table reservations add column if not exists aadhar_extracted_address text;
alter table reservations add column if not exists aadhar_extracted_name text;
alter table reservations add column if not exists aadhar_dob text;

-- 2. Create guest_profiles table to store persistent verification cards and metadata per guest (keyed by phone)
create table if not exists guest_profiles (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  email text,
  name text,
  aadhar_url text,
  aadhar_number text,
  aadhar_extracted_age integer,
  aadhar_extracted_address text,
  aadhar_extracted_name text,
  aadhar_dob text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup by phone
create index if not exists idx_guest_profiles_phone on guest_profiles(phone);

-- 3. Trigger to auto-fill Aadhar details from guest_profiles on new reservations if phone matches
create or replace function autofill_reservation_aadhar_from_profile()
returns trigger
language plpgsql
security definer
as $$
declare
  v_profile guest_profiles;
begin
  if new.guest_phone is not null and new.guest_phone <> '' then
    select * into v_profile from guest_profiles where phone = new.guest_phone limit 1;
    if v_profile.phone is not null then
      new.aadhar_url := coalesce(new.aadhar_url, v_profile.aadhar_url);
      new.aadhar_number := coalesce(new.aadhar_number, v_profile.aadhar_number);
      new.aadhar_extracted_age := coalesce(new.aadhar_extracted_age, v_profile.aadhar_extracted_age);
      new.aadhar_extracted_address := coalesce(new.aadhar_extracted_address, v_profile.aadhar_extracted_address);
      new.aadhar_extracted_name := coalesce(new.aadhar_extracted_name, v_profile.aadhar_extracted_name);
      new.aadhar_dob := coalesce(new.aadhar_dob, v_profile.aadhar_dob);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_autofill_reservation_aadhar_from_profile on reservations;
create trigger trg_autofill_reservation_aadhar_from_profile
  before insert on reservations
  for each row
  execute function autofill_reservation_aadhar_from_profile();

-- 4. Trigger to upsert guest_profiles when a reservation is updated with Aadhar details
create or replace function sync_reservation_aadhar_to_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.aadhar_url is not null and (old.aadhar_url is null or old.aadhar_url <> new.aadhar_url)) or
     (new.aadhar_number is not null and (old.aadhar_number is null or old.aadhar_number <> new.aadhar_number)) or
     (new.aadhar_extracted_age is not null and (old.aadhar_extracted_age is null or old.aadhar_extracted_age <> new.aadhar_extracted_age)) or
     (new.aadhar_extracted_address is not null and (old.aadhar_extracted_address is null or old.aadhar_extracted_address <> new.aadhar_extracted_address)) then
     
     if new.guest_phone is not null and new.guest_phone <> '' then
       insert into guest_profiles (
         phone, email, name, aadhar_url, aadhar_number, 
         aadhar_extracted_age, aadhar_extracted_address, aadhar_extracted_name, aadhar_dob, updated_at
       )
       values (
         new.guest_phone, new.guest_email, new.guest_name, new.aadhar_url, new.aadhar_number, 
         new.aadhar_extracted_age, new.aadhar_extracted_address, new.aadhar_extracted_name, new.aadhar_dob, now()
       )
       on conflict (phone) do update set
         email = coalesce(excluded.email, guest_profiles.email),
         name = coalesce(excluded.name, guest_profiles.name),
         aadhar_url = excluded.aadhar_url,
         aadhar_number = excluded.aadhar_number,
         aadhar_extracted_age = excluded.aadhar_extracted_age,
         aadhar_extracted_address = excluded.aadhar_extracted_address,
         aadhar_extracted_name = excluded.aadhar_extracted_name,
         aadhar_dob = excluded.aadhar_dob,
         updated_at = now();
     end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_reservation_aadhar_to_profile on reservations;
create trigger trg_sync_reservation_aadhar_to_profile
  after insert or update of aadhar_url, aadhar_number, aadhar_extracted_age, aadhar_extracted_address, aadhar_extracted_name, aadhar_dob
  on reservations
  for each row
  execute function sync_reservation_aadhar_to_profile();

-- 5. Redefine get_guest_session(p_token) RPC function to return new Aadhar fields
create or replace function get_guest_session(p_token text)
returns table(
  token_id uuid,
  tenant_id uuid,
  reservation_id text,
  room_id bigint,
  business_name text,
  guest_email text,
  guest_phone text,
  guest_name text,
  room_name text,
  room_number text,
  check_in date,
  check_out date,
  status text,
  amount numeric,
  is_expired boolean,
  aadhar_url text,
  aadhar_number text,
  aadhar_extracted_age integer,
  aadhar_extracted_address text,
  aadhar_extracted_name text,
  aadhar_dob text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    gt.id,
    r.tenant_id,
    r.id,
    r.room_id,
    t.business_name,
    r.guest_email,
    r.guest_phone,
    r.guest_name,
    rm.name,
    rm.room_number,
    r.check_in,
    r.check_out,
    r.status,
    r.amount,
    (now() > (r.check_out + interval '2 days')) as is_expired,
    r.aadhar_url,
    r.aadhar_number,
    r.aadhar_extracted_age,
    r.aadhar_extracted_address,
    r.aadhar_extracted_name,
    r.aadhar_dob
  from guest_tokens gt
  join reservations r on r.id = gt.reservation_id
  join tenants t on t.id = r.tenant_id
  left join rooms rm on rm.id = r.room_id
  where gt.token = p_token;
end;
$$;

-- Grant execution permissions
grant execute on function get_guest_session(text) to anon, authenticated;

-- Redefine create_public_booking to also return token
create or replace function create_public_booking(
  p_subdomain text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_room_id bigint,
  p_check_in date,
  p_check_out date,
  p_amount numeric default null,
  p_advance_amount numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_room rooms;
  v_nights int;
  v_overlap int;
  v_amount numeric;
  v_seq int;
  v_id text;
  v_token text;
begin
  select id into v_tenant_id from tenants where subdomain = lower(p_subdomain) and is_active = true limit 1;
  if v_tenant_id is null then return jsonb_build_object('error', 'Property not found'); end if;

  select * into v_room from rooms where id = p_room_id and tenant_id = v_tenant_id limit 1;
  if v_room.id is null then return jsonb_build_object('error', 'Room not found'); end if;

  v_nights := greatest((p_check_out - p_check_in), 0);
  if v_nights = 0 then return jsonb_build_object('error', 'Invalid dates'); end if;

  select count(*) into v_overlap
  from reservations
  where room_id = p_room_id and tenant_id = v_tenant_id
    and status not in ('CANCELLED', 'CHECKED_OUT')
    and check_in < p_check_out and check_out > p_check_in;
  if v_overlap > 0 then return jsonb_build_object('error', 'Room is not available for the selected dates'); end if;

  v_amount := coalesce(p_amount, v_room.price_per_night * v_nights);

  -- human reservation id RES-0001 scoped per tenant
  select count(*) + 1 into v_seq from reservations where tenant_id = v_tenant_id;
  v_id := 'RES-' || lpad(v_seq::text, 4, '0');
  -- guard against rare collision
  while exists (select 1 from reservations where id = v_id) loop
    v_seq := v_seq + 1;
    v_id := 'RES-' || lpad(v_seq::text, 4, '0');
  end loop;

  insert into reservations (
    id, tenant_id, guest_name, guest_email, guest_phone,
    room_type, room_id, check_in, check_out, source, status, payment_status, amount
  ) values (
    v_id, v_tenant_id, p_guest_name, p_guest_email, p_guest_phone,
    v_room.type, p_room_id, p_check_in, p_check_out, 'WEBSITE', 'CONFIRMED',
    case when coalesce(p_advance_amount,0) >= v_amount then 'PAID'
         when coalesce(p_advance_amount,0) > 0 then 'PARTIAL' else 'PENDING' end,
    v_amount
  );

  -- guest portal token
  v_token := gen_random_uuid()::text;
  insert into guest_tokens (reservation_id, token) values (v_id, v_token);

  return jsonb_build_object(
    'booking_id', v_id,
    'room', v_room.name,
    'nights', v_nights,
    'amount', v_amount,
    'token', v_token
  );
end;
$$;

grant execute on function create_public_booking(text, text, text, text, bigint, date, date, numeric, numeric) to anon, authenticated;
