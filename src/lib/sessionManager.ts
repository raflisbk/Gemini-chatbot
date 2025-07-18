// src/lib/sessionManager.ts - Enhanced session management with real-time support
import { 
  getUserSessions, 
  createChatSession, 
  updateChatSession, 
  deleteSession,
  getSessionMessages,
  createMessage,
  getUserById
} from './supabase';
import { supabaseAdmin } from './supabase';
import { handleChatError, ErrorType } from './errorHandler';

// FIXED: Enhanced session types
export interface EnhancedChatSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string;
  context_summary?: string;
  settings: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    autoTitle?: boolean;
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // FIXED: Enhanced metadata
  metadata: {
    totalTokens?: number;
    averageResponseTime?: number;
    lastActivity?: string;
    messageTypes?: {
      text: number;
      image: number;
      file: number;
      audio: number;
      video: number;
    };
    performance?: {
      avgProcessingTime: number;
      errorCount: number;
      successRate: number;
    };
  };
}

export interface SessionMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments: any[];
  metadata: {
    model?: string;
    temperature?: number;
    processingTime?: number;
    tokenCount?: number;
    timestamp?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at?: string;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  mostActiveSession: EnhancedChatSession | null;
  recentActivity: SessionMessage[];
  sessionsByDay: Record<string, number>;
  messagesByType: Record<string, number>;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessionCache: Map<string, EnhancedChatSession> = new Map();
  private messageCache: Map<string, SessionMessage[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private subscribers: Map<string, Set<(session: EnhancedChatSession) => void>> = new Map();
  
  private constructor() {}
  
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // FIXED: Enhanced session loading with caching
  async loadUserSessions(userId: string, forceRefresh: boolean = false): Promise<EnhancedChatSession[]> {
    try {
      const cacheKey = `user_sessions_${userId}`;
      
      // Check cache first
      if (!forceRefresh && this.sessionCache.has(cacheKey)) {
        const cached = this.sessionCache.get(cacheKey);
        if (cached && Array.isArray(cached)) {
          return cached as any;
        }
      }

      // Load from database
      const sessions = await getUserSessions(userId);
      
      // Enhanced session mapping
      const enhancedSessions: EnhancedChatSession[] = await Promise.all(
        sessions.map(async (session: any) => {
          const metadata = await this.calculateSessionMetadata(session.id);
      if (!metadata) {
        throw new Error(`Failed to calculate metadata for session ${session.id}`);
      }
          
          return {
            ...session,
            settings: typeof session.settings === 'object' && session.settings !== null 
              ? {
                  model: 'gemini-2.5-flash',
                  temperature: 0.7,
                  maxTokens: 4096,
                  autoTitle: true,
                  ...session.settings
                }
              : {
                  model: 'gemini-2.5-flash',
                  temperature: 0.7,
                  maxTokens: 4096,
                  autoTitle: true
                },
            metadata: metadata || {
              totalTokens: 0,
              averageResponseTime: 0,
              lastActivity: session.updated_at,
              messageTypes: {
                text: 0,
                image: 0,
                file: 0,
                audio: 0,
                video: 0
              },
              performance: {
                avgProcessingTime: 0,
                errorCount: 0,
                successRate: 100
              }
            }
          };
        })
      );

      // Cache results
      this.sessionCache.set(cacheKey, enhancedSessions as any);
      
      // Auto-expire cache
      setTimeout(() => {
        this.sessionCache.delete(cacheKey);
      }, this.cacheTimeout);

      return enhancedSessions;
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        userId,
        component: 'session_manager',
        action: 'load_sessions',
        metadata: { forceRefresh }
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to load sessions');
    }
  }

  // FIXED: Enhanced session creation with auto-title
  async createSession(
    userId: string, 
    title?: string,
    settings?: Partial<EnhancedChatSession['settings']>
  ): Promise<EnhancedChatSession> {
    try {
      const sessionTitle = title || `New Chat ${new Date().toLocaleString()}`;
      const sessionSettings = {
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 4096,
        autoTitle: true,
        ...settings
      };

      // Create session in database
      const newSession = await createChatSession(userId, sessionTitle);
      
      if (!newSession) {
        throw new Error('Failed to create session in database');
      }

      // Update session with enhanced settings
      await updateChatSession(newSession.id, {
        settings: sessionSettings
      });

      // Create enhanced session object
      const enhancedSession: EnhancedChatSession = {
        ...newSession,
        settings: sessionSettings,
        metadata: {
          totalTokens: 0,
          averageResponseTime: 0,
          lastActivity: new Date().toISOString(),
          messageTypes: {
            text: 0,
            image: 0,
            file: 0,
            audio: 0,
            video: 0
          },
          performance: {
            avgProcessingTime: 0,
            errorCount: 0,
            successRate: 100
          }
        }
      };

      // Invalidate cache
      this.invalidateUserCache(userId);
      
      // Notify subscribers
      this.notifySubscribers(enhancedSession.id, enhancedSession);

      return enhancedSession;
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        userId,
        component: 'session_manager',
        action: 'create_session',
        metadata: { title, settings }
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to create session');
    }
  }

  // FIXED: Enhanced session update with metadata tracking
  async updateSession(
    sessionId: string, 
    updates: Partial<EnhancedChatSession>
  ): Promise<EnhancedChatSession> {
    try {
      // Update in database
      await updateChatSession(sessionId, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      // Get updated session
      const { data: updatedSession, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !updatedSession) {
        throw new Error('Failed to retrieve updated session');
      }

      // Create enhanced session object
      const enhancedSession: EnhancedChatSession = {
        ...updatedSession,
        settings: updatedSession.settings || {
          model: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 4096,
          autoTitle: true
        },
        metadata: updates.metadata || await this.calculateSessionMetadata(sessionId)
      };

      // Invalidate cache
      this.invalidateUserCache(updatedSession.user_id);
      
      // Notify subscribers
      this.notifySubscribers(sessionId, enhancedSession);

      return enhancedSession;
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        sessionId,
        component: 'session_manager',
        action: 'update_session',
        metadata: { updates }
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to update session');
    }
  }

  // FIXED: Enhanced session deletion with cleanup
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Delete from database
      const success = await deleteSession(sessionId);
      
      if (!success) {
        throw new Error('Failed to delete session from database');
      }

      // Clear from cache
      this.messageCache.delete(sessionId);
      this.invalidateUserCache(userId);
      
      // Clear subscribers
      this.subscribers.delete(sessionId);

      return true;
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        sessionId,
        userId,
        component: 'session_manager',
        action: 'delete_session'
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to delete session');
    }
  }

  // FIXED: Enhanced message loading with caching
  async loadSessionMessages(sessionId: string, limit: number = 50): Promise<SessionMessage[]> {
    try {
      // Check cache first
      if (this.messageCache.has(sessionId)) {
        const cached = this.messageCache.get(sessionId);
        if (cached && cached.length > 0) {
          return cached.slice(-limit);
        }
      }

      // Load from database
      const messages = await getSessionMessages(sessionId, limit);
      
      // Enhanced message mapping - FIXED: Handle null values
      const enhancedMessages: SessionMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        session_id: msg.session_id || sessionId,
        user_id: msg.user_id || '',
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments || [],
        metadata: {
          model: msg.model_used,
          temperature: msg.metadata?.temperature,
          processingTime: msg.processing_time_ms,
          tokenCount: msg.tokens_used,
          timestamp: msg.created_at,
          ...msg.metadata
        },
        created_at: msg.created_at,
        updated_at: msg.updated_at
      }));

      // Cache results
      this.messageCache.set(sessionId, enhancedMessages);
      
      // Auto-expire cache
      setTimeout(() => {
        this.messageCache.delete(sessionId);
      }, this.cacheTimeout);

      return enhancedMessages;
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        sessionId,
        component: 'session_manager',
        action: 'load_messages',
        metadata: { limit }
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to load messages');
    }
  }

  // FIXED: Enhanced message saving with metadata
  async saveMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    attachments: any[] = [],
    metadata: Record<string, any> = {}
  ): Promise<SessionMessage> {
    try {
      // Save to database
      const message = await createMessage({
        session_id: sessionId,
        user_id: userId,
        role,
        content,
        attachments,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });

      if (!message) {
        throw new Error('Failed to save message to database');
      }

      // Create enhanced message object
      const enhancedMessage: SessionMessage = {
        id: message.id,
        session_id: sessionId,
        user_id: userId,
        role,
        content,
        attachments,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        },
        created_at: message.created_at || new Date().toISOString()
      };

      // Update cache
      if (this.messageCache.has(sessionId)) {
        const cached = this.messageCache.get(sessionId) || [];
        cached.push(enhancedMessage);
        this.messageCache.set(sessionId, cached);
      }

      // Update session metadata
      await this.updateSessionAfterMessage(sessionId, enhancedMessage);

      return enhancedMessage;
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        sessionId,
        userId,
        component: 'session_manager',
        action: 'save_message',
        metadata: { role, contentLength: content.length, attachmentsCount: attachments.length }
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to save message');
    }
  }

  // FIXED: Enhanced session metadata calculation
  private async calculateSessionMetadata(sessionId: string): Promise<EnhancedChatSession['metadata']> {
    try {
      const messages = await this.loadSessionMessages(sessionId, 1000);
      
      const metadata: EnhancedChatSession['metadata'] = {
        totalTokens: 0,
        averageResponseTime: 0,
        lastActivity: new Date().toISOString(),
        messageTypes: {
          text: 0,
          image: 0,
          file: 0,
          audio: 0,
          video: 0
        },
        performance: {
          avgProcessingTime: 0,
          errorCount: 0,
          successRate: 100
        }
      };

      if (messages.length === 0) {
        return metadata;
      }

      // Calculate statistics
      let totalTokens = 0;
      let totalProcessingTime = 0;
      let processingTimeCount = 0;
      
      messages.forEach(msg => {
        // Count tokens
        if (msg.metadata.tokenCount) {
          totalTokens += msg.metadata.tokenCount;
        }
        
        // Count processing time
        if (msg.metadata.processingTime) {
          totalProcessingTime += msg.metadata.processingTime;
          processingTimeCount++;
        }
        
        // Count message types
        if (msg.attachments.length > 0) {
          msg.attachments.forEach(att => {
            if (att.type?.startsWith('image/')) {
              metadata.messageTypes.image++;
            } else if (att.type?.startsWith('audio/')) {
              metadata.messageTypes.audio++;
            } else if (att.type?.startsWith('video/')) {
              metadata.messageTypes.video++;
            } else {
              metadata.messageTypes.file++;
            }
          });
        } else {
          metadata.messageTypes.text++;
        }
      });

      // Calculate averages
      metadata.totalTokens = totalTokens;
      metadata.averageResponseTime = processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0;
      metadata.lastActivity = messages[messages.length - 1]?.created_at || new Date().toISOString();
      metadata.performance.avgProcessingTime = metadata.averageResponseTime;
      metadata.performance.successRate = 100; // Can be enhanced with error tracking

      return metadata;
    } catch (error) {
      console.error('Error calculating session metadata:', error);
      return {
        totalTokens: 0,
        averageResponseTime: 0,
        lastActivity: new Date().toISOString(),
        messageTypes: {
          text: 0,
          image: 0,
          file: 0,
          audio: 0,
          video: 0
        },
        performance: {
          avgProcessingTime: 0,
          errorCount: 0,
          successRate: 100
        }
      };
    }
  }

  // FIXED: Enhanced session update after message
  private async updateSessionAfterMessage(sessionId: string, message: SessionMessage): Promise<void> {
    try {
      const updates: Record<string, any> = {
        last_message_at: new Date().toISOString(),
        message_count: await this.getMessageCount(sessionId)
      };

      // Auto-generate title if needed
      if (message.role === 'user') {
        const session = await this.getSession(sessionId);
        if (session && session.settings.autoTitle && session.message_count <= 2) {
          const title = await this.generateSessionTitle(sessionId);
          if (title) {
            updates['title'] = title;
          }
        }
      }

      await updateChatSession(sessionId, updates);
    } catch (error) {
      console.error('Error updating session after message:', error);
    }
  }

  // FIXED: Auto-title generation
  private async generateSessionTitle(sessionId: string): Promise<string | null> {
    try {
      const messages = await this.loadSessionMessages(sessionId, 3);
      const userMessages = messages.filter(m => m.role === 'user');
      
      if (userMessages.length === 0) {
        return null;
      }

      const firstMessage = userMessages[0].content;
      
      // Simple title generation - you can enhance this with AI
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage;
      
      return title;
    } catch (error) {
      console.error('Error generating session title:', error);
      return null;
    }
  }

  // FIXED: Enhanced session statistics
  async getSessionStats(userId: string): Promise<SessionStats> {
    try {
      const sessions = await this.loadUserSessions(userId);
      const activeSessions = sessions.filter(s => s.is_active);
      
      let totalMessages = 0;
      let mostActiveSession: EnhancedChatSession | null = null;
      let maxMessages = 0;
      
      const sessionsByDay: Record<string, number> = {};
      const messagesByType: Record<string, number> = {
        text: 0,
        image: 0,
        file: 0,
        audio: 0,
        video: 0
      };

      sessions.forEach(session => {
        totalMessages += session.message_count;
        
        if (session.message_count > maxMessages) {
          maxMessages = session.message_count;
          mostActiveSession = session;
        }
        
        // Count by day
        const day = session.created_at.split('T')[0];
        sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
        
        // Count by message type
        if (session.metadata.messageTypes) {
          Object.entries(session.metadata.messageTypes).forEach(([type, count]) => {
            messagesByType[type] = (messagesByType[type] || 0) + (count as number);
          });
        }
      });

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId, 10);

      return {
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        totalMessages,
        averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
        mostActiveSession,
        recentActivity,
        sessionsByDay,
        messagesByType
      };
    } catch (error) {
      const classifiedError = await handleChatError(error, {
        userId,
        component: 'session_manager',
        action: 'get_stats'
      });
      
      throw new Error(classifiedError.userMessage || 'Failed to get session stats');
    }
  }

  // FIXED: Enhanced recent activity
  private async getRecentActivity(userId: string, limit: number = 10): Promise<SessionMessage[]> {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return messages?.map(msg => ({
        id: msg.id,
        session_id: msg.session_id,
        user_id: msg.user_id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments || [],
        metadata: msg.metadata || {},
        created_at: msg.created_at
      })) || [];
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  // FIXED: Helper methods
  private async getSession(sessionId: string): Promise<EnhancedChatSession | null> {
    try {
      const { data: session, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        return null;
      }

      return {
        ...session,
        settings: typeof session.settings === 'object' && session.settings !== null 
          ? {
              model: 'gemini-2.5-flash',
              temperature: 0.7,
              maxTokens: 4096,
              autoTitle: true,
              ...session.settings
            }
          : {
              model: 'gemini-2.5-flash',
              temperature: 0.7,
              maxTokens: 4096,
              autoTitle: true
            },
        metadata: await this.calculateSessionMetadata(sessionId)
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  private async getMessageCount(sessionId: string): Promise<number> {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('session_id', sessionId);

      if (error) {
        throw error;
      }

      return messages?.length || 0;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  private invalidateUserCache(userId: string): void {
    const cacheKey = `user_sessions_${userId}`;
    this.sessionCache.delete(cacheKey);
  }

  // FIXED: Subscription management for real-time updates
  subscribe(sessionId: string, callback: (session: EnhancedChatSession) => void): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    
    this.subscribers.get(sessionId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const sessionSubscribers = this.subscribers.get(sessionId);
      if (sessionSubscribers) {
        sessionSubscribers.delete(callback);
        if (sessionSubscribers.size === 0) {
          this.subscribers.delete(sessionId);
        }
      }
    };
  }

  private notifySubscribers(sessionId: string, session: EnhancedChatSession): void {
    const sessionSubscribers = this.subscribers.get(sessionId);
    if (sessionSubscribers) {
      sessionSubscribers.forEach(callback => {
        try {
          callback(session);
        } catch (error) {
          console.error('Error in session subscriber callback:', error);
        }
      });
    }
  }

  // FIXED: Cleanup methods
  async cleanup(): Promise<void> {
    this.sessionCache.clear();
    this.messageCache.clear();
    this.subscribers.clear();
  }
}

export default SessionManager;