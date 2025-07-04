// src/lib/chatStorage.ts - FINAL VERSION FOR CHATBOT.TSX COMPATIBILITY
import { 
  getUserSessions, 
  deleteSession, 
  createChatSession, 
  updateChatSession, 
  createMessage, 
  getSessionMessages,
  supabaseAdmin 
} from './supabase';

// Import compatibility types
import type { 
  ChatBotSession, 
  ChatBotMessage, 
  SessionSummary,
  convertStoredSessionToChatSession,
  convertMessageWithFilesToChatBotMessage
} from '@/types/chatbot';

// ========================================
// EXPORTED INTERFACES - FINAL VERSION
// ========================================

export interface ChatSession extends ChatBotSession {
  messages?: Message[]; // Override with correct Message type
}

export interface ChatMessage {
  id: string;
  session_id: string | null;
  user_id: string | null;
  role: string;
  content: string;
  attachments: any[];
  tokens_used: number;
  model_used: string;
  processing_time_ms: number;
  metadata: any;
  created_at: string;
}

export interface StoredSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  isActive: boolean;
}

// Message interface with Date timestamp for ChatBot compatibility
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
}

export interface MessageWithFiles {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
}

// ========================================
// CHAT STORAGE CLASS - FINAL IMPLEMENTATION
// ========================================

