// src/lib/supabase.ts - FINAL COMPLETE VERSION WITH ALL EXPORTS
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ========================================
// ENVIRONMENT VARIABLES
// ========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ========================================
// SUPABASE CLIENTS
// ========================================

// Public client for browser use
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'ai-chatbot-public/2.0',
    },
  },
});

// Admin client for server-side operations
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'ai-chatbot-admin/2.0',
      },
    },
  }
);

// ========================================
// INTERFACES FOR PROPER TYPING
// ========================================

interface MessageData {
  session_id: string;
  user_id?: string | null;
  role: string;
  content: string;
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
  processing_time_ms?: number;
  metadata?: any;
}

interface SessionData {
  user_id: string;
  title: string;
  message_count?: number;
  is_active?: boolean;
  context_summary?: string;
  settings?: any;
}

// ========================================
// USER MANAGEMENT FUNCTIONS
// ========================================

export const getUserByEmail = async (email: string): Promise<any> => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user by email:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Exception in getUserByEmail:', error);
    return null;
  }
};

export const getUserById = async (id: string): Promise<any> => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Exception in getUserById:', error);
    return null;
  }
};

// FIXED: updateUserLastLogin function
export const updateUserLastLogin = async (userId: string): Promise<void> => {
  try {
    await supabaseAdmin
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating user last login:', error);
  }
};

// ========================================
// SESSION MANAGEMENT FUNCTIONS
// ========================================

export const createChatSession = async (userId: string, title: string): Promise<any> => {
  try {
    const sessionData: SessionData = {
      user_id: userId,
      title,
      message_count: 0,
      is_active: true,
    };

    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Exception in createChatSession:', error);
    return null;
  }
};

export const updateChatSession = async (sessionId: string, updates: any): Promise<void> => {
  try {
    await supabaseAdmin
      .from('chat_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error updating chat session:', error);
  }
};

// FIXED: getUserSessions function
export const getUserSessions = async (userId: string): Promise<any[]> => {
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('Exception in getUserSessions:', error);
    return [];
  }
};

// FIXED: deleteSession function
export const deleteSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception in deleteSession:', error);
    return false;
  }
};

// ========================================
// MESSAGE MANAGEMENT FUNCTIONS
// ========================================

export const createMessage = async (messageData: MessageData): Promise<any> => {
  try {
    // Ensure user_id is properly typed
    const cleanMessageData = {
      session_id: messageData.session_id,
      user_id: messageData.user_id || null,
      role: messageData.role,
      content: messageData.content,
      attachments: messageData.attachments || [],
      tokens_used: messageData.tokens_used || 0,
      model_used: messageData.model_used || 'gemini-1.5-flash',
      processing_time_ms: messageData.processing_time_ms || 0,
      metadata: messageData.metadata || {},
    };

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert(cleanMessageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return null;
    }

    return message;
  } catch (error) {
    console.error('Exception in createMessage:', error);
    return null;
  }
};

export const getSessionMessages = async (sessionId: string, limit: number = 100): Promise<any[]> => {
  try {
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Exception in getSessionMessages:', error);
    return [];
  }
};

// ========================================
// USAGE TRACKING FUNCTIONS
// ========================================

export const getUserUsage = async (userId: string): Promise<{
  messageCount: number;
  fileUploads: number;
  storageUsed: number;
  tokensUsed: number;
}> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: usage, error } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user usage:', error);
      return { messageCount: 0, fileUploads: 0, storageUsed: 0, tokensUsed: 0 };
    }

    return {
      messageCount: usage?.message_count || 0,
      fileUploads: usage?.file_uploads || 0,
      storageUsed: usage?.storage_used || 0,
      tokensUsed: usage?.tokens_used || 0,
    };
  } catch (error) {
    console.error('Exception in getUserUsage:', error);
    return { messageCount: 0, fileUploads: 0, storageUsed: 0, tokensUsed: 0 };
  }
};

export const trackUsage = async (userId: string, type: 'message' | 'file_upload', amount: number = 1): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing usage record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing usage:', fetchError);
      return;
    }

    if (existing) {
      // Update existing record
      const updates = type === 'message' 
        ? { message_count: (existing.message_count || 0) + amount }
        : { file_uploads: (existing.file_uploads || 0) + amount };
      
      await supabaseAdmin
        .from('usage_tracking')
        .update(updates)
        .eq('id', existing.id);
    } else {
      // Create new record
      const newRecord = {
        user_id: userId,
        date: today,
        message_count: type === 'message' ? amount : 0,
        file_uploads: type === 'file_upload' ? amount : 0,
        storage_used: 0,
        tokens_used: 0,
      };
      
      await supabaseAdmin
        .from('usage_tracking')
        .insert(newRecord);
    }
  } catch (error) {
    console.error('Exception in trackUsage:', error);
  }
};

