-- Hotspots aren't a single row insert — they emerge from accumulated data (3+ incidents within
-- 400m over the past week). So unlike SOS/emergency/chat above, this runs on a schedule
-- (pg_cron) rather than a trigger, and dedups who's already been told about a given cluster so
-- the same hotspot doesn't re-notify someone every 30 minutes it's still active.

create extension if not exists pg_cron;

create table if not exists hotspot_notifications_sent (
  cluster_key text not null,
  user_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (cluster_key, user_id)
);

-- Greedy clustering, mirroring the client-side detectHotspots() in backend/notificationEngine.ts:
-- any incident with >= 3 neighbors (itself included) within 400m becomes a hotspot, centered on
-- the group's average coordinate.
create or replace function public.check_and_notify_hotspots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_radius_meters integer := 400;
  v_min_points integer := 3;
  v_lookback interval := interval '7 days';
  v_notify_radius integer := 5000;
  rec record;
  v_assigned uuid[] := '{}';
  v_cluster_ids uuid[];
  v_cluster_key text;
  v_centroid_lat double precision;
  v_centroid_lng double precision;
  v_count integer;
  v_recipients uuid[];
begin
  for rec in
    select id, latitude, longitude
    from emergencies
    where created_at > now() - v_lookback
      and latitude is not null
      and longitude is not null
    order by created_at
  loop
    if rec.id = any(v_assigned) then
      continue;
    end if;

    select array_agg(e.id), avg(e.latitude), avg(e.longitude), count(*)
    into v_cluster_ids, v_centroid_lat, v_centroid_lng, v_count
    from emergencies e
    where e.created_at > now() - v_lookback
      and e.latitude is not null
      and e.longitude is not null
      and not (e.id = any(v_assigned))
      and ST_DWithin(
        ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(rec.longitude, rec.latitude), 4326)::geography,
        v_radius_meters
      );

    if v_count < v_min_points then
      continue;
    end if;

    v_assigned := v_assigned || v_cluster_ids;
    v_cluster_key := array_to_string(array(select unnest(v_cluster_ids)::text order by 1), ',');

    select coalesce(array_agg(distinct n.user_id), '{}') into v_recipients
    from public.get_user_ids_near_point(v_centroid_lat, v_centroid_lng, v_notify_radius) n
    where not exists (
      select 1 from hotspot_notifications_sent h
      where h.cluster_key = v_cluster_key and h.user_id = n.user_id
    );

    if array_length(v_recipients, 1) is not null then
      perform public.dispatch_push(
        v_recipients,
        v_count || ' incidents clustered nearby',
        'Multiple incidents reported in one area over the past week.',
        jsonb_build_object('type', 'hotspot', 'lat', v_centroid_lat, 'lng', v_centroid_lng)
      );

      insert into hotspot_notifications_sent (cluster_key, user_id)
      select v_cluster_key, u from unnest(v_recipients) as u
      on conflict (cluster_key, user_id) do nothing;
    end if;
  end loop;
end;
$$;

-- Idempotent schedule registration — safe to re-run this migration.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'check-hotspots-every-30-min') then
    perform cron.schedule(
      'check-hotspots-every-30-min',
      '*/30 * * * *',
      $cron$select public.check_and_notify_hotspots();$cron$
    );
  end if;
end;
$$;
