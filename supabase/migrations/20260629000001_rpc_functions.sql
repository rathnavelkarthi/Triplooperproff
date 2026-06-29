-- Triplooper / Ganesh Residence — RPC functions
-- These are called by the app via supabase.rpc() but had no source.
-- Contracts derived from every call site. All SECURITY DEFINER so anon/guest
-- flows can run them while base tables stay locked down under RLS.

-- Missing column used by get_tenant_site
alter table tenants add column if not exists google_place_id text;

-- ============================================================
-- create_tenant -> uuid
-- ============================================================
create or replace function create_tenant(
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
  return v_id;
end;
$$;

-- ============================================================
-- create_staff_user -> uuid
-- Note: cannot create a Supabase Auth user from SQL. This creates the
-- staff row with a generated id. The auth user is created separately by
-- the create-staff edge function; this RPC is the DB-side fallback.
-- ============================================================
create or replace function create_staff_user(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_phone text,
  p_tenant_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into staff (id, tenant_id, name, email, phone, role, status)
  values (v_id, p_tenant_id, p_name, p_email, p_phone, upper(p_role), 'ACTIVE');
  return v_id;
end;
$$;

-- ============================================================
-- get_tenant_site(p_subdomain) -> jsonb
-- { tenant, rooms[], testimonials[], settings{}, chef_specials[], gallery[] }
-- ============================================================
create or replace function get_tenant_site(p_subdomain text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant tenants;
  v_result jsonb;
begin
  select * into v_tenant from tenants
  where subdomain = lower(p_subdomain) and is_active = true
  limit 1;

  if v_tenant.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', v_tenant.id,
      'business_name', v_tenant.business_name,
      'business_type', v_tenant.business_type,
      'subdomain', v_tenant.subdomain,
      'template', v_tenant.template,
      'logo_url', v_tenant.logo_url,
      'google_place_id', v_tenant.google_place_id,
      'google_review_url', v_tenant.google_review_url,
      'hero_image_url', v_tenant.hero_image_url,
      'sections_visible', v_tenant.sections_visible
    ),
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'type', r.type, 'description', r.description,
        'price_per_night', r.price_per_night, 'max_occupancy', r.max_occupancy,
        'amenities', r.amenities, 'images', r.images
      ) order by r.id)
      from rooms r where r.tenant_id = v_tenant.id and r.show_on_website = true
    ), '[]'::jsonb),
    'testimonials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'guest_name', t.guest_name, 'guest_location', t.guest_location,
        'rating', t.rating, 'review_text', t.review_text
      ) order by t.is_featured desc, t.created_at desc)
      from testimonials t where t.tenant_id = v_tenant.id
    ), '[]'::jsonb),
    'settings', coalesce((
      select jsonb_object_agg(s.setting_key, s.setting_value)
      from settings s where s.tenant_id = v_tenant.id
    ), '{}'::jsonb),
    'chef_specials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'description', m.description,
        'price', m.price, 'image_url', m.image_url, 'is_veg', m.is_veg
      ) order by m.sort_order)
      from menu_items m
      where m.tenant_id = v_tenant.id and m.is_chef_special = true and m.is_available = true
    ), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'image_url', g.image_url, 'caption', g.caption, 'sort_order', g.sort_order
      ) order by g.sort_order)
      from gallery_images g where g.tenant_id = v_tenant.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================
-- get_room_detail(p_subdomain, p_room_id) -> jsonb
-- { room, tenant, all_rooms[] }
-- ============================================================
create or replace function get_room_detail(p_subdomain text, p_room_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant tenants;
  v_room rooms;
  v_result jsonb;
begin
  select * into v_tenant from tenants
  where subdomain = lower(p_subdomain) and is_active = true limit 1;
  if v_tenant.id is null then return null; end if;

  select * into v_room from rooms
  where id = p_room_id and tenant_id = v_tenant.id limit 1;
  if v_room.id is null then return null; end if;

  select jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id, 'name', v_room.name, 'type', v_room.type,
      'description', v_room.description, 'price_per_night', v_room.price_per_night,
      'max_occupancy', v_room.max_occupancy, 'amenities', v_room.amenities, 'images', v_room.images
    ),
    'tenant', jsonb_build_object(
      'id', v_tenant.id, 'business_name', v_tenant.business_name,
      'subdomain', v_tenant.subdomain, 'logo_url', v_tenant.logo_url
    ),
    'all_rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'type', r.type,
        'price_per_night', r.price_per_night, 'images', r.images
      ) order by r.id)
      from rooms r
      where r.tenant_id = v_tenant.id and r.id <> p_room_id and r.show_on_website = true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================
