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