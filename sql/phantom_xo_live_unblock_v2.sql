-- Phantom-XO - Live Unblock v2 (schema-corrected)
-- Apply:
--   psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/phantom_xo_live_unblock_v2.sql

BEGIN;

CREATE TEMP TABLE _seed_config AS
SELECT id AS lane_id
FROM data_lanes
WHERE code = 'LIVE'
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _seed_config) THEN
    RAISE EXCEPTION 'No LIVE lane found in data_lanes. Check data_lanes.code.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS crossing_points (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL,
  corridor_id TEXT,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  alt_m DOUBLE PRECISION DEFAULT 0,
  country_code TEXT NOT NULL,
  crossing_type TEXT NOT NULL CHECK (crossing_type IN ('formal','informal','phantom','seasonal')),
  monitored BOOLEAN NOT NULL DEFAULT false,
  iom_fmp BOOLEAN NOT NULL DEFAULT false,
  flow_count INTEGER,
  last_verified TIMESTAMPTZ,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crossing_lane ON crossing_points(lane_id);
CREATE INDEX IF NOT EXISTS idx_crossing_corridor ON crossing_points(corridor_id);
CREATE INDEX IF NOT EXISTS idx_crossing_country ON crossing_points(country_code);
CREATE INDEX IF NOT EXISTS idx_crossing_type ON crossing_points(crossing_type);

CREATE TABLE IF NOT EXISTS temporal_flows (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL,
  corridor_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  flow_count INTEGER NOT NULL,
  origin_name TEXT NOT NULL,
  origin_cc TEXT NOT NULL,
  destination_name TEXT,
  destination_cc TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('forward','reverse','bidirectional')) DEFAULT 'forward',
  mode TEXT,
  source TEXT NOT NULL,
  source_id TEXT,
  notes TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tf_lane ON temporal_flows(lane_id);
CREATE INDEX IF NOT EXISTS idx_tf_corridor ON temporal_flows(corridor_id);
CREATE INDEX IF NOT EXISTS idx_tf_timestamp ON temporal_flows(timestamp DESC);

CREATE TABLE IF NOT EXISTS temporal_events (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL,
  corridor_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  event_subtype TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('LOW','MODERATE','HIGH','CRITICAL')),
  casualties INTEGER,
  affected INTEGER,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  confidence DOUBLE PRECISION CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  notes TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_te_lane ON temporal_events(lane_id);
CREATE INDEX IF NOT EXISTS idx_te_corridor ON temporal_events(corridor_id);
CREATE INDEX IF NOT EXISTS idx_te_timestamp ON temporal_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_te_type ON temporal_events(event_type);
CREATE INDEX IF NOT EXISTS idx_te_severity ON temporal_events(severity) WHERE severity IS NOT NULL;

