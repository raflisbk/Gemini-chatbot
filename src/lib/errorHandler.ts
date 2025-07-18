// src/lib/errorHandler.ts - Enhanced error handler with chat integration
import { supabaseAdmin } from './supabase';

export enum ErrorType {
  // Authentication errors
  AUTH_ERROR = 'auth_error',
  TOKEN_EXPIRED = 'token_expired',
  INVALID_CREDENTIALS = 'invalid_credentials',
  
  // Rate limiting errors
  RATE_LIMIT_ERROR = 'rate_limit_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  
  // Chat specific errors
  CHAT_ERROR = 'chat_error',
  AI_SERVICE_ERROR = 'ai_service_error',
  CONTEXT_ERROR = 'context_error',
  
  // File handling errors
  FILE_ERROR = 'file_error',
  FILE_TOO_LARGE = 'file_too_large',
  UNSUPPORTED_FILE = 'unsupported_file',
  
  // Database errors
  DATABASE_ERROR = 'database_error',
  SESSION_ERROR = 'session_error',
  
  // Network errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  
  // Validation errors
  VALIDATION_ERROR = 'validation_error',
  MISSING_REQUIRED = 'missing_required',
  
  // System errors
  SYSTEM_ERROR = 'system_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  statusCode: number;
  isRetryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  timestamp: Date;
  userMessage?: string; // User-friendly message
}

export interface ErrorReport {
  errorId: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  level: 'error' | 'warning' | 'info';
  tags: string[];
  extra: Record<string, any>;
}

export class AppErrorHandler {
  private static instance: AppErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private isProcessing = false;
  
  private constructor() {}
  