// ========================================
// FILE ATTACHMENT FUNCTIONS
// ========================================

export const createFileAttachment = async (data: {
  message_id?: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  blob_url?: string;
  mime_type: string;
  file_size: number;
  file_hash?: string;
  processing_status?: string;
  ai_analysis?: any;
}): Promise<any> => {
  try {
    const attachmentData = {
      message_id: data.message_id || null,
      user_id: data.user_id,
      filename: data.filename,
      original_name: data.original_name,
      file_path: data.file_path,
      blob_url: data.blob_url || data.file_path,
      mime_type: data.mime_type,
      file_size: data.file_size,
      file_hash: data.file_hash || null,
      processing_status: data.processing_status || 'completed',
      ai_analysis: data.ai_analysis || {}
    };

    const { data: attachment, error } = await supabaseAdmin
      .from('file_attachments')
      .insert(attachmentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating file attachment:', error);
      return null;
    }

    return attachment;
  } catch (error) {
    console.error('Exception in createFileAttachment:', error);
    return null;
  }
};

// ========================================
// ENHANCED FUNCTIONS
// ========================================

export const getUserUsageWithStorage = async (userId: string): Promise<{
  messageCount: number;
  fileUploads: number;
  storageUsed: number;
  tokensUsed: number;
}> => {
  return getUserUsage(userId); // Same implementation
};

export const updateSessionContext = async (sessionId: string, contextSummary: string): Promise<void> => {
  try {
    await updateChatSession(sessionId, {
      context_summary: contextSummary
    });
  } catch (error) {
    console.error('Error updating session context:', error);
  }
};

export const getUserActiveSessions = async (userId: string): Promise<any[]> => {
  return getUserSessions(userId); // Same implementation
};

export const cleanupExpiredGuestSessions = async (): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('guest_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired guest sessions:', error);
    }
  } catch (error) {
    console.error('Exception in cleanupExpiredGuestSessions:', error);
  }
};

export const getSystemStats = async (): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalSessions: number;
  storageUsed: number;
  guestSessions: number;
}> => {
  try {
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalMessages },
      { count: totalSessions },
      { count: guestSessions }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('guest_sessions').select('*', { count: 'exact', head: true }).gte('expires_at', new Date().toISOString())
    ]);

    // Get total storage used
    const { data: storageData } = await supabaseAdmin
      .from('file_attachments')
      .select('file_size');
    
    const storageUsed = storageData?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalMessages: totalMessages || 0,
      totalSessions: totalSessions || 0,
      storageUsed,
      guestSessions: guestSessions || 0
    };
  } catch (error) {
    console.error('Exception in getSystemStats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalMessages: 0,
      totalSessions: 0,
      storageUsed: 0,
      guestSessions: 0
    };
  }
};

export const logError = async (errorData: {
  user_id?: string;
  session_id?: string;
  error_type: string;
  error_message: string;
  error_stack?: string;
  request_url?: string;
  request_method?: string;
  user_agent?: string;
  ip_address?: string;
  browser_info?: any;
}): Promise<void> => {
  try {
    await supabaseAdmin
      .from('error_reports')
      .insert({
        ...errorData,
        browser_info: errorData.browser_info || {},
        resolved: false
      });
  } catch (error) {
    console.error('Error logging error:', error);
  }
};

export const logSecurityEvent = async (eventData: {
  event_type: string;
  severity?: string;
  ip_address?: string;
  user_id?: string;
  session_id?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  details?: any;
}): Promise<void> => {
  try {
    await supabaseAdmin
      .from('security_events')
      .insert({
        ...eventData,
        severity: eventData.severity || 'medium',
        details: eventData.details || {},
        resolved: false
      });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// ========================================
// TYPE EXPORTS
// ========================================

export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type FileAttachment = Database['public']['Tables']['file_attachments']['Row'];
export type FileAttachmentInsert = Database['public']['Tables']['file_attachments']['Insert'];

export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row'];
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert'];

export type GuestSession = Database['public']['Tables']['guest_sessions']['Row'];
export type GuestSessionInsert = Database['public']['Tables']['guest_sessions']['Insert'];

// ========================================
// DEFAULT EXPORT
// ========================================

export default supabase;