INSERT INTO crossing_points (id, lane_id, corridor_id, name, latitude, longitude, alt_m, country_code, crossing_type, monitored, iom_fmp, last_verified, source, notes)
VALUES
  ('CP-CD-UG-ITU-MAHAGI', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Mahagi', 2.3000, 30.9800, 740, 'CD', 'formal', true, true, '2026-05-10T00:00:00Z', 'DGM-DRC', 'Formal DRC border post on the Mahagi-Goli crossing'),
  ('CP-CD-UG-ITU-GOLI', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Goli', 2.3400, 31.0050, 720, 'UG', 'formal', true, false, '2026-05-10T00:00:00Z', 'UG-IMM', 'Ugandan border post, Zombo District'),
  ('CP-CD-UG-ITU-VURRA', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Vurra', 2.9500, 30.9500, 1180, 'UG', 'formal', true, false, '2026-04-15T00:00:00Z', 'UG-IMM', 'Secondary Ugandan crossing point on the road to Arua'),
  ('CP-CD-UG-ITU-BUNIA-FLOW', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Bunia transit waypoint', 1.5667, 30.2500, 1280, 'CD', 'phantom', false, false, '2026-05-15T00:00:00Z', 'AFRO-SENTINEL', 'High-traffic transit choke point')
ON CONFLICT (id) DO NOTHING;

INSERT INTO temporal_flows (id, lane_id, corridor_id, timestamp, flow_count, origin_name, origin_cc, destination_name, destination_cc, direction, mode, source, source_id, notes)
VALUES
  ('TF-ITU-DIS-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-08T00:00:00Z', 68000, 'Mambasa', 'CD', 'Tshopo', 'CD', 'forward', 'MIXED', 'IOM-DTM', 'DTM-DRC-ITU-MAR2026', '68,000+ displaced within Mambasa and into Tshopo since mid-March.'),
  ('TF-ITU-DIS-002', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-08T00:00:00Z', 310000, 'Beni-Lubero', 'CD', NULL, NULL, 'forward', 'MIXED', 'IOM-DTM', 'DTM-DRC-NK-MAR2026', '310,000+ displaced across Beni and Lubero territories; secondary flow into Ituri.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO temporal_events (id, lane_id, corridor_id, timestamp, event_type, event_subtype, latitude, longitude, location_name, country_code, severity, casualties, affected, source, source_id, source_url, confidence, notes)
VALUES
  ('TE-ITU-EBO-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-15T11:30:00Z', 'HEALTH_CRISIS', 'EBOLA_OUTBREAK', 1.9667, 30.0500, 'Mongwalu', 'CD', 'CRITICAL', 40, 146, 'AFRICA-CDC', 'ACDC-PR-20260515-EBOLA-DRC', 'https://africacdc.org/news-item/ebola-outbreak-drc-ituri-2026/', 0.97, 'Mongwalu and Rwampara health zones; preliminary genetic testing suggests non-Zaire strain.'),
  ('TE-ITU-EBO-002', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-15T11:30:00Z', 'HEALTH_CRISIS', 'EBOLA_OUTBREAK', 1.5800, 30.2200, 'Rwampara', 'CD', 'CRITICAL', 25, 100, 'AFRICA-CDC', 'ACDC-PR-20260515-EBOLA-DRC', NULL, 0.95, NULL),
  ('TE-ITU-EBO-003', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-15T18:00:00Z', 'HEALTH_CRISIS', 'EBOLA_TRANSIT_RISK', 1.5667, 30.2500, 'Bunia', 'CD', 'HIGH', NULL, NULL, 'WHO-DON', 'WHO-DON-2026-ITURI-001', NULL, 0.78, 'Bunia is the Ituri capital and a high-traffic transit hub.'),
  ('TE-ITU-EBO-004', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-15T14:00:00Z', 'HEALTH_CRISIS', 'EBOLA_IMPORTED_CASE', 2.3400, 31.0050, 'Goli', 'UG', 'HIGH', 1, 1, 'AFRICA-CDC', 'ACDC-PR-20260515-EBOLA-UGA', NULL, 0.92, 'Imported-case signal at Mahagi-Goli crossing axis.'),
  ('TE-ITU-ADF-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-11T00:00:00Z', 'MASSACRE', 'ADF_ATTACK', 1.3700, 29.0500, 'Mambasa', 'CD', 'CRITICAL', 50, 0, 'UN-OCHA', 'OCHA-DRC-20260511', 'https://english.news.cn/20260512/fca253cf1eb04d679404beef30d14541/c.html', 0.99, 'ADF attacks on Makumo and Mabuo villages.'),
  ('TE-ITU-ADF-002', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-03-15T00:00:00Z', 'MASSACRE', 'ADF_SUSTAINED', 1.3700, 29.0500, 'Mambasa', 'CD', 'CRITICAL', 130, 500, 'AMNESTY', 'AI-DRC-20260505', 'https://www.amnesty.org/en/latest/news/2026/05/drc-rampant-adf-abuses-against-civilians-war-crimes-which-the-world-must-not-continue-to-ignore-new-report/', 0.98, 'Sustained ADF campaign pressure feeding displacement.'),
  ('TE-ITU-ADF-003', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', '2026-05-06T00:00:00Z', 'CONFLICT', 'ADF_ATTACK', 0.6900, 29.5100, 'Oicha', 'CD', 'HIGH', 19, 0, 'UN-OCHA', 'OCHA-DRC-20260508', NULL, 0.94, 'North Kivu/Ituri border attack pressure.')
ON CONFLICT (id) DO NOTHING;

COMMIT;