  static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler();
    }
    return AppErrorHandler.instance;
  }

  // FIXED: Enhanced error classification with chat-specific errors
  static classifyError(error: any, context?: string): ClassifiedError {
    const timestamp = new Date();
    let type = ErrorType.UNKNOWN_ERROR;
    let statusCode = 500;
    let isRetryable = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let userMessage = 'An unexpected error occurred';

    // Extract error message
    const message = error?.message || error?.error || String(error);

    // FIXED: Enhanced error classification logic
    if (message.includes('rate limit') || message.includes('quota exceeded')) {
      type = ErrorType.RATE_LIMIT_ERROR;
      statusCode = 429;
      isRetryable = true;
      severity = 'medium';
      userMessage = 'You have reached your message limit. Please try again later.';
    } else if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      type = ErrorType.AUTH_ERROR;
      statusCode = 401;
      isRetryable = false;
      severity = 'medium';
      userMessage = 'Authentication required. Please log in again.';
    } else if (message.includes('file') && message.includes('large')) {
      type = ErrorType.FILE_TOO_LARGE;
      statusCode = 413;
      isRetryable = false;
      severity = 'low';
      userMessage = 'File is too large. Please choose a smaller file.';
    } else if (message.includes('unsupported') && message.includes('file')) {
      type = ErrorType.UNSUPPORTED_FILE;
      statusCode = 415;
      isRetryable = false;
      severity = 'low';
      userMessage = 'File type not supported. Please choose a different file.';
    } else if (message.includes('AI') || message.includes('gemini') || message.includes('model')) {
      type = ErrorType.AI_SERVICE_ERROR;
      statusCode = 503;
      isRetryable = true;
      severity = 'high';
      userMessage = 'AI service is temporarily unavailable. Please try again.';
    } else if (message.includes('database') || message.includes('supabase')) {
      type = ErrorType.DATABASE_ERROR;
      statusCode = 500;
      isRetryable = true;
      severity = 'high';
      userMessage = 'Database error occurred. Please try again.';
    } else if (message.includes('session')) {
      type = ErrorType.SESSION_ERROR;
      statusCode = 400;
      isRetryable = true;
      severity = 'medium';
      userMessage = 'Session error. Please refresh the page.';
    } else if (message.includes('network') || message.includes('fetch')) {
      type = ErrorType.NETWORK_ERROR;
      statusCode = 503;
      isRetryable = true;
      severity = 'medium';
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (message.includes('timeout')) {
      type = ErrorType.TIMEOUT_ERROR;
      statusCode = 408;
      isRetryable = true;
      severity = 'medium';
      userMessage = 'Request timed out. Please try again.';
    } else if (message.includes('validation') || message.includes('required')) {
      type = ErrorType.VALIDATION_ERROR;
      statusCode = 400;
      isRetryable = false;
      severity = 'low';
      userMessage = 'Invalid input. Please check your data and try again.';
    } else if (context === 'chat_api') {
      type = ErrorType.CHAT_ERROR;
      statusCode = 500;
      isRetryable = true;
      severity = 'high';
      userMessage = 'Chat service error. Please try again.';
    }

    return {
      type,
      message,
      statusCode,
      isRetryable,
      severity,
      timestamp,
      userMessage,
      context: context ? { source: context } : undefined
    };
  }

  // FIXED: Enhanced error reporting with chat context
  static async reportError(
    error: Error | string,
    context?: {
      userId?: string;
      sessionId?: string;
      component?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const instance = AppErrorHandler.getInstance();
      
      const errorReport: ErrorReport = {
        errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userId: context?.userId,
        sessionId: context?.sessionId,
        level: 'error',
        tags: [
          context?.component || 'unknown',
          context?.action || 'unknown'
        ],
        extra: {
          ...context?.metadata,
          context: context?.component,
          action: context?.action
        }
      };

      // Add to queue for processing
      instance.errorQueue.push(errorReport);
      
      // Process queue if not already processing
      if (!instance.isProcessing) {
        instance.processErrorQueue();
      }
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  // FIXED: Enhanced error queue processing
  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const errorsToProcess = [...this.errorQueue];
      this.errorQueue = [];
      
      // Process errors in batches
      const batchSize = 10;
      for (let i = 0; i < errorsToProcess.length; i += batchSize) {
        const batch = errorsToProcess.slice(i, i + batchSize);
        await this.processBatch(batch);
      }
    } catch (error) {
      console.error('Error processing error queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // FIXED: Enhanced batch processing
  private async processBatch(errors: ErrorReport[]): Promise<void> {
    try {
      // Store errors in database
      const { error: insertError } = await supabaseAdmin
        .from('error_reports')
        .insert(
          errors.map(err => ({
            error_id: err.errorId,
            timestamp: err.timestamp,
            message: err.message,
            stack: err.stack,
            component_stack: err.componentStack,
            user_agent: err.userAgent,
            url: err.url,
            user_id: err.userId,
            session_id: err.sessionId,
            level: err.level,
            tags: err.tags,
            extra: err.extra
          }))
        );

      if (insertError) {
        console.error('Error inserting error reports:', insertError);
      }

      // Send critical errors to monitoring service (if configured)
      const criticalErrors = errors.filter(err => 
        err.level === 'error' && 
        (err.extra?.severity === 'critical' || err.extra?.severity === 'high')
      );

      if (criticalErrors.length > 0) {
        await this.notifyCriticalErrors(criticalErrors);
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }

  // FIXED: Enhanced critical error notification
  private async notifyCriticalErrors(errors: ErrorReport[]): Promise<void> {
    try {
      // Log critical errors
      console.error('Critical errors detected:', errors.length);
      
      // Here you could integrate with monitoring services like:
      // - Sentry
      // - LogRocket
      // - DataDog
      // - Custom webhook
      
      // For now, we'll just log them
      errors.forEach(error => {
        console.error(`Critical Error ${error.errorId}:`, {
          message: error.message,
          userId: error.userId,
          sessionId: error.sessionId,
          tags: error.tags,
          timestamp: error.timestamp
        });
      });
    } catch (error) {
      console.error('Error notifying critical errors:', error);
    }
  }

  // FIXED: Enhanced error analytics
  static async getErrorAnalytics(
    startDate?: string,
    endDate?: string,
    userId?: string
  ): Promise<any> {
    try {
      let query = supabaseAdmin
        .from('error_reports')
        .select('*');

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: errors, error } = await query
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        throw error;
      }

      // Analyze errors - FIXED: Use correct schema fields
      const analytics = {
        totalErrors: errors?.length || 0,
        errorsByType: {} as Record<string, number>,
        errorsByComponent: {} as Record<string, number>,
        errorsByUser: {} as Record<string, number>,
        errorsByDay: {} as Record<string, number>,
        topErrors: [] as Array<{ message: string; count: number }>,
        criticalErrors: errors?.filter(err => err.error_type === 'critical').length || 0
      };

      // Group errors by various dimensions
      errors?.forEach(error => {
        // By type
        const errorType = error.error_type || 'unknown';
        analytics.errorsByType[errorType] = (analytics.errorsByType[errorType] || 0) + 1;

        // By user
        const userId = error.user_id || 'anonymous';
        analytics.errorsByUser[userId] = (analytics.errorsByUser[userId] || 0) + 1;

        // By day
        const day = error.created_at.split('T')[0];
        analytics.errorsByDay[day] = (analytics.errorsByDay[day] || 0) + 1;
      });

      // Get top errors by frequency
      const errorFrequency: Record<string, number> = {};
      errors?.forEach(error => {
        const key = error.error_message.substring(0, 100);
        errorFrequency[key] = (errorFrequency[key] || 0) + 1;
      });

      analytics.topErrors = Object.entries(errorFrequency)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([message, count]) => ({ message, count: count as number }));

      return analytics;
    } catch (error) {
      console.error('Error getting error analytics:', error);
      return null;
    }
  }

  // FIXED: Enhanced error cleanup
  static async cleanupOldErrors(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabaseAdmin
        .from('error_reports')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error cleanup failed:', error);
        return 0;
      }

      const cleanedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${cleanedCount} old error reports`);
      
      return cleanedCount;
    } catch (error) {
      console.error('Error cleanup failed:', error);
      return 0;
    }
  }

  // FIXED: Enhanced retry logic
  static shouldRetry(error: ClassifiedError, attemptCount: number): boolean {
    const maxRetries = 3;
    
    if (attemptCount >= maxRetries) {
      return false;
    }

    // Don't retry certain error types
    const nonRetryableTypes = [
      ErrorType.AUTH_ERROR,
      ErrorType.VALIDATION_ERROR,
      ErrorType.FILE_TOO_LARGE,
      ErrorType.UNSUPPORTED_FILE,
      ErrorType.INVALID_CREDENTIALS
    ];

    if (nonRetryableTypes.includes(error.type)) {
      return false;
    }

    // Retry logic based on error type
    switch (error.type) {
      case ErrorType.RATE_LIMIT_ERROR:
        return attemptCount < 2; // Only retry once for rate limits
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return attemptCount < maxRetries;
      case ErrorType.AI_SERVICE_ERROR:
        return attemptCount < 2; // Limited retries for AI service
      default:
        return error.isRetryable && attemptCount < maxRetries;
    }
  }

  // FIXED: Enhanced delay calculation for retries
  static getRetryDelay(error: ClassifiedError, attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attemptCount),
      maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    // Special handling for rate limits
    if (error.type === ErrorType.RATE_LIMIT_ERROR) {
      return Math.min(60000, exponentialDelay + jitter); // At least 1 minute for rate limits
    }
    
    return exponentialDelay + jitter;
  }
}

// FIXED: Enhanced error boundary helper
export const handleChatError = async (
  error: any,
  context: {
    userId?: string;
    sessionId?: string;
    component: string;
    action: string;
    metadata?: Record<string, any>;
  }
): Promise<ClassifiedError> => {
  // Classify the error
  const classifiedError = AppErrorHandler.classifyError(error, context.component);
  
  // Report the error - FIXED: Handle both Error objects and strings
  const errorToReport = error instanceof Error ? error : new Error(String(error));
  await AppErrorHandler.reportError(errorToReport, context);
  
  return classifiedError;
};

// FIXED: Enhanced error recovery utilities
export const recoverFromError = async (
  error: ClassifiedError,
  recoveryFn?: () => Promise<void>
): Promise<void> => {
  try {
    switch (error.type) {
      case ErrorType.SESSION_ERROR:
        // Refresh the page or redirect to login
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
        break;
        
      case ErrorType.AUTH_ERROR:
        // Redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        break;
        
      case ErrorType.NETWORK_ERROR:
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (recoveryFn) {
          await recoveryFn();
        }
        break;
        
      default:
        // Default recovery
        if (recoveryFn) {
          await recoveryFn();
        }
        break;
    }
  } catch (recoveryError) {
    console.error('Error during recovery:', recoveryError);
    await AppErrorHandler.reportError(recoveryError, {
      component: 'error_recovery',
      action: 'recovery_failed'
    });
  }
};

export default AppErrorHandler;