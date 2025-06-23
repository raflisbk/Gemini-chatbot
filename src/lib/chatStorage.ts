import { ChatSession, Message } from './types';
import { generateId } from './utils';

const STORAGE_KEY = 'gemini-chat-sessions';
const MAX_SESSIONS = 50; // Limit untuk performance

export class ChatStorage {
  static getSessions(): ChatSession[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const sessions = JSON.parse(stored);
      return sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return [];
    }
  }

  static saveSession(session: ChatSession): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessions = this.getSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.unshift(session); // Add to beginning
      }
      
      // Keep only latest sessions
      const limitedSessions = sessions.slice(0, MAX_SESSIONS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedSessions));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  static deleteSession(sessionId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessions = this.getSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  static createSession(firstMessage: Message): ChatSession {
    const title = this.generateTitle(firstMessage.content);
    
    return {
      id: generateId(),
      title,
      messages: [firstMessage],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static updateSessionMessages(sessionId: string, messages: Message[]): void {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex >= 0) {
      sessions[sessionIndex].messages = messages;
      sessions[sessionIndex].updatedAt = new Date();
      
      // Update title if this is the first assistant response
      if (messages.length === 2 && messages[1].role === 'assistant') {
        sessions[sessionIndex].title = this.generateTitle(messages[0].content);
      }
      
      this.saveSession(sessions[sessionIndex]);
    }
  }

  private static generateTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(' ');
    const title = words.slice(0, 6).join(' ');
    return title.length > 50 ? title.substring(0, 50) + '...' : title;
  }

  static clearAllSessions(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
}