-- Canonical drift outputs computed server-side from live signals.
create table if not exists public.corridor_drift (
  id text primary key,
  corridor_id text not null,
  computed_at timestamptz not null default now(),
  window_days integer not null default 30,
  signal_count integer not null default 0,
  confidence real not null default 0 check (confidence >= 0 and confidence <= 1),
  activation_likelihood real not null default 0 check (activation_likelihood >= 0 and activation_likelihood <= 1),
  avg_magnitude_km real not null default 0,
  bearing_deg real not null default 0,
  drift_field_geojson jsonb not null default '{"type":"FeatureCollection","features":[]}'::jsonb,
  future_corridor_geojson jsonb not null default '{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[]}}'::jsonb,
  drivers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists corridor_drift_corridor_idx on public.corridor_drift (corridor_id);
create index if not exists corridor_drift_computed_idx on public.corridor_drift (computed_at desc);

alter table public.corridor_drift enable row level security;

drop policy if exists "auth_read" on public.corridor_drift;
create policy "auth_read"
on public.corridor_drift
for select
to authenticated
using (true);

