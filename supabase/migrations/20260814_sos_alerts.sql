-- extension needed for geography type / distance functions
create extension if not exists postgis;

create table if not exists sos_alerts (
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

create index if not exists sos_alerts_location_idx on sos_alerts using gist (location);
create index if not exists sos_alerts_status_idx on sos_alerts (status);

-- movement trail while an SOS is active (foreground-only updates)
create table if not exists sos_location_updates (
  id uuid primary key default gen_random_uuid(),
  sos_id uuid not null references sos_alerts(id) on delete cascade,
  location geography(Point,4326) not null,
  recorded_at timestamptz not null default now()
);
create index if not exists sos_location_updates_sos_idx on sos_location_updates (sos_id, recorded_at desc);

-- separate from normal emergency response history
create table if not exists sos_response_history (
  id uuid primary key default gen_random_uuid(),
  sos_id uuid not null references sos_alerts(id) on delete cascade,
  responder_id uuid not null references auth.users(id),
  status text not null default 'committed'
    check (status in ('committed','withdrawn','arrived')),
  responder_source text not null default 'proximity'
    check (responder_source in ('proximity','trusted_contact')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sos_id, responder_id)
);
