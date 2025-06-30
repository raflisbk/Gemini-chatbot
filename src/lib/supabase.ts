import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for browser usage - we'll use service role for our custom auth
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin client for server-side operations (same as above since we use custom auth)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Types for database operations
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

// Helper functions for common operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
};

export const createUser = async (userData: UserInsert): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data;
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  await supabaseAdmin
    .from('users')
    .update({ 
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
};

export const incrementMessageCount = async (userId: string): Promise<void> => {
  await supabaseAdmin.rpc('increment_message_count', { user_id: userId });
};

export const getUserSessions = async (userId: string): Promise<ChatSession[]> => {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data || [];
};

export const createChatSession = async (sessionData: ChatSessionInsert): Promise<ChatSession | null> => {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return data;
};

export const updateChatSession = async (
  sessionId: string, 
  updates: ChatSessionUpdate
): Promise<ChatSession | null> => {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    return null;
  }

  return data;
};

export const getSessionMessages = async (sessionId: string): Promise<Message[]> => {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_deleted', false)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
};

export const createMessage = async (messageData: MessageInsert): Promise<Message | null> => {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  if (error) {
    console.error('Error creating message:', error);
    return null;
  }

  return data;
};

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session:', error);
    return false;
  }

  return true;
};

// Usage tracking functions
export const trackUsage = async (userId: string, type: 'message' | 'file_upload'): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing } = await supabaseAdmin
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    const updates: any = {};
    if (type === 'message') {
      updates.message_count = existing.message_count + 1;
    } else if (type === 'file_upload') {
      updates.file_uploads = existing.file_uploads + 1;
    }

    await supabaseAdmin
      .from('usage_tracking')
      .update(updates)
      .eq('id', existing.id);
  } else {
    const newTracking: UsageTrackingInsert = {
      user_id: userId,
      date: today,
      message_count: type === 'message' ? 1 : 0,
      file_uploads: type === 'file_upload' ? 1 : 0,
    };

    await supabaseAdmin
      .from('usage_tracking')
      .insert(newTracking);
  }
};

export const getUserUsage = async (userId: string): Promise<{ messageCount: number; fileUploads: number }> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabaseAdmin
    .from('usage_tracking')
    .select('message_count, file_uploads')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  return {
    messageCount: data?.message_count || 0,
    fileUploads: data?.file_uploads || 0,
  };
};