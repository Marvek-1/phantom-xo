
-- ◉⟁⬡ MoStar Industries — Phantom POE Engine — 53 Tables

-- ZONE 16: ORCHESTRATION & OPS
CREATE TABLE public.data_lanes (
  id text PRIMARY KEY,
  lane text NOT NULL CHECK (lane IN ('LIVE','SANDBOX','TEST')),
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  created_at text NOT NULL,
  badge_color text NOT NULL DEFAULT '#FF4444'
);

CREATE TABLE public.ingestion_runs (
  run_id text PRIMARY KEY,
  started_at text NOT NULL,
  completed_at text,
  status text NOT NULL CHECK(status IN ('running','completed','failed','partial')),
  dtm_fetched integer DEFAULT 0,
  acled_fetched integer DEFAULT 0,
  dhis2_fetched integer DEFAULT 0,
  signals_normalized integer DEFAULT 0,
  signals_after_truth_filter integer DEFAULT 0,
  entropy_spikes integer DEFAULT 0,
  corridors_detected integer DEFAULT 0,
  error_message text
);

CREATE TABLE public.diagnostic_results (
  id text PRIMARY KEY,
  run_id text REFERENCES public.ingestion_runs(run_id),
  service text NOT NULL,
  status text NOT NULL CHECK (status IN ('OK','ERROR')),
  message text NOT NULL,
  latency_ms integer,
  tested_at text NOT NULL
);

CREATE TABLE public.operational_border_runs (
  id text PRIMARY KEY,
  run_mode text NOT NULL,
  ok boolean NOT NULL,
  started_at text NOT NULL,
  duration_ms integer NOT NULL,
  signals_fetched integer DEFAULT 0,
  truth_passed integer DEFAULT 0,
  rejected integer DEFAULT 0,
  persisted integer DEFAULT 0,
  corridor_candidates integer DEFAULT 0,
  top_corridor_id text,
  top_corridor_score real,
  top_corridor_risk text,
  providers_healthy text,
  providers_unhealthy text,
  errors text,
  warnings text
);

-- ZONE 1: RAW INTAKE
CREATE TABLE public.raw_dtm_flows (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES public.ingestion_runs(run_id),
  origin text NOT NULL,
  destination text NOT NULL,
  date text NOT NULL,
  individuals integer NOT NULL,
  country text NOT NULL,
  admin1 text,
  lat real,
  lng real,
  fetched_at text NOT NULL,
  raw_json text
);

CREATE TABLE public.raw_acled_events (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES public.ingestion_runs(run_id),
  event_id_cnty text NOT NULL,
  event_date text NOT NULL,
  event_type text NOT NULL,
  sub_event_type text,
  admin1 text,
  admin2 text,
  location text NOT NULL,
  latitude text NOT NULL,
  longitude text NOT NULL,
  fatalities text NOT NULL DEFAULT '0',
  country text NOT NULL,
  notes text,
  source text,
  fetched_at text NOT NULL
);

CREATE TABLE public.raw_dhis2_data_values (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES public.ingestion_runs(run_id),
  data_element text NOT NULL,
  org_unit_name text NOT NULL,
  period text NOT NULL,
  value text NOT NULL,
  org_unit_latitude text,
  org_unit_longitude text,
  disease text,
  country text,
  fetched_at text NOT NULL
);

CREATE TABLE public.provider_health (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  provider_id text NOT NULL,
  provider_name text NOT NULL,
  healthy boolean NOT NULL,
  response_time_ms integer,
  signals_fetched integer DEFAULT 0,
  error_message text,
  checked_at text NOT NULL
);

-- ZONE 2: TRUTH ENGINE
CREATE TABLE public.truth_engine_runs (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  lane_id text,
  total_signals integer NOT NULL,
  truth_passed integer NOT NULL,
  rejected integer NOT NULL,
  rejection_reasons text,
  avg_truth_score real,
  mock_rejected integer DEFAULT 0,
  stale_rejected integer DEFAULT 0,
  weak_rejected integer DEFAULT 0,
  run_mode text NOT NULL,
  min_truth_score real DEFAULT 0.70,
  max_signal_age_hours integer DEFAULT 168,
  created_at text NOT NULL
);

