
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles itself
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Admin write policies on ALL tables
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'camera_flight_logs','conduit_cycles','corridor_cameras','corridor_candidates',
    'corridor_definitions','corridor_evidence_chains','corridor_gap_zones','corridor_nodes',
    'corridor_scores','corridor_signals','data_lanes','diagnostic_results',
    'entropy_results','evidence_atoms','explainability_traces','firebase_user_sessions',
    'friction_cells','gemini_chat_messages','gemini_chat_sessions','ingestion_runs',
    'map_interaction_events','mcp_chat_sessions','mcp_chat_turns','mcp_tool_invocations',
    'moscript_moments','moscript_registry','moscript_runs','normalized_signals',
    'operational_border_runs','phantom_corridor_registry','phantom_node_registry',
    'poe_corridors','poe_detection_events','poe_divergence','poe_entropy',
    'poe_evidence','poe_moments','poe_signals','poe_temporal','poe_terrain',
    'provider_health','radar_scans','raw_acled_events','raw_dhis2_data_values',
    'raw_dtm_flows','route_activity','sentinel_signals','system_config',
    'terrain_friction_surfaces','trinity_syntheses','truth_engine_runs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "admin_update" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "admin_delete" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))',
      tbl
    );
  END LOOP;
END $$;

-- 6. Analyst write policies on map/chat tables only
DO $$
DECLARE
  tbl text;
  analyst_tables text[] := ARRAY[
    'map_interaction_events','mcp_chat_sessions','mcp_chat_turns','mcp_tool_invocations',
    'gemini_chat_messages','gemini_chat_sessions','camera_flight_logs','radar_scans'
  ];
BEGIN
  FOREACH tbl IN ARRAY analyst_tables LOOP
    EXECUTE format(
      'CREATE POLICY "analyst_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''analyst''))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "analyst_update" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''analyst'')) WITH CHECK (public.has_role(auth.uid(), ''analyst''))',
      tbl
    );
  END LOOP;
END $$;
