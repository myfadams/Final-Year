-- Two fixes to the RLS policies added for push notifications:
--
-- 1. Admins (public.users.role = 'admin') had no access to push_tokens or user_locations at
--    all — the existing policies only let a user manage their own row. Adds read access for
--    admins (e.g. a future admin dashboard showing where active responders/incidents are, or
--    support/debugging a user's push delivery) without granting them write access to rows they
--    don't own.
--
-- 2. hotspot_notifications_sent (from 20260819_04_hotspot_push.sql) never had RLS enabled at
--    all — meaning, unlike every other table here, it was openly readable/writable by any
--    authenticated user via the API. It's only ever touched by the security-definer
--    check_and_notify_hotspots() function, so it needs no policies for the app itself to work —
--    just RLS turned on to close that gap, plus admin read access for visibility/debugging.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── push_tokens ──────────────────────────────────────────────────────────────────────────────

drop policy if exists "Admins can view all push tokens" on push_tokens;
create policy "Admins can view all push tokens"
  on push_tokens for select
  using (public.is_admin());

-- ── user_locations ───────────────────────────────────────────────────────────────────────────

drop policy if exists "Admins can view all locations" on user_locations;
create policy "Admins can view all locations"
  on user_locations for select
  using (public.is_admin());

-- ── hotspot_notifications_sent ───────────────────────────────────────────────────────────────

alter table hotspot_notifications_sent enable row level security;

drop policy if exists "Admins can view hotspot notification log" on hotspot_notifications_sent;
create policy "Admins can view hotspot notification log"
  on hotspot_notifications_sent for select
  using (public.is_admin());
