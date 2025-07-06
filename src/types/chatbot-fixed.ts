// src/types/chatbot-fixed.ts - CLEAN VERSION WITH NO DUPLICATE EXPORTS

// ========================================
// FIXED MESSAGE INTERFACE
// ========================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date; // FIXED: Date type untuk toLocaleDateString() dan date methods
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
  tokens_used?: number;
  model_used?: string;
  metadata?: Record<string, any>;
}

// ========================================
// FIXED SESSION INTERFACE
// ========================================

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string | null;
  context_summary: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updatedAt: Date; // FIXED: Date type untuk toLocaleDateString()
  messages: Message[]; // FIXED: Always array, never undefined
}

// ========================================
// CHATBOT STORAGE INTERFACE - FIXED FUNCTION SIGNATURES
// ========================================

export interface ChatBotStorageInterface {
  getSessions(userId: string): Promise<ChatSession[]>;
  createNewSession(userId: string, title: string): Promise<{ id: string } | null>;
  saveSession(session: ChatSession): Promise<void>;
  getSessionById(sessionId: string): Promise<ChatSession | null>;
  saveMessage(
    sessionId: string,
    userId: string | undefined,
    role: 'user' | 'assistant',
    content: string,
    attachments?: any[],
    metadata?: any
  ): Promise<string | null>;
  loadSessionMessages(sessionId: string): Promise<Message[]>;
  deleteSession(sessionId: string): Promise<boolean>;
  updateSessionTitle(sessionId: string, newTitle: string): Promise<boolean>;
  exportSession(sessionId: string): Promise<string | null>;
  getUserStats(userId: string): Promise<any>;
}

// ========================================
// COMPATIBILITY FUNCTIONS - SINGLE EXPORT
// ========================================

export function ensureDate(dateValue: string | Date): Date {
  if (dateValue instanceof Date) {
    return dateValue;
  }
  return new Date(dateValue);
}

export function ensureMessages(messages: Message[] | undefined): Message[] {
  return messages || [];
}

export function convertToCompatibleSession(session: any): ChatSession {
  return {
    id: session.id,
    user_id: session.user_id || session.userId || '',
    title: session.title,
    message_count: session.message_count || session.messageCount || 0,
    last_message_at: session.last_message_at || session.lastMessageAt || null,
    context_summary: session.context_summary || session.contextSummary || null,
    settings: session.settings || {},
    is_active: session.is_active ?? session.isActive ?? true,
    created_at: session.created_at || session.createdAt || new Date().toISOString(),
    updated_at: session.updated_at || session.updatedAt || new Date().toISOString(),
    updatedAt: ensureDate(session.updated_at || session.updatedAt || new Date()),
    messages: ensureMessages(session.messages)
  };
}

export function convertToCompatibleMessage(message: any): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: ensureDate(message.timestamp),
    attachments: message.attachments || [],
    tokens_used: message.tokens_used || message.tokensUsed,
    model_used: message.model_used || message.modelUsed,
    metadata: message.metadata
  };
}

// ========================================
// ERROR HANDLING TYPES
// ========================================

export interface ChatBotError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type ChatBotErrorCode = 
  | 'INVALID_USER_ID'
  | 'SESSION_NOT_FOUND'
  | 'MESSAGE_SAVE_FAILED'
  | 'SESSION_LOAD_FAILED'
  | 'INVALID_ARGUMENTS'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// ========================================
// VALIDATION HELPERS - SINGLE EXPORT
// ========================================

export class ChatBotValidator {
  static validateUserId(userId: string | undefined): userId is string {
    return typeof userId === 'string' && userId.length > 0;
  }

  static validateSessionId(sessionId: string | undefined): sessionId is string {
    return typeof sessionId === 'string' && sessionId.length > 0;
  }

  static validateMessage(message: Partial<Message>): message is Message {
    return !!(
      message.id &&
      message.role &&
      message.content &&
      message.timestamp
    );
  }

