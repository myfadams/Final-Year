-- ==========================================================
-- SOS Bug Fix Pass: RLS, Realtime Publications, and Monotonic Write Protection
-- ==========================================================

-- 1. Ensure location_updated_at column exists for monotonic timestamp tracking
alter table public.sos_alerts 
  add column if not exists location_updated_at timestamptz not null default now();

-- 2. Monotonic out-of-order write guard on update_sos_location RPC
create or replace function public.update_sos_location(
  p_sos_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_recorded_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sos_alerts
  set location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      location_updated_at = coalesce(p_recorded_at, now())
  where id = p_sos_id
    and user_id = auth.uid()
    and status = 'active'
    and coalesce(p_recorded_at, now()) >= location_updated_at;

  insert into sos_location_updates (sos_id, location, recorded_at)
  values (p_sos_id, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, coalesce(p_recorded_at, now()));
end;
$$;

grant execute on function public.update_sos_location(uuid, double precision, double precision, timestamptz) to authenticated;

-- 3. Explicit RLS policy so committed/arrived responders can SELECT and receive realtime events on sos_alerts
drop policy if exists "responders can select sos_alerts they've committed to" on public.sos_alerts;

create policy "responders can select sos_alerts they've committed to"
on public.sos_alerts for select
using (
  exists (
    select 1 from public.sos_response_history
    where sos_response_history.sos_id = sos_alerts.id
      and sos_response_history.responder_id = auth.uid()
      and sos_response_history.status in ('committed', 'arrived')
  )
);

-- 4. Ensure tables are in the realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'sos_alerts'
  ) then
    alter publication supabase_realtime add table public.sos_alerts;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'sos_location_updates'
  ) then
    alter publication supabase_realtime add table public.sos_location_updates;
  end if;
end;
$$;
