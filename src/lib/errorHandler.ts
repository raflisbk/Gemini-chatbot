// src/lib/errorHandler.ts - Centralized error handling utility

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  statusCode?: number;
  context?: string;
  originalError?: Error;
  timestamp: Date;
}

export enum ErrorType {
  // Network and API errors
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  TIMEOUT_ERROR = 'timeout_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMITED = 'rate_limited',
  
  // File handling errors
  FILE_TOO_LARGE = 'file_too_large',
  FILE_INVALID_TYPE = 'file_invalid_type',
  FILE_PROCESSING_ERROR = 'file_processing_error',
  FILE_UPLOAD_FAILED = 'file_upload_failed',
  
  // AI/Content errors
  CONTENT_BLOCKED = 'content_blocked',
  SAFETY_FILTER = 'safety_filter',
  AI_PROCESSING_ERROR = 'ai_processing_error',
  RESPONSE_INCOMPLETE = 'response_incomplete',
  
  // Authentication and authorization
  AUTH_REQUIRED = 'auth_required',
  PERMISSION_DENIED = 'permission_denied',
  SESSION_EXPIRED = 'session_expired',
  
  // Validation errors
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  
  // System errors
  SERVER_ERROR = 'server_error',
  DATABASE_ERROR = 'database_error',
  MEMORY_ERROR = 'memory_error',
  
  // User interface errors
  UI_ERROR = 'ui_error',
  STATE_ERROR = 'state_error',
  
  // Generic
  UNKNOWN_ERROR = 'unknown_error'
}

