-- ============================================================
-- Guest WhatsApp OTP gate
--   * guest_otps: short-lived one-time codes, service-role only.
--     The plaintext code NEVER leaves the server — the browser only
--     ever sends a code back to the `guest-otp` edge function to verify.
--   * guest_stays_for_phone: SECURITY DEFINER lookup used AFTER a verified
--     OTP to return a guest's bookings. Callable only by the service role
--     (the edge function), so anon cannot enumerate reservations by phone.
-- ============================================================

create table if not exists guest_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,                                   -- normalized digits
  code_hash text not null,                               -- sha-256 of the 6-digit code
  purpose text not null default 'my_stays',              -- 'my_stays' | 'portal'
  token text,                                            -- guest_tokens.token when purpose='portal'
  attempts int not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_otps_phone on guest_otps (phone, created_at desc);
create index if not exists idx_guest_otps_expires on guest_otps (expires_at);

-- Deny-by-default: RLS on, no policies -> only service role (edge function) reads/writes.
alter table guest_otps enable row level security;

-- ------------------------------------------------------------
-- guest_stays_for_phone(p_phone) -> bookings for that phone.
-- SECURITY DEFINER so it can read reservations under deny-by-default RLS.
-- Granted to service_role ONLY; the edge function calls it after verifying
-- the OTP, so anonymous callers can never reach it directly.
-- ------------------------------------------------------------
drop function if exists guest_stays_for_phone(text);
create or replace function guest_stays_for_phone(p_phone text)
returns table(
  id text,
  guest_name text,
  check_in date,
  check_out date,
  room_type text,
  status text,
  payment_status text,
  amount numeric,
  gst_amount numeric,
  payment_method text,
  guest_email text,
  guest_phone text,
  guest_location text,
  tenant_id uuid,
  business_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id,
    r.guest_name,
    r.check_in,
    r.check_out,
    r.room_type,
    r.status,
    r.payment_status,
    r.amount,
    r.gst_amount,
    r.payment_method,
    r.guest_email,
    r.guest_phone,
    r.guest_location,
    r.tenant_id,
    t.business_name
  from reservations r
  join tenants t on t.id = r.tenant_id
  -- Match on digits only so "+91 98765 43210" == "9876543210" == "919876543210".
  where regexp_replace(coalesce(r.guest_phone, ''), '\D', '', 'g') like '%' || p_phone
    and length(p_phone) >= 6
  order by r.check_in desc;
end;
$$;

revoke all on function guest_stays_for_phone(text) from anon, authenticated;
grant execute on function guest_stays_for_phone(text) to service_role;

-- ------------------------------------------------------------
-- guest_phone_for_token(p_token) -> the reservation's tenant + phone.
-- Used by the portal OTP gate: given a portal link, find which phone
-- the code must be sent to (the guest on that reservation).
-- ------------------------------------------------------------
drop function if exists guest_phone_for_token(text);
create or replace function guest_phone_for_token(p_token text)
returns table(tenant_id uuid, guest_phone text, business_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select r.tenant_id, r.guest_phone, t.business_name
  from guest_tokens gt
  join reservations r on r.id = gt.reservation_id
  join tenants t on t.id = r.tenant_id
  where gt.token = p_token;
end;
$$;

revoke all on function guest_phone_for_token(text) from anon, authenticated;
grant execute on function guest_phone_for_token(text) to service_role;
