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
  
  // FIXED: Create structured error with proper classification
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

  // FIXED: Classify errors automatically from Error objects
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
      
      if (message.includes('rate') && message.includes('limit')) {
        return this.createError(
          'Too many requests. Please slow down.',
          ErrorType.RATE_LIMITED,
          context,
          error
        );
      }
      
      // File errors
      if (message.includes('file') && message.includes('large')) {
        return this.createError(
          'File is too large. Please upload a smaller file.',
          ErrorType.FILE_TOO_LARGE,
          context,
          error
        );
      }
      
      if (message.includes('file') && (message.includes('type') || message.includes('format'))) {
        return this.createError(
          'Unsupported file type. Please upload a supported file format.',
          ErrorType.FILE_INVALID_TYPE,
          context,
          error
        );
      }
      
      // AI/Content errors
      if (message.includes('safety') || message.includes('blocked')) {
        return this.createError(
          'Content was blocked by safety filters. Please try different content.',
          ErrorType.SAFETY_FILTER,
          context,
          error
        );
      }
      
      if (message.includes('vision') || message.includes('image')) {
        return this.createError(
          'Unable to process images. Please ensure they are valid image files.',
          ErrorType.AI_PROCESSING_ERROR,
          context,
          error
        );
      }
      
      // Authentication errors
      if (message.includes('unauthorized') || message.includes('auth')) {
        return this.createError(
          'Authentication required. Please sign in.',
          ErrorType.AUTH_REQUIRED,
          context,
          error
        );
      }
      
      // Validation errors
      if (message.includes('validation') || message.includes('invalid')) {
        return this.createError(
          'Invalid input. Please check your data and try again.',
          ErrorType.VALIDATION_ERROR,
          context,
          error
        );
      }
      
      // Default to generic error with original message
      return this.createError(
        error.message,
        ErrorType.UNKNOWN_ERROR,
        context,
        error
      );
    }
    
    // Handle non-Error objects
    const errorMessage = typeof error === 'string' ? error : 'An unexpected error occurred';
    return this.createError(errorMessage, ErrorType.UNKNOWN_ERROR, context);
  }

  // FIXED: Get appropriate HTTP status code for error type
  private static getStatusCodeForErrorType(type: ErrorType): number {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.INVALID_INPUT:
      case ErrorType.MISSING_REQUIRED_FIELD:
      case ErrorType.FILE_INVALID_TYPE:
      case ErrorType.CONTENT_BLOCKED:
      case ErrorType.SAFETY_FILTER:
        return 400;
      
      case ErrorType.AUTH_REQUIRED:
        return 401;
      
      case ErrorType.PERMISSION_DENIED:
        return 403;
      
      case ErrorType.TIMEOUT_ERROR:
        return 408;
      
      case ErrorType.FILE_TOO_LARGE:
        return 413;
      
      case ErrorType.QUOTA_EXCEEDED:
      case ErrorType.RATE_LIMITED:
        return 429;
      
      case ErrorType.SERVER_ERROR:
      case ErrorType.DATABASE_ERROR:
      case ErrorType.MEMORY_ERROR:
      case ErrorType.AI_PROCESSING_ERROR:
        return 500;
      
      case ErrorType.NETWORK_ERROR:
        return 503;
      
      default:
        return 500;
    }
  }

  // FIXED: Enhanced error logging with context and rate limiting
  static logError(appError: AppError): void {
    const errorKey = `${appError.type}-${appError.context || 'unknown'}`;
    
    // Rate limit logging for repeated errors
    const lastOccurrence = this.lastErrors.get(errorKey);
    const now = new Date();
    
    if (lastOccurrence && (now.getTime() - lastOccurrence.getTime()) < 5000) {
      // If same error occurred within 5 seconds, just increment counter
      const count = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, count + 1);
      return;
    }
    
    // Log the error
    const count = this.errorCounts.get(errorKey) || 0;
    const logMessage = count > 0 ? 
      `${appError.message} (occurred ${count + 1} times)` : 
      appError.message;
    
    console.error(`🚨 [${appError.type}] ${logMessage}`, {
      context: appError.context,
      timestamp: appError.timestamp,
      statusCode: appError.statusCode,
      originalError: appError.originalError?.stack
    });
    
    // Update tracking
    this.lastErrors.set(errorKey, now);
    this.errorCounts.set(errorKey, 0);
  }

  // FIXED: Get user-friendly error message
  static getUserMessage(appError: AppError): string {
    // Return user-friendly messages that don't expose technical details
    switch (appError.type) {
      case ErrorType.NETWORK_ERROR:
        return 'Connection issue. Please check your internet and try again.';
      
      case ErrorType.TIMEOUT_ERROR:
        return 'Request is taking too long. Please try again.';
      
      case ErrorType.QUOTA_EXCEEDED:
        return 'Daily limit reached. Please try again tomorrow or upgrade your plan.';
      
      case ErrorType.RATE_LIMITED:
        return 'You\'re sending messages too quickly. Please wait a moment.';
      
      case ErrorType.FILE_TOO_LARGE:
        return 'File is too large. Please upload a smaller file (max 10MB).';
      
      case ErrorType.FILE_INVALID_TYPE:
        return 'File type not supported. Please upload an image, document, audio, or video file.';
      
      case ErrorType.SAFETY_FILTER:
        return 'Content was blocked for safety reasons. Please try different content.';
      
      case ErrorType.AUTH_REQUIRED:
        return 'Please sign in to continue.';
      
      case ErrorType.PERMISSION_DENIED:
        return 'You don\'t have permission to perform this action.';
      
      case ErrorType.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      
      case ErrorType.AI_PROCESSING_ERROR:
        return 'AI processing failed. Please try rephrasing your message.';
      
      case ErrorType.SERVER_ERROR:
        return 'Server error. Please try again in a moment.';
      
      default:
        return appError.message || 'Something went wrong. Please try again.';
    }
  }

  // FIXED: Check if error is recoverable
  static isRecoverable(appError: AppError): boolean {
    const nonRecoverableTypes = [
      ErrorType.FILE_INVALID_TYPE,
      ErrorType.PERMISSION_DENIED,
      ErrorType.VALIDATION_ERROR,
      ErrorType.SAFETY_FILTER
    ];
    
    return !nonRecoverableTypes.includes(appError.type);
  }

  // FIXED: Get recovery suggestions
  static getRecoverySuggestions(appError: AppError): string[] {
    switch (appError.type) {
      case ErrorType.NETWORK_ERROR:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ];
      
      case ErrorType.TIMEOUT_ERROR:
        return [
          'Try again with a shorter message',
          'Remove large files and retry',
          'Check your internet connection'
        ];
      
      case ErrorType.QUOTA_EXCEEDED:
        return [
          'Wait until tomorrow for quota reset',
          'Sign up for a premium account',
          'Contact support for more quota'
        ];
      
      case ErrorType.FILE_TOO_LARGE:
        return [
          'Compress your file',
          'Split large files into smaller parts',
          'Use a different file format'
        ];
      
      case ErrorType.FILE_INVALID_TYPE:
        return [
          'Convert to a supported format (PDF, JPG, PNG, MP3, MP4)',
          'Check file is not corrupted',
          'Try uploading a different file'
        ];
      
      case ErrorType.SAFETY_FILTER:
        return [
          'Rephrase your message',
          'Remove sensitive content',
          'Try a different approach to your question'
        ];
      
      case ErrorType.AUTH_REQUIRED:
        return [
          'Sign in to your account',
          'Create a new account',
          'Check if you\'re still logged in'
        ];
      
      default:
        return [
          'Try again in a moment',
          'Refresh the page',
          'Contact support if the problem persists'
        ];
    }
  }

  // FIXED: Clear error tracking (useful for cleanup)
  static clearErrorTracking(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  // FIXED: Get error statistics
  static getErrorStats(): { type: string; count: number; lastOccurrence: Date }[] {
    const stats: { type: string; count: number; lastOccurrence: Date }[] = [];
    
    for (const [key, count] of this.errorCounts.entries()) {
      const lastOccurrence = this.lastErrors.get(key);
      if (lastOccurrence) {
        stats.push({
          type: key,
          count,
          lastOccurrence
        });
      }
    }
    
    return stats.sort((a, b) => b.count - a.count);
  }
}

// FIXED: React hook for error handling in components
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    const appError = AppErrorHandler.classifyError(error, context);
    AppErrorHandler.logError(appError);
    return appError;
  };

  const getUserMessage = (error: unknown, context?: string): string => {
    const appError = AppErrorHandler.classifyError(error, context);
    return AppErrorHandler.getUserMessage(appError);
  };

  const getRecoverySuggestions = (error: unknown, context?: string): string[] => {
    const appError = AppErrorHandler.classifyError(error, context);
    return AppErrorHandler.getRecoverySuggestions(appError);
  };

  const isRecoverable = (error: unknown, context?: string): boolean => {
    const appError = AppErrorHandler.classifyError(error, context);
    return AppErrorHandler.isRecoverable(appError);
  };

  return {
    handleError,
    getUserMessage,
    getRecoverySuggestions,
    isRecoverable
  };
}

export default AppErrorHandler;