export class AppErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static lastErrors = new Map<string, Date>();
  
  // Create structured error with proper classification
  static createError(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    context?: string,
    originalError?: Error
  ): AppError {
    return {
      message,
      type,
      context,
      originalError,
      timestamp: new Date(),
      statusCode: this.getStatusCodeForErrorType(type)
    };
  }

  // Classify errors automatically from Error objects
  static classifyError(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network and API errors
      if (message.includes('fetch') || message.includes('network')) {
        return this.createError(
          'Network connection error. Please check your internet connection.',
          ErrorType.NETWORK_ERROR,
          context,
          error
        );
      }
      
      if (message.includes('timeout')) {
        return this.createError(
          'Request timed out. Please try again.',
          ErrorType.TIMEOUT_ERROR,
          context,
          error
        );
      }
      
      if (message.includes('quota') || message.includes('limit')) {
        return this.createError(
          'API quota exceeded. Please try again later.',
          ErrorType.QUOTA_EXCEEDED,
          context,
          error
        );
      }

      if (message.includes('rate limit')) {
        return this.createError(
          'Too many requests. Please wait a moment before trying again.',
          ErrorType.RATE_LIMITED,
          context,
          error
        );
      }

      // Authentication errors
      if (message.includes('unauthorized') || message.includes('auth')) {
        return this.createError(
          'Authentication required. Please log in.',
          ErrorType.AUTH_REQUIRED,
          context,
          error
        );
      }

      if (message.includes('forbidden') || message.includes('permission')) {
        return this.createError(
          'Permission denied. You do not have access to this resource.',
          ErrorType.PERMISSION_DENIED,
          context,
          error
        );
      }

      // File errors
      if (message.includes('file') && message.includes('large')) {
        return this.createError(
          'File is too large. Please select a smaller file.',
          ErrorType.FILE_TOO_LARGE,
          context,
          error
        );
      }

      if (message.includes('file') && message.includes('type')) {
        return this.createError(
          'File type not supported. Please select a different file.',
          ErrorType.FILE_INVALID_TYPE,
          context,
          error
        );
      }

      // AI processing errors
      if (message.includes('ai') || message.includes('model') || message.includes('generation')) {
        return this.createError(
          'AI processing error. Please try again.',
          ErrorType.AI_PROCESSING_ERROR,
          context,
          error
        );
      }

      // Database errors
      if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
        return this.createError(
          'Database error. Please try again later.',
          ErrorType.DATABASE_ERROR,
          context,
          error
        );
      }

      // Validation errors
      if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return this.createError(
          'Invalid input. Please check your data and try again.',
          ErrorType.VALIDATION_ERROR,
          context,
          error
        );
      }

      // Generic server errors
      if (message.includes('server') || message.includes('internal')) {
        return this.createError(
          'Server error. Please try again later.',
          ErrorType.SERVER_ERROR,
          context,
          error
        );
      }

      // Default to original error message
      return this.createError(
        error.message,
        ErrorType.UNKNOWN_ERROR,
        context,
        error
      );
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.createError(
        error,
        ErrorType.UNKNOWN_ERROR,
        context
      );
    }

    // Handle unknown errors
    return this.createError(
      'An unexpected error occurred. Please try again.',
      ErrorType.UNKNOWN_ERROR,
      context
    );
  }

  // Get HTTP status code for error type
  static getStatusCodeForErrorType(type: ErrorType): number {
    switch (type) {
      case ErrorType.AUTH_REQUIRED:
      case ErrorType.SESSION_EXPIRED:
        return 401;
      case ErrorType.PERMISSION_DENIED:
        return 403;
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.INVALID_INPUT:
      case ErrorType.MISSING_REQUIRED_FIELD:
      case ErrorType.FILE_TOO_LARGE:
      case ErrorType.FILE_INVALID_TYPE:
        return 400;
      case ErrorType.QUOTA_EXCEEDED:
      case ErrorType.RATE_LIMITED:
        return 429;
      case ErrorType.TIMEOUT_ERROR:
        return 408;
      case ErrorType.SERVER_ERROR:
      case ErrorType.DATABASE_ERROR:
      case ErrorType.AI_PROCESSING_ERROR:
        return 500;
      case ErrorType.NETWORK_ERROR:
        return 503;
      default:
        return 500;
    }
  }

  // Log error for debugging and monitoring
  static logError(error: AppError): void {
    const errorKey = `${error.type}_${error.context || 'unknown'}`;
    
    // Increment error count
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    
    // Update last error time
    this.lastErrors.set(errorKey, error.timestamp);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 AppError [${error.type}]`);
      console.log('Message:', error.message);
      console.log('Context:', error.context);
      console.log('Status Code:', error.statusCode);
      console.log('Timestamp:', error.timestamp.toISOString());
      if (error.originalError) {
        console.log('Original Error:', error.originalError);
      }
      console.groupEnd();
    }

    // In production, you might want to send to error tracking service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // sendToErrorTracking(error);
    }
  }

  // Get error statistics
  static getErrorStats(): { type: string; count: number; lastOccurred: Date }[] {
    const stats: { type: string; count: number; lastOccurred: Date }[] = [];
    
    for (const [type, count] of this.errorCounts.entries()) {
      const lastOccurred = this.lastErrors.get(type);
      if (lastOccurred) {
        stats.push({ type, count, lastOccurred });
      }
    }
    
    return stats.sort((a, b) => b.count - a.count);
  }

  // Clear error statistics
  static clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  // Check if error should be retried
  static shouldRetry(error: AppError, retryCount: number = 0): boolean {
    const maxRetries = 3;
    
    if (retryCount >= maxRetries) {
      return false;
    }

    // Retry network and timeout errors
    if ([
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.SERVER_ERROR
    ].includes(error.type)) {
      return true;
    }

    // Don't retry validation, auth, or quota errors
    if ([
      ErrorType.VALIDATION_ERROR,
      ErrorType.AUTH_REQUIRED,
      ErrorType.PERMISSION_DENIED,
      ErrorType.QUOTA_EXCEEDED,
      ErrorType.FILE_TOO_LARGE,
      ErrorType.FILE_INVALID_TYPE
    ].includes(error.type)) {
      return false;
    }

    return false;
  }

  // Get user-friendly error message
  static getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return 'Please check your internet connection and try again.';
      case ErrorType.TIMEOUT_ERROR:
        return 'The request took too long. Please try again.';
      case ErrorType.AUTH_REQUIRED:
        return 'Please log in to continue.';
      case ErrorType.PERMISSION_DENIED:
        return 'You do not have permission to perform this action.';
      case ErrorType.QUOTA_EXCEEDED:
        return 'You have reached your usage limit. Please try again later.';
      case ErrorType.RATE_LIMITED:
        return 'Too many requests. Please wait a moment before trying again.';
      case ErrorType.FILE_TOO_LARGE:
        return 'The file is too large. Please select a smaller file.';
      case ErrorType.FILE_INVALID_TYPE:
        return 'This file type is not supported. Please select a different file.';
      case ErrorType.AI_PROCESSING_ERROR:
        return 'AI processing failed. Please try again.';
      case ErrorType.SERVER_ERROR:
        return 'Something went wrong on our end. Please try again later.';
      case ErrorType.DATABASE_ERROR:
        return 'Data could not be saved. Please try again.';
      case ErrorType.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

// Convenience functions for common error types
export const createNetworkError = (message?: string, context?: string) =>
  AppErrorHandler.createError(
    message || 'Network connection failed',
    ErrorType.NETWORK_ERROR,
    context
  );

export const createValidationError = (message?: string, context?: string) =>
  AppErrorHandler.createError(
    message || 'Invalid input provided',
    ErrorType.VALIDATION_ERROR,
    context
  );

export const createAuthError = (message?: string, context?: string) =>
  AppErrorHandler.createError(
    message || 'Authentication required',
    ErrorType.AUTH_REQUIRED,
    context
  );

export const createFileError = (message?: string, context?: string) =>
  AppErrorHandler.createError(
    message || 'File processing failed',
    ErrorType.FILE_PROCESSING_ERROR,
    context
  );

export const createAIError = (message?: string, context?: string) =>
  AppErrorHandler.createError(
    message || 'AI processing failed',
    ErrorType.AI_PROCESSING_ERROR,
    context
  );

// Export default handler
export default AppErrorHandler;