CREATE TABLE public.truth_gate_validations (
  id text PRIMARY KEY,
  gate_type text NOT NULL,
  input_type text NOT NULL,
  is_valid boolean NOT NULL,
  confidence real,
  evidence_source text,
  evidence_description text,
  errors text,
  validated_at text NOT NULL
);

-- ZONE 3: NORMALIZED INTELLIGENCE
CREATE TABLE public.normalized_signals (
  id text PRIMARY KEY,
  run_id text REFERENCES public.ingestion_runs(run_id),
  source text NOT NULL CHECK(source IN ('IOM-DTM','ACLED','DHIS2','EWARS','MANUAL','MOCK','AFRO-SENTINEL')),
  type text NOT NULL CHECK(type IN ('displacement','conflict','disease','linguistic','terrain')),
  element text NOT NULL CHECK(element IN ('fire','water','air','earth')),
  location text NOT NULL,
  country text NOT NULL,
  admin1 text,
  admin2 text,
  latitude real,
  longitude real,
  magnitude real NOT NULL CHECK(magnitude >= 0 AND magnitude <= 1),
  truth_score real NOT NULL CHECK(truth_score >= 0 AND truth_score <= 1),
  raw_value real,
  disease text,
  timestamp text NOT NULL,
  period text,
  passed_truth_filter boolean NOT NULL DEFAULT false,
  ingested_at text NOT NULL,
  raw_source_id text,
  notes text
);

CREATE TABLE public.poe_signals (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  source text NOT NULL,
  type text NOT NULL CHECK (type IN ('displacement','conflict','disease','market','transport','linguistic','satellite','community')),
  element text CHECK (element IN ('fire','water','air','earth')),
  location text NOT NULL,
  country text NOT NULL,
  admin1 text,
  latitude real NOT NULL,
  longitude real NOT NULL,
  magnitude real NOT NULL CHECK (magnitude >= 0 AND magnitude <= 1),
  truth_score real NOT NULL CHECK (truth_score >= 0 AND truth_score <= 1),
  passed_truth_filter boolean NOT NULL,
  disease text,
  raw_source_id text,
  timestamp text NOT NULL,
  ingested_at text NOT NULL
);

