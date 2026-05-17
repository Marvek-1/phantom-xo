-- ============================================================================
-- Phantom-XO - Live Unblock v2 PATCH (graph + scoring layer)
-- ============================================================================
-- Apply after:
--   1) sql/phantom_xo_live_unblock_v2.sql
--   2) sql/phantom_xo_logistics_routes_v2.sql
--
-- Adds the graph/scoring layer for CORRIDOR-CD-UG-ITU-001:
--   corridor_nodes, corridor_candidates, poe_corridors, corridor_scores,
--   poe_signals, corridor_signal_links, poe_evidence, and a friction_grid
--   coverage check.
--
-- These INSERT blocks are codemap-inferred. Verify live column names with
-- `\d <table>` before applying against production if the schema has drifted.
-- ============================================================================

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

-- ============================================================================
-- BLOCK 1: corridor_nodes
-- COLUMNS_VERIFIED: NO
-- ============================================================================
INSERT INTO corridor_nodes (
  id, lane_id, corridor_id, name, latitude, longitude, alt_m,
  country_code, node_type, seq, prec, km_from_start
) VALUES
  ('CN-ITU-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Mongwalu', 1.9667, 30.0500, 1180, 'CD', 'start',    0, 'SETTLEMENT',   0),
  ('CN-ITU-002', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Bunia',    1.5667, 30.2500, 1280, 'CD', 'phantom',  1, 'PRECISE',     55),
  ('CN-ITU-003', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Rwampara', 1.5800, 30.2200, 1290, 'CD', 'phantom',  2, 'DISTRICT',    60),
  ('CN-ITU-004', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Mahagi',   2.3000, 30.9800,  740, 'CD', 'border',   3, 'SETTLEMENT', 135),
  ('CN-ITU-005', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Goli',     2.3400, 31.0050,  720, 'UG', 'crossing', 4, 'SETTLEMENT', 140),
  ('CN-ITU-006', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'Arua',     3.0200, 30.9100, 1200, 'UG', 'end',      5, 'PRECISE',    165)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BLOCK 2: corridor_candidates
-- COLUMNS_VERIFIED: NO
-- ============================================================================
INSERT INTO corridor_candidates (
  id, lane_id, start_node_id, end_node_id,
  detection_source, first_detected, candidate_score,
  status, promoted, activated, inferred_mode, evidence_count
) VALUES (
  'CORRIDOR-CD-UG-ITU-001', (SELECT lane_id FROM _seed_config),
  'CN-ITU-001', 'CN-ITU-006',
  'AFRO-SENTINEL', '2026-05-15T12:00:00Z', 0.94,
  'PROMOTED', true, true, 'MIXED', 11
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BLOCK 3: poe_corridors
-- COLUMNS_VERIFIED: NO
-- ============================================================================
INSERT INTO poe_corridors (
  id, lane_id, start_node, end_node,
  start_lat, start_lng, end_lat, end_lng,
  start_cc, end_cc, distance_km, inferred_mode, gap_coverage,
  score, risk_class, activated, phantom_poe_activated,
  evidence_count, signal_count, first_detected, last_updated
) VALUES (
  'CORRIDOR-CD-UG-ITU-001', (SELECT lane_id FROM _seed_config),
  'Mongwalu', 'Arua',
  1.9667, 30.0500, 3.0200, 30.9100,
  'CD', 'UG', 165, 'MIXED', 'gap_zone',
  0.94, 'CRITICAL', true, true,
  11, 2, '2026-05-15T12:00:00Z', NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BLOCK 4: corridor_scores
-- COLUMNS_VERIFIED: NO
-- ============================================================================
INSERT INTO corridor_scores (
  corridor_id, lane_id,
  gravity_score, diffusion_score, centrality_score, hmm_score,
  seasonal_score, linguistic_score, entropy_score, terrain_score,
  composite_score, computed_at
) VALUES (
  'CORRIDOR-CD-UG-ITU-001', (SELECT lane_id FROM _seed_config),
  0.92, 0.95, 0.78, 0.91,
  0.30, 0.62, 0.88, 0.45,
  0.94, NOW()
);

-- ============================================================================
-- BLOCK 5: poe_signals
-- COLUMNS_VERIFIED: NO
-- ============================================================================
INSERT INTO poe_signals (
  id, lane_id, source, type, latitude, longitude, magnitude, truth_score, timestamp, ingested_at
) VALUES
  ('SIG-ITU-ENT-001', (SELECT lane_id FROM _seed_config), 'AFRO-SENTINEL', 'ENTROPY',    1.5667, 30.2500, 0.91, 0.91, '2026-02-15T00:00:00Z', NOW()),
  ('SIG-ITU-LNG-001', (SELECT lane_id FROM _seed_config), 'AFRO-SENTINEL', 'LINGUISTIC', 2.3000, 30.9800, 0.62, 0.62, '2026-05-09T00:00:00Z', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BLOCK 6: corridor_signal_links
-- COLUMNS_VERIFIED: NO
-- TABLE_NAME_VERIFIED: NO
-- ============================================================================
INSERT INTO corridor_signal_links (
  corridor_id, signal_id, lane_id, weight, attribution_confidence, linked_at
) VALUES
  ('CORRIDOR-CD-UG-ITU-001', 'SIG-ITU-ENT-001', (SELECT lane_id FROM _seed_config), 0.88, 0.91, NOW()),
  ('CORRIDOR-CD-UG-ITU-001', 'SIG-ITU-LNG-001', (SELECT lane_id FROM _seed_config), 0.62, 0.62, NOW())
ON CONFLICT (corridor_id, signal_id) DO NOTHING;

-- ============================================================================
-- BLOCK 7: poe_evidence
-- COLUMNS_VERIFIED: NO
-- ============================================================================
INSERT INTO poe_evidence (
  id, lane_id, corridor_id, source_table, source_row_id,
  timestamp, weight, confidence, source, description
) VALUES
  ('EV-ITU-001', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-EBO-001', '2026-05-15T11:30:00Z', 0.97, 0.97, 'AFRICA-CDC', 'Ebola outbreak confirmed at Mongwalu/Rwampara - anchor event'),
  ('EV-ITU-002', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-EBO-002', '2026-05-15T11:30:00Z', 0.95, 0.95, 'AFRICA-CDC', 'Rwampara health zone secondary cases'),
  ('EV-ITU-003', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-EBO-003', '2026-05-15T18:00:00Z', 0.78, 0.78, 'WHO-DON', 'Bunia transit risk assessment'),
  ('EV-ITU-004', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-EBO-004', '2026-05-15T14:00:00Z', 0.92, 0.92, 'AFRICA-CDC', 'Ebola imported case confirmed in Uganda (Goli)'),
  ('EV-ITU-005', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-ADF-001', '2026-05-11T00:00:00Z', 0.99, 0.99, 'UN-OCHA', 'ADF massacre Makumo/Mabuo - 50 killed'),
  ('EV-ITU-006', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-ADF-002', '2026-03-15T00:00:00Z', 0.98, 0.98, 'AMNESTY', 'ADF sustained campaign - 130 killed, 500 abducted'),
  ('EV-ITU-007', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_events', 'TE-ITU-ADF-003', '2026-05-06T00:00:00Z', 0.94, 0.94, 'UN-OCHA', 'ADF attack Oicha - 19 killed in fields'),
  ('EV-ITU-008', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_flows', 'TF-ITU-DIS-001', '2026-05-08T00:00:00Z', 0.95, 0.95, 'IOM-DTM', 'Mambasa to Tshopo flow, 68,000 displaced'),
  ('EV-ITU-009', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'temporal_flows', 'TF-ITU-DIS-002', '2026-05-08T00:00:00Z', 0.93, 0.93, 'IOM-DTM', 'Beni-Lubero flow, 310,000 displaced'),
  ('EV-ITU-010', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'poe_signals', 'SIG-ITU-ENT-001', '2026-02-15T00:00:00Z', 0.91, 0.91, 'AFRO-SENTINEL', 'Security vacuum entropy spike - FARDC south-draw'),
  ('EV-ITU-011', (SELECT lane_id FROM _seed_config), 'CORRIDOR-CD-UG-ITU-001', 'poe_signals', 'SIG-ITU-LNG-001', '2026-05-09T00:00:00Z', 0.62, 0.62, 'AFRO-SENTINEL', 'Alur/Lugbara cross-border chatter elevated')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BLOCK 8: friction_grid coverage check (read-only)
-- ============================================================================
SELECT
  'friction_grid coverage check' AS check,
  count(*) AS cells_in_ituri_bbox,
  min(latitude) AS min_lat,
  max(latitude) AS max_lat,
  min(longitude) AS min_lng,
  max(longitude) AS max_lng
FROM friction_grid
WHERE latitude BETWEEN 1.30 AND 3.10
  AND longitude BETWEEN 29.00 AND 31.10
  AND lane_id = (SELECT lane_id FROM _seed_config);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
\echo '=== ITURI SEED VERIFICATION ==='

SELECT 'corridor_nodes' AS table_name, count(*) FROM corridor_nodes WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'corridor_candidates' AS table_name, count(*) FROM corridor_candidates WHERE id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'poe_corridors' AS table_name, count(*) FROM poe_corridors WHERE id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'corridor_scores' AS table_name, count(*) FROM corridor_scores WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'poe_signals' AS table_name, count(*) FROM poe_signals WHERE id LIKE 'SIG-ITU-%';
SELECT 'corridor_signal_links' AS table_name, count(*) FROM corridor_signal_links WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'poe_evidence' AS table_name, count(*) FROM poe_evidence WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'crossing_points' AS table_name, count(*) FROM crossing_points WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'temporal_flows' AS table_name, count(*) FROM temporal_flows WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'temporal_events' AS table_name, count(*) FROM temporal_events WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'logistics_routes' AS table_name, count(*) FROM logistics_routes WHERE corridor_id = 'CORRIDOR-CD-UG-ITU-001';
SELECT 'logistics_waypoints' AS table_name, count(*) FROM logistics_waypoints WHERE route_id LIKE 'LR-CD-UG-ITU-%';

-- Expected:
--   corridor_nodes        6
--   corridor_candidates   1
--   poe_corridors         1
--   corridor_scores       1
--   poe_signals           2
--   corridor_signal_links 2
--   poe_evidence          11
--   crossing_points       4
--   temporal_flows        2
--   temporal_events       7
--   logistics_routes      3
--   logistics_waypoints   16
