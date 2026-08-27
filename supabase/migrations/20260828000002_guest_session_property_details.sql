-- Migration: Include property address and stay details in get_guest_session RPC
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
  slot_end_time text,
  property_address text,
  property_phone text,
  property_email text,
  property_about text,
  wifi_network text,
  wifi_password text,
  breakfast_hours text,
  checkout_guidelines text,
  checkout_time text,
  google_maps_url text
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
    r.slot_end_time,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('contactAddress', 'address') order by case when setting_key = 'contactAddress' then 1 else 2 end limit 1), '') as property_address,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('contactPhone', 'phone') order by case when setting_key = 'contactPhone' then 1 else 2 end limit 1), '') as property_phone,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('contactEmail', 'email') order by case when setting_key = 'contactEmail' then 1 else 2 end limit 1), t.custom_email, '') as property_email,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('aboutText', 'about') limit 1), '') as property_about,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('wifiNetwork') limit 1), t.business_name || '_Guest') as wifi_network,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('wifiPassword') limit 1), 'Welcome@123') as wifi_password,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('breakfastHours') limit 1), '08:00 AM - 10:30 AM') as breakfast_hours,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('checkoutGuidelines') limit 1), 'Drop key cards at front desk') as checkout_guidelines,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('checkoutTime') limit 1), '11:00 AM') as checkout_time,
    coalesce((select setting_value from settings where tenant_id = r.tenant_id and setting_key in ('googleMapsUrl') limit 1), '') as google_maps_url
  from guest_tokens gt
  join reservations r on r.id = gt.reservation_id
  join tenants t on t.id = r.tenant_id
  left join rooms rm on rm.id = r.room_id
  where gt.token = p_token;
end;
$$;
