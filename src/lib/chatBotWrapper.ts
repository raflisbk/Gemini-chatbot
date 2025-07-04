// src/lib/chatBotWrapper.ts - WRAPPER UNTUK MEMPERBAIKI SEMUA ERROR CHATBOT.TSX
import { ChatStorage } from './chatStorage';
import type { ChatSession, Message } from './chatStorage';

// ========================================
// EXACT INTERFACES UNTUK CHATBOT.TSX
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
  timestamp: Date;
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
}

// ========================================
// CHATBOT WRAPPER CLASS - SOLUSI FINAL
// ========================================

export class ChatBotWrapper {
  
  // FIXED: getSessions dengan user safety check
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
        updatedAt: new Date(session.updated_at), // FIXED: Convert to Date
        messages: session.messages?.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
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

  // FIXED: createNewSession dengan await dan proper return
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

  // FIXED: saveSession dengan single parameter
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

  // FIXED: getSessionById dengan message loading
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
        updatedAt: new Date(session.updated_at), // FIXED: Convert to Date
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
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

  // FIXED: loadSessionMessages dengan non-undefined return
  static async loadSessionMessages(sessionId: string): Promise<ChatBotMessage[]> {
    try {
      const messages = await ChatStorage.loadSessionMessages(sessionId);
      
      return messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        attachments: msg.attachments,
        tokens_used: msg.tokens_used,
        model_used: msg.model_used
      }));
    } catch (error) {
      console.error('Error loading session messages:', error);
      return []; // FIXED: Always return array, never undefined
    }
  }

  // Helper methods
  static async deleteSession(sessionId: string): Promise<boolean> {
    return ChatStorage.deleteSession(sessionId);
  }

  static async updateSessionTitle(sessionId: string, newTitle: string): Promise<boolean> {
    return ChatStorage.updateSessionTitle(sessionId, newTitle);
  }

  static async exportSession(sessionId: string): Promise<string | null> {
    return ChatStorage.exportSession(sessionId);
  }

  static async getUserStats(userId: string | undefined) {
    if (!userId) return null;
    return ChatStorage.getUserStats(userId);
  }
}

// ========================================
// EXPORT UNTUK CHATBOT.TSX
// ========================================

export default ChatBotWrapper;

// Export types untuk import di ChatBot.tsx
export type { ChatBotSession as ChatSession, ChatBotMessage as Message };