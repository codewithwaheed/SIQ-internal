export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_activity: {
        Row: {
          activity_type: string
          admin_id: string
          created_at: string
          description: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          activity_type: string
          admin_id: string
          created_at?: string
          description: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          activity_type?: string
          admin_id?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_error_logs: {
        Row: {
          error_message: string
          id: string
          request_url: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          error_message: string
          id?: string
          request_url?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          error_message?: string
          id?: string
          request_url?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_evaluation_runs: {
        Row: {
          aggregate_scores: Json
          completed_at: string
          created_at: string | null
          duration_ms: number
          id: string
          individual_results: Json
          prompt_count: number
          run_id: string
          started_at: string
          version: string
        }
        Insert: {
          aggregate_scores: Json
          completed_at: string
          created_at?: string | null
          duration_ms: number
          id?: string
          individual_results: Json
          prompt_count: number
          run_id: string
          started_at: string
          version?: string
        }
        Update: {
          aggregate_scores?: Json
          completed_at?: string
          created_at?: string | null
          duration_ms?: number
          id?: string
          individual_results?: Json
          prompt_count?: number
          run_id?: string
          started_at?: string
          version?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          ai_response_quality: string | null
          category_tags: string[] | null
          comments: string | null
          consultant_id: string
          conversation_id: string | null
          created_at: string
          escalation_id: string | null
          feedback_type: string
          id: string
          is_training_data: boolean | null
          message_id: string | null
          metadata: Json | null
          rating: number | null
          suggested_improvement: string | null
          updated_at: string
        }
        Insert: {
          ai_response_quality?: string | null
          category_tags?: string[] | null
          comments?: string | null
          consultant_id: string
          conversation_id?: string | null
          created_at?: string
          escalation_id?: string | null
          feedback_type: string
          id?: string
          is_training_data?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          rating?: number | null
          suggested_improvement?: string | null
          updated_at?: string
        }
        Update: {
          ai_response_quality?: string | null
          category_tags?: string[] | null
          comments?: string | null
          consultant_id?: string
          conversation_id?: string | null
          created_at?: string
          escalation_id?: string | null
          feedback_type?: string
          id?: string
          is_training_data?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          rating?: number | null
          suggested_improvement?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_logs: {
        Row: {
          answer: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          model_used: string | null
          question: string
          question_category: string | null
          response_analysis: Json | null
          timestamp: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          model_used?: string | null
          question: string
          question_category?: string | null
          response_analysis?: Json | null
          timestamp?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          model_used?: string | null
          question?: string
          question_category?: string | null
          response_analysis?: Json | null
          timestamp?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          tenant_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempted_at: string
          created_at: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_email: string | null
        }
        Insert: {
          attempt_type: string
          attempted_at?: string
          created_at?: string
          id?: string
          ip_address: unknown
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_shared: boolean | null
          org_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          consultant_id: string | null
          created_at: string
          id: string
          org_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consultant_id?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consultant_id?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_evaluations: {
        Row: {
          ai_response_json: Json | null
          ai_response_raw: string
          context_sources: Json | null
          conversation_id: string | null
          created_at: string | null
          id: string
          user_message: string
        }
        Insert: {
          ai_response_json?: Json | null
          ai_response_raw: string
          context_sources?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          user_message: string
        }
        Update: {
          ai_response_json?: Json | null
          ai_response_raw?: string
          context_sources?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_evaluations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          sender_id: string | null
          sender_type: string | null
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          sender_id?: string | null
          sender_type?: string | null
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          sender_id?: string | null
          sender_type?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_applications: {
        Row: {
          additional_info: string | null
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          availability_hours: string
          background_check_consent: boolean
          certifications: string[]
          created_at: string
          email: string
          engagement_preferences: string[]
          experience_years: string
          expertise_areas: string[]
          full_name: string
          id: string
          linkedin: string | null
          nda_agreement: boolean
          other_certifications: string | null
          other_expertise: string | null
          phone: string | null
          portfolio_url: string | null
          resume_url: string | null
          security_clearance: string | null
          smb_experience: boolean | null
          status: string
          testimonials: string | null
          timezone: string
          updated_at: string
          vciso_experience: boolean | null
          work_authorization: string | null
        }
        Insert: {
          additional_info?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          availability_hours: string
          background_check_consent?: boolean
          certifications?: string[]
          created_at?: string
          email: string
          engagement_preferences?: string[]
          experience_years: string
          expertise_areas?: string[]
          full_name: string
          id?: string
          linkedin?: string | null
          nda_agreement?: boolean
          other_certifications?: string | null
          other_expertise?: string | null
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          security_clearance?: string | null
          smb_experience?: boolean | null
          status?: string
          testimonials?: string | null
          timezone: string
          updated_at?: string
          vciso_experience?: boolean | null
          work_authorization?: string | null
        }
        Update: {
          additional_info?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          availability_hours?: string
          background_check_consent?: boolean
          certifications?: string[]
          created_at?: string
          email?: string
          engagement_preferences?: string[]
          experience_years?: string
          expertise_areas?: string[]
          full_name?: string
          id?: string
          linkedin?: string | null
          nda_agreement?: boolean
          other_certifications?: string | null
          other_expertise?: string | null
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          security_clearance?: string | null
          smb_experience?: boolean | null
          status?: string
          testimonials?: string | null
          timezone?: string
          updated_at?: string
          vciso_experience?: boolean | null
          work_authorization?: string | null
        }
        Relationships: []
      }
      consultant_profiles: {
        Row: {
          availability_hours: Json | null
          availability_status: string | null
          avg_response_time_hours: number | null
          bio: string | null
          certifications: string[] | null
          client_feedback_score: number | null
          created_at: string | null
          expertise_areas: string[] | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          last_active_at: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          rating: number | null
          resume_url: string | null
          security_clearance: string | null
          specializations: string[] | null
          success_rate: number | null
          timezone: string | null
          total_escalations_handled: number | null
          updated_at: string | null
          user_id: string
          work_authorization: string | null
          years_experience: number | null
        }
        Insert: {
          availability_hours?: Json | null
          availability_status?: string | null
          avg_response_time_hours?: number | null
          bio?: string | null
          certifications?: string[] | null
          client_feedback_score?: number | null
          created_at?: string | null
          expertise_areas?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_active_at?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          rating?: number | null
          resume_url?: string | null
          security_clearance?: string | null
          specializations?: string[] | null
          success_rate?: number | null
          timezone?: string | null
          total_escalations_handled?: number | null
          updated_at?: string | null
          user_id: string
          work_authorization?: string | null
          years_experience?: number | null
        }
        Update: {
          availability_hours?: Json | null
          availability_status?: string | null
          avg_response_time_hours?: number | null
          bio?: string | null
          certifications?: string[] | null
          client_feedback_score?: number | null
          created_at?: string | null
          expertise_areas?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_active_at?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          rating?: number | null
          resume_url?: string | null
          security_clearance?: string | null
          specializations?: string[] | null
          success_rate?: number | null
          timezone?: string | null
          total_escalations_handled?: number | null
          updated_at?: string | null
          user_id?: string
          work_authorization?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      consultant_replies: {
        Row: {
          attachments: Json | null
          checklist_items: Json | null
          consultant_id: string
          content: string
          created_at: string
          escalation_id: string | null
          helpful_count: number | null
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          checklist_items?: Json | null
          consultant_id: string
          content: string
          created_at?: string
          escalation_id?: string | null
          helpful_count?: number | null
          id?: string
          type: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          checklist_items?: Json | null
          consultant_id?: string
          content?: string
          created_at?: string
          escalation_id?: string | null
          helpful_count?: number | null
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_replies_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          agenda: string | null
          consultant_id: string | null
          created_at: string
          duration_minutes: number
          escalation_id: string | null
          id: string
          meeting_type: string
          meeting_url: string | null
          preparation_notes: string | null
          scheduled_at: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda?: string | null
          consultant_id?: string | null
          created_at?: string
          duration_minutes?: number
          escalation_id?: string | null
          id?: string
          meeting_type: string
          meeting_url?: string | null
          preparation_notes?: string | null
          scheduled_at: string
          status?: string
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda?: string | null
          consultant_id?: string | null
          created_at?: string
          duration_minutes?: number
          escalation_id?: string | null
          id?: string
          meeting_type?: string
          meeting_url?: string | null
          preparation_notes?: string | null
          scheduled_at?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      cve_cache: {
        Row: {
          cached_at: string
          created_at: string
          cve_id: string
          cvss_v2_score: number | null
          cvss_v2_severity: string | null
          cvss_v3_score: number | null
          cvss_v3_severity: string | null
          cwe_list: string[] | null
          description: string | null
          id: string
          modified_date: string | null
          published_date: string | null
          raw_data: Json | null
          reference_urls: string[] | null
          updated_at: string
        }
        Insert: {
          cached_at?: string
          created_at?: string
          cve_id: string
          cvss_v2_score?: number | null
          cvss_v2_severity?: string | null
          cvss_v3_score?: number | null
          cvss_v3_severity?: string | null
          cwe_list?: string[] | null
          description?: string | null
          id?: string
          modified_date?: string | null
          published_date?: string | null
          raw_data?: Json | null
          reference_urls?: string[] | null
          updated_at?: string
        }
        Update: {
          cached_at?: string
          created_at?: string
          cve_id?: string
          cvss_v2_score?: number | null
          cvss_v2_severity?: string | null
          cvss_v3_score?: number | null
          cvss_v3_severity?: string | null
          cwe_list?: string[] | null
          description?: string | null
          id?: string
          modified_date?: string | null
          published_date?: string | null
          raw_data?: Json | null
          reference_urls?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          acceptance_deadline: string | null
          accepted_at: string | null
          consultant_id: string
          content: Json
          created_at: string
          deliverable_type: string
          description: string | null
          escalation_id: string
          file_attachments: Json | null
          id: string
          revision_notes: string | null
          status: string | null
          title: string
          updated_at: string
          user_feedback: string | null
        }
        Insert: {
          acceptance_deadline?: string | null
          accepted_at?: string | null
          consultant_id: string
          content?: Json
          created_at?: string
          deliverable_type: string
          description?: string | null
          escalation_id: string
          file_attachments?: Json | null
          id?: string
          revision_notes?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_feedback?: string | null
        }
        Update: {
          acceptance_deadline?: string | null
          accepted_at?: string | null
          consultant_id?: string
          content?: Json
          created_at?: string
          deliverable_type?: string
          description?: string | null
          escalation_id?: string
          file_attachments?: Json | null
          id?: string
          revision_notes?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_extracted: string | null
          encryption_iv: string | null
          encryption_key_hash: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_encrypted: boolean | null
          org_id: string | null
          processed_at: string | null
          processing_status: string | null
          tags: string[] | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          content_extracted?: string | null
          encryption_iv?: string | null
          encryption_key_hash?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_encrypted?: boolean | null
          org_id?: string | null
          processed_at?: string | null
          processing_status?: string | null
          tags?: string[] | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          content_extracted?: string | null
          encryption_iv?: string | null
          encryption_key_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_encrypted?: boolean | null
          org_id?: string | null
          processed_at?: string | null
          processing_status?: string | null
          tags?: string[] | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_audit: {
        Row: {
          created_at: string | null
          created_by: string | null
          escalation_id: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          escalation_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          escalation_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_audit_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_metrics: {
        Row: {
          complexity_score: number | null
          consultant_response_count: number | null
          created_at: string
          escalation_id: string
          first_response_time: unknown | null
          framework_tags: string[] | null
          id: string
          reopened_count: number | null
          resolution_time: unknown | null
          updated_at: string
          user_satisfaction_feedback: string | null
          user_satisfaction_rating: number | null
        }
        Insert: {
          complexity_score?: number | null
          consultant_response_count?: number | null
          created_at?: string
          escalation_id: string
          first_response_time?: unknown | null
          framework_tags?: string[] | null
          id?: string
          reopened_count?: number | null
          resolution_time?: unknown | null
          updated_at?: string
          user_satisfaction_feedback?: string | null
          user_satisfaction_rating?: number | null
        }
        Update: {
          complexity_score?: number | null
          consultant_response_count?: number | null
          created_at?: string
          escalation_id?: string
          first_response_time?: unknown | null
          framework_tags?: string[] | null
          id?: string
          reopened_count?: number | null
          resolution_time?: unknown | null
          updated_at?: string
          user_satisfaction_feedback?: string | null
          user_satisfaction_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_metrics_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: true
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          assigned_consultant: string | null
          assigned_to: string | null
          chat_context: string
          clearance_requirement: string | null
          consultant_response_count: number | null
          context_pack: Json | null
          created_at: string
          environment_notes: string | null
          escalation_state:
            | Database["public"]["Enums"]["escalation_state"]
            | null
          escalation_type: string | null
          first_response_at: string | null
          framework_tags: string[] | null
          id: string
          industry_context: string | null
          language_preference: string | null
          message_log: Json | null
          org_id: string | null
          pause_reason: string | null
          priority: string | null
          reason: string | null
          resolution_notes: string | null
          resolved_at: string | null
          risk_flags: string[] | null
          routing_decision: Json | null
          routing_inputs: Json | null
          session_id: string | null
          sla_deadline: string | null
          status: string | null
          timer_paused_at: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_consultant?: string | null
          assigned_to?: string | null
          chat_context: string
          clearance_requirement?: string | null
          consultant_response_count?: number | null
          context_pack?: Json | null
          created_at?: string
          environment_notes?: string | null
          escalation_state?:
            | Database["public"]["Enums"]["escalation_state"]
            | null
          escalation_type?: string | null
          first_response_at?: string | null
          framework_tags?: string[] | null
          id?: string
          industry_context?: string | null
          language_preference?: string | null
          message_log?: Json | null
          org_id?: string | null
          pause_reason?: string | null
          priority?: string | null
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_flags?: string[] | null
          routing_decision?: Json | null
          routing_inputs?: Json | null
          session_id?: string | null
          sla_deadline?: string | null
          status?: string | null
          timer_paused_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_consultant?: string | null
          assigned_to?: string | null
          chat_context?: string
          clearance_requirement?: string | null
          consultant_response_count?: number | null
          context_pack?: Json | null
          created_at?: string
          environment_notes?: string | null
          escalation_state?:
            | Database["public"]["Enums"]["escalation_state"]
            | null
          escalation_type?: string | null
          first_response_at?: string | null
          framework_tags?: string[] | null
          id?: string
          industry_context?: string | null
          language_preference?: string | null
          message_log?: Json | null
          org_id?: string | null
          pause_reason?: string | null
          priority?: string | null
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_flags?: string[] | null
          routing_decision?: Json | null
          routing_inputs?: Json | null
          session_id?: string | null
          sla_deadline?: string | null
          status?: string | null
          timer_paused_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_sources: {
        Row: {
          api_key_required: boolean | null
          base_url: string
          content_type: string
          created_at: string
          framework_category: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          name: string
          next_sync_at: string | null
          source_type: string
          sync_frequency: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          api_key_required?: boolean | null
          base_url: string
          content_type: string
          created_at?: string
          framework_category: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          name: string
          next_sync_at?: string | null
          source_type: string
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          api_key_required?: boolean | null
          base_url?: string
          content_type?: string
          created_at?: string
          framework_category?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          name?: string
          next_sync_at?: string | null
          source_type?: string
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Relationships: []
      }
      master_knowledge_base: {
        Row: {
          content_extracted: string | null
          content_hash: string | null
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          framework_category: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          processed_at: string | null
          processing_status: string | null
          source_id: string | null
          source_type: string | null
          source_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
          version: string | null
          version_number: number | null
        }
        Insert: {
          content_extracted?: string | null
          content_hash?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          framework_category: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          processed_at?: string | null
          processing_status?: string | null
          source_id?: string | null
          source_type?: string | null
          source_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: string | null
          version_number?: number | null
        }
        Update: {
          content_extracted?: string | null
          content_hash?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          framework_category?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          processed_at?: string | null
          processing_status?: string | null
          source_id?: string | null
          source_type?: string | null
          source_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: string | null
          version_number?: number | null
        }
        Relationships: []
      }
      master_knowledge_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string | null
          id: string
          master_document_id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          master_document_id: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          master_document_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "master_knowledge_embeddings_master_document_id_fkey"
            columns: ["master_document_id"]
            isOneToOne: false
            referencedRelation: "master_knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      message_processing_queue: {
        Row: {
          ai_response_id: string | null
          completed_at: string | null
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          status: string
          updated_at: string
          user_message_id: string
        }
        Insert: {
          ai_response_id?: string | null
          completed_at?: string | null
          conversation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_message_id: string
        }
        Update: {
          ai_response_id?: string | null
          completed_at?: string | null
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_processing_queue_ai_response_id_fkey"
            columns: ["ai_response_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_processing_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_processing_queue_user_message_id_fkey"
            columns: ["user_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_ratings: {
        Row: {
          conversation_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          message_id: string
          rating_type: string
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id: string
          rating_type: string
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id?: string
          rating_type?: string
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_types: Json | null
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_types?: Json | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_types?: Json | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          escalation_id: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalation_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalation_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          id: string
          joined_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_policies: {
        Row: {
          created_at: string
          id: string
          last_password_change: string | null
          min_length: number
          password_history_count: number
          require_lowercase: boolean
          require_numbers: boolean
          require_symbols: boolean
          require_uppercase: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_password_change?: string | null
          min_length?: number
          password_history_count?: number
          require_lowercase?: boolean
          require_numbers?: boolean
          require_symbols?: boolean
          require_uppercase?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_password_change?: string | null
          min_length?: number
          password_history_count?: number
          require_lowercase?: boolean
          require_numbers?: boolean
          require_symbols?: boolean
          require_uppercase?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          org_id: string | null
          policy_type: string
          template_used: string | null
          title: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          policy_type: string
          template_used?: string | null
          title: string
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          policy_type?: string
          template_used?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_shared: boolean | null
          org_id: string | null
          tags: string[] | null
          template_type: string | null
          title: string
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          template_type?: string | null
          title: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          template_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability_status: string | null
          clearance_level: string | null
          company_name: string | null
          country: string | null
          created_at: string
          current_escalations: number | null
          email: string
          expertise_areas: string[] | null
          first_name: string | null
          id: string
          industry_experience: string[] | null
          languages: string[] | null
          last_active_at: string | null
          last_assignment_at: string | null
          last_name: string | null
          max_concurrent_escalations: number | null
          org_id: string | null
          phone: string | null
          primary_frameworks: string[] | null
          response_time_avg: number | null
          satisfaction_rating: number | null
          status: string | null
          timezone: string | null
          total_escalations_handled: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: string | null
          clearance_level?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          current_escalations?: number | null
          email: string
          expertise_areas?: string[] | null
          first_name?: string | null
          id?: string
          industry_experience?: string[] | null
          languages?: string[] | null
          last_active_at?: string | null
          last_assignment_at?: string | null
          last_name?: string | null
          max_concurrent_escalations?: number | null
          org_id?: string | null
          phone?: string | null
          primary_frameworks?: string[] | null
          response_time_avg?: number | null
          satisfaction_rating?: number | null
          status?: string | null
          timezone?: string | null
          total_escalations_handled?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: string | null
          clearance_level?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          current_escalations?: number | null
          email?: string
          expertise_areas?: string[] | null
          first_name?: string | null
          id?: string
          industry_experience?: string[] | null
          languages?: string[] | null
          last_active_at?: string | null
          last_assignment_at?: string | null
          last_name?: string | null
          max_concurrent_escalations?: number | null
          org_id?: string | null
          phone?: string | null
          primary_frameworks?: string[] | null
          response_time_avg?: number | null
          satisfaction_rating?: number | null
          status?: string | null
          timezone?: string | null
          total_escalations_handled?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_feedback: {
        Row: {
          created_at: string
          escalation_id: string | null
          feedback_text: string | null
          feedback_type: string
          id: string
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          escalation_id?: string | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          escalation_id?: string | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_feedback_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_feedback_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "consultant_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_links: {
        Row: {
          access_count: number | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_shared: boolean | null
          org_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          description: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_name: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_name: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_name?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          billing_cycle_start: string | null
          created_at: string
          email: string
          id: string
          monthly_escalations_used: number | null
          monthly_uploads_used: number | null
          price_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_cycle_start?: string | null
          created_at?: string
          email: string
          id?: string
          monthly_escalations_used?: number | null
          monthly_uploads_used?: number | null
          price_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_cycle_start?: string | null
          created_at?: string
          email?: string
          id?: string
          monthly_escalations_used?: number | null
          monthly_uploads_used?: number | null
          price_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          documents_added: number | null
          documents_processed: number | null
          documents_skipped: number | null
          documents_updated: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          source_id: string
          status: string
          sync_completed_at: string | null
          sync_started_at: string
        }
        Insert: {
          documents_added?: number | null
          documents_processed?: number | null
          documents_skipped?: number | null
          documents_updated?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          source_id: string
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Update: {
          documents_added?: number | null
          documents_processed?: number | null
          documents_skipped?: number | null
          documents_updated?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          id: string
          metric_name: string
          metric_value: Json
          recorded_at: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: Json
          recorded_at?: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: Json
          recorded_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          self_selected: boolean | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          self_selected?: boolean | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          self_selected?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      consultants: {
        Row: {
          availability_status: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          expertise_areas: string[] | null
          first_name: string | null
          id: string | null
          last_assignment_at: string | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_escalations_handled: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      block_suspicious_ip: {
        Args: { ip_address: unknown; reason?: string }
        Returns: undefined
      }
      calculate_sla_deadline: {
        Args: { urgency_level: string; submission_time: string }
        Returns: string
      }
      can_access_conversation: {
        Args: {
          conversation_id: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_update_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_update_role_enhanced: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_user_perform_action: {
        Args: { user_email: string; action_type: string }
        Returns: boolean
      }
      check_enhanced_rate_limit: {
        Args: {
          identifier: string
          action_type: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_enhanced: {
        Args: {
          identifier: string
          max_requests: number
          window_minutes: number
          block_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_audit_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      create_consultant_from_application: {
        Args: { application_id: string; admin_user_id: string }
        Returns: string
      }
      detect_suspicious_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          description: string
          user_id: string
          metadata: Json
          created_at: string
          severity_level: string
        }[]
      }
      generate_invite_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_analytics_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_available_consultants: {
        Args: { expertise_filter?: string[]; limit_val?: number }
        Returns: {
          consultant_id: string
          user_id: string
          email: string
          first_name: string
          last_name: string
          expertise_areas: string[]
          availability_status: string
          rating: number
          total_escalations_handled: number
          avg_response_time_hours: number
          last_active_at: string
        }[]
      }
      get_security_headers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_setting: {
        Args: { setting_name: string }
        Returns: Json
      }
      get_tier_limits: {
        Args: { tier_name: string }
        Returns: {
          upload_limit: number
          escalation_limit: number
        }[]
      }
      get_user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_with_roles: {
        Args: { limit_val?: number; offset_val?: number; search_term?: string }
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          company_name: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
          last_active_at: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_escalation_count: {
        Args: { user_email: string }
        Returns: undefined
      }
      increment_upload_count: {
        Args: { user_email: string }
        Returns: undefined
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_document_access: {
        Args: { document_id: string; access_type: string; user_ip?: unknown }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_severity: string
          p_description: string
          p_user_id?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_metadata?: Json
        }
        Returns: string
      }
      log_security_violation: {
        Args: {
          violation_type: string
          user_id_param?: string
          ip_address_param?: unknown
          metadata_param?: Json
        }
        Returns: undefined
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sanitize_message_content: {
        Args: { content: string }
        Returns: string
      }
      setup_initial_admin: {
        Args: { admin_email: string; admin_password: string }
        Returns: boolean
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_consultant_availability: {
        Args: { consultant_user_id: string; new_status: string }
        Returns: boolean
      }
      update_conversation_status: {
        Args: {
          conversation_id: string
          new_status: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { org_id: string }
        Returns: boolean
      }
      validate_file_upload: {
        Args: {
          file_name: string
          file_size: number
          file_type: string
          magic_bytes?: string
        }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_password_strength_enhanced: {
        Args: { password: string }
        Returns: Json
      }
      validate_security_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          recommendation: string
        }[]
      }
      validate_security_configuration: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          message: string
          severity: string
        }[]
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      audit_action:
        | "LOGIN_SUCCESS"
        | "LOGIN_FAILURE"
        | "LOGOUT"
        | "SIGNUP"
        | "FILE_UPLOADED"
        | "FILE_DOWNLOADED"
        | "FILE_DELETED"
        | "DOCUMENT_VIEWED"
        | "CHAT_STARTED"
        | "CHAT_MESSAGE_SENT"
        | "ESCALATION_REQUESTED"
        | "ESCALATION_ASSIGNED"
        | "ESCALATION_RESOLVED"
        | "CONSULTANT_RESPONSE"
        | "SUBSCRIPTION_CREATED"
        | "SUBSCRIPTION_UPDATED"
        | "SUBSCRIPTION_CANCELLED"
        | "ROLE_CHANGED"
        | "USER_INVITED"
        | "PROFILE_UPDATED"
        | "PASSWORD_CHANGED"
        | "MFA_ENABLED"
        | "MFA_DISABLED"
        | "ADMIN_ACTION"
        | "SYSTEM_EVENT"
      escalation_state:
        | "drafted"
        | "submitted"
        | "routing"
        | "assigned"
        | "in_progress"
        | "awaiting_user"
        | "resolved"
        | "closed"
      user_role: "business_owner" | "consultant" | "admin"
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
      audit_action: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILURE",
        "LOGOUT",
        "SIGNUP",
        "FILE_UPLOADED",
        "FILE_DOWNLOADED",
        "FILE_DELETED",
        "DOCUMENT_VIEWED",
        "CHAT_STARTED",
        "CHAT_MESSAGE_SENT",
        "ESCALATION_REQUESTED",
        "ESCALATION_ASSIGNED",
        "ESCALATION_RESOLVED",
        "CONSULTANT_RESPONSE",
        "SUBSCRIPTION_CREATED",
        "SUBSCRIPTION_UPDATED",
        "SUBSCRIPTION_CANCELLED",
        "ROLE_CHANGED",
        "USER_INVITED",
        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",
        "MFA_ENABLED",
        "MFA_DISABLED",
        "ADMIN_ACTION",
        "SYSTEM_EVENT",
      ],
      escalation_state: [
        "drafted",
        "submitted",
        "routing",
        "assigned",
        "in_progress",
        "awaiting_user",
        "resolved",
        "closed",
      ],
      user_role: ["business_owner", "consultant", "admin"],
    },
  },
} as const
