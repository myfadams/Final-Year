-- Stores each user's current (not historical) location, upserted while the app is
-- foregrounded and the user already has location permission granted. This is what lets the
-- server resolve "who is near this new SOS/emergency" for push notifications — something it
-- otherwise has no way to know, since proximity matching elsewhere in this app is done by the
-- client passing its own current position at query time.
--
-- Privacy: single row per user (overwritten, not appended — no location history), and there is
-- deliberately NO select policy letting one user read another user's row. Only the service role
-- (used by the send-push Edge Function, which bypasses RLS) can read across users for matching.
create table if not exists user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  location geography(Point, 4326) not null,
  updated_at timestamptz not null default now()
);

create index if not exists user_locations_geo_idx on user_locations using gist (location);

alter table user_locations enable row level security;

drop policy if exists "Users manage their own location" on user_locations;
create policy "Users manage their own location"
  on user_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Resolves which users are near a given point, for the push triggers below to call. Excludes
-- stale fixes (>30 min old) so someone who left the area or closed the app a while ago doesn't
-- keep getting matched. Returned rows are just user_ids — this never exposes raw coordinates.
create or replace function public.get_user_ids_near_point(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer,
  p_exclude_user_id uuid default null
)
returns table (user_id uuid)
language sql
security definer
set search_path = public
as $$
  select ul.user_id
  from user_locations ul
  where (p_exclude_user_id is null or ul.user_id <> p_exclude_user_id)
    and ul.updated_at > now() - interval '30 minutes'
    and ST_DWithin(
      ul.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    );
$$;

-- Resolves a user's trusted-network contacts (either direction of the friendship), for the SOS
-- push trigger — mirrors get_trusted_network_sos_for_me's join, but returns "who to notify"
-- rather than "what alerts do I see."
create or replace function public.get_trusted_contact_ids(p_user_id uuid)
returns table (user_id uuid)
language sql
security definer
set search_path = public
as $$
  select case when f.user_id = p_user_id then f.friend_id else f.user_id end as user_id
  from friends f
  where (f.user_id = p_user_id or f.friend_id = p_user_id)
    and f.is_in_trusted_network = true
    and f.status = 'accepted';
$$;