export class ChatStorage {
  // FIXED: getSessions method with proper return type
  static async getSessions(userId: string): Promise<ChatSession[]> {
    try {
      const storedSessions = await loadUserSessions(userId);
      
      // Convert StoredSession[] to ChatSession[]
      const chatSessions: ChatSession[] = [];
      
      for (const stored of storedSessions) {
        const session: ChatSession = {
          id: stored.id,
          user_id: userId,
          title: stored.title,
          message_count: stored.messageCount,
          last_message_at: stored.timestamp,
          context_summary: stored.lastMessage,
          settings: {},
          is_active: stored.isActive,
          created_at: stored.timestamp,
          updated_at: stored.timestamp,
          updatedAt: stored.timestamp,
          messages: [] // Initialize empty messages array
        };
        chatSessions.push(session);
      }
      
      return chatSessions;
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  static async loadUserSessions(userId: string): Promise<StoredSession[]> {
    return loadUserSessions(userId);
  }

  // FIXED: createNewSession with proper async handling
  static async createNewSession(userId: string, title: string): Promise<{ id: string } | null> {
    try {
      const sessionId = await createNewChatSession(userId, title);
      return sessionId ? { id: sessionId } : null;
    } catch (error) {
      console.error('Error creating new session:', error);
      return null;
    }
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    return deleteChatSession(sessionId);
  }

  static async updateSessionTitle(sessionId: string, newTitle: string): Promise<boolean> {
    return updateSessionTitle(sessionId, newTitle);
  }

  // FIXED: saveSession with single parameter
  static async saveSession(session: ChatSession): Promise<void> {
    try {
      await updateChatSession(session.id, {
        title: session.title,
        context_summary: session.context_summary,
        settings: session.settings,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  // FIXED: getSessionById with proper return type
  static async getSessionById(sessionId: string): Promise<ChatSession | null> {
    try {
      const session = await getSessionById(sessionId);
      if (!session) return null;

      // Load messages for this session
      const messages = await ChatStorage.loadSessionMessages(sessionId);
      
      return {
        ...session,
        updatedAt: session.updated_at,
        messages: messages
      };
    } catch (error) {
      console.error('Error getting session by ID:', error);
      return null;
    }
  }

  // Message management
  static async saveMessage(
    sessionId: string,
    userId: string | undefined, // FIXED: Accept undefined
    role: 'user' | 'assistant',
    content: string,
    attachments: any[] = [],
    metadata: any = {}
  ): Promise<string | null> {
    return saveMessage(sessionId, userId || null, role, content, attachments, metadata);
  }

  static async loadSessionMessages(sessionId: string): Promise<Message[]> {
    const messages = await loadSessionMessages(sessionId);
    return messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  }

  // Context management
  static async updateConversationContext(sessionId: string, summary: string): Promise<void> {
    return updateConversationContext(sessionId, summary);
  }

  static async getConversationContext(sessionId: string): Promise<string | null> {
    return getConversationContext(sessionId);
  }

  // Search functionality
  static async searchSessions(userId: string, query: string): Promise<ChatSession[]> {
    const storedSessions = await searchUserSessions(userId, query);
    return storedSessions.map(stored => ({
      id: stored.id,
      user_id: userId,
      title: stored.title,
      message_count: stored.messageCount,
      last_message_at: stored.timestamp,
      context_summary: stored.lastMessage,
      settings: {},
      is_active: stored.isActive,
      created_at: stored.timestamp,
      updated_at: stored.timestamp,
      updatedAt: stored.timestamp,
      messages: []
    }));
  }

  static async searchMessages(sessionId: string, query: string): Promise<Message[]> {
    const messages = await searchSessionMessages(sessionId, query);
    return messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  }

  // Export/Import
  static async exportSession(sessionId: string): Promise<string | null> {
    return exportSession(sessionId);
  }

  static async exportAllSessions(userId: string): Promise<string | null> {
    return exportAllUserSessions(userId);
  }

  // Statistics
  static async getUserStats(userId: string) {
    return getUserChatStats(userId);
  }

  // Cleanup
  static async cleanup(userId: string, keepDays: number = 30): Promise<number> {
    return cleanupOldSessions(userId, keepDays);
  }
}

// ========================================
// SESSION MANAGEMENT FUNCTIONS
// ========================================

export async function loadUserSessions(userId: string): Promise<StoredSession[]> {
  try {
    const sessions = await getUserSessions(userId);
    
    return sessions.map((session: any) => ({
      id: session.id,
      title: session.title,
      lastMessage: session.context_summary || 'No messages yet',
      timestamp: session.updated_at,
      messageCount: session.message_count,
      isActive: session.is_active
    }));
  } catch (error) {
    console.error('Error loading user sessions:', error);
    return [];
  }
}

export async function createNewChatSession(userId: string, title: string): Promise<string | null> {
  try {
    const session = await createChatSession(userId, title);
    return session?.id || null;
  } catch (error) {
    console.error('Error creating new chat session:', error);
    return null;
  }
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  try {
    return await deleteSession(sessionId);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return false;
  }
}

export async function updateSessionTitle(sessionId: string, newTitle: string): Promise<boolean> {
  try {
    await updateChatSession(sessionId, { title: newTitle });
    return true;
  } catch (error) {
    console.error('Error updating session title:', error);
    return false;
  }
}

// ========================================
// MESSAGE MANAGEMENT FUNCTIONS
// ========================================

export async function saveMessage(
  sessionId: string,
  userId: string | null,
  role: 'user' | 'assistant',
  content: string,
  attachments: any[] = [],
  metadata: any = {}
): Promise<string | null> {
  try {
    const message = await createMessage({
      session_id: sessionId,
      user_id: userId || undefined,
      role,
      content,
      attachments,
      tokens_used: metadata.tokensUsed || 0,
      model_used: metadata.modelUsed || 'gemini-1.5-flash',
      processing_time_ms: metadata.processingTime || 0,
      metadata
    });

    if (message) {
      await updateChatSession(sessionId, {
        last_message_at: new Date().toISOString(),
        message_count: await getSessionMessageCount(sessionId)
      });
    }

    return message?.id || null;
  } catch (error) {
    console.error('Error saving message:', error);
    return null;
  }
}

export async function loadSessionMessages(sessionId: string): Promise<MessageWithFiles[]> {
  try {
    const messages = await getSessionMessages(sessionId);
    
    return messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.created_at,
      attachments: msg.attachments || [],
      tokens_used: msg.tokens_used,
      model_used: msg.model_used
    }));
  } catch (error) {
    console.error('Error loading session messages:', error);
    return [];
  }
}

async function getSessionMessageCount(sessionId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error getting message count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Exception in getSessionMessageCount:', error);
    return 0;
  }
}

// ========================================
// CONVERSATION CONTEXT MANAGEMENT
// ========================================

export async function updateConversationContext(
  sessionId: string, 
  summary: string
): Promise<void> {
  try {
    await updateChatSession(sessionId, {
      context_summary: summary,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating conversation context:', error);
  }
}

export async function getConversationContext(sessionId: string): Promise<string | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('context_summary')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error getting conversation context:', error);
      return null;
    }

    return session?.context_summary || null;
  } catch (error) {
    console.error('Exception in getConversationContext:', error);
    return null;
  }
}

// ========================================
// SEARCH AND FILTERING
// ========================================

export async function searchUserSessions(
  userId: string, 
  query: string
): Promise<StoredSession[]> {
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,context_summary.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching sessions:', error);
      return [];
    }

