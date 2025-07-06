// src/lib/chatBotWrapper.ts - COMPLETE WRAPPER UNTUK MEMPERBAIKI SEMUA ERROR CHATBOT.TSX

import { ChatStorage } from './chatStorage';
import type { ChatSession, Message } from './chatStorage';

// ========================================
// EXACT INTERFACES UNTUK CHATBOT.TSX COMPATIBILITY
// ========================================

export interface ChatBotSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string | null;
  context_summary: string | null;
  settings: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updatedAt: Date; // FIXED: Date type untuk toLocaleDateString()
  messages: ChatBotMessage[];
}

export interface ChatBotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date; // FIXED: Date type untuk date methods
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
}

// ========================================
// CHATBOT WRAPPER CLASS - SOLUSI FINAL UNTUK SEMUA ERROR
// ========================================

export class ChatBotWrapper {
  
  // FIXED ERROR LINE 310: getSessions dengan single argument (userId only)
  static async getSessions(userId: string | undefined): Promise<ChatBotSession[]> {
    if (!userId) {
      console.warn('ChatBot: userId is undefined, returning empty sessions');
      return [];
    }

    try {
      const sessions = await ChatStorage.getSessions(userId);
      
      return sessions.map(session => ({
        id: session.id,
        user_id: session.user_id || userId,
        title: session.title,
        message_count: session.message_count,
        last_message_at: session.last_message_at,
        context_summary: session.context_summary,
        settings: session.settings || {},
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at,
        updatedAt: new Date(session.updated_at), // FIXED: Convert string to Date
        messages: session.messages?.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp), // FIXED: Convert to Date
          attachments: msg.attachments,
          tokens_used: msg.tokens_used,
          model_used: msg.model_used
        })) || []
      }));
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  // FIXED ERROR LINE 330: createNewSession dengan single argument (title only after userId check)
  static async createNewSession(userId: string | undefined, title: string): Promise<{ id: string } | null> {
    if (!userId) {
      console.warn('ChatBot: userId is undefined, cannot create session');
      return null;
    }

    try {
      const result = await ChatStorage.createNewSession(userId, title);
      return result; // Already returns { id: string } | null
    } catch (error) {
      console.error('Error creating new session:', error);
      return null;
    }
  }

  // FIXED ERROR LINE 333: saveSession dengan single parameter
  static async saveSession(session: ChatBotSession): Promise<void> {
    try {
      const chatSession: ChatSession = {
        id: session.id,
        user_id: session.user_id,
        title: session.title,
        message_count: session.message_count,
        last_message_at: session.last_message_at,
        context_summary: session.context_summary,
        settings: session.settings,
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at,
        updatedAt: session.updated_at,
        messages: session.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachments: msg.attachments,
          tokens_used: msg.tokens_used,
          model_used: msg.model_used
        }))
      };

      await ChatStorage.saveSession(chatSession);
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  // FIXED ERROR LINE 449: getSessionById dengan single argument (sessionId only, userId sebagai parameter kedua)
  static async getSessionById(sessionId: string, userId: string | undefined): Promise<ChatBotSession | null> {
    if (!userId) {
      console.warn('ChatBot: userId is undefined, cannot get session');
      return null;
    }

    try {
      const session = await ChatStorage.getSessionById(sessionId);
      if (!session) return null;

      const messages = await ChatStorage.loadSessionMessages(sessionId);

      return {
        id: session.id,
        user_id: session.user_id || userId,
        title: session.title,
        message_count: session.message_count,
        last_message_at: session.last_message_at,
        context_summary: session.context_summary,
        settings: session.settings || {},
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at,
        updatedAt: new Date(session.updated_at), // FIXED: Convert to Date for line 619
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp), // FIXED: Convert to Date
          attachments: msg.attachments,
          tokens_used: msg.tokens_used,
          model_used: msg.model_used
        }))
      };
    } catch (error) {
      console.error('Error getting session by ID:', error);
      return null;
    }
  }

  // FIXED: saveMessage dengan proper userId handling
  static async saveMessage(
    sessionId: string,
    userId: string | undefined,
    role: 'user' | 'assistant',
    content: string,
    attachments: any[] = [],
    metadata: any = {}
  ): Promise<string | null> {
    try {
      return await ChatStorage.saveMessage(
        sessionId,
        userId || undefined, // ChatStorage sudah handle undefined
        role,
        content,
        attachments,
        metadata
      );
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }

  // FIXED ERROR LINE 481: loadSessionMessages dengan single argument dan non-undefined return
  static async loadSessionMessages(sessionId: string): Promise<ChatBotMessage[]> {
    try {
      const messages = await ChatStorage.loadSessionMessages(sessionId);
      
      return messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp), // FIXED: Convert to Date
        attachments: msg.attachments,
        tokens_used: msg.tokens_used,
        model_used: msg.model_used
      }));
    } catch (error) {
      console.error('Error loading session messages:', error);
      return []; // FIXED: Always return array, never undefined
    }
  }

  // FIXED: deleteSession dengan single argument
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      return await ChatStorage.deleteSession(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  // Helper methods dengan fixed signatures
  static async updateSessionTitle(sessionId: string, newTitle: string): Promise<boolean> {
    try {
      return await ChatStorage.updateSessionTitle(sessionId, newTitle);
    } catch (error) {
      console.error('Error updating session title:', error);
      return false;
    }
  }

  static async exportSession(sessionId: string): Promise<string | null> {
    try {
      return await ChatStorage.exportSession(sessionId);
    } catch (error) {
      console.error('Error exporting session:', error);
      return null;
    }
  }

  static async getUserStats(userId: string | undefined) {
    if (!userId) return null;
    try {
      return await ChatStorage.getUserStats(userId);
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  // Additional utility methods for compatibility
  static async searchSessions(userId: string | undefined, query: string): Promise<ChatBotSession[]> {
    if (!userId) return [];
    
    try {
      const sessions = await this.getSessions(userId);
      return sessions.filter(session => 
        session.title.toLowerCase().includes(query.toLowerCase()) ||
        session.context_summary?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching sessions:', error);
      return [];
    }
  }

  static async duplicateSession(sessionId: string, userId: string | undefined): Promise<{ id: string } | null> {
    if (!userId) return null;

    try {
      const session = await this.getSessionById(sessionId, userId);
      if (!session) return null;

      const newSession = await this.createNewSession(userId, `${session.title} (Copy)`);
      if (!newSession) return null;

      // Copy messages
      for (const message of session.messages) {
        await this.saveMessage(
          newSession.id,
          userId,
          message.role,
          message.content,
          message.attachments || [],
          {
            tokensUsed: message.tokens_used,
            modelUsed: message.model_used
          }
        );
      }

      return newSession;
    } catch (error) {
      console.error('Error duplicating session:', error);
      return null;
    }
  }

  static async archiveSession(sessionId: string): Promise<boolean> {
    try {
      // Implementation depends on your archive system
      // For now, just mark as inactive
      const session = await ChatStorage.getSessionById(sessionId);
      if (!session) return false;

      const updatedSession: ChatBotSession = {
        ...session,
        user_id: session.user_id || '',
        is_active: false,
        updatedAt: new Date(),
        messages: []
      };

      await this.saveSession(updatedSession);
      return true;
    } catch (error) {
      console.error('Error archiving session:', error);
      return false;
    }
  }

  // Batch operations
  static async batchDeleteSessions(sessionIds: string[]): Promise<boolean> {
    try {
      const results = await Promise.all(
        sessionIds.map(id => this.deleteSession(id))
      );
      return results.every(result => result);
    } catch (error) {
      console.error('Error batch deleting sessions:', error);
      return false;
    }
  }

  static async getSessionCount(userId: string | undefined): Promise<number> {
    if (!userId) return 0;
    
    try {
      const sessions = await this.getSessions(userId);
      return sessions.length;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }
}

// ========================================
// EXPORT UNTUK CHATBOT.TSX
// ========================================

export default ChatBotWrapper;

// Export types untuk import di ChatBot.tsx  
export type { ChatBotSession as ChatSession, ChatBotMessage as Message };

// Export utility functions
export const chatBotUtils = {
  generateSessionTitle: (content: string): string => {
    return content.slice(0, 50) + (content.length > 50 ? '...' : '');
  },
  
  formatMessageCount: (count: number): string => {
    if (count === 0) return 'No messages';
    if (count === 1) return '1 message';
    return `${count} messages`;
  },
  
  formatLastActivity: (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  },
  
  validateSessionData: (session: Partial<ChatBotSession>): boolean => {
    return !!(session.id && session.title && session.user_id);
  }
};