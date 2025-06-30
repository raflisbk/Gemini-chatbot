import { 
  supabase, 
  getUserSessions, 
  createChatSession, 
  updateChatSession, 
  getSessionMessages, 
  createMessage, 
  deleteSession as deleteSessionFromDB 
} from './supabase';
import { generateId } from './utils';

// Keep backward compatibility with existing types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  metadata?: Record<string, any>;
}

const MAX_SESSIONS = 50; // Limit for performance
const GUEST_STORAGE_KEY = 'guest-chat-sessions';

export class ChatStorage {
  static updateSession(currentSessionId: string, updatedMessages: Message[]) {
    throw new Error('Method not implemented.');
  }
  static createSession(firstMessage: { id: string; content: string; role: "user"; timestamp: Date; }) {
    throw new Error('Method not implemented.');
  }
  // Get sessions for authenticated users from Supabase, guests from localStorage
  static async getSessions(userId?: string): Promise<ChatSession[]> {
    if (userId) {
      // Authenticated user - fetch from Supabase
      try {
        const sessions = await getUserSessions(userId);
        
        // Convert to our ChatSession format
        const chatSessions: ChatSession[] = await Promise.all(
          sessions.map(async (session) => {
            const messages = await getSessionMessages(session.id);
            
            return {
              id: session.id,
              title: session.title,
              createdAt: new Date(session.created_at),
              updatedAt: new Date(session.updated_at),
              isArchived: session.is_archived,
              metadata: session.session_data as Record<string, any>,
              messages: messages.map(msg => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                attachments: msg.attachments as any[],
                metadata: msg.metadata as Record<string, any>
              }))
            };
          })
        );

        return chatSessions;
      } catch (error) {
        console.error('Error loading chat sessions from Supabase:', error);
        return [];
      }
    } else {
      // Guest user - use localStorage
      return this.getGuestSessions();
    }
  }

  // Get guest sessions from localStorage (fallback)
  static getGuestSessions(): ChatSession[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
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
      console.error('Error loading guest chat sessions:', error);
      return [];
    }
  }

  // Save session for authenticated users to Supabase, guests to localStorage
  static async saveSession(session: ChatSession, userId?: string): Promise<void> {
    if (userId) {
      // Authenticated user - save to Supabase
      try {
        // Check if session exists
        const existingSessions = await getUserSessions(userId);
        const existingSession = existingSessions.find(s => s.id === session.id);

        if (existingSession) {
          // Update existing session
          await updateChatSession(session.id, {
            title: session.title,
            updated_at: new Date().toISOString(),
            session_data: session.metadata || {}
          });
        } else {
          // Create new session
          await createChatSession(
            userId,
            session.title
          );
        }

        // Save messages that don't exist yet
        const existingMessages = await getSessionMessages(session.id);
        const existingMessageIds = new Set(existingMessages.map(m => m.id));

        for (const message of session.messages) {
          if (!existingMessageIds.has(message.id)) {
            await createMessage({
              id: message.id,
              session_id: session.id,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp.toISOString(),
              attachments: message.attachments || [],
              metadata: message.metadata || {}
            });
          }
        }
      } catch (error) {
        console.error('Error saving chat session to Supabase:', error);
        // Fallback to localStorage
        this.saveGuestSession(session);
      }
    } else {
      // Guest user - save to localStorage
      this.saveGuestSession(session);
    }
  }

  // Save guest session to localStorage
  static saveGuestSession(session: ChatSession): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessions = this.getGuestSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.unshift(session); // Add to beginning
      }
      
      // Keep only latest sessions
      const limitedSessions = sessions.slice(0, MAX_SESSIONS);
      
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(limitedSessions));
    } catch (error) {
      console.error('Error saving guest chat session:', error);
    }
  }

  // Delete session
  static async deleteSession(sessionId: string, userId?: string): Promise<void> {
    if (userId) {
      // Authenticated user - delete from Supabase
      try {
        await deleteSessionFromDB(sessionId);
      } catch (error) {
        console.error('Error deleting session from Supabase:', error);
      }
    } else {
      // Guest user - delete from localStorage
      this.deleteGuestSession(sessionId);
    }
  }

  // Delete guest session from localStorage
  static deleteGuestSession(sessionId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessions = this.getGuestSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Error deleting guest session:', error);
    }
  }

  // Create new session
  static createNewSession(title?: string, userId?: string): ChatSession {
    return {
      id: generateId(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      metadata: {}
    };
  }

  // Add message to session
  static async addMessageToSession(
    sessionId: string, 
    message: Omit<Message, 'id' | 'timestamp'>,
    userId?: string
  ): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date()
    };

    if (userId) {
      // Authenticated user - save to Supabase
      try {
        await createMessage({
          id: newMessage.id,
          session_id: sessionId,
          role: newMessage.role,
          content: newMessage.content,
          timestamp: newMessage.timestamp.toISOString(),
          attachments: newMessage.attachments || [],
          metadata: newMessage.metadata || {}
        });

        // Update session timestamp
        await updateChatSession(sessionId, {
          updated_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error adding message to Supabase:', error);
      }
    } else {
      // Guest user - update localStorage
      const sessions = this.getGuestSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].messages.push(newMessage);
        sessions[sessionIndex].updatedAt = new Date();
        this.saveGuestSession(sessions[sessionIndex]);
      }
    }

    return newMessage;
  }

  // Get session by ID
  static async getSessionById(sessionId: string, userId?: string): Promise<ChatSession | null> {
    const sessions = await this.getSessions(userId);
    return sessions.find(s => s.id === sessionId) || null;
  }

  // Update session title
  static async updateSessionTitle(
    sessionId: string, 
    title: string, 
    userId?: string
  ): Promise<void> {
    if (userId) {
      // Authenticated user - update in Supabase
      try {
        await updateChatSession(sessionId, { title });
      } catch (error) {
        console.error('Error updating session title in Supabase:', error);
      }
    } else {
      // Guest user - update in localStorage
      const sessions = this.getGuestSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].title = title;
        sessions[sessionIndex].updatedAt = new Date();
        this.saveGuestSession(sessions[sessionIndex]);
      }
    }
  }

  // Archive/unarchive session
  static async archiveSession(
    sessionId: string, 
    archived: boolean, 
    userId?: string
  ): Promise<void> {
    if (userId) {
      // Authenticated user - update in Supabase
      try {
        await updateChatSession(sessionId, { is_archived: archived });
      } catch (error) {
        console.error('Error archiving session in Supabase:', error);
      }
    } else {
      // Guest user - update in localStorage
      const sessions = this.getGuestSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].isArchived = archived;
        sessions[sessionIndex].updatedAt = new Date();
        this.saveGuestSession(sessions[sessionIndex]);
      }
    }
  }

  // Export sessions (for backup/migration)
  static async exportSessions(userId?: string): Promise<string> {
    const sessions = await this.getSessions(userId);
    return JSON.stringify({
      sessions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    });
  }

  // Import sessions (for backup/migration)
  static async importSessions(
    data: string, 
    userId?: string, 
    merge: boolean = false
  ): Promise<{ success: boolean; imported: number; errors: number }> {
    try {
      const parsed = JSON.parse(data);
      const importedSessions: ChatSession[] = parsed.sessions || [];
      
      let imported = 0;
      let errors = 0;

      if (!merge) {
        // Clear existing sessions first
        if (userId) {
          const existingSessions = await getUserSessions(userId);
          for (const session of existingSessions) {
            await this.deleteSession(session.id, userId);
          }
        } else {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        }
      }

      // Import each session
      for (const session of importedSessions) {
        try {
          await this.saveSession(session, userId);
          imported++;
        } catch (error) {
          console.error('Error importing session:', error);
          errors++;
        }
      }

      return { success: true, imported, errors };
    } catch (error) {
      console.error('Error importing sessions:', error);
      return { success: false, imported: 0, errors: 1 };
    }
  }

  // Clean up old sessions (keep only recent ones)
  static async cleanupOldSessions(
    keepCount: number = MAX_SESSIONS, 
    userId?: string
  ): Promise<number> {
    const sessions = await this.getSessions(userId);
    
    if (sessions.length <= keepCount) {
      return 0;
    }

    // Sort by update date and keep only the most recent
    const sortedSessions = sessions.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    
    const sessionsToDelete = sortedSessions.slice(keepCount);
    
    for (const session of sessionsToDelete) {
      await this.deleteSession(session.id, userId);
    }

    return sessionsToDelete.length;
  }

  // Search sessions by content
  static async searchSessions(
    query: string, 
    userId?: string
  ): Promise<ChatSession[]> {
    const sessions = await this.getSessions(userId);
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