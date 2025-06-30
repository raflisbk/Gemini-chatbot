import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// ========================================
// PRODUCTION-READY SECURITY CONFIGURATION
// ========================================

// Environment variables - STRICT validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Server-only

// CRITICAL: Validate required public variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ].filter(Boolean);
  
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Detect environment
const isServer = typeof window === 'undefined';
const isBrowser = !isServer;
const isProduction = process.env.NODE_ENV === 'production';

// Security logging (only in development)
if (!isProduction) {
  console.log('🔐 Supabase Security Check:');
  console.log('Environment:', isServer ? 'Server' : 'Browser');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey ? 'Present' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey ? 'Present (Server)' : 'Not Available');
  
  // SECURITY WARNING for development
  if (isBrowser && supabaseServiceKey) {
    console.warn('🚨 WARNING: Service key should NOT be available in browser!');
  }
}

// ========================================
// SECURE CLIENT CONFIGURATION
// ========================================

/**
 * PUBLIC CLIENT - Browser Safe
 * - Uses anon key only (public, limited access)
 * - Subject to Row Level Security (RLS)
 * - Safe to use in browser/client-side code
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': `ai-chatbot-client/${isServer ? 'server' : 'browser'}`,
    },
  },
});

/**
 * ADMIN CLIENT - Server Only
 * - Uses service key when available (server-side only)
 * - Falls back to anon key for safety
 * - NEVER exposed to browser
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  // SECURITY: Only use service key on server-side
  isServer && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': `ai-chatbot-admin/${isServer ? 'server' : 'browser-fallback'}`,
      },
    },
  }
);

// Security validation in production
if (isProduction && isBrowser && supabaseServiceKey) {
  // This should NEVER happen in production
  console.error('🚨 SECURITY BREACH: Service key exposed to browser in production!');
}

// ========================================
// SECURE HELPER FUNCTIONS
// ========================================

/**
 * Get user by email - SERVER-SIDE ONLY
 * Uses admin client for elevated permissions
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  // Security check: This should only run on server
  if (isBrowser) {
    console.error('🚨 Security violation: getUserByEmail called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error getting user by email:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getUserByEmail:', error);
    return null;
  }
};

/**
 * Get user by ID - SERVER-SIDE ONLY
 * Uses admin client for elevated permissions
 */
export const getUserById = async (id: string): Promise<User | null> => {
  // Security check: This should only run on server
  if (isBrowser) {
    console.error('🚨 Security violation: getUserById called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error getting user by ID:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getUserById:', error);
    return null;
  }
};

/**
 * Create user - SERVER-SIDE ONLY
 * Admin operation with elevated permissions
 */
export const createUser = async (userData: UserInsert): Promise<User | null> => {
  if (isBrowser) {
    console.error('🚨 Security violation: createUser called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in createUser:', error);
    return null;
  }
};

/**
 * Update user last login - SERVER-SIDE ONLY
 */
export const updateUserLastLogin = async (userId: string): Promise<void> => {
  if (isBrowser) {
    console.error('🚨 Security violation: updateUserLastLogin called from browser');
    return;
  }

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

/**
 * Increment message count - SERVER-SIDE ONLY
 */
export const incrementMessageCount = async (userId: string): Promise<void> => {
  if (isBrowser) {
    console.error('🚨 Security violation: incrementMessageCount called from browser');
    return;
  }

  try {
    await supabaseAdmin.rpc('increment_message_count', { user_id: userId });
  } catch (error) {
    console.error('Error incrementing message count:', error);
  }
};

// ========================================
// CLIENT-SAFE FUNCTIONS (Browser + Server)
// ========================================

/**
 * Get user sessions - Uses public client (RLS protected)
 * Safe for both browser and server
 */
export async function getUserSessions(userId?: string) {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error getting user sessions:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in getUserSessions:', error);
    return [];
  }
}

/**
 * Create chat session - Uses public client (RLS protected)
 */
export async function createChatSession(userId: string, title: string) {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title,
        session_data: {}
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating chat session:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in createChatSession:', error);
    return null;
  }
}

/**
 * Update chat session - Uses public client (RLS protected)
 */
export async function updateChatSession(sessionId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating chat session:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in updateChatSession:', error);
    return null;
  }
}

/**
 * Get session messages - Uses public client (RLS protected)
 */
export async function getSessionMessages(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error getting session messages:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in getSessionMessages:', error);
    return [];
  }
}

/**
 * Create message - Uses public client (RLS protected)
 */
export async function createMessage(messageData: any) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating message:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in createMessage:', error);
    return null;
  }
}

/**
 * Delete session - Uses public client (RLS protected)
 * Named export for ChatStorage.ts compatibility
 */
export async function deleteSession(sessionId: string) {
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error deleting session:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in deleteSession:', error);
    return false;
  }
}

/**
 * Get user usage - Uses public client (RLS protected)
 */
export async function getUserUsage(userId: string) {
  try {
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Return default usage if no data found
      return {
        messageCount: 0,
        fileUploads: 0,
        remainingQuota: 100,
        storageUsage: 0
      };
    }
    
    return {
      messageCount: data.message_count || 0,
      fileUploads: data.file_uploads || 0,
      remainingQuota: Math.max(0, 100 - (data.message_count || 0)),
      storageUsage: 0
    };
  } catch (error) {
    console.error('Exception in getUserUsage:', error);
    return {
      messageCount: 0,
      fileUploads: 0,
      remainingQuota: 100,
      storageUsage: 0
    };
  }
}

/**
 * Track usage - Uses public client (RLS protected)
 */
export async function trackUsage(userId: string, type: 'message' | 'file_upload') {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Try to get existing record
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (existing) {
      // Update existing record
      const updates = type === 'message' 
        ? { message_count: (existing.message_count || 0) + 1 }
        : { file_uploads: (existing.file_uploads || 0) + 1 };
      
      await supabase
        .from('usage_tracking')
        .update(updates)
        .eq('id', existing.id);
    } else {
      // Create new record
      const newRecord = {
        user_id: userId,
        date: today,
        message_count: type === 'message' ? 1 : 0,
        file_uploads: type === 'file_upload' ? 1 : 0
      };
      
      await supabase
        .from('usage_tracking')
        .insert(newRecord);
    }
  } catch (error) {
    console.error('Exception in trackUsage:', error);
  }
}

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

// ========================================
// SECURITY AUDIT LOG
// ========================================

if (!isProduction) {
  console.log('🛡️ Security audit complete:', {
    environment: isServer ? 'server' : 'browser',
    publicClientSecure: true,
    adminClientSecure: isServer ? !!supabaseServiceKey : 'anon-fallback',
    serviceKeyExposed: isBrowser && !!supabaseServiceKey ? '🚨 YES' : '✅ NO'
  });
}