    return sessions?.map((session: any) => ({
      id: session.id,
      title: session.title,
      lastMessage: session.context_summary || 'No messages yet',
      timestamp: session.updated_at,
      messageCount: session.message_count,
      isActive: session.is_active
    })) || [];
  } catch (error) {
    console.error('Exception in searchUserSessions:', error);
    return [];
  }
}

export async function searchSessionMessages(
  sessionId: string, 
  query: string
): Promise<MessageWithFiles[]> {
  try {
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error searching messages:', error);
      return [];
    }

    return messages?.map((msg: any) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.created_at,
      attachments: msg.attachments || [],
      tokens_used: msg.tokens_used,
      model_used: msg.model_used
    })) || [];
  } catch (error) {
    console.error('Exception in searchSessionMessages:', error);
    return [];
  }
}

// ========================================
// EXPORT AND IMPORT
// ========================================

export async function exportSession(sessionId: string): Promise<string | null> {
  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error getting session for export:', sessionError);
      return null;
    }

    const messages = await loadSessionMessages(sessionId);

    const exportData = {
      session: {
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: session.message_count
      },
      messages,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting session:', error);
    return null;
  }
}

export async function exportAllUserSessions(userId: string): Promise<string | null> {
  try {
    const sessions = await loadUserSessions(userId);
    const exportData = {
      sessions: [] as any[],
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };

    for (const session of sessions) {
      const sessionExport = await exportSession(session.id);
      if (sessionExport) {
        exportData.sessions.push(JSON.parse(sessionExport));
      }
    }

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting all sessions:', error);
    return null;
  }
}

// ========================================
// STATISTICS AND ANALYTICS
// ========================================

export async function getUserChatStats(userId: string): Promise<{
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  lastActiveSession: string | null;
}> {
  try {
    const [sessionsCount, messagesCount] = await Promise.all([
      supabaseAdmin
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);

    const { data: lastSession } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const totalSessions = sessionsCount.count || 0;
    const totalMessages = messagesCount.count || 0;

    return {
      totalSessions,
      totalMessages,
      averageMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
      lastActiveSession: lastSession?.title || null
    };
  } catch (error) {
    console.error('Error getting user chat stats:', error);
    return {
      totalSessions: 0,
      totalMessages: 0,
      averageMessagesPerSession: 0,
      lastActiveSession: null
    };
  }
}

// ========================================
// CLEANUP FUNCTIONS
// ========================================

export async function cleanupOldSessions(userId: string, keepDays: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const { data: sessionsToDelete, error: fetchError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .lt('updated_at', cutoffDate.toISOString());

    if (fetchError) {
      console.error('Error fetching old sessions:', fetchError);
      return 0;
    }

    if (!sessionsToDelete || sessionsToDelete.length === 0) {
      return 0;
    }

    const { error: deleteError } = await supabaseAdmin
      .from('chat_sessions')
      .update({ is_active: false })
      .in('id', sessionsToDelete.map(s => s.id));

    if (deleteError) {
      console.error('Error cleaning up old sessions:', deleteError);
      return 0;
    }

    return sessionsToDelete.length;
  } catch (error) {
    console.error('Exception in cleanupOldSessions:', error);
    return 0;
  }
}

// ========================================
// ADDITIONAL HELPER FUNCTIONS
// ========================================

export async function getSessionById(sessionId: string): Promise<ChatSession | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error getting session by ID:', error);
      return null;
    }

    return {
      ...session,
      updatedAt: session.updated_at
    };
  } catch (error) {
    console.error('Exception in getSessionById:', error);
    return null;
  }
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await updateChatSession(sessionId, {
      last_message_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

export async function archiveSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error archiving session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception in archiveSession:', error);
    return false;
  }
}

export async function restoreSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error restoring session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception in restoreSession:', error);
    return false;
  }
}

// ========================================
// DEFAULT EXPORT
// ========================================

export default ChatStorage;