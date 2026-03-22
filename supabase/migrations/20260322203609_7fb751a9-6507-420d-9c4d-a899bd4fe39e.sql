
-- temporal_flows
CREATE TABLE public.temporal_flows (
  id text PRIMARY KEY,
  corridor_id text NOT NULL,
  period_start text NOT NULL,
  period_end text NOT NULL,
  flow_count integer NOT NULL,
  flow_direction text NOT NULL,
  source_report text NOT NULL,
  source_url text,
  notes text,
  provenance text DEFAULT 'IOM-DTM-PUBLISHED'
);

ALTER TABLE public.temporal_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_insert" ON public.temporal_flows FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_update" ON public.temporal_flows FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_delete" ON public.temporal_flows FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_read" ON public.temporal_flows FOR SELECT TO authenticated USING (true);

-- real_crossing_points
CREATE TABLE public.real_crossing_points (
  id text PRIMARY KEY,
  name text NOT NULL,
  alt_names text,
  lat real NOT NULL,
  lng real NOT NULL,
  country_a text NOT NULL,
  country_b text NOT NULL,
  crossing_type text NOT NULL,
  iom_fmp_active boolean DEFAULT false,
  monthly_avg_flow integer,
  peak_daily_flow integer,
  status text DEFAULT 'active',
  closure_periods text,
  source text NOT NULL
);

ALTER TABLE public.real_crossing_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_insert" ON public.real_crossing_points FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_update" ON public.real_crossing_points FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_delete" ON public.real_crossing_points FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_read" ON public.real_crossing_points FOR SELECT TO authenticated USING (true);

-- corridor_temporal_events
CREATE TABLE public.corridor_temporal_events (
  id text PRIMARY KEY,
  corridor_id text,
  crossing_point_id text,
  event_date text NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  flow_impact text,
  source text NOT NULL
);

ALTER TABLE public.corridor_temporal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_insert" ON public.corridor_temporal_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_update" ON public.corridor_temporal_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_delete" ON public.corridor_temporal_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_read" ON public.corridor_temporal_events FOR SELECT TO authenticated USING (true);
