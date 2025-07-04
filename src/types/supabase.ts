// src/types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          context_summary: string | null
          created_at: string
          id: string
          is_active: boolean
          last_message_at: string | null
          message_count: number
          settings: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context_summary?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          message_count?: number
          settings?: Json
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context_summary?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          message_count?: number
          settings?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          browser_info: Json
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          ip_address: string | null
          request_method: string | null
          request_url: string | null
          resolved: boolean
          resolved_at: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser_info?: Json
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_url?: string | null
          resolved?: boolean
          resolved_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser_info?: Json
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_url?: string | null
          resolved?: boolean
          resolved_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_attachments: {
        Row: {
          ai_analysis: Json
          blob_url: string | null
          created_at: string
          file_hash: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          message_id: string | null
          mime_type: string
          original_name: string
          processing_status: string
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json
          blob_url?: string | null
          created_at?: string
          file_hash?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          message_id?: string | null
          mime_type: string
          original_name: string
          processing_status?: string
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json
          blob_url?: string | null
          created_at?: string
          file_hash?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          message_id?: string | null
          mime_type?: string
          original_name?: string
          processing_status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string
          message_count: number
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          message_count?: number
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          message_count?: number
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          metadata: Json
          model_used: string
          processing_time_ms: number
          role: string
          session_id: string | null
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          model_used?: string
          processing_time_ms?: number
          role: string
          session_id?: string | null
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          model_used?: string
          processing_time_ms?: number
          role?: string
          session_id?: string | null
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_violations: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          first_violation: string
          id: string
          ip_address: string
          last_violation: string
          method: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          violation_count: number
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          first_violation?: string
          id?: string
          ip_address: string
          last_violation?: string
          method: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          violation_count?: number
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          first_violation?: string
          id?: string
          ip_address?: string
          last_violation?: string
          method?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          violation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          ip_address: string | null
          request_method: string | null
          request_path: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          metric_name: string
          metric_unit: string | null
          metric_value: number
          status: string
          threshold_critical: number | null
          threshold_warning: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          status?: string
          threshold_critical?: number | null
          threshold_warning?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          status?: string
          threshold_critical?: number | null
          threshold_warning?: number | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          date: string
          file_uploads: number
          id: string
          message_count: number
          storage_used: number
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          file_uploads?: number
          id?: string
          message_count?: number
          storage_used?: number
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          file_uploads?: number
          id?: string
          message_count?: number
          storage_used?: number
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity: string
          last_used: string
          refresh_token_hash: string | null
          token_hash: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          last_used?: string
          refresh_token_hash?: string | null
          token_hash: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          last_used?: string
          refresh_token_hash?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          message_count: number
          name: string
          password_hash: string
          role: string
          settings: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          message_count?: number
          name: string
          password_hash: string
          role?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          message_count?: number
          name?: string
          password_hash?: string
          role?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_errors: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_system_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          active_users: number
          total_messages: number
          total_sessions: number
          storage_used: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}