-- Backfill guest_tokens for all existing reservations without a token
insert into guest_tokens (reservation_id, token)
select r.id, gen_random_uuid()::text
from reservations r
where not exists (
  select 1 from guest_tokens gt where gt.reservation_id = r.id
);

-- Trigger to automatically create a guest_token whenever a reservation is inserted
create or replace function auto_create_guest_token_for_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not exists (select 1 from guest_tokens where reservation_id = new.id) then
    v_token := gen_random_uuid()::text;
    insert into guest_tokens (reservation_id, token)
    values (new.id, v_token);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_create_guest_token_for_reservation on reservations;
create trigger trg_auto_create_guest_token_for_reservation
  after insert on reservations
  for each row
  execute function auto_create_guest_token_for_reservation();

-- Update get_guest_session to include slot columns
drop function if exists get_guest_session(text);
create or replace function get_guest_session(p_token text)
returns table (
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
  aadhar_dob text,
  slot_type text,
  slot_start_time text,
  slot_end_time text
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
    r.aadhar_dob,
    r.slot_type,
    r.slot_start_time,
    r.slot_end_time
  from guest_tokens gt
  join reservations r on r.id = gt.reservation_id
  join tenants t on t.id = r.tenant_id
  left join rooms rm on rm.id = r.room_id
  where gt.token = p_token;
end;
$$;

grant execute on function get_guest_session(text) to anon, authenticated;
