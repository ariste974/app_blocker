alter table public.billing_settings
  rename column trial_duration_minutes to trial_duration_seconds;

alter table public.billing_settings
  drop constraint if exists billing_settings_trial_duration_minutes_check;

update public.billing_settings
set trial_duration_seconds = trial_duration_seconds * 60;

alter table public.billing_settings
  alter column trial_duration_seconds set default 604800,
  add constraint billing_settings_trial_duration_seconds_check
    check (trial_duration_seconds between 1 and 31536000);

create or replace function public.initialize_billing_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  trial_seconds integer;
begin
  select trial_duration_seconds
  into trial_seconds
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
    now() + make_interval(secs => coalesce(trial_seconds, 604800))
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

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
  now() + make_interval(secs => settings.trial_duration_seconds)
from auth.users as users
cross join public.billing_settings as settings
where settings.id = true
on conflict (user_id) do nothing;
