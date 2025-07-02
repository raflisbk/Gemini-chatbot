// src/types/supabase-enhanced.ts
// Extended types untuk enhanced features
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
          created_at: string
          id: string
          is_archived: boolean
          session_data: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          session_data?: Json
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          session_data?: Json
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
      // NEW: Error Reports Table
      error_reports: {
        Row: {
          id: string
          error_id: string
          timestamp: string
          message: string
          stack: string | null
          component_stack: string
          user_agent: string
          url: string
          user_id: string | null
          session_id: string | null
          level: string
          tags: string[]
          extra: Json
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          error_id: string
          timestamp: string
          message: string
          stack?: string | null
          component_stack: string
          user_agent: string
          url: string
          user_id?: string | null
          session_id?: string | null
          level?: string
          tags?: string[]
          extra?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          error_id?: string
          timestamp?: string
          message?: string
          stack?: string | null
          component_stack?: string
          user_agent?: string
          url?: string
          user_id?: string | null
          session_id?: string | null
          level?: string
          tags?: string[]
          extra?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // NEW: Rate Limit Violations Table
      rate_limit_violations: {
        Row: {
          id: string
          ip_address: string
          endpoint: string
          method: string
          violation_count: number
          first_violation: string
          last_violation: string
          user_id: string | null
          user_agent: string | null
          blocked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          endpoint: string
          method: string
          violation_count?: number
          first_violation?: string
          last_violation?: string
          user_id?: string | null
          user_agent?: string | null
          blocked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          endpoint?: string
          method?: string
          violation_count?: number
          first_violation?: string
          last_violation?: string
          user_id?: string | null
          user_agent?: string | null
          blocked_until?: string | null
          created_at?: string
          updated_at?: string
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
      // NEW: Security Events Table
      security_events: {
        Row: {
          id: string
          event_type: string
          severity: string
          ip_address: string | null
          user_id: string | null
          session_id: string | null
          user_agent: string | null
          request_path: string | null
          request_method: string | null
          details: Json
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          severity?: string
          ip_address?: string | null
          user_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          request_path?: string | null
          request_method?: string | null
          details?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          severity?: string
          ip_address?: string | null
          user_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          request_path?: string | null
          request_method?: string | null
          details?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // NEW: System Health Table
      system_health: {
        Row: {
          id: string
          component: string
          status: string
          response_time_ms: number | null
          error_rate: number | null
          details: Json
          check_timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          component: string
          status?: string
          response_time_ms?: number | null
          error_rate?: number | null
          details?: Json
          check_timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          component?: string
          status?: string
          response_time_ms?: number | null
          error_rate?: number | null
          details?: Json
          check_timestamp?: string
          created_at?: string
        }
        Relationships: []
      }
      file_attachments: {
        Row: {
          blob_url: string
          filename: string
          file_size: number
          id: string
          is_processed: boolean
          message_id: string | null
          metadata: Json
          mime_type: string
          original_name: string
          uploaded_at: string
          user_id: string | null
        }
        Insert: {
          blob_url: string
          filename: string
          file_size: number
          id?: string
          is_processed?: boolean
          message_id?: string | null
          metadata?: Json
          mime_type: string
          original_name: string
          uploaded_at?: string
          user_id?: string | null
        }
        Update: {
          blob_url?: string
          filename?: string
          file_size?: number
          id?: string
          is_processed?: boolean
          message_id?: string | null
          metadata?: Json
          mime_type?: string
          original_name?: string
          uploaded_at?: string
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
      messages: {
        Row: {
          attachments: Json
          content: string
          id: string
          is_deleted: boolean
          metadata: Json
          role: string
          session_id: string | null
          timestamp: string
        }
        Insert: {
          attachments?: Json
          content: string
          id?: string
          is_deleted?: boolean
          metadata?: Json
          role: string
          session_id?: string | null
          timestamp?: string
        }
        Update: {
          attachments?: Json
          content?: string
          id?: string
          is_deleted?: boolean
          metadata?: Json
          role?: string
          session_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string
          date: string
          file_uploads: number
          id: string
          message_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          file_uploads?: number
          id?: string
          message_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          file_uploads?: number
          id?: string
          message_count?: number
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
      // ENHANCED: User Sessions with refresh token support
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_used: string
          token_hash: string
          user_agent: string | null
          user_id: string | null
          // Enhanced fields
          refresh_token_hash: string | null
          is_active: boolean
          device_info: Json
          last_activity: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_used?: string
          token_hash: string
          user_agent?: string | null
          user_id?: string | null
          // Enhanced fields
          refresh_token_hash?: string | null
          is_active?: boolean
          device_info?: Json
          last_activity?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_used?: string
          token_hash?: string
          user_agent?: string | null
          user_id?: string | null
          // Enhanced fields
          refresh_token_hash?: string | null
          is_active?: boolean
          device_info?: Json
          last_activity?: string
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
      cleanup_old_error_reports: {
        Args: {
          days_to_keep?: number
        }
        Returns: number
      }
      get_error_stats: {
        Args: {
          start_date?: string
          end_date?: string
        }
        Returns: {
          date: string
          total_errors: number
          critical_errors: number
          resolved_errors: number
        }[]
      }
      increment_message_count: {
        Args: {
          user_id: string
        }
        Returns: undefined
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