-- Single roundtrip RPC for streaming SOS location updates
-- Simultaneously updates sos_alerts.location and appends a breadcrumb to sos_location_updates

create or replace function public.update_sos_location(
  p_sos_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sos_alerts
  set location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  where id = p_sos_id
    and user_id = auth.uid()
    and status = 'active';

  insert into sos_location_updates (sos_id, location)
  values (p_sos_id, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
end;
$$;

grant execute on function public.update_sos_location(uuid, double precision, double precision) to authenticated;
