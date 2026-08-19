-- Dispatches push notifications by calling the send-push Edge Function whenever a
-- push-worthy row is inserted. Uses pg_net for a non-blocking async HTTP call so the insert
-- itself never waits on push delivery.
--
-- REQUIRES MANUAL SETUP AFTER THIS MIGRATION RUNS (cannot be done from a migration file since
-- it involves a secret that must never be committed to git):
--   alter database postgres set app.settings.push_function_url = 'https://<project-ref>.supabase.co/functions/v1';
--   alter database postgres set app.settings.service_role_key = '<your service_role key>';
-- Also requires the pg_net extension enabled (Database > Extensions in the Supabase dashboard,
-- or `create extension if not exists pg_net;` — it's preinstalled on Supabase but not always on
-- by default).

create extension if not exists pg_net;

create or replace function public.dispatch_push(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.settings.push_function_url', true);
  v_key text := current_setting('app.settings.service_role_key', true);
begin
  if v_url is null or v_key is null or array_length(p_user_ids, 1) is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'user_ids', to_jsonb(p_user_ids),
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  );
end;
$$;

-- ── SOS alerts: nearby users + trusted network ──────────────────────────────────────────────

create or replace function public.trigger_push_on_new_sos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_sender_name text;
  v_recipients uuid[];
begin
  if new.status <> 'active' then
    return new;
  end if;

  select ST_Y(new.location::geometry), ST_X(new.location::geometry) into v_lat, v_lng;
  select coalesce(name, 'Someone') into v_sender_name from public.users where id = new.user_id;

  select coalesce(array_agg(distinct uid), '{}') into v_recipients
  from (
    select user_id as uid from public.get_user_ids_near_point(v_lat, v_lng, new.radius_meters, new.user_id)
    union
    select user_id as uid from public.get_trusted_contact_ids(new.user_id)
  ) combined;

  perform public.dispatch_push(
    v_recipients,
    'SOS: ' || v_sender_name || ' needs help',
    'Tap to view their location and respond.',
    jsonb_build_object('type', 'sos', 'sosId', new.id)
  );

  return new;
end;
$$;

drop trigger if exists sos_alerts_push_trigger on sos_alerts;
create trigger sos_alerts_push_trigger
  after insert on sos_alerts
  for each row execute function public.trigger_push_on_new_sos();

-- ── New emergencies: nearby users (1.5km, matches the in-app "Nearby Emergencies" radius) ───

create or replace function public.trigger_push_on_new_emergency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipients uuid[];
begin
  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  select coalesce(array_agg(distinct user_id), '{}') into v_recipients
  from public.get_user_ids_near_point(new.latitude, new.longitude, 1500, new.creator_id);

  perform public.dispatch_push(
    v_recipients,
    coalesce(new.title, 'New emergency nearby'),
    coalesce(new.nearest_landmark, new.location_text, 'Reported near you'),
    jsonb_build_object('type', 'emergency', 'emergencyId', new.id)
  );

  return new;
end;
$$;

drop trigger if exists emergencies_push_trigger on emergencies;
create trigger emergencies_push_trigger
  after insert on emergencies
  for each row execute function public.trigger_push_on_new_emergency();

-- ── Chat messages: the other participant in the private chat ───────────────────────────────

create or replace function public.trigger_push_on_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat record;
  v_recipient uuid;
  v_preview text;
begin
  select user_id_1, user_id_2 into v_chat from public.private_chat where id = new.chat_id;
  if v_chat is null then
    return new;
  end if;

  v_recipient := case when v_chat.user_id_1 = new.sender_id then v_chat.user_id_2 else v_chat.user_id_1 end;

  v_preview := case new.type
    when 'audio' then '🎤 Voice note'
    when 'media' then '📷 Photo/video'
    when 'location_share' then '📍 Shared location'
    when 'walk_safe' then '🚶 Walk Safe session'
    when 'im_okay' then '✅ I''m Okay'
    else coalesce(new.text_content, 'New message')
  end;

  perform public.dispatch_push(
    array[v_recipient],
    coalesce(new.sender_name, 'New message'),
    v_preview,
    jsonb_build_object('type', 'chat', 'chatId', new.chat_id, 'senderId', new.sender_id)
  );

  return new;
end;
$$;

drop trigger if exists chat_messages_push_trigger on private_chat_messages;
create trigger chat_messages_push_trigger
  after insert on private_chat_messages
  for each row execute function public.trigger_push_on_new_chat_message();