  static validateSession(session: Partial<ChatSession>): session is ChatSession {
    return !!(
      session.id &&
      session.user_id &&
      session.title &&
      typeof session.message_count === 'number' &&
      typeof session.is_active === 'boolean' &&
      session.created_at &&
      session.updated_at &&
      session.updatedAt instanceof Date &&
      Array.isArray(session.messages)
    );
  }
}

// ========================================
// UTILITY TYPES
// ========================================

export type SessionSortOrder = 'newest' | 'oldest' | 'alphabetical' | 'most_messages';
export type MessageRole = 'user' | 'assistant' | 'system';
export type FileCategory = 'image' | 'document' | 'audio' | 'video' | 'code' | 'archive' | 'other';

// ========================================
// WRAPPER CONFIGURATION
// ========================================

export interface ChatBotWrapperConfig {
  autoSave: boolean;
  maxRetries: number;
  retryDelay: number;
  cacheTimeout: number;
  validateInputs: boolean;
  logErrors: boolean;
}

export const DEFAULT_WRAPPER_CONFIG: ChatBotWrapperConfig = {
  autoSave: true,
  maxRetries: 3,
  retryDelay: 1000,
  cacheTimeout: 300000,
  validateInputs: true,
  logErrors: true
};

// ========================================
// MIGRATION HELPERS - SINGLE EXPORT
// ========================================

export class ChatBotMigrationHelper {
  static migrateSession(oldSession: any): ChatSession {
    const now = new Date().toISOString();
    
    return {
      id: oldSession.id || this.generateId(),
      user_id: oldSession.user_id || oldSession.userId || '',
      title: oldSession.title || 'Untitled Chat',
      message_count: oldSession.message_count || oldSession.messageCount || 0,
      last_message_at: oldSession.last_message_at || oldSession.lastMessageAt || null,
      context_summary: oldSession.context_summary || oldSession.contextSummary || null,
      settings: oldSession.settings || {},
      is_active: oldSession.is_active ?? oldSession.isActive ?? true,
      created_at: oldSession.created_at || oldSession.createdAt || now,
      updated_at: oldSession.updated_at || oldSession.updatedAt || now,
      updatedAt: ensureDate(oldSession.updated_at || oldSession.updatedAt || now),
      messages: ensureMessages(oldSession.messages)
    };
  }

  static migrateMessage(oldMessage: any): Message {
    return {
      id: oldMessage.id || this.generateId(),
      role: oldMessage.role || 'user',
      content: oldMessage.content || '',
      timestamp: ensureDate(oldMessage.timestamp || new Date()),
      attachments: oldMessage.attachments || [],
      tokens_used: oldMessage.tokens_used || oldMessage.tokensUsed,
      model_used: oldMessage.model_used || oldMessage.modelUsed,
      metadata: oldMessage.metadata
    };
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  static migrateSessions(oldSessions: any[]): ChatSession[] {
    return oldSessions.map(session => this.migrateSession(session));
  }

  static migrateMessages(oldMessages: any[]): Message[] {
    return oldMessages.map(message => this.migrateMessage(message));
  }
}

// ========================================
// PERFORMANCE MONITORING - SINGLE EXPORT
// ========================================

export interface ChatBotPerformanceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ChatBotPerformanceMonitor {
  private static metrics: ChatBotPerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000;

  static startOperation(operationName: string): () => void {
    const startTime = performance.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      
      this.metrics.push({
        operationName,
        duration,
        success,
        timestamp: new Date(),
        metadata
      });

      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS);
      }
    };
  }

  static getMetrics(): ChatBotPerformanceMetrics[] {
    return [...this.metrics];
  }

  static getAverageOperationTime(operationName: string): number {
    const operationMetrics = this.metrics.filter(m => m.operationName === operationName);
    if (operationMetrics.length === 0) return 0;
    
    const totalTime = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / operationMetrics.length;
  }

  static getSuccessRate(operationName: string): number {
    const operationMetrics = this.metrics.filter(m => m.operationName === operationName);
    if (operationMetrics.length === 0) return 1;
    
    const successCount = operationMetrics.filter(m => m.success).length;
    return successCount / operationMetrics.length;
  }

  static clearMetrics(): void {
    this.metrics = [];
  }
}