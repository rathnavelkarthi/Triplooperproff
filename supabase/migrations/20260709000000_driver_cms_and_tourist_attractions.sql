-- ============================================================
-- Driver CMS and Cottage Tourist Attractions Schema Update
-- ============================================================

-- 1. Add tourist_attractions to rooms
alter table public.rooms
  add column if not exists tourist_attractions text[] not null default '{}';

-- 2. Add CMS fields to drivers
alter table public.drivers
  add column if not exists nearby_spots text[] not null default '{}',
  add column if not exists pickup_drop_services text[] not null default '{}',
  add column if not exists travel_locations text[] not null default '{}',
  add column if not exists payment_details jsonb not null default '{}'::jsonb;

-- 3. Redefine get_room_detail function to include tourist_attractions
create or replace function public.get_room_detail(p_subdomain text, p_room_id bigint)
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
      'max_occupancy', v_room.max_occupancy, 'amenities', v_room.amenities, 'images', v_room.images,
      'tourist_attractions', v_room.tourist_attractions
    ),
    'tenant', jsonb_build_object(
      'id', v_tenant.id, 'business_name', v_tenant.business_name,
      'subdomain', v_tenant.subdomain, 'logo_url', v_tenant.logo_url
    ),
    'all_rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'type', r.type,
        'price_per_night', r.price_per_night, 'images', r.images,
        'tourist_attractions', r.tourist_attractions
      ) order by r.id)
      from rooms r
      where r.tenant_id = v_tenant.id and r.id <> p_room_id and r.show_on_website = true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- 4. Redefine get_tenant_site function to include tourist_attractions
drop function if exists public.get_tenant_site(text);
create or replace function public.get_tenant_site(p_subdomain text)
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
        'amenities', r.amenities, 'images', r.images, 'tourist_attractions', r.tourist_attractions
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
        'id', c.id, 'name', c.name, 'description', c.description,
        'price', c.price, 'image_url', c.image_url, 'is_veg', c.is_veg
      ) order by c.sort_order, c.id)
      from menu_items c where c.tenant_id = v_tenant.id and c.is_chef_special = true and c.is_available = true
    ), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'image_url', g.image_url, 'caption', g.caption
      ) order by g.sort_order, g.id)
      from gallery_images g where g.tenant_id = v_tenant.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
