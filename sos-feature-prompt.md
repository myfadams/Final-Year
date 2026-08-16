# SOS Emergency Alert Feature — Implementation Prompt

## Context

the sos button on the Home screen, pressed and
held for 2 seconds, which opens a red full-screen confirmation modal stating
the user's location will be broadcast. **Don't rebuild that entry point** —
wire the feature below into it, so confirming on that modal is what actually
creates the `sos_alerts` row and kicks off everything downstream (realtime
matching, the nearby-responder overlay, live location, response tracking,
and biometric-gated cancellation).

## Hard constraints — read before writing any code

- **This is a managed Expo app running in Expo Go — no custom dev build / EAS
  dev client.** Do not install or suggest any package that requires native
  config / a config plugin needing a custom dev client (e.g. native
  full-screen intents, PushKit, `react-native-background-geolocation`,
  custom background-task native modules).
- **Push notifications are out of scope for this pass.** Do not implement
  `expo-notifications` background push, FCM, or APNs. That will be added
  separately later — build this feature assuming the app must be
  open/foregrounded to receive alerts.
- **Background location tracking is out of scope.** `expo-location`'s
  background task API needs a custom dev client and won't run in Expo Go.
  Location tracking only works while the app is foregrounded/active. Handle
  this explicitly: pause the location watcher on `AppState` → background,
  resume on → active, and surface that gap in the UI rather than pretending
  it works continuously.
- **The "full-screen SOS alert" is a JS-level in-app overlay only** — a
  React component rendered above the navigation stack via Context, not a
  native full-screen intent or lock-screen takeover. It's only visible while
  the app is open and foregrounded.
- Proximity matching happens **server-side via PostgreSQL/PostGIS**, called
  through Supabase RPC. Never trust raw coordinates delivered via a Realtime
  payload as the thing to display/filter on — always re-derive the eligible
  set through the RPC, so a client never receives coordinates it isn't
  authorized to see.

## Stack

- React Native + Expo (managed workflow, Expo Go)
- `expo-location` (foreground only)
- `expo-local-authentication` (Face ID / Touch ID / device passcode fallback
  — this works fine in Expo Go, no native config needed)
- Supabase: Postgres + PostGIS + Realtime + Row Level Security
- React Context for global overlay state (no navigation-library-specific
  portal needed)

## Where the SQL goes

Save every SQL block below as migration files in `supabase/migrations/`
(standard Supabase CLI layout — timestamp-prefixed, one concern per file),
not inline in app code or only pasted into the dashboard:

- `supabase/migrations/<timestamp>_sos_alerts.sql` — the three `create
table` statements + indexes
- `supabase/migrations/<timestamp>_sos_rls_policies.sql` — the RLS policies
- `supabase/migrations/<timestamp>_get_nearby_active_sos.sql` — the RPC
  function

If this project isn't using the Supabase CLI locally (no `supabase/` folder
with a `config.toml` yet), run `supabase init` first so migrations are
tracked, or at minimum create `supabase/sql/schema.sql` with all of it in
one file — but CLI migrations are strongly preferred so schema changes are
versioned alongside the app code.

## Database schema

```sql
-- extension needed for geography type / distance functions
create extension if not exists postgis;

create table sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'active'
    check (status in ('active','cancelled','resolved','expired')),
  location geography(Point,4326) not null,
  radius_meters integer not null default 1000,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancellation_reason text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index sos_alerts_location_idx on sos_alerts using gist (location);
create index sos_alerts_status_idx on sos_alerts (status);

-- movement trail while an SOS is active (foreground-only updates, see constraints)
create table sos_location_updates (
  id uuid primary key default gen_random_uuid(),
  sos_id uuid not null references sos_alerts(id) on delete cascade,
  location geography(Point,4326) not null,
  recorded_at timestamptz not null default now()
);
create index sos_location_updates_sos_idx on sos_location_updates (sos_id, recorded_at desc);

-- separate from normal emergency response history on purpose
create table sos_response_history (
  id uuid primary key default gen_random_uuid(),
  sos_id uuid not null references sos_alerts(id) on delete cascade,
  responder_id uuid not null references auth.users(id),
  status text not null default 'committed'
    check (status in ('committed','withdrawn','arrived')),
  -- lets the sender's UI show "2 trusted contacts, 1 nearby responder"
  -- rather than one undifferentiated list
  responder_source text not null default 'proximity'
    check (responder_source in ('proximity','trusted_contact')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sos_id, responder_id)
);
```

### Server-side proximity RPC (security definer — this is what enforces that

coordinates are never over-shared)

```sql
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
    )
$$;
```

### Server-side trusted-network RPC

This app already has a `friends` table with an `is_in_trusted_network`
boolean. **Inspect its actual columns before writing this** — the query
below assumes a row per direction (`user_id` = the person who owns the
friendship entry, `friend_id` = the other person, and `is_in_trusted_network`
meaning "friend_id is trusted to receive user_id's SOS alerts"). Adjust
names/direction to match what's really there.

Unlike proximity, trusted-network delivery is **identity-based, not
distance-based** — a trusted contact should be alerted no matter how far
away they are:

```sql
create or replace function get_trusted_network_sos_for_me()
returns setof sos_alerts
language sql
security definer
set search_path = public
as $$
  select sa.*
  from sos_alerts sa
  join friends f
    on f.user_id = sa.user_id
   and f.friend_id = auth.uid()
   and f.is_in_trusted_network = true
  where sa.status = 'active'
    and sa.expires_at > now()
$$;
```

