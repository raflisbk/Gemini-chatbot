// src/components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ========================================
// ERROR TYPES & INTERFACES
// ========================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  maxRetries?: number;
}

interface ErrorReport {
  errorId: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
}

// ========================================
// ERROR LOGGING SERVICE
// ========================================

class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: ErrorReport[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Listen to online/offline events
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushErrorQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  async logError(error: Error, errorInfo: ErrorInfo, additionalData?: Record<string, any>): Promise<string> {
    const errorId = this.generateErrorId();
    
    const errorReport: ErrorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      ...additionalData,
    };

    // Try to send immediately if online
    if (this.isOnline) {
      try {
        await this.sendErrorReport(errorReport);
        console.log(`✅ Error logged with ID: ${errorId}`);
      } catch (sendError) {
        console.warn('Failed to send error report immediately, queuing:', sendError);
        this.errorQueue.push(errorReport);
      }
    } else {
      // Queue for later if offline
      this.errorQueue.push(errorReport);
      console.log(`📦 Error queued for later transmission: ${errorId}`);
    }

    // Store in localStorage as backup
    this.storeErrorLocally(errorReport);

    return errorId;
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    try {
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
      throw error;
    }
  }

  private async flushErrorQueue(): Promise<void> {
    while (this.errorQueue.length > 0 && this.isOnline) {
      const errorReport = this.errorQueue.shift()!;
      try {
        await this.sendErrorReport(errorReport);
        console.log(`✅ Queued error sent: ${errorReport.errorId}`);
      } catch (error) {
        // Put it back at the front of the queue
        this.errorQueue.unshift(errorReport);
        console.warn('Failed to send queued error, stopping flush:', error);
        break;
      }
    }
  }

  private storeErrorLocally(errorReport: ErrorReport): void {
    try {
      const stored = localStorage.getItem('error_reports') || '[]';
      const reports = JSON.parse(stored) as ErrorReport[];
      
      // Keep only last 10 errors to prevent storage overflow
      reports.push(errorReport);
      if (reports.length > 10) {
        reports.shift();
      }
      
      localStorage.setItem('error_reports', JSON.stringify(reports));
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get locally stored errors for debugging
  getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('error_reports') || '[]';
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  // Clear stored errors
  clearStoredErrors(): void {
    try {
      localStorage.removeItem('error_reports');
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }
}

// ========================================
// ERROR BOUNDARY COMPONENT
// ========================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorLogger = ErrorLogger.getInstance();
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    try {
      // Get additional context
      const additionalData = {
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString(),
        // Add user context if available
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
      };

      // Log the error
      const errorId = await this.errorLogger.logError(error, errorInfo, additionalData);

      // Update state with error details
      this.setState({
        error,
        errorInfo,
        errorId,
      });

      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private getUserId(): string | undefined {
    try {
      // Try to get user ID from auth context or localStorage
      const token = localStorage.getItem('auth-token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch {
      // Ignore errors when getting user ID
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    try {
      // Try to get session ID from auth context or localStorage
      const token = localStorage.getItem('auth-token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sessionId;
      }
    } catch {
      // Ignore errors when getting session ID
    }
    return undefined;
  }

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount < maxRetries) {
      console.log(`🔄 Retrying... (${this.state.retryCount + 1}/${maxRetries})`);
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      console.warn('Max retries reached');
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const bugReport = {
      errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2))
      .then(() => {
        alert('Bug report copied to clipboard! Please paste it when reporting the issue.');
      })
      .catch(() => {
        console.log('Bug report:', bugReport);
        alert('Bug report logged to console. Please copy it when reporting the issue.');
      });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, retryCount } = this.state;
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = retryCount < maxRetries;
      const showDetails = this.props.showErrorDetails || process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 text-center mb-6">
              We're sorry for the inconvenience. The error has been logged and we'll look into it.
            </p>

            {/* Error ID */}
            {errorId && (
              <div className="bg-gray-100 rounded p-3 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Error ID:</strong> <code className="text-xs">{errorId}</code>
                </p>
              </div>
            )}

            {/* Error Details (Development only) */}
            {showDetails && error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Technical Details
                </summary>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800 font-mono break-all">
                    {error.message}
                  </p>
                  {error.stack && (
                    <pre className="text-xs text-red-700 mt-2 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Retry Count */}
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 text-center mb-4">
                Retry attempts: {retryCount}/{maxRetries}
              </p>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <Button 
                onClick={this.handleReportBug}
                variant="ghost"
                className="w-full text-sm"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Bug
              </Button>
            </div>

            {/* Contact Support */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please{' '}
                <a 
                  href="mailto:support@yourapp.com" 
                  className="text-blue-600 hover:underline"
                >
                  contact support
                </a>{' '}
                with the error ID above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ========================================
// ASYNC ERROR BOUNDARY (For App Router)
// ========================================

export function AsyncErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary 
      fallback={fallback}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      maxRetries={3}
      onError={(error, errorInfo) => {
        // Additional async error handling
        console.error('Async error caught:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ========================================
// ERROR HOOKS
// ========================================

export function useErrorHandler() {
  const errorLogger = ErrorLogger.getInstance();

  const handleError = React.useCallback(async (
    error: Error,
    context?: string,
    additionalData?: Record<string, any>
  ) => {
    console.error(`Error in ${context || 'component'}:`, error);

    try {
      await errorLogger.logError(error, { componentStack: context || 'unknown' }, additionalData);
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }, [errorLogger]);

  return { handleError };
}

// ========================================
// ERROR REPORTING UTILITIES
// ========================================

export function reportError(
  error: Error, 
  context?: string, 
  additionalData?: Record<string, any>
): void {
  const errorLogger = ErrorLogger.getInstance();
  errorLogger.logError(error, { componentStack: context || 'manual-report' }, additionalData);
}

// Unhandled promise rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reportError(error, 'unhandled-promise-rejection', {
      promise: event.promise,
    });

    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    reportError(event.error, 'global-error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

// ========================================
// EXPORTS
// ========================================

export default ErrorBoundary;
export { ErrorLogger };