create table if not exists public.billing_settings (
  id boolean primary key default true check (id),
  trial_duration_minutes integer not null default 10080
    check (trial_duration_minutes between 1 and 525600),
  updated_at timestamptz not null default now()
);

insert into public.billing_settings (id, trial_duration_minutes)
values (true, 10080)
on conflict (id) do nothing;

create table if not exists public.billing_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),
  source text not null default 'stripe'
    check (source in ('stripe', 'apple', 'google')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists billing_entitlements_customer_id_idx
  on public.billing_entitlements (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  result text not null default 'processed'
);

alter table public.billing_settings enable row level security;
alter table public.billing_entitlements enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Users can read their own billing entitlement"
  on public.billing_entitlements;
create policy "Users can read their own billing entitlement"
  on public.billing_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.billing_settings from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;
revoke insert, update, delete on public.billing_entitlements from anon, authenticated;
grant select on public.billing_entitlements to authenticated;

create or replace function public.initialize_billing_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  trial_minutes integer;
begin
  select trial_duration_minutes
  into trial_minutes
  from public.billing_settings
  where id = true;

  insert into public.billing_entitlements (
    user_id,
    status,
    source,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.id,
    'trialing',
    'stripe',
    now(),
    now() + make_interval(mins => coalesce(trial_minutes, 10080))
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_initialize_billing
  on auth.users;
create trigger on_auth_user_created_initialize_billing
  after insert on auth.users
  for each row execute function public.initialize_billing_entitlement();

revoke all on function public.initialize_billing_entitlement()
  from public, anon, authenticated;

insert into public.billing_entitlements (
  user_id,
  status,
  source,
  trial_started_at,
  trial_ends_at
)
select
  users.id,
  'trialing',
  'stripe',
  now(),
  now() + make_interval(mins => settings.trial_duration_minutes)
from auth.users as users
cross join public.billing_settings as settings
where settings.id = true
on conflict (user_id) do nothing;

create or replace function public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_trial_end timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_inserted integer;
  entitlement_updated integer;
begin
  if p_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete') then
    raise exception 'Unsupported subscription status';
  end if;

  insert into public.stripe_webhook_events (event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;

  get diagnostics event_inserted = row_count;
  if event_inserted = 0 then
    return false;
  end if;

  update public.billing_entitlements
  set
    status = p_status,
    stripe_customer_id = p_customer_id,
    stripe_subscription_id = p_subscription_id,
    trial_ends_at = coalesce(p_trial_end, trial_ends_at),
    current_period_end = p_current_period_end,
    cancel_at_period_end = p_cancel_at_period_end,
    updated_at = now()
  where stripe_customer_id = p_customer_id
    and (p_user_id is null or user_id = p_user_id);

  get diagnostics entitlement_updated = row_count;
  if entitlement_updated = 0 then
    raise exception 'No billing entitlement matches this Stripe customer';
  end if;

  return true;
end;
$$;

revoke all on function public.apply_stripe_subscription_event(
  text, text, uuid, text, text, text, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription_event(
  text, text, uuid, text, text, text, timestamptz, timestamptz, boolean
) to service_role;