-- check_room_availability -> table(is_available, total_price)
-- ============================================================
create or replace function check_room_availability(
  p_subdomain text,
  p_room_id bigint,
  p_check_in date,
  p_check_out date
) returns table(is_available boolean, total_price numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_base numeric;
  v_nights int;
  v_total numeric := 0;
  v_overlap int;
  d date;
begin
  select id into v_tenant_id from tenants where subdomain = lower(p_subdomain) and is_active = true limit 1;
  if v_tenant_id is null then
    return query select false, 0::numeric; return;
  end if;

  select price_per_night into v_base from rooms where id = p_room_id and tenant_id = v_tenant_id limit 1;
  if v_base is null then
    return query select false, 0::numeric; return;
  end if;

  v_nights := greatest((p_check_out - p_check_in), 0);
  if v_nights = 0 then
    return query select false, 0::numeric; return;
  end if;

  -- overlapping active reservations make the room unavailable
  select count(*) into v_overlap
  from reservations
  where room_id = p_room_id
    and tenant_id = v_tenant_id
    and status not in ('CANCELLED', 'CHECKED_OUT')
    and check_in < p_check_out
    and check_out > p_check_in;

  -- price each night, applying peak overrides from room_pricing
  d := p_check_in;
  while d < p_check_out loop
    v_total := v_total + coalesce((
      select rp.price_override from room_pricing rp
      where rp.tenant_id = v_tenant_id
        and (rp.room_id = p_room_id or rp.room_id is null)
        and rp.rule_type = 'peak'
        and d between coalesce(rp.start_date, d) and coalesce(rp.end_date, d)
      order by rp.room_id nulls last
      limit 1
    ), v_base);
    d := d + 1;
  end loop;

  return query select (v_overlap = 0), v_total;
end;
$$;

-- ============================================================
-- apply_coupon -> table(is_valid, amount, message)
-- ============================================================
create or replace function apply_coupon(
  p_subdomain text,
  p_code text,
  p_room_id bigint,
  p_nights int
) returns table(is_valid boolean, amount numeric, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_base numeric;
  v_subtotal numeric;
  c coupons;
begin
  select id into v_tenant_id from tenants where subdomain = lower(p_subdomain) and is_active = true limit 1;
  if v_tenant_id is null then
    return query select false, 0::numeric, 'Invalid property'; return;
  end if;

  select price_per_night into v_base from rooms where id = p_room_id and tenant_id = v_tenant_id limit 1;
  if v_base is null then
    return query select false, 0::numeric, 'Room not found'; return;
  end if;

  select * into c from coupons
  where tenant_id = v_tenant_id and upper(code) = upper(p_code) limit 1;

  if c.id is null then
    return query select false, 0::numeric, 'Coupon not found'; return;
  end if;
  if not c.is_active then
    return query select false, 0::numeric, 'Coupon is inactive'; return;
  end if;
  if c.valid_from is not null and current_date < c.valid_from then
    return query select false, 0::numeric, 'Coupon not yet valid'; return;
  end if;
  if c.valid_until is not null and current_date > c.valid_until then
    return query select false, 0::numeric, 'Coupon has expired'; return;
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    return query select false, 0::numeric, 'Coupon usage limit reached'; return;
  end if;
  if c.min_nights is not null and p_nights < c.min_nights then
    return query select false, 0::numeric,
      format('Requires a minimum of %s nights', c.min_nights); return;
  end if;

  v_subtotal := v_base * greatest(p_nights, 1);
  if c.discount_type = 'percent' then
    return query select true, round(v_subtotal * c.discount_value / 100.0, 2),
      format('%s%% discount applied', c.discount_value);
  else
    return query select true, least(c.discount_value, v_subtotal),
      format('Flat discount applied');
  end if;
end;
$$;

-- ============================================================
-- create_public_booking -> jsonb { booking_id, room, nights, amount } | { error }
-- ============================================================
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
  insert into guest_tokens (reservation_id) values (v_id);

  return jsonb_build_object(
    'booking_id', v_id,
    'room', v_room.name,
    'nights', v_nights,
    'amount', v_amount
  );
end;
$$;

-- ============================================================
-- create_table_reservation -> jsonb { reservation_date, reservation_time } | { error }
-- ============================================================
create or replace function create_table_reservation(
  p_subdomain text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_count int,
  p_reservation_date date,
  p_reservation_time text,
  p_special_request text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants where subdomain = lower(p_subdomain) and is_active = true limit 1;
  if v_tenant_id is null then return jsonb_build_object('error', 'Property not found'); end if;

  insert into table_reservations (
    tenant_id, guest_name, guest_phone, guest_count,
    reservation_date, reservation_time, special_request, status
  ) values (
    v_tenant_id, p_guest_name, p_guest_phone, coalesce(p_guest_count, 2),
    p_reservation_date, p_reservation_time, p_special_request, 'pending'
  );

  return jsonb_build_object(
    'reservation_date', p_reservation_date,
    'reservation_time', p_reservation_time
  );
end;
$$;

-- ============================================================
-- get_guest_session(p_token) -> table(...) one row
-- ============================================================
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
  is_expired boolean
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
    (now() > (r.check_out + interval '2 days')) as is_expired
  from guest_tokens gt
  join reservations r on r.id = gt.reservation_id
  join tenants t on t.id = r.tenant_id
  left join rooms rm on rm.id = r.room_id
  where gt.token = p_token;
end;
$$;

-- Allow anon + authenticated to execute the public-facing RPCs
grant execute on function get_tenant_site(text) to anon, authenticated;
grant execute on function get_room_detail(text, bigint) to anon, authenticated;
grant execute on function check_room_availability(text, bigint, date, date) to anon, authenticated;
grant execute on function apply_coupon(text, text, bigint, int) to anon, authenticated;
grant execute on function create_public_booking(text, text, text, text, bigint, date, date, numeric, numeric) to anon, authenticated;
grant execute on function create_table_reservation(text, text, text, int, date, text, text) to anon, authenticated;
grant execute on function get_guest_session(text) to anon, authenticated;
grant execute on function create_tenant(text, text, text, text) to anon, authenticated;
grant execute on function create_staff_user(text, text, text, text, text, uuid) to authenticated;
