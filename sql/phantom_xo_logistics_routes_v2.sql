-- Phantom-XO - Logistics Routes v2 (schema-corrected)
-- Apply after sql/phantom_xo_live_unblock_v2.sql.
--   psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/phantom_xo_logistics_routes_v2.sql

BEGIN;

CREATE TEMP TABLE _seed_config AS
SELECT id AS lane_id
FROM data_lanes
WHERE code = 'LIVE'
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _seed_config) THEN
    RAISE EXCEPTION 'No LIVE lane found in data_lanes.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS logistics_routes (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL,
  corridor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('PRIMARY','ALTERNATE','BLOCKED','CONTINGENCY')),
  purpose TEXT NOT NULL,
  supply_classes TEXT[],
  origin_name TEXT NOT NULL,
  origin_cc TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  destination_cc TEXT NOT NULL,
  total_km DOUBLE PRECISION NOT NULL,
  estimated_hours DOUBLE PRECISION NOT NULL,
  modes TEXT[] NOT NULL,
  risk_class TEXT NOT NULL CHECK (risk_class IN ('LOW','MODERATE','HIGH','CRITICAL','BLOCKED')),
  risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  cold_chain_capable BOOLEAN NOT NULL DEFAULT false,
  cost_class TEXT NOT NULL CHECK (cost_class IN ('LOW','MODERATE','HIGH','VERY_HIGH')),
  formal_crossings_used TEXT[],
  blocked_reason TEXT,
  derived_from_evidence TEXT[] NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  style_color TEXT,
  style_dash_pattern INTEGER[],
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lr_lane ON logistics_routes(lane_id);
CREATE INDEX IF NOT EXISTS idx_lr_corridor ON logistics_routes(corridor_id);
CREATE INDEX IF NOT EXISTS idx_lr_classification ON logistics_routes(classification);
CREATE INDEX IF NOT EXISTS idx_lr_valid ON logistics_routes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_lr_lane_corridor ON logistics_routes(lane_id, corridor_id);

