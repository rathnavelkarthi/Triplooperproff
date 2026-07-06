-- ============================================================
-- Billing and Auto-Pay Setup Migration
-- ============================================================

-- 1. Tenant billing columns ---------------------------------------------
alter table if exists tenants
  add column if not exists payment_setup boolean not null default false,
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text,
  add column if not exists razorpay_mandate_id text,
  add column if not exists max_rooms integer;

-- Grandfather existing active tenants as having completed payment setup
update tenants set payment_setup = true, max_rooms = 50 
where is_active = true;

-- 2. commission_statements table ----------------------------------------
create table if not exists commission_statements (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  billing_month       date not null,
  booking_count       integer not null default 0,
  total_revenue       numeric(10,2) not null default 0,
  commission_amount   numeric(10,2) not null default 0,
  status              text not null default 'pending',
  razorpay_payment_id text,
  created_at          timestamptz not null default now()
);

-- Constrain status values
alter table if exists commission_statements
  drop constraint if exists commission_statements_status_check;
alter table if exists commission_statements
  add constraint commission_statements_status_check
  check (status in ('pending', 'paid', 'failed'));

create index if not exists commission_statements_tenant_idx
  on commission_statements(tenant_id);

alter table if exists commission_statements enable row level security;

-- Owner may read their own commission statements. Uses the qualified auth_tenant_ids() helper.
drop policy if exists "commission_statements_owner_r" on commission_statements;
create policy "commission_statements_owner_r" on commission_statements
  for select
  using (tenant_id in (select public.auth_tenant_ids()));

-- 3. Commission Calculator Function -------------------------------------
create or replace function public.calculate_monthly_commission(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  booking_count bigint,
  total_revenue numeric,
  commission_amount numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    count(*) as booking_count,
    coalesce(sum(amount), 0)::numeric as total_revenue,
    (coalesce(sum(amount), 0) * 0.12)::numeric as commission_amount
  from reservations
  where tenant_id = p_tenant_id
    and status != 'Cancelled'
    and check_in >= p_start_date
    and check_in <= p_end_date
$$;

revoke all on function public.calculate_monthly_commission(uuid, date, date) from public;
grant execute on function public.calculate_monthly_commission(uuid, date, date) to authenticated;
