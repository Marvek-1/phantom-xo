export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      camera_flight_logs: {
        Row: {
          alt_m: number
          corridor_id: string | null
          heading_deg: number
          id: string
          pitch_deg: number
          session_id: string | null
          target_lat: number
          target_lng: number
          timestamp: string
          trigger_source: string
        }
        Insert: {
          alt_m: number
          corridor_id?: string | null
          heading_deg?: number
          id: string
          pitch_deg?: number
          session_id?: string | null
          target_lat: number
          target_lng: number
          timestamp: string
          trigger_source: string
        }
        Update: {
          alt_m?: number
          corridor_id?: string | null
          heading_deg?: number
          id?: string
          pitch_deg?: number
          session_id?: string | null
          target_lat?: number
          target_lng?: number
          timestamp?: string
          trigger_source?: string
        }
        Relationships: []
      }
      conduit_cycles: {
        Row: {
          air_avg_truth: number | null
          air_flowing: boolean
          air_volume: number | null
          computed_at: string
          conduit_score: number | null
          cycle_complete: boolean
          cycle_id: string
          earth_avg_truth: number | null
          earth_flowing: boolean
          earth_volume: number | null
          elements_flowing: number
          fire_avg_truth: number | null
          fire_flowing: boolean
          fire_volume: number | null
          ready_for_woo: boolean
          run_id: string | null
          water_avg_truth: number | null
          water_flowing: boolean
          water_volume: number | null
        }
        Insert: {
          air_avg_truth?: number | null
          air_flowing?: boolean
          air_volume?: number | null
          computed_at: string
          conduit_score?: number | null
          cycle_complete?: boolean
          cycle_id: string
          earth_avg_truth?: number | null
          earth_flowing?: boolean
          earth_volume?: number | null
          elements_flowing?: number
          fire_avg_truth?: number | null
          fire_flowing?: boolean
          fire_volume?: number | null
          ready_for_woo?: boolean
          run_id?: string | null
          water_avg_truth?: number | null
          water_flowing?: boolean
          water_volume?: number | null
        }
        Update: {
          air_avg_truth?: number | null
          air_flowing?: boolean
          air_volume?: number | null
          computed_at?: string
          conduit_score?: number | null
          cycle_complete?: boolean
          cycle_id?: string
          earth_avg_truth?: number | null
          earth_flowing?: boolean
          earth_volume?: number | null
          elements_flowing?: number
          fire_avg_truth?: number | null
          fire_flowing?: boolean
          fire_volume?: number | null
          ready_for_woo?: boolean
          run_id?: string | null
          water_avg_truth?: number | null
          water_flowing?: boolean
          water_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conduit_cycles_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      corridor_cameras: {
        Row: {
          alt_m: number
          corridor_def_id: string
          heading_deg: number
          id: string
          label: string | null
          lat: number
          lng: number
          tilt_deg: number
        }
        Insert: {
          alt_m: number
          corridor_def_id: string
          heading_deg: number
          id: string
          label?: string | null
          lat: number
          lng: number
          tilt_deg: number
        }
        Update: {
          alt_m?: number
          corridor_def_id?: string
          heading_deg?: number
          id?: string
          label?: string | null
          lat?: number
          lng?: number
          tilt_deg?: number
        }
        Relationships: [
          {
            foreignKeyName: "corridor_cameras_corridor_def_id_fkey"
            columns: ["corridor_def_id"]
            isOneToOne: false
            referencedRelation: "corridor_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      corridor_candidates: {
        Row: {
          activated: boolean
          corridor_id: string
          days_delta: number | null
          detected_at: string
          distance_km: number | null
          end_country: string
          end_lat: number | null
          end_lng: number | null
          end_node: string
          entropy_delta_h: number | null
          risk_class: string
          run_id: string | null
          score: number
          signal_count: number
          start_country: string
          start_lat: number | null
          start_lng: number | null
          start_node: string
          velocity_km_day: number | null
        }
        Insert: {
          activated?: boolean
          corridor_id: string
          days_delta?: number | null
          detected_at: string
          distance_km?: number | null
          end_country: string
          end_lat?: number | null
          end_lng?: number | null
          end_node: string
          entropy_delta_h?: number | null
          risk_class: string
          run_id?: string | null
          score: number
          signal_count?: number
          start_country: string
          start_lat?: number | null
          start_lng?: number | null
          start_node: string
          velocity_km_day?: number | null
        }
        Update: {
          activated?: boolean
          corridor_id?: string
          days_delta?: number | null
          detected_at?: string
          distance_km?: number | null
          end_country?: string
          end_lat?: number | null
          end_lng?: number | null
          end_node?: string
          entropy_delta_h?: number | null
          risk_class?: string
          run_id?: string | null
          score?: number
          signal_count?: number
          start_country?: string
          start_lat?: number | null
          start_lng?: number | null
          start_node?: string
          velocity_km_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "corridor_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      corridor_definitions: {
        Row: {
          active: boolean
          created_at: string
          end_lat: number
          end_lng: number
          end_node: string
          id: string
          region: string
          start_lat: number
          start_lng: number
          start_node: string
        }
        Insert: {
          active?: boolean
          created_at: string
          end_lat: number
          end_lng: number
          end_node: string
          id: string
          region: string
          start_lat: number
          start_lng: number
          start_node: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_lat?: number
          end_lng?: number
          end_node?: string
          id?: string
          region?: string
          start_lat?: number
          start_lng?: number
          start_node?: string
        }
        Relationships: []
      }
      corridor_evidence_chains: {
        Row: {
          alt_m: number | null
          corridor_def_id: string
          country_code: string
          day_offset: number
          evidence_id: string
          evidence_type: string
          id: string
          km_marker: number
          lat: number
          lng: number
          location_name: string
          precision_level: string
          score: number
          source: string
          source_record_id: string
          tag: string
        }
        Insert: {
          alt_m?: number | null
          corridor_def_id: string
          country_code: string
          day_offset: number
          evidence_id: string
          evidence_type: string
          id: string
          km_marker: number
          lat: number
          lng: number
          location_name: string
          precision_level: string
          score: number
          source: string
          source_record_id: string
          tag: string
        }
        Update: {
          alt_m?: number | null
          corridor_def_id?: string
          country_code?: string
          day_offset?: number
          evidence_id?: string
          evidence_type?: string
          id?: string
          km_marker?: number
          lat?: number
          lng?: number
          location_name?: string
          precision_level?: string
          score?: number
          source?: string
          source_record_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "corridor_evidence_chains_corridor_def_id_fkey"
            columns: ["corridor_def_id"]
            isOneToOne: false
            referencedRelation: "corridor_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      corridor_gap_zones: {
        Row: {
          corridor_def_id: string
          coverage_description: string
          id: string
          inferred_mode: string
          is_gap_zone: boolean
          nearest_formal_poe: string
          total_km: number
          velocity_kmh: number
        }
        Insert: {
          corridor_def_id: string
          coverage_description: string
          id: string
          inferred_mode: string
          is_gap_zone?: boolean
          nearest_formal_poe: string
          total_km: number
          velocity_kmh: number
        }
        Update: {
          corridor_def_id?: string
          coverage_description?: string
          id?: string
          inferred_mode?: string
          is_gap_zone?: boolean
          nearest_formal_poe?: string
          total_km?: number
          velocity_kmh?: number
        }
        Relationships: [
          {
            foreignKeyName: "corridor_gap_zones_corridor_def_id_fkey"
            columns: ["corridor_def_id"]
            isOneToOne: false
            referencedRelation: "corridor_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      corridor_nodes: {
        Row: {
          alt_m: number | null
          corridor_def_id: string
          country_code: string
          id: string
          km_marker: number
          lat: number
          lng: number
          name: string
          node_order: number
          node_type: string
          precision_level: string
        }
        Insert: {
          alt_m?: number | null
          corridor_def_id: string
          country_code: string
          id: string
          km_marker: number
          lat: number
          lng: number
          name: string
          node_order: number
          node_type: string
          precision_level: string
        }
        Update: {
          alt_m?: number | null
          corridor_def_id?: string
          country_code?: string
          id?: string
          km_marker?: number
          lat?: number
          lng?: number
          name?: string
          node_order?: number
          node_type?: string
          precision_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "corridor_nodes_corridor_def_id_fkey"
            columns: ["corridor_def_id"]
            isOneToOne: false
            referencedRelation: "corridor_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      corridor_scores: {
        Row: {
          anomaly_confidence: number
          anomaly_entropy_shift: number | null
          anomaly_is_anomaly: boolean | null
          centrality_score: number
          conflict_detour: boolean
          corridor_id: string
          corridor_score: number
          diffusion_score: number
          end_node: string
          entropy_score: number
          evidence_support_score: number
          first_detected: string
          forecast_activation_likelihood: number | null
          forecast_drift_direction_deg: number | null
          forecast_score: number
          friction_score: number
          gravity_score: number
          hmm_score: number
          id: string
          inferred_mode: string
          inferred_path_json: string | null
          inferred_velocity_kmh: number
          last_updated: string
          latent_state: string
          linguistic_score: number
          location_center_lat: number | null
          location_center_lng: number | null
          location_probability_mass: number | null
          location_score: number
          location_uncertainty_m: number | null
          path_score: number
          phantom_poe_activated: boolean
          requires_canoe: boolean
          risk_class: string
          run_id: string
          scored_at: string
          seasonal_score: number
          seasonally_active: boolean
          start_node: string
          trace_lines_json: string | null
        }
        Insert: {
          anomaly_confidence: number
          anomaly_entropy_shift?: number | null
          anomaly_is_anomaly?: boolean | null
          centrality_score: number
          conflict_detour: boolean
          corridor_id: string
          corridor_score: number
          diffusion_score: number
          end_node: string
          entropy_score: number
          evidence_support_score: number
          first_detected: string
          forecast_activation_likelihood?: number | null
          forecast_drift_direction_deg?: number | null
          forecast_score: number
          friction_score: number
          gravity_score: number
          hmm_score: number
          id: string
          inferred_mode: string
          inferred_path_json?: string | null
          inferred_velocity_kmh: number
          last_updated: string
          latent_state: string
          linguistic_score: number
          location_center_lat?: number | null
          location_center_lng?: number | null
          location_probability_mass?: number | null
          location_score: number
          location_uncertainty_m?: number | null
          path_score: number
          phantom_poe_activated: boolean
          requires_canoe: boolean
          risk_class: string
          run_id: string
          scored_at: string
          seasonal_score: number
          seasonally_active: boolean
          start_node: string
          trace_lines_json?: string | null
        }
        Update: {
          anomaly_confidence?: number
          anomaly_entropy_shift?: number | null
          anomaly_is_anomaly?: boolean | null
          centrality_score?: number
          conflict_detour?: boolean
          corridor_id?: string
          corridor_score?: number
          diffusion_score?: number
          end_node?: string
          entropy_score?: number
          evidence_support_score?: number
          first_detected?: string
          forecast_activation_likelihood?: number | null
          forecast_drift_direction_deg?: number | null
          forecast_score?: number
          friction_score?: number
          gravity_score?: number
          hmm_score?: number
          id?: string
          inferred_mode?: string
          inferred_path_json?: string | null
          inferred_velocity_kmh?: number
          last_updated?: string
          latent_state?: string
          linguistic_score?: number
          location_center_lat?: number | null
          location_center_lng?: number | null
          location_probability_mass?: number | null
          location_score?: number
          location_uncertainty_m?: number | null
          path_score?: number
          phantom_poe_activated?: boolean
          requires_canoe?: boolean
          risk_class?: string
          run_id?: string
          scored_at?: string
          seasonal_score?: number
          seasonally_active?: boolean
          start_node?: string
          trace_lines_json?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corridor_scores_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
          {
            foreignKeyName: "corridor_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      corridor_signals: {
        Row: {
          corridor_id: string
          sequence_order: number
          signal_id: string
        }
        Insert: {
          corridor_id: string
          sequence_order: number
          signal_id: string
        }
        Update: {
          corridor_id?: string
          sequence_order?: number
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corridor_signals_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
          {
            foreignKeyName: "corridor_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "normalized_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      corridor_temporal_events: {
        Row: {
          corridor_id: string | null
          crossing_point_id: string | null
          description: string
          event_date: string
          event_type: string
          flow_impact: string | null
          id: string
          source: string
        }
        Insert: {
          corridor_id?: string | null
          crossing_point_id?: string | null
          description: string
          event_date: string
          event_type: string
          flow_impact?: string | null
          id: string
          source: string
        }
        Update: {
          corridor_id?: string | null
          crossing_point_id?: string | null
          description?: string
          event_date?: string
          event_type?: string
          flow_impact?: string | null
          id?: string
          source?: string
        }
        Relationships: []
      }
      data_lanes: {
        Row: {
          badge_color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          lane: string
        }
        Insert: {
          badge_color?: string
          created_at: string
          description?: string | null
          id: string
          is_active?: boolean
          label: string
          lane: string
        }
        Update: {
          badge_color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          lane?: string
        }
        Relationships: []
      }
      diagnostic_results: {
        Row: {
          id: string
          latency_ms: number | null
          message: string
          run_id: string | null
          service: string
          status: string
          tested_at: string
        }
        Insert: {
          id: string
          latency_ms?: number | null
          message: string
          run_id?: string | null
          service: string
          status: string
          tested_at: string
        }
        Update: {
          id?: string
          latency_ms?: number | null
          message?: string
          run_id?: string | null
          service?: string
          status?: string
          tested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      entropy_results: {
        Row: {
          computed_at: string
          delta_h: number
          h_baseline: number
          h_current: number
          id: string
          node_id: string
          risk_class: string
          run_id: string | null
          signal_count: number
          spiked: boolean
          threshold: number
        }
        Insert: {
          computed_at: string
          delta_h: number
          h_baseline: number
          h_current: number
          id: string
          node_id: string
          risk_class: string
          run_id?: string | null
          signal_count?: number
          spiked?: boolean
          threshold?: number
        }
        Update: {
          computed_at?: string
          delta_h?: number
          h_baseline?: number
          h_current?: number
          id?: string
          node_id?: string
          risk_class?: string
          run_id?: string | null
          signal_count?: number
          spiked?: boolean
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "entropy_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      evidence_atoms: {
        Row: {
          confidence: number
          corridor_score_id: string
          description: string
          evidence_type: string
          id: string
          node_ids_json: string
          raw_value_json: string | null
          source: string
          source_record_id: string
          synthetic: boolean
          timestamp: string
          weight: number
        }
        Insert: {
          confidence: number
          corridor_score_id: string
          description: string
          evidence_type: string
          id: string
          node_ids_json: string
          raw_value_json?: string | null
          source: string
          source_record_id: string
          synthetic?: boolean
          timestamp: string
          weight: number
        }
        Update: {
          confidence?: number
          corridor_score_id?: string
          description?: string
          evidence_type?: string
          id?: string
          node_ids_json?: string
          raw_value_json?: string | null
          source?: string
          source_record_id?: string
          synthetic?: boolean
          timestamp?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_atoms_corridor_score_id_fkey"
            columns: ["corridor_score_id"]
            isOneToOne: false
            referencedRelation: "corridor_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      explainability_traces: {
        Row: {
          centrality_score: number | null
          conflict_detour: boolean | null
          corridor_id: string
          corridor_score: number
          created_at: string
          diffusion_score: number | null
          entropy_score: number | null
          friction_score: number | null
          gravity_score: number | null
          hmm_score: number | null
          id: string
          inferred_mode: string | null
          inferred_velocity_kmh: number | null
          linguistic_score: number | null
          phantom_poe_activated: boolean | null
          requires_canoe: boolean | null
          risk_class: string
          run_id: string | null
          seasonal_score: number | null
          seasonally_active: boolean | null
          soul_weights: string | null
          trace_lines: string | null
        }
        Insert: {
          centrality_score?: number | null
          conflict_detour?: boolean | null
          corridor_id: string
          corridor_score: number
          created_at: string
          diffusion_score?: number | null
          entropy_score?: number | null
          friction_score?: number | null
          gravity_score?: number | null
          hmm_score?: number | null
          id: string
          inferred_mode?: string | null
          inferred_velocity_kmh?: number | null
          linguistic_score?: number | null
          phantom_poe_activated?: boolean | null
          requires_canoe?: boolean | null
          risk_class: string
          run_id?: string | null
          seasonal_score?: number | null
          seasonally_active?: boolean | null
          soul_weights?: string | null
          trace_lines?: string | null
        }
        Update: {
          centrality_score?: number | null
          conflict_detour?: boolean | null
          corridor_id?: string
          corridor_score?: number
          created_at?: string
          diffusion_score?: number | null
          entropy_score?: number | null
          friction_score?: number | null
          gravity_score?: number | null
          hmm_score?: number | null
          id?: string
          inferred_mode?: string | null
          inferred_velocity_kmh?: number | null
          linguistic_score?: number | null
          phantom_poe_activated?: boolean | null
          requires_canoe?: boolean | null
          risk_class?: string
          run_id?: string | null
          seasonal_score?: number | null
          seasonally_active?: boolean | null
          soul_weights?: string | null
          trace_lines?: string | null
        }
        Relationships: []
      }
      firebase_user_sessions: {
        Row: {
          display_name: string | null
          email: string | null
          id: string
          last_active_at: string
          logged_in_at: string
          login_method: string
          photo_url: string | null
          role: string
          uid: string
        }
        Insert: {
          display_name?: string | null
          email?: string | null
          id: string
          last_active_at: string
          logged_in_at: string
          login_method?: string
          photo_url?: string | null
          role?: string
          uid: string
        }
        Update: {
          display_name?: string | null
          email?: string | null
          id?: string
          last_active_at?: string
          logged_in_at?: string
          login_method?: string
          photo_url?: string | null
          role?: string
          uid?: string
        }
        Relationships: []
      }
      friction_cells: {
        Row: {
          aspect_deg: number | null
          bridge_present: boolean | null
          cell_index: number
          conflict_risk: number | null
          corridor_id: string
          elevation_m: number | null
          flood_probability: number | null
          flooded: boolean | null
          footpath_present: boolean | null
          ford_present: boolean | null
          friction_cost: number
          id: string
          land_cover: string
          lat: number
          lng: number
          passable: boolean | null
          protected_area: boolean | null
          rainfall_7d_mm: number | null
          river_present: boolean | null
          river_width_m: number | null
          road_present: boolean | null
          road_quality: number | null
          seasonal_phase: string | null
          slope_deg: number | null
          transport_mode: string | null
        }
        Insert: {
          aspect_deg?: number | null
          bridge_present?: boolean | null
          cell_index: number
          conflict_risk?: number | null
          corridor_id: string
          elevation_m?: number | null
          flood_probability?: number | null
          flooded?: boolean | null
          footpath_present?: boolean | null
          ford_present?: boolean | null
          friction_cost: number
          id: string
          land_cover: string
          lat: number
          lng: number
          passable?: boolean | null
          protected_area?: boolean | null
          rainfall_7d_mm?: number | null
          river_present?: boolean | null
          river_width_m?: number | null
          road_present?: boolean | null
          road_quality?: number | null
          seasonal_phase?: string | null
          slope_deg?: number | null
          transport_mode?: string | null
        }
        Update: {
          aspect_deg?: number | null
          bridge_present?: boolean | null
          cell_index?: number
          conflict_risk?: number | null
          corridor_id?: string
          elevation_m?: number | null
          flood_probability?: number | null
          flooded?: boolean | null
          footpath_present?: boolean | null
          ford_present?: boolean | null
          friction_cost?: number
          id?: string
          land_cover?: string
          lat?: number
          lng?: number
          passable?: boolean | null
          protected_area?: boolean | null
          rainfall_7d_mm?: number | null
          river_present?: boolean | null
          river_width_m?: number | null
          road_present?: boolean | null
          road_quality?: number | null
          seasonal_phase?: string | null
          slope_deg?: number | null
          transport_mode?: string | null
        }
        Relationships: []
      }
      gemini_chat_messages: {
        Row: {
          content: string
          id: string
          message_order: number
          message_type: string
          session_id: string
          timestamp: string
        }
        Insert: {
          content: string
          id: string
          message_order: number
          message_type: string
          session_id: string
          timestamp: string
        }
        Update: {
          content?: string
          id?: string
          message_order?: number
          message_type?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "gemini_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gemini_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gemini_chat_sessions: {
        Row: {
          id: string
          message_count: number
          model: string
          started_at: string
          thinking_enabled: boolean
        }
        Insert: {
          id: string
          message_count?: number
          model?: string
          started_at: string
          thinking_enabled?: boolean
        }
        Update: {
          id?: string
          message_count?: number
          model?: string
          started_at?: string
          thinking_enabled?: boolean
        }
        Relationships: []
      }
      ingestion_runs: {
        Row: {
          acled_fetched: number | null
          completed_at: string | null
          corridors_detected: number | null
          dhis2_fetched: number | null
          dtm_fetched: number | null
          entropy_spikes: number | null
          error_message: string | null
          run_id: string
          signals_after_truth_filter: number | null
          signals_normalized: number | null
          started_at: string
          status: string
        }
        Insert: {
          acled_fetched?: number | null
          completed_at?: string | null
          corridors_detected?: number | null
          dhis2_fetched?: number | null
          dtm_fetched?: number | null
          entropy_spikes?: number | null
          error_message?: string | null
          run_id: string
          signals_after_truth_filter?: number | null
          signals_normalized?: number | null
          started_at: string
          status: string
        }
        Update: {
          acled_fetched?: number | null
          completed_at?: string | null
          corridors_detected?: number | null
          dhis2_fetched?: number | null
          dtm_fetched?: number | null
          entropy_spikes?: number | null
          error_message?: string | null
          run_id?: string
          signals_after_truth_filter?: number | null
          signals_normalized?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      map_interaction_events: {
        Row: {
          corridor_id: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          screen_x: number | null
          screen_y: number | null
          session_id: string | null
          timestamp: string
        }
        Insert: {
          corridor_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id: string
          screen_x?: number | null
          screen_y?: number | null
          session_id?: string | null
          timestamp: string
        }
        Update: {
          corridor_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          screen_x?: number | null
          screen_y?: number | null
          session_id?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      mcp_chat_sessions: {
        Row: {
          active_tab: string | null
          analyst_id: string
          corridor_id: string | null
          id: string
          last_message_at: string
          model: string
          run_id: string | null
          started_at: string
          turn_count: number
        }
        Insert: {
          active_tab?: string | null
          analyst_id: string
          corridor_id?: string | null
          id: string
          last_message_at: string
          model?: string
          run_id?: string | null
          started_at: string
          turn_count?: number
        }
        Update: {
          active_tab?: string | null
          analyst_id?: string
          corridor_id?: string | null
          id?: string
          last_message_at?: string
          model?: string
          run_id?: string | null
          started_at?: string
          turn_count?: number
        }
        Relationships: []
      }
      mcp_chat_turns: {
        Row: {
          content: string
          id: string
          role: string
          session_id: string
          timestamp: string
          turn_order: number
        }
        Insert: {
          content: string
          id: string
          role: string
          session_id: string
          timestamp: string
          turn_order: number
        }
        Update: {
          content?: string
          id?: string
          role?: string
          session_id?: string
          timestamp?: string
          turn_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "mcp_chat_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mcp_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tool_invocations: {
        Row: {
          id: string
          invoked_at: string
          map_action_type: string | null
          params_json: string
          result_text: string | null
          session_id: string | null
          success: boolean
          tool_name: string
        }
        Insert: {
          id: string
          invoked_at: string
          map_action_type?: string | null
          params_json: string
          result_text?: string | null
          session_id?: string | null
          success?: boolean
          tool_name: string
        }
        Update: {
          id?: string
          invoked_at?: string
          map_action_type?: string | null
          params_json?: string
          result_text?: string | null
          session_id?: string | null
          success?: boolean
          tool_name?: string
        }
        Relationships: []
      }
      moscript_moments: {
        Row: {
          grid_cypher_id: string | null
          moment_id: string
          request_id: string
          result_json: string | null
          script_id: string
          sealed_at: string
          trigger: string
          woo_state: string
        }
        Insert: {
          grid_cypher_id?: string | null
          moment_id: string
          request_id: string
          result_json?: string | null
          script_id: string
          sealed_at: string
          trigger: string
          woo_state: string
        }
        Update: {
          grid_cypher_id?: string | null
          moment_id?: string
          request_id?: string
          result_json?: string | null
          script_id?: string
          sealed_at?: string
          trigger?: string
          woo_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "moscript_moments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "moscript_runs"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "moscript_moments_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "moscript_registry"
            referencedColumns: ["script_id"]
          },
        ]
      }
      moscript_registry: {
        Row: {
          cid: string
          grid_node: string
          has_voice_line: boolean
          inputs: string
          name: string
          registered_at: string
          sass: boolean
          script_id: string
          trigger: string
        }
        Insert: {
          cid: string
          grid_node: string
          has_voice_line?: boolean
          inputs: string
          name: string
          registered_at: string
          sass?: boolean
          script_id: string
          trigger: string
        }
        Update: {
          cid?: string
          grid_node?: string
          has_voice_line?: boolean
          inputs?: string
          name?: string
          registered_at?: string
          sass?: boolean
          script_id?: string
          trigger?: string
        }
        Relationships: []
      }
      moscript_runs: {
        Row: {
          completed_at: string | null
          corridor_id: string | null
          execution_ms: number | null
          grid_log_id: string | null
          request_id: string
          result_json: string | null
          run_id: string | null
          script_id: string
          signal_external_noise: number | null
          signal_memory_weight: number | null
          signal_origin: string | null
          signal_signature_hash: string | null
          signal_trust_level: number | null
          status: string
          submitted_at: string
          voice_line: string | null
        }
        Insert: {
          completed_at?: string | null
          corridor_id?: string | null
          execution_ms?: number | null
          grid_log_id?: string | null
          request_id: string
          result_json?: string | null
          run_id?: string | null
          script_id: string
          signal_external_noise?: number | null
          signal_memory_weight?: number | null
          signal_origin?: string | null
          signal_signature_hash?: string | null
          signal_trust_level?: number | null
          status: string
          submitted_at: string
          voice_line?: string | null
        }
        Update: {
          completed_at?: string | null
          corridor_id?: string | null
          execution_ms?: number | null
          grid_log_id?: string | null
          request_id?: string
          result_json?: string | null
          run_id?: string | null
          script_id?: string
          signal_external_noise?: number | null
          signal_memory_weight?: number | null
          signal_origin?: string | null
          signal_signature_hash?: string | null
          signal_trust_level?: number | null
          status?: string
          submitted_at?: string
          voice_line?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moscript_runs_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
          {
            foreignKeyName: "moscript_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "moscript_runs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "moscript_registry"
            referencedColumns: ["script_id"]
          },
        ]
      }
      normalized_signals: {
        Row: {
          admin1: string | null
          admin2: string | null
          country: string
          disease: string | null
          element: string
          id: string
          ingested_at: string
          latitude: number | null
          location: string
          longitude: number | null
          magnitude: number
          notes: string | null
          passed_truth_filter: boolean
          period: string | null
          raw_source_id: string | null
          raw_value: number | null
          run_id: string | null
          source: string
          timestamp: string
          truth_score: number
          type: string
        }
        Insert: {
          admin1?: string | null
          admin2?: string | null
          country: string
          disease?: string | null
          element: string
          id: string
          ingested_at: string
          latitude?: number | null
          location: string
          longitude?: number | null
          magnitude: number
          notes?: string | null
          passed_truth_filter?: boolean
          period?: string | null
          raw_source_id?: string | null
          raw_value?: number | null
          run_id?: string | null
          source: string
          timestamp: string
          truth_score: number
          type: string
        }
        Update: {
          admin1?: string | null
          admin2?: string | null
          country?: string
          disease?: string | null
          element?: string
          id?: string
          ingested_at?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          magnitude?: number
          notes?: string | null
          passed_truth_filter?: boolean
          period?: string | null
          raw_source_id?: string | null
          raw_value?: number | null
          run_id?: string | null
          source?: string
          timestamp?: string
          truth_score?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "normalized_signals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      operational_border_runs: {
        Row: {
          corridor_candidates: number | null
          duration_ms: number
          errors: string | null
          id: string
          ok: boolean
          persisted: number | null
          providers_healthy: string | null
          providers_unhealthy: string | null
          rejected: number | null
          run_mode: string
          signals_fetched: number | null
          started_at: string
          top_corridor_id: string | null
          top_corridor_risk: string | null
          top_corridor_score: number | null
          truth_passed: number | null
          warnings: string | null
        }
        Insert: {
          corridor_candidates?: number | null
          duration_ms: number
          errors?: string | null
          id: string
          ok: boolean
          persisted?: number | null
          providers_healthy?: string | null
          providers_unhealthy?: string | null
          rejected?: number | null
          run_mode: string
          signals_fetched?: number | null
          started_at: string
          top_corridor_id?: string | null
          top_corridor_risk?: string | null
          top_corridor_score?: number | null
          truth_passed?: number | null
          warnings?: string | null
        }
        Update: {
          corridor_candidates?: number | null
          duration_ms?: number
          errors?: string | null
          id?: string
          ok?: boolean
          persisted?: number | null
          providers_healthy?: string | null
          providers_unhealthy?: string | null
          rejected?: number | null
          run_mode?: string
          signals_fetched?: number | null
          started_at?: string
          top_corridor_id?: string | null
          top_corridor_risk?: string | null
          top_corridor_score?: number | null
          truth_passed?: number | null
          warnings?: string | null
        }
        Relationships: []
      }
      phantom_corridor_registry: {
        Row: {
          confidence: number
          corridor_type: string
          from_node: string
          id: string
          models: string
          risk: string
          to_node: string
        }
        Insert: {
          confidence: number
          corridor_type: string
          from_node: string
          id: string
          models: string
          risk: string
          to_node: string
        }
        Update: {
          confidence?: number
          corridor_type?: string
          from_node?: string
          id?: string
          models?: string
          risk?: string
          to_node?: string
        }
        Relationships: []
      }
      phantom_node_registry: {
        Row: {
          country: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          node_type: string
          properties: string | null
        }
        Insert: {
          country: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          node_type: string
          properties?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          node_type?: string
          properties?: string | null
        }
        Relationships: []
      }
      poe_corridors: {
        Row: {
          activated: boolean
          conflict_detour: boolean
          distance_km: number | null
          end_country: string
          end_lat: number
          end_lng: number
          end_node: string
          evidence_count: number
          first_detected: string
          formal_poe_coverage: string | null
          gap_km: number | null
          id: string
          inferred_mode: string | null
          inferred_path_json: string | null
          inferred_velocity_kmh: number | null
          lane_id: string
          last_updated: string
          latent_state: string | null
          phantom_poe_activated: boolean
          previous_score: number | null
          requires_canoe: boolean
          risk_class: string
          score: number
          score_delta: number | null
          signal_count: number
          start_country: string
          start_lat: number
          start_lng: number
          start_node: string
        }
        Insert: {
          activated?: boolean
          conflict_detour?: boolean
          distance_km?: number | null
          end_country: string
          end_lat: number
          end_lng: number
          end_node: string
          evidence_count?: number
          first_detected: string
          formal_poe_coverage?: string | null
          gap_km?: number | null
          id: string
          inferred_mode?: string | null
          inferred_path_json?: string | null
          inferred_velocity_kmh?: number | null
          lane_id: string
          last_updated: string
          latent_state?: string | null
          phantom_poe_activated?: boolean
          previous_score?: number | null
          requires_canoe?: boolean
          risk_class: string
          score: number
          score_delta?: number | null
          signal_count?: number
          start_country: string
          start_lat: number
          start_lng: number
          start_node: string
        }
        Update: {
          activated?: boolean
          conflict_detour?: boolean
          distance_km?: number | null
          end_country?: string
          end_lat?: number
          end_lng?: number
          end_node?: string
          evidence_count?: number
          first_detected?: string
          formal_poe_coverage?: string | null
          gap_km?: number | null
          id?: string
          inferred_mode?: string | null
          inferred_path_json?: string | null
          inferred_velocity_kmh?: number | null
          lane_id?: string
          last_updated?: string
          latent_state?: string | null
          phantom_poe_activated?: boolean
          previous_score?: number | null
          requires_canoe?: boolean
          risk_class?: string
          score?: number
          score_delta?: number | null
          signal_count?: number
          start_country?: string
          start_lat?: number
          start_lng?: number
          start_node?: string
        }
        Relationships: [
          {
            foreignKeyName: "poe_corridors_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_detection_events: {
        Row: {
          acknowledged: boolean
          click_action: string | null
          corridor_id: string | null
          created_at: string
          event_type: string
          id: string
          lane_id: string
          route_name: string | null
          score: number | null
          score_delta: number | null
          severity: string
          source_count: number | null
          summary: string
        }
        Insert: {
          acknowledged?: boolean
          click_action?: string | null
          corridor_id?: string | null
          created_at: string
          event_type: string
          id: string
          lane_id: string
          route_name?: string | null
          score?: number | null
          score_delta?: number | null
          severity: string
          source_count?: number | null
          summary: string
        }
        Update: {
          acknowledged?: boolean
          click_action?: string | null
          corridor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lane_id?: string
          route_name?: string | null
          score?: number | null
          score_delta?: number | null
          severity?: string
          source_count?: number | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "poe_detection_events_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "poe_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_detection_events_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_divergence: {
        Row: {
          computed_at: string
          corridor_id: string
          divergence_ratio: number
          formal_volume: number
          id: string
          informal_volume: number
          lane_id: string
          trend: string | null
          window_days: number
        }
        Insert: {
          computed_at: string
          corridor_id: string
          divergence_ratio: number
          formal_volume?: number
          id: string
          informal_volume?: number
          lane_id: string
          trend?: string | null
          window_days?: number
        }
        Update: {
          computed_at?: string
          corridor_id?: string
          divergence_ratio?: number
          formal_volume?: number
          id?: string
          informal_volume?: number
          lane_id?: string
          trend?: string | null
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "poe_divergence_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "poe_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_divergence_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_entropy: {
        Row: {
          computed_at: string
          delta_h: number
          h_baseline: number
          h_current: number
          id: string
          lane_id: string
          node_id: string
          risk_class: string
          signal_count: number
          spiked: boolean
        }
        Insert: {
          computed_at: string
          delta_h: number
          h_baseline: number
          h_current: number
          id: string
          lane_id: string
          node_id: string
          risk_class: string
          signal_count?: number
          spiked?: boolean
        }
        Update: {
          computed_at?: string
          delta_h?: number
          h_baseline?: number
          h_current?: number
          id?: string
          lane_id?: string
          node_id?: string
          risk_class?: string
          signal_count?: number
          spiked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "poe_entropy_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_evidence: {
        Row: {
          confidence: number
          corridor_id: string
          description: string | null
          evidence_type: string
          id: string
          lane_id: string
          node_ids_json: string | null
          source: string
          synthetic: boolean
          timestamp: string
          weight: number
        }
        Insert: {
          confidence: number
          corridor_id: string
          description?: string | null
          evidence_type: string
          id: string
          lane_id: string
          node_ids_json?: string | null
          source: string
          synthetic?: boolean
          timestamp: string
          weight: number
        }
        Update: {
          confidence?: number
          corridor_id?: string
          description?: string | null
          evidence_type?: string
          id?: string
          lane_id?: string
          node_ids_json?: string | null
          source?: string
          synthetic?: boolean
          timestamp?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "poe_evidence_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "poe_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_evidence_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_moments: {
        Row: {
          corridor_id: string | null
          evidence_count: number | null
          id: string
          lane_id: string
          script_id: string | null
          sealed_at: string
          synthesis_text: string | null
          trigger: string
          trinity_hash: string | null
          woo_state: string
        }
        Insert: {
          corridor_id?: string | null
          evidence_count?: number | null
          id: string
          lane_id: string
          script_id?: string | null
          sealed_at: string
          synthesis_text?: string | null
          trigger: string
          trinity_hash?: string | null
          woo_state: string
        }
        Update: {
          corridor_id?: string | null
          evidence_count?: number | null
          id?: string
          lane_id?: string
          script_id?: string | null
          sealed_at?: string
          synthesis_text?: string | null
          trigger?: string
          trinity_hash?: string | null
          woo_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "poe_moments_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "poe_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_moments_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_signals: {
        Row: {
          admin1: string | null
          country: string
          disease: string | null
          element: string | null
          id: string
          ingested_at: string
          lane_id: string
          latitude: number
          location: string
          longitude: number
          magnitude: number
          passed_truth_filter: boolean
          raw_source_id: string | null
          source: string
          timestamp: string
          truth_score: number
          type: string
        }
        Insert: {
          admin1?: string | null
          country: string
          disease?: string | null
          element?: string | null
          id: string
          ingested_at: string
          lane_id: string
          latitude: number
          location: string
          longitude: number
          magnitude: number
          passed_truth_filter: boolean
          raw_source_id?: string | null
          source: string
          timestamp: string
          truth_score: number
          type: string
        }
        Update: {
          admin1?: string | null
          country?: string
          disease?: string | null
          element?: string | null
          id?: string
          ingested_at?: string
          lane_id?: string
          latitude?: number
          location?: string
          longitude?: number
          magnitude?: number
          passed_truth_filter?: boolean
          raw_source_id?: string | null
          source?: string
          timestamp?: string
          truth_score?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "poe_signals_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_temporal: {
        Row: {
          activity_status: string | null
          avg_magnitude: number | null
          avg_truth_score: number | null
          bucket_date: string
          corridor_id: string
          divergence_ratio: number | null
          dominant_type: string | null
          estimated_daily_crossings: number | null
          formal_poe_crossings: number | null
          id: string
          informal_crossings: number | null
          lane_id: string
          signal_count: number
        }
        Insert: {
          activity_status?: string | null
          avg_magnitude?: number | null
          avg_truth_score?: number | null
          bucket_date: string
          corridor_id: string
          divergence_ratio?: number | null
          dominant_type?: string | null
          estimated_daily_crossings?: number | null
          formal_poe_crossings?: number | null
          id: string
          informal_crossings?: number | null
          lane_id: string
          signal_count?: number
        }
        Update: {
          activity_status?: string | null
          avg_magnitude?: number | null
          avg_truth_score?: number | null
          bucket_date?: string
          corridor_id?: string
          divergence_ratio?: number | null
          dominant_type?: string | null
          estimated_daily_crossings?: number | null
          formal_poe_crossings?: number | null
          id?: string
          informal_crossings?: number | null
          lane_id?: string
          signal_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poe_temporal_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "poe_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_temporal_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_terrain: {
        Row: {
          avg_slope_deg: number | null
          best_friction: number | null
          best_mode: string
          computed_at: string
          corridor_id: string
          has_river_crossing: boolean
          id: string
          lane_id: string
          primary_land_cover: string
          requires_canoe: boolean
          river_width_m: number | null
          seasonal_phase: string | null
        }
        Insert: {
          avg_slope_deg?: number | null
          best_friction?: number | null
          best_mode: string
          computed_at: string
          corridor_id: string
          has_river_crossing?: boolean
          id: string
          lane_id: string
          primary_land_cover: string
          requires_canoe?: boolean
          river_width_m?: number | null
          seasonal_phase?: string | null
        }
        Update: {
          avg_slope_deg?: number | null
          best_friction?: number | null
          best_mode?: string
          computed_at?: string
          corridor_id?: string
          has_river_crossing?: boolean
          id?: string
          lane_id?: string
          primary_land_cover?: string
          requires_canoe?: boolean
          river_width_m?: number | null
          seasonal_phase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poe_terrain_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "poe_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_terrain_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "data_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_health: {
        Row: {
          checked_at: string
          error_message: string | null
          healthy: boolean
          id: string
          provider_id: string
          provider_name: string
          response_time_ms: number | null
          run_id: string
          signals_fetched: number | null
        }
        Insert: {
          checked_at: string
          error_message?: string | null
          healthy: boolean
          id: string
          provider_id: string
          provider_name: string
          response_time_ms?: number | null
          run_id: string
          signals_fetched?: number | null
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          healthy?: boolean
          id?: string
          provider_id?: string
          provider_name?: string
          response_time_ms?: number | null
          run_id?: string
          signals_fetched?: number | null
        }
        Relationships: []
      }
      radar_scans: {
        Row: {
          corridor_id: string | null
          end_lat: number | null
          end_lng: number | null
          expires_at: string | null
          id: string
          initiated_at: string
          mode: string
          start_lat: number
          start_lng: number
          status: string
        }
        Insert: {
          corridor_id?: string | null
          end_lat?: number | null
          end_lng?: number | null
          expires_at?: string | null
          id: string
          initiated_at: string
          mode: string
          start_lat: number
          start_lng: number
          status: string
        }
        Update: {
          corridor_id?: string | null
          end_lat?: number | null
          end_lng?: number | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          mode?: string
          start_lat?: number
          start_lng?: number
          status?: string
        }
        Relationships: []
      }
      raw_acled_events: {
        Row: {
          admin1: string | null
          admin2: string | null
          country: string
          event_date: string
          event_id_cnty: string
          event_type: string
          fatalities: string
          fetched_at: string
          id: string
          latitude: string
          location: string
          longitude: string
          notes: string | null
          run_id: string
          source: string | null
          sub_event_type: string | null
        }
        Insert: {
          admin1?: string | null
          admin2?: string | null
          country: string
          event_date: string
          event_id_cnty: string
          event_type: string
          fatalities?: string
          fetched_at: string
          id: string
          latitude: string
          location: string
          longitude: string
          notes?: string | null
          run_id: string
          source?: string | null
          sub_event_type?: string | null
        }
        Update: {
          admin1?: string | null
          admin2?: string | null
          country?: string
          event_date?: string
          event_id_cnty?: string
          event_type?: string
          fatalities?: string
          fetched_at?: string
          id?: string
          latitude?: string
          location?: string
          longitude?: string
          notes?: string | null
          run_id?: string
          source?: string | null
          sub_event_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_acled_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      raw_dhis2_data_values: {
        Row: {
          country: string | null
          data_element: string
          disease: string | null
          fetched_at: string
          id: string
          org_unit_latitude: string | null
          org_unit_longitude: string | null
          org_unit_name: string
          period: string
          run_id: string
          value: string
        }
        Insert: {
          country?: string | null
          data_element: string
          disease?: string | null
          fetched_at: string
          id: string
          org_unit_latitude?: string | null
          org_unit_longitude?: string | null
          org_unit_name: string
          period: string
          run_id: string
          value: string
        }
        Update: {
          country?: string | null
          data_element?: string
          disease?: string | null
          fetched_at?: string
          id?: string
          org_unit_latitude?: string | null
          org_unit_longitude?: string | null
          org_unit_name?: string
          period?: string
          run_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_dhis2_data_values_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      raw_dtm_flows: {
        Row: {
          admin1: string | null
          country: string
          date: string
          destination: string
          fetched_at: string
          id: string
          individuals: number
          lat: number | null
          lng: number | null
          origin: string
          raw_json: string | null
          run_id: string
        }
        Insert: {
          admin1?: string | null
          country: string
          date: string
          destination: string
          fetched_at: string
          id: string
          individuals: number
          lat?: number | null
          lng?: number | null
          origin: string
          raw_json?: string | null
          run_id: string
        }
        Update: {
          admin1?: string | null
          country?: string
          date?: string
          destination?: string
          fetched_at?: string
          id?: string
          individuals?: number
          lat?: number | null
          lng?: number | null
          origin?: string
          raw_json?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_dtm_flows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      real_crossing_points: {
        Row: {
          alt_names: string | null
          closure_periods: string | null
          country_a: string
          country_b: string
          crossing_type: string
          id: string
          iom_fmp_active: boolean | null
          lat: number
          lng: number
          monthly_avg_flow: number | null
          name: string
          peak_daily_flow: number | null
          source: string
          status: string | null
        }
        Insert: {
          alt_names?: string | null
          closure_periods?: string | null
          country_a: string
          country_b: string
          crossing_type: string
          id: string
          iom_fmp_active?: boolean | null
          lat: number
          lng: number
          monthly_avg_flow?: number | null
          name: string
          peak_daily_flow?: number | null
          source: string
          status?: string | null
        }
        Update: {
          alt_names?: string | null
          closure_periods?: string | null
          country_a?: string
          country_b?: string
          crossing_type?: string
          id?: string
          iom_fmp_active?: boolean | null
          lat?: number
          lng?: number
          monthly_avg_flow?: number | null
          name?: string
          peak_daily_flow?: number | null
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      route_activity: {
        Row: {
          activity_status: string
          avg_magnitude: number | null
          avg_truth_score: number | null
          corridor_id: string | null
          dominant_signal_type: string | null
          end_node: string
          estimated_daily_crossings: number | null
          id: string
          notes: string | null
          observation_date: string
          route_name: string
          signal_count: number
          start_node: string
        }
        Insert: {
          activity_status: string
          avg_magnitude?: number | null
          avg_truth_score?: number | null
          corridor_id?: string | null
          dominant_signal_type?: string | null
          end_node: string
          estimated_daily_crossings?: number | null
          id: string
          notes?: string | null
          observation_date: string
          route_name: string
          signal_count?: number
          start_node: string
        }
        Update: {
          activity_status?: string
          avg_magnitude?: number | null
          avg_truth_score?: number | null
          corridor_id?: string | null
          dominant_signal_type?: string | null
          end_node?: string
          estimated_daily_crossings?: number | null
          id?: string
          notes?: string | null
          observation_date?: string
          route_name?: string
          signal_count?: number
          start_node?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_activity_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
        ]
      }
      sentinel_signals: {
        Row: {
          confidence: number
          corridor_id: string | null
          description: string
          evidence_type: string
          id: string
          ingested_at: string
          lat: number
          lng: number
          source: string
          timestamp: string
          weight: number
        }
        Insert: {
          confidence: number
          corridor_id?: string | null
          description: string
          evidence_type: string
          id: string
          ingested_at: string
          lat: number
          lng: number
          source: string
          timestamp: string
          weight: number
        }
        Update: {
          confidence?: number
          corridor_id?: string | null
          description?: string
          evidence_type?: string
          id?: string
          ingested_at?: string
          lat?: number
          lng?: number
          source?: string
          timestamp?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "sentinel_signals_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      temporal_flows: {
        Row: {
          corridor_id: string
          flow_count: number
          flow_direction: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          provenance: string | null
          source_report: string
          source_url: string | null
        }
        Insert: {
          corridor_id: string
          flow_count: number
          flow_direction: string
          id: string
          notes?: string | null
          period_end: string
          period_start: string
          provenance?: string | null
          source_report: string
          source_url?: string | null
        }
        Update: {
          corridor_id?: string
          flow_count?: number
          flow_direction?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          provenance?: string | null
          source_report?: string
          source_url?: string | null
        }
        Relationships: []
      }
      terrain_friction_surfaces: {
        Row: {
          best_friction: number
          best_mode: string
          computed_at: string
          corridor_id: string
          distance_km: number
          elevation_gain_m: number
          end_lat: number
          end_lng: number
          friction_canoe: number
          friction_foot: number
          friction_livestock: number
          friction_motorcycle: number
          friction_vehicle: number
          id: string
          land_cover: string
          rainfall_anomaly: number | null
          river_width_m: number | null
          road_quality: number | null
          seasonal_phase: string
          segment_index: number
          slope_deg: number
          start_lat: number
          start_lng: number
        }
        Insert: {
          best_friction: number
          best_mode: string
          computed_at: string
          corridor_id: string
          distance_km: number
          elevation_gain_m: number
          end_lat: number
          end_lng: number
          friction_canoe: number
          friction_foot: number
          friction_livestock: number
          friction_motorcycle: number
          friction_vehicle: number
          id: string
          land_cover: string
          rainfall_anomaly?: number | null
          river_width_m?: number | null
          road_quality?: number | null
          seasonal_phase: string
          segment_index: number
          slope_deg: number
          start_lat: number
          start_lng: number
        }
        Update: {
          best_friction?: number
          best_mode?: string
          computed_at?: string
          corridor_id?: string
          distance_km?: number
          elevation_gain_m?: number
          end_lat?: number
          end_lng?: number
          friction_canoe?: number
          friction_foot?: number
          friction_livestock?: number
          friction_motorcycle?: number
          friction_vehicle?: number
          id?: string
          land_cover?: string
          rainfall_anomaly?: number | null
          river_width_m?: number | null
          road_quality?: number | null
          seasonal_phase?: string
          segment_index?: number
          slope_deg?: number
          start_lat?: number
          start_lng?: number
        }
        Relationships: [
          {
            foreignKeyName: "terrain_friction_surfaces_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
        ]
      }
      trinity_syntheses: {
        Row: {
          corridor_id: string
          corridor_score: number | null
          dcx0_healthy: boolean | null
          dcx1_healthy: boolean | null
          dcx2_healthy: boolean | null
          end_node: string | null
          evidence_count: number | null
          field_notes: string | null
          id: string
          latency_ms: number | null
          loop_complete: boolean
          request_id: string
          risk_class: string | null
          run_id: string | null
          start_node: string | null
          synthesis_text: string
          synthesized_at: string
          trinity_hash: string
        }
        Insert: {
          corridor_id: string
          corridor_score?: number | null
          dcx0_healthy?: boolean | null
          dcx1_healthy?: boolean | null
          dcx2_healthy?: boolean | null
          end_node?: string | null
          evidence_count?: number | null
          field_notes?: string | null
          id: string
          latency_ms?: number | null
          loop_complete?: boolean
          request_id: string
          risk_class?: string | null
          run_id?: string | null
          start_node?: string | null
          synthesis_text: string
          synthesized_at: string
          trinity_hash: string
        }
        Update: {
          corridor_id?: string
          corridor_score?: number | null
          dcx0_healthy?: boolean | null
          dcx1_healthy?: boolean | null
          dcx2_healthy?: boolean | null
          end_node?: string | null
          evidence_count?: number | null
          field_notes?: string | null
          id?: string
          latency_ms?: number | null
          loop_complete?: boolean
          request_id?: string
          risk_class?: string | null
          run_id?: string | null
          start_node?: string | null
          synthesis_text?: string
          synthesized_at?: string
          trinity_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "trinity_syntheses_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridor_candidates"
            referencedColumns: ["corridor_id"]
          },
          {
            foreignKeyName: "trinity_syntheses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "moscript_runs"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "trinity_syntheses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      truth_engine_runs: {
        Row: {
          avg_truth_score: number | null
          created_at: string
          id: string
          lane_id: string | null
          max_signal_age_hours: number | null
          min_truth_score: number | null
          mock_rejected: number | null
          rejected: number
          rejection_reasons: string | null
          run_id: string
          run_mode: string
          stale_rejected: number | null
          total_signals: number
          truth_passed: number
          weak_rejected: number | null
        }
        Insert: {
          avg_truth_score?: number | null
          created_at: string
          id: string
          lane_id?: string | null
          max_signal_age_hours?: number | null
          min_truth_score?: number | null
          mock_rejected?: number | null
          rejected: number
          rejection_reasons?: string | null
          run_id: string
          run_mode: string
          stale_rejected?: number | null
          total_signals: number
          truth_passed: number
          weak_rejected?: number | null
        }
        Update: {
          avg_truth_score?: number | null
          created_at?: string
          id?: string
          lane_id?: string | null
          max_signal_age_hours?: number | null
          min_truth_score?: number | null
          mock_rejected?: number | null
          rejected?: number
          rejection_reasons?: string | null
          run_id?: string
          run_mode?: string
          stale_rejected?: number | null
          total_signals?: number
          truth_passed?: number
          weak_rejected?: number | null
        }
        Relationships: []
      }
      truth_gate_validations: {
        Row: {
          confidence: number | null
          errors: string | null
          evidence_description: string | null
          evidence_source: string | null
          gate_type: string
          id: string
          input_type: string
          is_valid: boolean
          validated_at: string
        }
        Insert: {
          confidence?: number | null
          errors?: string | null
          evidence_description?: string | null
          evidence_source?: string | null
          gate_type: string
          id: string
          input_type: string
          is_valid: boolean
          validated_at: string
        }
        Update: {
          confidence?: number | null
          errors?: string | null
          evidence_description?: string | null
          evidence_source?: string | null
          gate_type?: string
          id?: string
          input_type?: string
          is_valid?: boolean
          validated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      woo_verdicts: {
        Row: {
          anchor_index: number | null
          blocked_reason: string | null
          cleared: boolean
          cleared_at: string | null
          frost_stillness: number | null
          gate_1_origin_pass: boolean | null
          gate_1_reason: string | null
          gate_2_fire_pass: boolean | null
          gate_2_reason: string | null
          gate_2_sig_freq: number | null
          gate_3_clarity: number | null
          gate_3_echo_valid: boolean | null
          gate_3_frost_pass: boolean | null
          gate_3_purity: number | null
          gate_3_reason: string | null
          gate_3_silence_ms: number | null
          gate_4_corruption_index: number | null
          gate_4_corruption_pass: boolean | null
          gate_4_reason: string | null
          id: string
          integrity_hash: string
          judged_at: string
          reason: string
          request_id: string
          woo_state: string
        }
        Insert: {
          anchor_index?: number | null
          blocked_reason?: string | null
          cleared: boolean
          cleared_at?: string | null
          frost_stillness?: number | null
          gate_1_origin_pass?: boolean | null
          gate_1_reason?: string | null
          gate_2_fire_pass?: boolean | null
          gate_2_reason?: string | null
          gate_2_sig_freq?: number | null
          gate_3_clarity?: number | null
          gate_3_echo_valid?: boolean | null
          gate_3_frost_pass?: boolean | null
          gate_3_purity?: number | null
          gate_3_reason?: string | null
          gate_3_silence_ms?: number | null
          gate_4_corruption_index?: number | null
          gate_4_corruption_pass?: boolean | null
          gate_4_reason?: string | null
          id: string
          integrity_hash: string
          judged_at: string
          reason: string
          request_id: string
          woo_state: string
        }
        Update: {
          anchor_index?: number | null
          blocked_reason?: string | null
          cleared?: boolean
          cleared_at?: string | null
          frost_stillness?: number | null
          gate_1_origin_pass?: boolean | null
          gate_1_reason?: string | null
          gate_2_fire_pass?: boolean | null
          gate_2_reason?: string | null
          gate_2_sig_freq?: number | null
          gate_3_clarity?: number | null
          gate_3_echo_valid?: boolean | null
          gate_3_frost_pass?: boolean | null
          gate_3_purity?: number | null
          gate_3_reason?: string | null
          gate_3_silence_ms?: number | null
          gate_4_corruption_index?: number | null
          gate_4_corruption_pass?: boolean | null
          gate_4_reason?: string | null
          id?: string
          integrity_hash?: string
          judged_at?: string
          reason?: string
          request_id?: string
          woo_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "woo_verdicts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "moscript_runs"
            referencedColumns: ["request_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "analyst", "viewer"],
    },
  },
} as const