Note the deliberate asymmetry between the two RPCs: `get_nearby_active_sos`
should stay identity-light for public/proximity responders — don't join in
the sender's name/profile there, since a stranger being asked to help
doesn't need to know who they're helping until they choose to. This
function, by contrast, is for people who already have a relationship with
the sender, so it's fine (and expected) for the app to also fetch the
sender's name/profile for display once this returns a match.

### RLS notes

- `sos_alerts`: no broad `select` policy for other users' rows. A user can
  `select` their own alerts, plus alerts they have an entry for in
  `sos_response_history`. Everyone else reaches nearby alerts **only**
  through `get_nearby_active_sos`, which runs as `security definer` and
  returns just the filtered set.
- `sos_location_updates`: readable by the SOS owner and anyone with a
  `committed`/`arrived` row in `sos_response_history` for that `sos_id`.
- `sos_response_history`: readable by the responder and the SOS owner.

## Feature flow to implement

### 1. Realtime as a "check again" trigger, not a data source

Subscribe to `postgres_changes` on `sos_alerts` (`INSERT`, `UPDATE`). On any
event, **don't read coordinates off the payload** — instead call both
`get_nearby_active_sos(lastKnownLat, lastKnownLng)` and
`get_trusted_network_sos_for_me()` via `supabase.rpc(...)`, tag each
returned alert with its source (`'proximity'` or `'trusted_contact'` — an
alert can be both, if a trusted friend also happens to be nearby; prefer
the trusted framing in that case), and merge into one "eligible alerts"
state.

### 2. Proximity re-check on the user's own movement

While `expo-location`'s foreground watcher (`watchPositionAsync`) reports a
meaningful position change, call `get_nearby_active_sos` again. This is how
someone who walks into an SOS's radius becomes eligible, per the original
spec.

### 3. Global full-screen overlay

Build an `SosAlertProvider` (Context) mounted at the root of the app, above
the navigation container. It holds the current "nearby active alert(s)"
state (from steps 1–2) and renders an absolutely-positioned full-screen view
on top of everything when a qualifying, not-yet-dismissed alert exists:

```
🚨 SOS — SOMEONE NEARBY NEEDS HELP
Someone near you has activated an emergency.
Can you get to them quickly?
[ I CAN HELP ]   [ Dismiss ]
```

Dismiss should be per-alert-id (don't resurface an alert the user already
dismissed this session, but do resurface a genuinely new one).

Trusted Network

A user's trusted network consists of people in the friends table where:

is_in_trusted_network = true

Only friends who have this flag enabled should receive the trusted-network SOS alert.

For example:

## friends

user_id friend_id is_in_trusted_network
User A User B true
User A User C false
User A User D true

If User A activates an SOS:

User B receives the trusted-network SOS alert.
User C does not receive the trusted-network SOS alert through the trusted-network mechanism.
User D receives the trusted-network SOS alert.

The trusted-network relationship should be resolved when the SOS is activated so the system knows exactly who should be notified.

3. Nearby Users

The system should also identify ResQ users who are physically near the SOS sender.

The app can use the sender's SOS coordinates and the recipient's current location to determine whether the recipient is within the configured SOS response radius.

### 4. Respond flow

"I CAN HELP" → insert into `sos_response_history` with `status: 'committed'`.
Show the SOS owner a live responder count/list via a Realtime subscription
on `sos_response_history` filtered by `sos_id`. Give responders a way to
set `status: 'withdrawn'` if they can no longer help.

### 5. Live location while an SOS is active

- Add Background location tracking
  Only while (a) the sender has an active SOS **and** (b) the app is
  foregrounded: run `watchPositionAsync` and insert rows into
  `sos_location_updates` on a distance/time interval (e.g. every 15–20m or
  30s, whichever first). On `AppState` → `background`, stop the watcher; on →
  `active`, resume it. Show a small "live location paused — reopen the app to
  keep sharing your location" indicator when paused, so this limitation is
  visible rather than silent.

### 6. Activation / cancellation

- **Activate:** already implemented — 2s press-and-hold on the Home screen
  button opens the red confirmation modal. Add the actual submission logic
  to that modal's confirm action: insert the `sos_alerts` row (status
  `'active'`, current location, default radius/expiry), then close the
  modal into whatever "SOS is live" state/screen makes sense (e.g. showing
  responder count, a cancel button, live location toggle). Don't add a
  second hold-to-confirm step — the existing hold + modal is the
  confirmation step.
- **Cancel:** gated by `expo-local-authentication`
  (`LocalAuthentication.authenticateAsync`), which handles Face ID/Touch ID
  and automatically falls back to device passcode — no extra native config
  needed in Expo Go. If you also want an app-level PIN independent of the
  device passcode, build that as its own screen/state (not covered by
  `expo-local-authentication`).

## Explicitly out of scope for this pass

- Push notifications (FCM/APNs/`expo-notifications` background delivery)

- Any native full-screen-intent / lock-screen takeover UI
- Any package requiring a custom dev client / native config plugin

## Definition of done (foreground demo scope)

- [ ] SOS can be activated via press-and-hold with an abort-able arming delay
- [ ] Nearby users (app open) see the full-screen overlay within a few
      seconds of activation, without refreshing
- [ ] A user who walks into the radius after the SOS was created becomes
      eligible and sees the overlay
- [ ] "I CAN HELP" is recorded in `sos_response_history`, visible to the
      sender in near-real-time
- [ ] Sender's location updates are visible to committed responders while
      the app is foregrounded, and visibly pause when backgrounded
- [ ] Cancellation requires biometric (or passcode fallback) auth and
      records `cancelled_by`
- [ ] No client ever receives another user's raw coordinates outside of the
      `get_nearby_active_sos` RPC result set