-- ZONE 4: ENTROPY DETECTION
CREATE TABLE public.entropy_results (
  id text PRIMARY KEY,
  run_id text REFERENCES public.ingestion_runs(run_id),
  node_id text NOT NULL,
  h_baseline real NOT NULL,
  h_current real NOT NULL,
  delta_h real NOT NULL,
  threshold real NOT NULL DEFAULT 0.8,
  spiked boolean NOT NULL DEFAULT false,
  risk_class text NOT NULL CHECK(risk_class IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  signal_count integer NOT NULL DEFAULT 0,
  computed_at text NOT NULL
);

CREATE TABLE public.poe_entropy (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  node_id text NOT NULL,
  h_baseline real NOT NULL,
  h_current real NOT NULL,
  delta_h real NOT NULL,
  spiked boolean NOT NULL DEFAULT false,
  risk_class text NOT NULL CHECK (risk_class IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  signal_count integer NOT NULL DEFAULT 0,
  computed_at text NOT NULL
);

-- ZONE 5: CORRIDOR DETECTION & SCORING
CREATE TABLE public.corridor_candidates (
  corridor_id text PRIMARY KEY,
  run_id text REFERENCES public.ingestion_runs(run_id),
  start_node text NOT NULL,
  end_node text NOT NULL,
  start_country text NOT NULL,
  end_country text NOT NULL,
  start_lat real,
  start_lng real,
  end_lat real,
  end_lng real,
  score real NOT NULL CHECK(score >= 0 AND score <= 1),
  risk_class text NOT NULL CHECK(risk_class IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  distance_km real,
  velocity_km_day real,
  days_delta real,
  entropy_delta_h real,
  signal_count integer NOT NULL DEFAULT 0,
  activated boolean NOT NULL DEFAULT false,
  detected_at text NOT NULL
);

CREATE TABLE public.sentinel_signals (
  id text PRIMARY KEY,
  evidence_type text NOT NULL,
  description text NOT NULL,
  weight real NOT NULL,
  source text NOT NULL,
  confidence real NOT NULL,
  timestamp text NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  corridor_id text REFERENCES public.corridor_candidates(corridor_id),
  ingested_at text NOT NULL
);

CREATE TABLE public.corridor_definitions (
  id text PRIMARY KEY,
  start_node text NOT NULL,
  end_node text NOT NULL,
  start_lat real NOT NULL,
  start_lng real NOT NULL,
  end_lat real NOT NULL,
  end_lng real NOT NULL,
  region text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at text NOT NULL
);

CREATE TABLE public.corridor_scores (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES public.ingestion_runs(run_id),
  corridor_id text NOT NULL REFERENCES public.corridor_candidates(corridor_id),
  start_node text NOT NULL,
  end_node text NOT NULL,
  corridor_score real NOT NULL,
  risk_class text NOT NULL CHECK (risk_class IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  latent_state text NOT NULL CHECK (latent_state IN ('dormant','probing','active_crossing','surge','dissipating')),
  gravity_score real NOT NULL,
  diffusion_score real NOT NULL,
  centrality_score real NOT NULL,
  hmm_score real NOT NULL,
  seasonal_score real NOT NULL,
  linguistic_score real NOT NULL,
  entropy_score real NOT NULL,
  friction_score real NOT NULL,
  evidence_support_score real NOT NULL,
  path_score real NOT NULL,
  location_score real NOT NULL,
  forecast_score real NOT NULL,
  anomaly_confidence real NOT NULL,
  inferred_mode text NOT NULL CHECK (inferred_mode IN ('foot','motorcycle','vehicle','canoe','livestock','unknown')),
  inferred_velocity_kmh real NOT NULL,
  phantom_poe_activated boolean NOT NULL,
  seasonally_active boolean NOT NULL,
  requires_canoe boolean NOT NULL,
  conflict_detour boolean NOT NULL,
  inferred_path_json text,
  location_center_lat real,
  location_center_lng real,
  location_uncertainty_m real,
  location_probability_mass real,
  anomaly_entropy_shift real,
  anomaly_is_anomaly boolean,
  forecast_activation_likelihood real,
  forecast_drift_direction_deg real,
  trace_lines_json text,
  first_detected text NOT NULL,
  last_updated text NOT NULL,
  scored_at text NOT NULL
);

CREATE TABLE public.corridor_signals (
  corridor_id text NOT NULL REFERENCES public.corridor_candidates(corridor_id),
  signal_id text NOT NULL REFERENCES public.normalized_signals(id),
  sequence_order integer NOT NULL,
  PRIMARY KEY (corridor_id, signal_id)
);

CREATE TABLE public.poe_corridors (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  start_node text NOT NULL,
  end_node text NOT NULL,
  start_country text NOT NULL,
  end_country text NOT NULL,
  start_lat real NOT NULL,
  start_lng real NOT NULL,
  end_lat real NOT NULL,
  end_lng real NOT NULL,
  score real NOT NULL CHECK (score >= 0 AND score <= 1),
  risk_class text NOT NULL CHECK (risk_class IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  latent_state text CHECK (latent_state IN ('dormant','probing','active_crossing','surge','dissipating')),
  distance_km real,
  inferred_mode text,
  inferred_velocity_kmh real,
  signal_count integer NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  phantom_poe_activated boolean NOT NULL DEFAULT false,
  conflict_detour boolean NOT NULL DEFAULT false,
  requires_canoe boolean NOT NULL DEFAULT false,
  gap_km real,
  formal_poe_coverage text,
  inferred_path_json text,
  activated boolean NOT NULL DEFAULT true,
  first_detected text NOT NULL,
  last_updated text NOT NULL,
  previous_score real,
  score_delta real
);

-- ZONE 6: EVIDENCE & EXPLAINABILITY
CREATE TABLE public.evidence_atoms (
  id text PRIMARY KEY,
  corridor_score_id text NOT NULL REFERENCES public.corridor_scores(id),
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'health_signal','market_signal','transport_signal','linguistic_drift',
    'entropy_spike','centrality_score','gravity_pull','diffusion_timing',
    'hmm_inference','seasonal_weight','friction_surface','remote_sensing',
    'community_report','path_plausibility','location_sharpening','anomaly_bloom','forecast_drift'
  )),
  description text NOT NULL,
  weight real NOT NULL CHECK (weight >= 0 AND weight <= 1),
  source text NOT NULL,
  source_record_id text NOT NULL,
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  timestamp text NOT NULL,
  node_ids_json text NOT NULL,
  raw_value_json text,
  synthetic boolean NOT NULL DEFAULT false
);

CREATE TABLE public.explainability_traces (
  id text PRIMARY KEY,
  corridor_id text NOT NULL,
  run_id text,
  corridor_score real NOT NULL,
  risk_class text NOT NULL,
  gravity_score real,
  diffusion_score real,
  centrality_score real,
  hmm_score real,
  seasonal_score real,
  linguistic_score real,
  entropy_score real,
  friction_score real,
  inferred_mode text,
  inferred_velocity_kmh real,
  phantom_poe_activated boolean,
  seasonally_active boolean,
  requires_canoe boolean,
  conflict_detour boolean,
  trace_lines text,
  soul_weights text DEFAULT '{"gravity":0.10,"diffusion":0.20,"centrality":0.15,"hmm":0.20,"seasonal":0.08,"linguistic":0.10,"entropy":0.12,"friction":0.05}',
  created_at text NOT NULL
);

CREATE TABLE public.poe_evidence (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  corridor_id text NOT NULL REFERENCES public.poe_corridors(id),
  evidence_type text NOT NULL,
  description text,
  weight real NOT NULL CHECK (weight >= 0 AND weight <= 1),
  source text NOT NULL,
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  timestamp text NOT NULL,
  node_ids_json text,
  synthetic boolean NOT NULL DEFAULT false
);

-- ZONE 7: TERRAIN & FRICTION PHYSICS
CREATE TABLE public.terrain_friction_surfaces (
  id text PRIMARY KEY,
  corridor_id text NOT NULL REFERENCES public.corridor_candidates(corridor_id),
  segment_index integer NOT NULL,
  start_lat real NOT NULL,
  start_lng real NOT NULL,
  end_lat real NOT NULL,
  end_lng real NOT NULL,
  distance_km real NOT NULL,
  elevation_gain_m real NOT NULL,
  slope_deg real NOT NULL,
  land_cover text NOT NULL CHECK (land_cover IN (
    'open_ground','sparse_vegetation','dense_forest','cropland',
    'wetland','urban','water_body','bare_rock','sand_dune'
  )),
  river_width_m real,
  road_quality integer CHECK (road_quality IN (0,1,2,3)),
  rainfall_anomaly real CHECK (rainfall_anomaly >= -1 AND rainfall_anomaly <= 1),
  seasonal_phase text NOT NULL CHECK (seasonal_phase IN ('dry','wet_onset','peak_wet','recession')),
  friction_foot real NOT NULL,
  friction_motorcycle real NOT NULL,
  friction_vehicle real NOT NULL,
  friction_canoe real NOT NULL,
  friction_livestock real NOT NULL,
  best_mode text NOT NULL CHECK (best_mode IN ('foot','motorcycle','vehicle','canoe','livestock')),
  best_friction real NOT NULL,
  computed_at text NOT NULL
);

CREATE TABLE public.friction_cells (
  id text PRIMARY KEY,
  corridor_id text NOT NULL,
  cell_index integer NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  elevation_m real DEFAULT 0,
  slope_deg real DEFAULT 0,
  aspect_deg real DEFAULT 0,
  land_cover text NOT NULL,
  river_present boolean DEFAULT false,
  river_width_m real DEFAULT 0,
  bridge_present boolean DEFAULT false,
  ford_present boolean DEFAULT false,
  flood_probability real DEFAULT 0,
  flooded boolean DEFAULT false,
  rainfall_7d_mm real DEFAULT 0,
  road_present boolean DEFAULT false,
  road_quality integer DEFAULT 0,
  footpath_present boolean DEFAULT false,
  conflict_risk real DEFAULT 0,
  protected_area boolean DEFAULT false,
  friction_cost real NOT NULL,
  passable boolean DEFAULT true,
  transport_mode text DEFAULT 'foot',
  seasonal_phase text DEFAULT 'dry'
);

CREATE TABLE public.poe_terrain (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  corridor_id text NOT NULL REFERENCES public.poe_corridors(id),
  primary_land_cover text NOT NULL,
  best_mode text NOT NULL,
  best_friction real,
  avg_slope_deg real,
  has_river_crossing boolean NOT NULL DEFAULT false,
  river_width_m real,
  seasonal_phase text,
  requires_canoe boolean NOT NULL DEFAULT false,
  computed_at text NOT NULL
);

-- ZONE 8: TEMPORAL & DIVERGENCE
CREATE TABLE public.poe_temporal (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  corridor_id text NOT NULL REFERENCES public.poe_corridors(id),
  bucket_date text NOT NULL,
  signal_count integer NOT NULL DEFAULT 0,
  avg_magnitude real,
  avg_truth_score real,
  dominant_type text,
  activity_status text CHECK (activity_status IN ('dormant','emerging','active','surging','declining')),
  estimated_daily_crossings integer,
  formal_poe_crossings integer DEFAULT 0,
  informal_crossings integer DEFAULT 0,
  divergence_ratio real
);

CREATE TABLE public.poe_divergence (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  corridor_id text NOT NULL REFERENCES public.poe_corridors(id),
  formal_volume integer NOT NULL DEFAULT 0,
  informal_volume integer NOT NULL DEFAULT 0,
  divergence_ratio real NOT NULL,
  trend text CHECK (trend IN ('widening','narrowing','stable')),
  window_days integer NOT NULL DEFAULT 14,
  computed_at text NOT NULL
);

CREATE TABLE public.route_activity (
  id text PRIMARY KEY,
  corridor_id text REFERENCES public.corridor_candidates(corridor_id),
  route_name text NOT NULL,
  start_node text NOT NULL,
  end_node text NOT NULL,
  observation_date text NOT NULL,
  signal_count integer NOT NULL DEFAULT 0,
  avg_magnitude real,
  avg_truth_score real,
  dominant_signal_type text,
  activity_status text NOT NULL CHECK(activity_status IN ('active','dormant','emerging','declining','surging')),
  estimated_daily_crossings integer,
  notes text
);

-- ZONE 9: MoSCRIPT EXECUTION
CREATE TABLE public.moscript_registry (
  script_id text PRIMARY KEY,
  name text NOT NULL,
  trigger text NOT NULL,
  inputs text NOT NULL,
  cid text NOT NULL,
  grid_node text NOT NULL,
  has_voice_line boolean NOT NULL DEFAULT false,
  sass boolean NOT NULL DEFAULT false,
  registered_at text NOT NULL
);

CREATE TABLE public.moscript_runs (
  request_id text PRIMARY KEY,
  script_id text NOT NULL REFERENCES public.moscript_registry(script_id),
  run_id text REFERENCES public.ingestion_runs(run_id),
  corridor_id text REFERENCES public.corridor_candidates(corridor_id),
  status text NOT NULL CHECK (status IN ('pending','woo_gate','cleared','executing','complete','blocked','corrupted','sealed')),
  execution_ms integer,
  voice_line text,
  result_json text,
  grid_log_id text,
  submitted_at text NOT NULL,
  completed_at text,
  signal_origin text CHECK (signal_origin IN ('mo_originator','external','unknown')),
  signal_trust_level real,
  signal_memory_weight real,
  signal_external_noise real,
  signal_signature_hash text
);

CREATE TABLE public.moscript_moments (
  moment_id text PRIMARY KEY,
  script_id text NOT NULL REFERENCES public.moscript_registry(script_id),
  request_id text NOT NULL REFERENCES public.moscript_runs(request_id),
  trigger text NOT NULL,
  result_json text,
  woo_state text NOT NULL CHECK (woo_state IN ('frost','fire','sealed','reforming','aligned')),
  grid_cypher_id text,
  sealed_at text NOT NULL
);

CREATE TABLE public.conduit_cycles (
  cycle_id text PRIMARY KEY,
  run_id text REFERENCES public.ingestion_runs(run_id),
  fire_flowing boolean NOT NULL DEFAULT false,
  fire_volume integer DEFAULT 0,
  fire_avg_truth real,
  water_flowing boolean NOT NULL DEFAULT false,
  water_volume integer DEFAULT 0,
  water_avg_truth real,
  air_flowing boolean NOT NULL DEFAULT false,
  air_volume integer DEFAULT 0,
  air_avg_truth real,
  earth_flowing boolean NOT NULL DEFAULT false,
  earth_volume integer DEFAULT 0,
  earth_avg_truth real,
  elements_flowing integer NOT NULL DEFAULT 0,
  conduit_score real,
  ready_for_woo boolean NOT NULL DEFAULT false,
  cycle_complete boolean NOT NULL DEFAULT true,
  computed_at text NOT NULL
);

-- ZONE 10: WOO GATE SYSTEM
CREATE TABLE public.woo_verdicts (
  id text PRIMARY KEY,
  request_id text NOT NULL REFERENCES public.moscript_runs(request_id),
  cleared boolean NOT NULL,
  reason text NOT NULL,
  gate_1_origin_pass boolean,
  gate_1_reason text,
  gate_2_fire_pass boolean,
  gate_2_sig_freq real,
  gate_2_reason text,
  gate_3_frost_pass boolean,
  gate_3_silence_ms real,
  gate_3_purity real,
  gate_3_clarity real,
  gate_3_echo_valid boolean,
  gate_3_reason text,
  gate_4_corruption_pass boolean,
  gate_4_corruption_index real,
  gate_4_reason text,
  woo_state text NOT NULL CHECK (woo_state IN ('frost','fire','sealed','reforming','aligned')),
  anchor_index integer CHECK (anchor_index IN (0, 1)),
  frost_stillness real,
  integrity_hash text NOT NULL,
  cleared_at text,
  blocked_reason text,
  judged_at text NOT NULL
);

-- ZONE 11: TRINITY SYNTHESIS
CREATE TABLE public.trinity_syntheses (
  id text PRIMARY KEY,
  corridor_id text NOT NULL REFERENCES public.corridor_candidates(corridor_id),
  request_id text NOT NULL REFERENCES public.moscript_runs(request_id),
  run_id text REFERENCES public.ingestion_runs(run_id),
  synthesis_text text NOT NULL,
  trinity_hash text NOT NULL,
  loop_complete boolean NOT NULL DEFAULT false,
  latency_ms integer,
  evidence_count integer,
  corridor_score real,
  risk_class text,
  start_node text,
  end_node text,
  field_notes text,
  dcx0_healthy boolean DEFAULT true,
  dcx1_healthy boolean DEFAULT true,
  dcx2_healthy boolean DEFAULT true,
  synthesized_at text NOT NULL
);

CREATE TABLE public.poe_moments (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  corridor_id text REFERENCES public.poe_corridors(id),
  script_id text,
  trigger text NOT NULL,
  woo_state text NOT NULL,
  synthesis_text text,
  trinity_hash text,
  evidence_count integer DEFAULT 0,
  sealed_at text NOT NULL
);

-- ZONE 12: DETECTION EVENTS
CREATE TABLE public.poe_detection_events (
  id text PRIMARY KEY,
  lane_id text NOT NULL REFERENCES public.data_lanes(id),
  event_type text NOT NULL CHECK (event_type IN (
    'NEW_CORRIDOR_DETECTED','CORRIDOR_SCORE_INCREASED','CORRIDOR_SCORE_DECREASED',
    'ENTROPY_SPIKE','NEW_EVIDENCE_ATOM','DIVERGENCE_INCREASED',
    'TRINITY_SYNTHESIS_COMPLETED','LIVE_SOURCE_DEGRADED','PHANTOM_POE_ACTIVATED',
    'HMM_STATE_CHANGE','RUN_COMPLETED','RUN_FAILED'
  )),
  corridor_id text REFERENCES public.poe_corridors(id),
  route_name text,
  score real,
  score_delta real,
  summary text NOT NULL,
  source_count integer,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  acknowledged boolean NOT NULL DEFAULT false,
  click_action text,
  created_at text NOT NULL
);

-- ZONE 13: PHANTOM NODE REGISTRY
CREATE TABLE public.phantom_node_registry (
  id text PRIMARY KEY,
  name text NOT NULL,
  node_type text NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  country text NOT NULL,
  properties text,
  created_at text NOT NULL
);

CREATE TABLE public.phantom_corridor_registry (
  id text PRIMARY KEY,
  from_node text NOT NULL,
  to_node text NOT NULL,
  confidence real NOT NULL,
  models text NOT NULL,
  corridor_type text NOT NULL,
  risk text NOT NULL
);

-- ZONE 14: MAP & ANALYST INTERACTION
CREATE TABLE public.corridor_nodes (
  id text PRIMARY KEY,
  corridor_def_id text NOT NULL REFERENCES public.corridor_definitions(id),
  name text NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  alt_m real,
  node_type text NOT NULL CHECK (node_type IN ('start','border','phantom','end','waypoint')),
  country_code text NOT NULL,
  km_marker real NOT NULL,
  precision_level text NOT NULL CHECK (precision_level IN ('PRECISE','SETTLEMENT','INFERRED','DISTRICT')),
  node_order integer NOT NULL
);

CREATE TABLE public.corridor_evidence_chains (
  id text PRIMARY KEY,
  corridor_def_id text NOT NULL REFERENCES public.corridor_definitions(id),
  evidence_id text NOT NULL,
  day_offset integer NOT NULL,
  km_marker real NOT NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN ('DISPLACEMENT','HEALTH','CONFLICT','ENTROPY','MARKET','TRANSPORT')),
  tag text NOT NULL,
  location_name text NOT NULL,
  country_code text NOT NULL,
  score real NOT NULL CHECK (score >= 0 AND score <= 1),
  source text NOT NULL,
  precision_level text NOT NULL CHECK (precision_level IN ('PRECISE','SETTLEMENT','INFERRED','DISTRICT')),
  source_record_id text NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  alt_m real
);

CREATE TABLE public.corridor_cameras (
  id text PRIMARY KEY,
  corridor_def_id text NOT NULL REFERENCES public.corridor_definitions(id),
  lat real NOT NULL,
  lng real NOT NULL,
  alt_m real NOT NULL,
  tilt_deg real NOT NULL,
  heading_deg real NOT NULL,
  label text
);

CREATE TABLE public.corridor_gap_zones (
  id text PRIMARY KEY,
  corridor_def_id text NOT NULL REFERENCES public.corridor_definitions(id),
  coverage_description text NOT NULL,
  nearest_formal_poe text NOT NULL,
  is_gap_zone boolean NOT NULL DEFAULT true,
  inferred_mode text NOT NULL CHECK (inferred_mode IN ('FOOT','MOTORCYCLE','VEHICLE','CANOE','LIVESTOCK','UNKNOWN')),
  velocity_kmh real NOT NULL,
  total_km real NOT NULL
);

CREATE TABLE public.map_interaction_events (
  id text PRIMARY KEY,
  session_id text,
  event_type text NOT NULL CHECK (event_type IN ('hover','click','select_corridor','fly_to')),
  entity_type text CHECK (entity_type IN ('node','signal','corridor','formal_route','gap_zone')),
  entity_id text,
  corridor_id text,
  screen_x real,
  screen_y real,
  timestamp text NOT NULL
);

CREATE TABLE public.radar_scans (
  id text PRIMARY KEY,
  corridor_id text,
  start_lat real NOT NULL,
  start_lng real NOT NULL,
  end_lat real,
  end_lng real,
  mode text NOT NULL CHECK (mode IN ('corridor','place')),
  status text NOT NULL CHECK (status IN ('active','completed','expired')),
  initiated_at text NOT NULL,
  expires_at text
);

CREATE TABLE public.camera_flight_logs (
  id text PRIMARY KEY,
  session_id text,
  target_lat real NOT NULL,
  target_lng real NOT NULL,
  alt_m real NOT NULL,
  heading_deg real NOT NULL DEFAULT 0,
  pitch_deg real NOT NULL DEFAULT -50,
  trigger_source text NOT NULL CHECK (trigger_source IN ('mcp_tool','user_click','corridor_select','auto_boot','radar_pulse')),
  corridor_id text,
  timestamp text NOT NULL
);

-- ZONE 15: SESSIONS & TOOLING
CREATE TABLE public.firebase_user_sessions (
  id text PRIMARY KEY,
  uid text NOT NULL,
  display_name text,
  email text,
  photo_url text,
  role text NOT NULL DEFAULT 'client',
  login_method text NOT NULL DEFAULT 'google',
  logged_in_at text NOT NULL,
  last_active_at text NOT NULL
);

CREATE TABLE public.mcp_chat_sessions (
  id text PRIMARY KEY,
  analyst_id text NOT NULL,
  corridor_id text,
  run_id text,
  active_tab text,
  started_at text NOT NULL,
  last_message_at text NOT NULL,
  turn_count integer NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT 'gemini-2.0-flash'
);

CREATE TABLE public.mcp_chat_turns (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.mcp_chat_sessions(id),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  turn_order integer NOT NULL,
  timestamp text NOT NULL
);

CREATE TABLE public.mcp_tool_invocations (
  id text PRIMARY KEY,
  session_id text,
  tool_name text NOT NULL CHECK (tool_name IN ('view_location','fly_to_corridor','radar_scan','analyze_corridor','fetch_sentinel_signals','ingest_signals','test_connections')),
  params_json text NOT NULL,
  result_text text,
  map_action_type text CHECK (map_action_type IN ('camera','corridor','radar','signals','corridorAnalysis')),
  success boolean NOT NULL DEFAULT true,
  invoked_at text NOT NULL
);

CREATE TABLE public.gemini_chat_sessions (
  id text PRIMARY KEY,
  model text NOT NULL DEFAULT 'gemini-2.5-flash',
  thinking_enabled boolean NOT NULL DEFAULT false,
  started_at text NOT NULL,
  message_count integer NOT NULL DEFAULT 0
);

CREATE TABLE public.gemini_chat_messages (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.gemini_chat_sessions(id),
  message_type text NOT NULL CHECK (message_type IN ('user','thought','text','error')),
  content text NOT NULL,
  message_order integer NOT NULL,
  timestamp text NOT NULL
);

CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at text NOT NULL
);

-- Enable RLS on all 53 tables
ALTER TABLE public.data_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_border_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_dtm_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_acled_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_dhis2_data_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_engine_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_gate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entropy_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_entropy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_corridors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_atoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explainability_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrain_friction_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friction_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_terrain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_temporal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_divergence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moscript_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moscript_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moscript_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conduit_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woo_verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trinity_syntheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poe_detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phantom_node_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phantom_corridor_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_evidence_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_gap_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firebase_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_chat_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_tool_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Read-only policies for authenticated users (all tables)
CREATE POLICY "auth_read" ON public.data_lanes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.ingestion_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.diagnostic_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.operational_border_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.raw_dtm_flows FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.raw_acled_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.raw_dhis2_data_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.sentinel_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.provider_health FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.truth_engine_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.truth_gate_validations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.normalized_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.entropy_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_entropy FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_corridors FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.evidence_atoms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.explainability_traces FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.terrain_friction_surfaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.friction_cells FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_terrain FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_temporal FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_divergence FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.route_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.moscript_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.moscript_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.moscript_moments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.conduit_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.woo_verdicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.trinity_syntheses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_moments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.poe_detection_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.phantom_node_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.phantom_corridor_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_evidence_chains FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_cameras FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.corridor_gap_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.map_interaction_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.radar_scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.camera_flight_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.firebase_user_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.mcp_chat_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.mcp_chat_turns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.mcp_tool_invocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.gemini_chat_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.gemini_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.system_config FOR SELECT TO authenticated USING (true);

-- Seed data lanes
INSERT INTO public.data_lanes (id, lane, label, description, is_active, created_at, badge_color)
VALUES 
  ('fea02699-fc7b-43fe-ba71-add220071f57', 'LIVE', 'Live Intelligence', 'Real provider ingestion from IOM-DTM, ACLED, DHIS2, AFRO Sentinel.', true, '2026-03-21T20:56:47.723Z', '#FF4444'),
  ('0a7c5c65-4b67-435d-a58a-88097522c2e9', 'SANDBOX', 'Sandbox / Regression', 'Synthetic test data for UI testing and regression checks.', false, '2026-03-21T20:56:47.723Z', '#FFB800'),
  ('6979eaa2-5f04-40c5-bd99-641729b98647', 'TEST', 'Test Suite', 'Automated pipeline test data. 14 hidden corridors across 5 zones.', false, '2026-03-21T20:56:47.723Z', '#4488FF');
