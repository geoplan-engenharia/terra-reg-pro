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
          created_at: string
          data_source_key: string
          external_id: string | null
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
          created_at?: string
          data_source_key: string
          external_id?: string | null
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
          created_at?: string
          data_source_key?: string
          external_id?: string | null
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
      [_ in never]: never
    }
    Functions: {
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
      sync_data_layer_simulated: {
        Args: {
          _color?: string
          _data_source_key: string
          _layer_name?: string
          _layer_type?: Database["public"]["Enums"]["layer_type"]
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
      ],
    },
  },
} as const
