-- ==========================================================
-- RLS Policies for SOS Emergency Feature (Recursion Safe)
-- ==========================================================

-- Helper functions using SECURITY DEFINER to avoid circular RLS evaluation recursion
create or replace function public.has_responded_to_sos(p_sos_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from sos_response_history
    where sos_id = p_sos_id
      and responder_id = auth.uid()
  );
$$;

create or replace function public.is_sos_owner(p_sos_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from sos_alerts
    where id = p_sos_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_active_sos_for_response(p_sos_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from sos_alerts
    where id = p_sos_id
      and status = 'active'
      and expires_at > now()
  );
$$;


-- 1. sos_alerts
alter table sos_alerts enable row level security;

drop policy if exists "Users can view their own SOS alerts" on sos_alerts;
drop policy if exists "Responders can view responded SOS alerts" on sos_alerts;
drop policy if exists "Users can view relevant SOS alerts" on sos_alerts;
drop policy if exists "Users can insert their own SOS alerts" on sos_alerts;
drop policy if exists "Users can update their own SOS alerts" on sos_alerts;

create policy "Users can view relevant SOS alerts"
  on sos_alerts for select
  using (
    auth.uid() = user_id
    or public.has_responded_to_sos(id)
  );

create policy "Users can insert their own SOS alerts"
  on sos_alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own SOS alerts"
  on sos_alerts for update
  using (auth.uid() = user_id);


-- 2. sos_location_updates
alter table sos_location_updates enable row level security;

drop policy if exists "Owner and responders can view location updates" on sos_location_updates;
drop policy if exists "SOS owner can insert location updates" on sos_location_updates;

create policy "Owner and responders can view location updates"
  on sos_location_updates for select
  using (
    public.is_sos_owner(sos_id)
    or public.has_responded_to_sos(sos_id)
  );

create policy "SOS owner can insert location updates"
  on sos_location_updates for insert
  with check (
    public.is_sos_owner(sos_id)
  );


-- 3. sos_response_history
alter table sos_response_history enable row level security;

drop policy if exists "Responders and SOS owner can view response history" on sos_response_history;
drop policy if exists "Users can insert response to SOS" on sos_response_history;
drop policy if exists "Responders can update their response status" on sos_response_history;

create policy "Responders and SOS owner can view response history"
  on sos_response_history for select
  using (
    responder_id = auth.uid()
    or public.is_sos_owner(sos_id)
  );

create policy "Users can insert response to SOS"
  on sos_response_history for insert
  with check (
    auth.uid() = responder_id
    and public.is_active_sos_for_response(sos_id)
  );

create policy "Responders can update their response status"
  on sos_response_history for update
  using (auth.uid() = responder_id);