CREATE TABLE IF NOT EXISTS logistics_waypoints (
  id TEXT PRIMARY KEY,
  lane_id TEXT NOT NULL,
  route_id TEXT NOT NULL REFERENCES logistics_routes(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  alt_m DOUBLE PRECISION DEFAULT 0,
  country_code TEXT NOT NULL,
  waypoint_type TEXT NOT NULL CHECK (waypoint_type IN ('origin','airport','border_formal','border_informal','staging_hub','transit','final_delivery')),
  leg_mode TEXT,
  leg_km DOUBLE PRECISION,
  leg_hours DOUBLE PRECISION,
  leg_risk_score DOUBLE PRECISION CHECK (leg_risk_score IS NULL OR (leg_risk_score >= 0 AND leg_risk_score <= 1)),
  operator TEXT,
  notes TEXT,
  UNIQUE (route_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_lw_lane ON logistics_waypoints(lane_id);
CREATE INDEX IF NOT EXISTS idx_lw_route_seq ON logistics_waypoints(route_id, seq);

INSERT INTO logistics_routes (
  id, lane_id, corridor_id, name, classification, purpose, supply_classes,
  origin_name, origin_cc, destination_name, destination_cc,
  total_km, estimated_hours, modes, risk_class, risk_score, cold_chain_capable, cost_class,
  formal_crossings_used, blocked_reason, derived_from_evidence, style_color, style_dash_pattern, notes
) VALUES
  (
    'LR-CD-UG-ITU-PRIMARY-AIR-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001',
    'Entebbe -> Bunia -> Mongwalu (Air Bridge)', 'PRIMARY', 'EBOLA RESPONSE SUPPLY',
    ARRAY['VACCINE','PPE','LAB-SAMPLES','MEDICAL-EQUIPMENT'],
    'Entebbe International Airport', 'UG', 'Mongwalu (Djugu Health Zone)', 'CD',
    580.0, 5.0, ARRAY['AIR','TRUCK'], 'LOW', 0.18, true, 'HIGH',
    ARRAY['Bunia Airport Customs'], NULL,
    ARRAY['TE-ITU-EBO-001','TE-ITU-EBO-002','TE-ITU-ADF-001','TE-ITU-ADF-002','TF-ITU-DIS-001'],
    '#22c55e', ARRAY[6,3],
    'Bypasses land conflict buffers. Cold-chain maintained. Recommended for outbreak response payload.'
  ),
  (
    'LR-CD-UG-ITU-ALTERNATE-GROUND-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001',
    'Kampala -> Arua -> Mahagi -> Bunia -> Mongwalu (Ground)', 'ALTERNATE', 'EBOLA RESPONSE SUPPLY',
    ARRAY['FOOD','WATER','SHELTER','BULK-PPE','NON-COLD-CHAIN-MEDICAL'],
    'Kampala (WFP Logistics Hub)', 'UG', 'Mongwalu (Djugu Health Zone)', 'CD',
    690.0, 30.0, ARRAY['TRUCK'], 'MODERATE', 0.52, false, 'LOW',
    ARRAY['Goli','Mahagi'], NULL,
    ARRAY['TE-ITU-EBO-001','TE-ITU-ADF-002','TF-ITU-DIS-001'],
    '#f59e0b', ARRAY[4,4],
    'Formal monitored crossing via Goli-Mahagi. Slower but high-volume capacity for bulk supplies.'
  ),
  (
    'LR-CD-UG-ITU-BLOCKED-SOUTH-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001',
    'Kigali -> Goma -> Beni -> Bunia -> Mongwalu (BLOCKED)', 'BLOCKED', 'EBOLA RESPONSE SUPPLY',
    ARRAY['ANY'],
    'Kigali International Airport', 'RW', 'Mongwalu (Djugu Health Zone)', 'CD',
    750.0, 36.0, ARRAY['TRUCK'], 'BLOCKED', 1.00, false, 'LOW',
    ARRAY[]::TEXT[],
    'M23/Goma and ADF pressure make this route operationally rejected.',
    ARRAY['TE-ITU-ADF-001','TE-ITU-ADF-002','TE-ITU-ADF-003'],
    '#ef4444', ARRAY[2,6],
    'Displayed for routing transparency: evidence rejects this path.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO logistics_waypoints (id, lane_id, route_id, seq, name, lat, lng, alt_m, country_code, waypoint_type, leg_mode, leg_km, leg_hours, leg_risk_score, operator, notes)
VALUES
  ('LW-PRIM-001-0', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-PRIMARY-AIR-001', 0, 'Entebbe International Airport', 0.0420, 32.4435, 1155, 'UG', 'origin', NULL, NULL, NULL, NULL, NULL, 'Regional humanitarian flight hub'),
  ('LW-PRIM-001-1', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-PRIMARY-AIR-001', 1, 'Bunia Airport (Murongo)', 1.5722, 30.2206, 1300, 'CD', 'airport', 'AIR', 520.0, 1.5, 0.05, 'UNHAS', 'Cargo offload and customs'),
  ('LW-PRIM-001-2', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-PRIMARY-AIR-001', 2, 'Bunia Staging Hub', 1.5667, 30.2500, 1280, 'CD', 'staging_hub', 'TRUCK', 3.0, 0.3, 0.20, 'MSF-Convoy', 'Cold-chain transfer'),
  ('LW-PRIM-001-3', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-PRIMARY-AIR-001', 3, 'Mongwalu Health Centre', 1.9667, 30.0500, 1180, 'CD', 'final_delivery', 'TRUCK', 60.0, 3.2, 0.35, 'MSF-Convoy', 'Final delivery to outbreak epicenter'),
  ('LW-ALT-001-0', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-ALTERNATE-GROUND-001', 0, 'Kampala (WFP Logistics Hub)', 0.3476, 32.5825, 1190, 'UG', 'origin', NULL, NULL, NULL, NULL, NULL, 'Regional bulk stockpile'),
  ('LW-ALT-001-1', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-ALTERNATE-GROUND-001', 1, 'Arua OCHA Hub', 3.0200, 30.9100, 1200, 'UG', 'staging_hub', 'TRUCK', 480.0, 8.0, 0.15, 'WFP-Logistics', 'West Nile staging'),
  ('LW-ALT-001-2', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-ALTERNATE-GROUND-001', 2, 'Goli Border Post', 2.3400, 31.0050, 720, 'UG', 'border_formal', 'TRUCK', 70.0, 2.0, 0.25, 'WFP-Logistics', 'Formal Uganda-side border post'),
  ('LW-ALT-001-3', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-ALTERNATE-GROUND-001', 3, 'Mahagi (DRC Entry)', 2.3000, 30.9800, 740, 'CD', 'border_formal', 'TRUCK', 5.0, 0.5, 0.30, 'WFP-Logistics', 'DRC-side entry'),
  ('LW-ALT-001-4', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-ALTERNATE-GROUND-001', 4, 'Bunia Staging Hub', 1.5667, 30.2500, 1280, 'CD', 'staging_hub', 'TRUCK', 130.0, 6.5, 0.55, 'MONUSCO-escort', 'Escort recommended'),
  ('LW-ALT-001-5', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-ALTERNATE-GROUND-001', 5, 'Mongwalu Health Centre', 1.9667, 30.0500, 1180, 'CD', 'final_delivery', 'TRUCK', 60.0, 3.5, 0.40, 'MSF-Convoy', 'Final delivery'),
  ('LW-BLK-001-0', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-BLOCKED-SOUTH-001', 0, 'Kigali (origin)', -1.9686, 30.1395, 1567, 'RW', 'origin', NULL, NULL, NULL, NULL, NULL, NULL),
  ('LW-BLK-001-1', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-BLOCKED-SOUTH-001', 1, 'Goma (M23-occupied)', -1.6790, 29.2206, 1493, 'CD', 'transit', 'TRUCK', 160.0, 5.0, 1.00, NULL, 'BLOCKED'),
  ('LW-BLK-001-2', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-BLOCKED-SOUTH-001', 2, 'Beni (ADF zone)', 0.5000, 29.4700, 1050, 'CD', 'transit', 'TRUCK', 350.0, 12.0, 0.98, NULL, 'BLOCKED'),
  ('LW-BLK-001-3', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-BLOCKED-SOUTH-001', 3, 'Mambasa (ADF pressure zone)', 1.3700, 29.0500, 720, 'CD', 'transit', 'TRUCK', 180.0, 9.0, 0.99, NULL, 'BLOCKED'),
  ('LW-BLK-001-4', (SELECT lane_id FROM _seed_config), 'LR-CD-UG-ITU-BLOCKED-SOUTH-001', 4, 'Mongwalu (intended destination)', 1.9667, 30.0500, 1180, 'CD', 'final_delivery', 'TRUCK', 60.0, 4.0, 0.35, NULL, 'Destination unreachable via this path')
ON CONFLICT (id) DO NOTHING;

COMMIT;

