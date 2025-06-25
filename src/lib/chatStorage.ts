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
    const title = this.generateSessionTitle(firstMessage.content);
    const session: ChatSession = {
      id: generateId(),
      title,
      messages: [firstMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.saveSession(session);
    return session;
  }

  static updateSession(sessionId: string, messages: Message[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessions = this.getSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        const session = sessions[sessionIndex];
        session.messages = messages;
        session.updatedAt = new Date();
        
        // Update title if it's the default and we have new messages
        if (session.title.startsWith('Chat') && messages.length > 0) {
          session.title = this.generateSessionTitle(messages[0].content);
        }
        
        this.saveSession(session);
      }
    } catch (error) {
      console.error('Error updating chat session:', error);
    }
  }

  static getSession(sessionId: string): ChatSession | null {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  static clearAllSessions(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing chat sessions:', error);
    }
  }

  static exportSessions(): string {
    const sessions = this.getSessions();
    return JSON.stringify(sessions, null, 2);
  }

  static importSessions(jsonData: string): boolean {
    try {
      const sessions = JSON.parse(jsonData);
      
      // Validate the data structure
      if (!Array.isArray(sessions)) {
        throw new Error('Invalid data format: expected array');
      }
      
      // Validate each session
      sessions.forEach((session, index) => {
        if (!session.id || !session.title || !Array.isArray(session.messages)) {
          throw new Error(`Invalid session at index ${index}`);
        }
      });
      
      // Convert dates and save
      const validatedSessions = sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedSessions));
      return true;
    } catch (error) {
      console.error('Error importing chat sessions:', error);
      return false;
    }
  }

  private static generateSessionTitle(firstMessage: string): string {
    // Clean and truncate the first message to create a title
    const cleaned = firstMessage
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (cleaned.length === 0) {
      return `Chat ${new Date().toLocaleDateString()}`;
    }
    
    // Take first 50 characters and add ellipsis if needed
    const title = cleaned.length > 50 
      ? cleaned.substring(0, 47) + '...'
      : cleaned;
    
    return title || `Chat ${new Date().toLocaleDateString()}`;
  }

  static getSessionStats(): {
    totalSessions: number;
    totalMessages: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const sessions = this.getSessions();
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        oldestSession: null,
        newestSession: null
      };
    }
    
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const dates = sessions.map(s => s.createdAt);
    
    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestSession: new Date(Math.min(...dates.map(d => d.getTime()))),
      newestSession: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }

  static searchSessions(query: string): ChatSession[] {
    const sessions = this.getSessions();
    const lowerQuery = query.toLowerCase();
    
    return sessions.filter(session => {
      // Search in title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in messages
      return session.messages.some(message => 
        message.content.toLowerCase().includes(lowerQuery)
      );
    });
  }
}