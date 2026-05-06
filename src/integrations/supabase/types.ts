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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_history: {
        Row: {
          created_at: string
          data_source_key: string | null
          id: string
          organization_id: string
          property_id: string | null
          query_params: Json | null
          result_summary: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_source_key?: string | null
          id?: string
          organization_id: string
          property_id?: string | null
          query_params?: Json | null
          result_summary?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_source_key?: string | null
          id?: string
          organization_id?: string
          property_id?: string | null
          query_params?: Json | null
          result_summary?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      data_layer_features: {
        Row: {
          area_ha: number | null
          bbox_max_lat: number | null
          bbox_max_lng: number | null
          bbox_min_lat: number | null
          bbox_min_lng: number | null
          created_at: string
          data_source_key: string
          external_id: string | null
          geometry: unknown
          geometry_geojson: Json
          id: string
          layer_id: string
          municipality: string | null
          properties_json: Json
          source_updated_at: string | null
          uf: string | null
        }
        Insert: {
          area_ha?: number | null
          bbox_max_lat?: number | null
          bbox_max_lng?: number | null
          bbox_min_lat?: number | null
          bbox_min_lng?: number | null
          created_at?: string
          data_source_key: string
          external_id?: string | null
          geometry?: unknown
          geometry_geojson: Json
          id?: string
          layer_id: string
          municipality?: string | null
          properties_json?: Json
          source_updated_at?: string | null
          uf?: string | null
        }
        Update: {
          area_ha?: number | null
          bbox_max_lat?: number | null
          bbox_max_lng?: number | null
          bbox_min_lat?: number | null
          bbox_min_lng?: number | null
          created_at?: string
          data_source_key?: string
          external_id?: string | null
          geometry?: unknown
          geometry_geojson?: Json
          id?: string
          layer_id?: string
          municipality?: string | null
          properties_json?: Json
          source_updated_at?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_layer_features_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "data_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      data_layers: {
        Row: {
          color: string
          created_at: string
          data_source_key: string
          description: string | null
          geometry_type: Database["public"]["Enums"]["layer_geometry_type"]
          id: string
          last_sync_at: string | null
          layer_type: Database["public"]["Enums"]["layer_type"]
          name: string
          status: Database["public"]["Enums"]["data_layer_status"]
          updated_at: string
          visible_to_users: boolean
        }
        Insert: {
          color?: string
          created_at?: string
          data_source_key: string
          description?: string | null
          geometry_type?: Database["public"]["Enums"]["layer_geometry_type"]
          id?: string
          last_sync_at?: string | null
          layer_type?: Database["public"]["Enums"]["layer_type"]
          name: string
          status?: Database["public"]["Enums"]["data_layer_status"]
          updated_at?: string
          visible_to_users?: boolean
        }
        Update: {
          color?: string
          created_at?: string
          data_source_key?: string
          description?: string | null
          geometry_type?: Database["public"]["Enums"]["layer_geometry_type"]
          id?: string
          last_sync_at?: string | null
          layer_type?: Database["public"]["Enums"]["layer_type"]
          name?: string
          status?: Database["public"]["Enums"]["data_layer_status"]
          updated_at?: string
          visible_to_users?: boolean
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          category: string | null
          config: Json | null
          created_at: string
          description: string | null
          enabled: boolean
          endpoint_url: string | null
          id: string
          key: string
          last_sync_at: string | null
          name: string
          source_kind: Database["public"]["Enums"]["data_source_kind"]
          source_type: string | null
          status: Database["public"]["Enums"]["data_source_status"]
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          id?: string
          key: string
          last_sync_at?: string | null
          name: string
          source_kind?: Database["public"]["Enums"]["data_source_kind"]
          source_type?: string | null
          status?: Database["public"]["Enums"]["data_source_status"]
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          id?: string
          key?: string
          last_sync_at?: string | null
          name?: string
          source_kind?: Database["public"]["Enums"]["data_source_kind"]
          source_type?: string | null
          status?: Database["public"]["Enums"]["data_source_status"]
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diagnostic_rules: {
        Row: {
          category: Database["public"]["Enums"]["rule_category"]
          condition_json: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string
          report_message: string
          severity: Database["public"]["Enums"]["severidade"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["rule_category"]
          condition_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id: string
          report_message: string
          severity?: Database["public"]["Enums"]["severidade"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["rule_category"]
          condition_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string
          report_message?: string
          severity?: Database["public"]["Enums"]["severidade"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_analysis: {
        Row: {
          analyzed_at: string
          desmatamento_area_ha: number | null
          embargo_area_ha: number | null
          has_app_violation: boolean | null
          has_desmatamento: boolean | null
          has_embargo: boolean | null
          has_reserva_legal_deficit: boolean | null
          id: string
          organization_id: string
          property_id: string
          raw_payload: Json | null
        }
        Insert: {
          analyzed_at?: string
          desmatamento_area_ha?: number | null
          embargo_area_ha?: number | null
          has_app_violation?: boolean | null
          has_desmatamento?: boolean | null
          has_embargo?: boolean | null
          has_reserva_legal_deficit?: boolean | null
          id?: string
          organization_id: string
          property_id: string
          raw_payload?: Json | null
        }
        Update: {
          analyzed_at?: string
          desmatamento_area_ha?: number | null
          embargo_area_ha?: number | null
          has_app_violation?: boolean | null
          has_desmatamento?: boolean | null
          has_embargo?: boolean | null
          has_reserva_legal_deficit?: boolean | null
          id?: string
          organization_id?: string
          property_id?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_analysis_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_licenses: {
        Row: {
          attachment_name: string | null
          attachment_uploaded_at: string | null
          attachment_url: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_body: string | null
          license_number: string | null
          license_type: string
          licensed_activity: string | null
          notes: string | null
          organization_id: string
          property_id: string | null
          status: Database["public"]["Enums"]["license_status"]
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_uploaded_at?: string | null
          attachment_url?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_body?: string | null
          license_number?: string | null
          license_type: string
          licensed_activity?: string | null
          notes?: string | null
          organization_id: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_uploaded_at?: string | null
          attachment_url?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_body?: string | null
          license_number?: string | null
          license_type?: string
          licensed_activity?: string | null
          notes?: string | null
          organization_id?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "environmental_licenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_licenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          failed_features: number
          features_imported: number
          finished_at: string | null
          geojson_path: string | null
          id: string
          layer_id: string | null
          log: string | null
          organization_id: string | null
          processed_features: number
          properties_linked: number
          provider_id: string
          source_label: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["integration_job_status"]
          storage_path: string | null
          total_features: number | null
          triggered_by: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          failed_features?: number
          features_imported?: number
          finished_at?: string | null
          geojson_path?: string | null
          id?: string
          layer_id?: string | null
          log?: string | null
          organization_id?: string | null
          processed_features?: number
          properties_linked?: number
          provider_id: string
          source_label?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["integration_job_status"]
          storage_path?: string | null
          total_features?: number | null
          triggered_by?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          failed_features?: number
          features_imported?: number
          finished_at?: string | null
          geojson_path?: string | null
          id?: string
          layer_id?: string | null
          log?: string | null
          organization_id?: string | null
          processed_features?: number
          properties_linked?: number
          provider_id?: string
          source_label?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["integration_job_status"]
          storage_path?: string | null
          total_features?: number | null
          triggered_by?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_jobs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          config: Json
          created_at: string
          data_source_key: string | null
          default_color: string
          description: string | null
          id: string
          key: string
          kind: Database["public"]["Enums"]["integration_provider_kind"]
          layer_type: Database["public"]["Enums"]["layer_type"]
          name: string
          status: Database["public"]["Enums"]["integration_provider_status"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          data_source_key?: string | null
          default_color?: string
          description?: string | null
          id?: string
          key: string
          kind?: Database["public"]["Enums"]["integration_provider_kind"]
          layer_type?: Database["public"]["Enums"]["layer_type"]
          name: string
          status?: Database["public"]["Enums"]["integration_provider_status"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          data_source_key?: string | null
          default_color?: string
          description?: string | null
          id?: string
          key?: string
          kind?: Database["public"]["Enums"]["integration_provider_kind"]
          layer_type?: Database["public"]["Enums"]["layer_type"]
          name?: string
          status?: Database["public"]["Enums"]["integration_provider_status"]
          updated_at?: string
        }
        Relationships: []
      }
      license_alerts: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["license_alert_kind"]
          license_id: string
          organization_id: string
          status: Database["public"]["Enums"]["alert_status"]
          triggered_at: string
        }
        Insert: {
          id?: string
          kind: Database["public"]["Enums"]["license_alert_kind"]
          license_id: string
          organization_id: string
          status?: Database["public"]["Enums"]["alert_status"]
          triggered_at?: string
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["license_alert_kind"]
          license_id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_alerts_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "environmental_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          description: string | null
          id: string
          organization_id: string
          property_id: string
          resolved_at: string | null
          severidade: Database["public"]["Enums"]["severidade"]
          source: string | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Insert: {
          alert_date?: string
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          property_id: string
          resolved_at?: string | null
          severidade?: Database["public"]["Enums"]["severidade"]
          source?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          property_id?: string
          resolved_at?: string | null
          severidade?: Database["public"]["Enums"]["severidade"]
          source?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_onboarding: {
        Row: {
          created_at: string
          has_created_client: boolean
          has_created_property: boolean
          has_generated_report: boolean
          has_run_diagnosis: boolean
          onboarding_completed_at: string | null
          onboarding_dismissed: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_created_client?: boolean
          has_created_property?: boolean
          has_generated_report?: boolean
          has_run_diagnosis?: boolean
          onboarding_completed_at?: string | null
          onboarding_dismissed?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_created_client?: boolean
          has_created_property?: boolean
          has_generated_report?: boolean
          has_run_diagnosis?: boolean
          onboarding_completed_at?: string | null
          onboarding_dismissed?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string
          plan_key: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          plan_key: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          plan_key?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_diagnostics: {
        Row: {
          description: string | null
          generated_at: string
          id: string
          kind: Database["public"]["Enums"]["diagnostic_kind"]
          organization_id: string
          property_id: string
          rule_key: string | null
          severidade: Database["public"]["Enums"]["severidade"]
          title: string
        }
        Insert: {
          description?: string | null
          generated_at?: string
          id?: string
          kind: Database["public"]["Enums"]["diagnostic_kind"]
          organization_id: string
          property_id: string
          rule_key?: string | null
          severidade?: Database["public"]["Enums"]["severidade"]
          title: string
        }
        Update: {
          description?: string | null
          generated_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["diagnostic_kind"]
          organization_id?: string
          property_id?: string
          rule_key?: string | null
          severidade?: Database["public"]["Enums"]["severidade"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_diagnostics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_diagnostics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_geometries: {
        Row: {
          bbox: Json | null
          created_at: string
          geojson: Json
          id: string
          organization_id: string
          property_id: string
          source: string | null
        }
        Insert: {
          bbox?: Json | null
          created_at?: string
          geojson: Json
          id?: string
          organization_id: string
          property_id: string
          source?: string | null
        }
        Update: {
          bbox?: Json | null
          created_at?: string
          geojson?: Json
          id?: string
          organization_id?: string
          property_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_geometries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_geometries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_registry_data: {
        Row: {
          cartorio_name: string | null
          created_at: string
          data_emissao: string | null
          folha: string | null
          id: string
          livro: string | null
          matricula_number: string | null
          observacoes: string | null
          organization_id: string
          property_id: string
          raw_payload: Json | null
        }
        Insert: {
          cartorio_name?: string | null
          created_at?: string
          data_emissao?: string | null
          folha?: string | null
          id?: string
          livro?: string | null
          matricula_number?: string | null
          observacoes?: string | null
          organization_id: string
          property_id: string
          raw_payload?: Json | null
        }
        Update: {
          cartorio_name?: string | null
          created_at?: string
          data_emissao?: string | null
          folha?: string | null
          id?: string
          livro?: string | null
          matricula_number?: string | null
          observacoes?: string | null
          organization_id?: string
          property_id?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "property_registry_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_registry_data_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rural_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rural_properties: {
        Row: {
          area_ha: number | null
          car_code: string | null
          car_status: Database["public"]["Enums"]["car_status"] | null
          centroid_lat: number | null
          centroid_lng: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_consultation_at: string | null
          matricula_confiabilidade:
            | Database["public"]["Enums"]["confiabilidade"]
            | null
          matricula_number: string | null
          matricula_source:
            | Database["public"]["Enums"]["matricula_source"]
            | null
          monitorado: boolean
          municipio: string | null
          name: string
          notes: string | null
          organization_id: string
          owner_name: string | null
          sigef_status: Database["public"]["Enums"]["sigef_status"] | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          area_ha?: number | null
          car_code?: string | null
          car_status?: Database["public"]["Enums"]["car_status"] | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_consultation_at?: string | null
          matricula_confiabilidade?:
            | Database["public"]["Enums"]["confiabilidade"]
            | null
          matricula_number?: string | null
          matricula_source?:
            | Database["public"]["Enums"]["matricula_source"]
            | null
          monitorado?: boolean
          municipio?: string | null
          name: string
          notes?: string | null
          organization_id: string
          owner_name?: string | null
          sigef_status?: Database["public"]["Enums"]["sigef_status"] | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          area_ha?: number | null
          car_code?: string | null
          car_status?: Database["public"]["Enums"]["car_status"] | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_consultation_at?: string | null
          matricula_confiabilidade?:
            | Database["public"]["Enums"]["confiabilidade"]
            | null
          matricula_number?: string | null
          matricula_source?:
            | Database["public"]["Enums"]["matricula_source"]
            | null
          monitorado?: boolean
          municipio?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          owner_name?: string | null
          sigef_status?: Database["public"]["Enums"]["sigef_status"] | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rural_properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rural_properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulated_sync_findings: {
        Row: {
          created_at: string
          data: Json | null
          data_source_key: string
          description: string | null
          finding_type: string
          id: string
          organization_id: string
          property_id: string | null
          run_id: string
          severidade: Database["public"]["Enums"]["severidade"]
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          data_source_key: string
          description?: string | null
          finding_type: string
          id?: string
          organization_id: string
          property_id?: string | null
          run_id: string
          severidade?: Database["public"]["Enums"]["severidade"]
          title: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          data_source_key?: string
          description?: string | null
          finding_type?: string
          id?: string
          organization_id?: string
          property_id?: string | null
          run_id?: string
          severidade?: Database["public"]["Enums"]["severidade"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulated_sync_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "simulated_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      simulated_sync_runs: {
        Row: {
          created_at: string
          data_source_key: string
          findings_count: number
          id: string
          message: string | null
          organization_id: string
          property_id: string | null
          raw_payload: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          data_source_key: string
          findings_count?: number
          id?: string
          message?: string | null
          organization_id: string
          property_id?: string | null
          raw_payload?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          data_source_key?: string
          findings_count?: number
          id?: string
          message?: string | null
          organization_id?: string
          property_id?: string | null
          raw_payload?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          can_export_reports: boolean
          can_use_custom_rules: boolean
          can_use_simulated_sync: boolean
          created_at: string
          id: string
          is_active: boolean
          key: string
          max_licenses: number
          max_properties: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          can_export_reports?: boolean
          can_use_custom_rules?: boolean
          can_use_simulated_sync?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          max_licenses?: number
          max_properties?: number
          max_users?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          can_export_reports?: boolean
          can_use_custom_rules?: boolean
          can_use_simulated_sync?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          max_licenses?: number
          max_properties?: number
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          priority: string
          report_type: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          report_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          report_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _coords_minmax: {
        Args: { mn: number[]; mx: number[]; node: Json }
        Returns: Record<string, unknown>
      }
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_organization_details: { Args: { _org_id: string }; Returns: Json }
      admin_organizations_overview: {
        Args: never
        Returns: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          expires_at: string
          id: string
          licenses_count: number
          name: string
          plan_key: string
          properties_count: number
          slug: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          users_count: number
        }[]
      }
      admin_platform_overview: { Args: never; Returns: Json }
      admin_users_overview: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_super_admin: boolean
          organization_id: string
          organization_name: string
          roles: string[]
        }[]
      }
      current_org_id: { Args: never; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geojson_bbox: { Args: { geom: Json }; Returns: number[] }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_feature_by_id: {
        Args: { _feature_id: string }
        Returns: {
          area_ha: number | null
          bbox_max_lat: number | null
          bbox_max_lng: number | null
          bbox_min_lat: number | null
          bbox_min_lng: number | null
          created_at: string
          data_source_key: string
          external_id: string | null
          geometry: unknown
          geometry_geojson: Json
          id: string
          layer_id: string
          municipality: string | null
          properties_json: Json
          source_updated_at: string | null
          uf: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "data_layer_features"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_features_density: {
        Args: { _layer_id: string; _limit?: number }
        Returns: {
          id: string
          lat: number
          lng: number
        }[]
      }
      get_features_in_bbox: {
        Args: {
          _layer_id: string
          _max_lat: number
          _max_lng: number
          _min_lat: number
          _min_lng: number
          _zoom: number
        }
        Returns: {
          area_ha: number | null
          bbox_max_lat: number | null
          bbox_max_lng: number | null
          bbox_min_lat: number | null
          bbox_min_lng: number | null
          created_at: string
          data_source_key: string
          external_id: string | null
          geometry: unknown
          geometry_geojson: Json
          id: string
          layer_id: string
          municipality: string | null
          properties_json: Json
          source_updated_at: string | null
          uf: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "data_layer_features"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_vector_tile: {
        Args: { _layer_id: string; _x: number; _y: number; _z: number }
        Returns: string
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_layer_feature_as_property: {
        Args: { _client_id?: string; _feature_id: string; _name?: string }
        Returns: string
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      link_car_features_to_properties: {
        Args: { _layer_id: string }
        Returns: number
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refresh_license_alerts: {
        Args: { _license_id: string }
        Returns: undefined
      }
      run_property_diagnostics: {
        Args: { _property_id: string }
        Returns: undefined
      }
      run_simulated_sync: {
        Args: { _data_source_key: string; _property_id?: string }
        Returns: string
      }
      search_documental_sources: {
        Args: { _id_type?: string; _identifier: string }
        Returns: Json
      }
      seed_default_diagnostic_rules: {
        Args: { _org_id: string }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      sync_data_layer_simulated: {
        Args: {
          _color?: string
          _data_source_key: string
          _layer_name?: string
          _layer_type?: Database["public"]["Enums"]["layer_type"]
        }
        Returns: string
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      alert_status: "novo" | "visualizado" | "resolvido"
      app_role: "admin" | "tecnico" | "financeiro" | "visualizador"
      billing_cycle: "mensal" | "anual"
      car_status:
        | "ativo"
        | "pendente"
        | "cancelado"
        | "suspenso"
        | "nao_cadastrado"
      confiabilidade: "alta" | "media" | "baixa"
      data_layer_status: "ativa" | "planejada" | "indisponivel"
      data_source_kind: "geoespacial" | "documental"
      data_source_status: "planejada" | "ativa" | "instavel" | "indisponivel"
      diagnostic_kind:
        | "regular"
        | "irregularidade_ambiental"
        | "sem_certificacao"
        | "embargo"
        | "desmatamento"
        | "sobreposicao"
        | "documental"
        | "outro"
      integration_job_status:
        | "pendente"
        | "processando"
        | "sucesso"
        | "erro"
        | "cancelado"
      integration_provider_kind:
        | "shapefile_upload"
        | "rest_api"
        | "wms_wfs"
        | "scraping"
        | "manual"
      integration_provider_status: "ativo" | "planejado" | "desativado"
      invite_status: "pendente" | "aceito" | "expirado" | "revogado"
      layer_geometry_type: "polygon" | "multipolygon" | "point" | "line"
      layer_type:
        | "car"
        | "sigef"
        | "embargo"
        | "desmatamento"
        | "uso_solo"
        | "outros"
      license_alert_kind: "180_dias" | "90_dias" | "30_dias" | "vencida"
      license_status:
        | "ativa"
        | "vencida"
        | "em_renovacao"
        | "suspensa"
        | "cancelada"
      matricula_source:
        | "cartorio"
        | "sigef"
        | "car"
        | "declarado"
        | "desconhecida"
      rule_category:
        | "fundiaria"
        | "ambiental"
        | "licenciamento"
        | "monitoramento"
      severidade: "alta" | "media" | "baixa"
      sigef_status:
        | "certificado"
        | "em_analise"
        | "nao_certificado"
        | "desconhecido"
      subscription_status:
        | "ativo"
        | "trial"
        | "pausado"
        | "cancelado"
        | "expirado"
        | "vitalicio"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      alert_status: ["novo", "visualizado", "resolvido"],
      app_role: ["admin", "tecnico", "financeiro", "visualizador"],
      billing_cycle: ["mensal", "anual"],
      car_status: [
        "ativo",
        "pendente",
        "cancelado",
        "suspenso",
        "nao_cadastrado",
      ],
      confiabilidade: ["alta", "media", "baixa"],
      data_layer_status: ["ativa", "planejada", "indisponivel"],
      data_source_kind: ["geoespacial", "documental"],
      data_source_status: ["planejada", "ativa", "instavel", "indisponivel"],
      diagnostic_kind: [
        "regular",
        "irregularidade_ambiental",
        "sem_certificacao",
        "embargo",
        "desmatamento",
        "sobreposicao",
        "documental",
        "outro",
      ],
      integration_job_status: [
        "pendente",
        "processando",
        "sucesso",
        "erro",
        "cancelado",
      ],
      integration_provider_kind: [
        "shapefile_upload",
        "rest_api",
        "wms_wfs",
        "scraping",
        "manual",
      ],
      integration_provider_status: ["ativo", "planejado", "desativado"],
      invite_status: ["pendente", "aceito", "expirado", "revogado"],
      layer_geometry_type: ["polygon", "multipolygon", "point", "line"],
      layer_type: [
        "car",
        "sigef",
        "embargo",
        "desmatamento",
        "uso_solo",
        "outros",
      ],
      license_alert_kind: ["180_dias", "90_dias", "30_dias", "vencida"],
      license_status: [
        "ativa",
        "vencida",
        "em_renovacao",
        "suspensa",
        "cancelada",
      ],
      matricula_source: [
        "cartorio",
        "sigef",
        "car",
        "declarado",
        "desconhecida",
      ],
      rule_category: [
        "fundiaria",
        "ambiental",
        "licenciamento",
        "monitoramento",
      ],
      severidade: ["alta", "media", "baixa"],
      sigef_status: [
        "certificado",
        "em_analise",
        "nao_certificado",
        "desconhecido",
      ],
      subscription_status: [
        "ativo",
        "trial",
        "pausado",
        "cancelado",
        "expirado",
        "vitalicio",
      ],
    },
  },
} as const
