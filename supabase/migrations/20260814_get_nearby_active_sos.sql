-- Server-side PostGIS RPC for Proximity SOS Filtering
create or replace function get_nearby_active_sos(user_lat double precision, user_lng double precision)
returns setof sos_alerts
language sql
security definer
set search_path = public
as $$
  select *
  from sos_alerts
  where status = 'active'
    and expires_at > now()
    and user_id <> auth.uid()
    and ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    );
$$;

-- Server-side RPC for Trusted Network SOS Alerts (identity-based, distance-agnostic)
create or replace function get_trusted_network_sos_for_me()
returns setof sos_alerts
language sql
security definer
set search_path = public
as $$
  select sa.*
  from sos_alerts sa
  join friends f
    on (
      (f.user_id = sa.user_id and f.friend_id = auth.uid())
      or (f.friend_id = sa.user_id and f.user_id = auth.uid())
    )
   and f.is_in_trusted_network = true
   and f.status = 'accepted'
  where sa.status = 'active'
    and sa.expires_at > now()
    and sa.user_id <> auth.uid();
$$;
