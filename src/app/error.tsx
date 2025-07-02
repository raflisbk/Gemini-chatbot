'use client';

import type { Metadata } from 'next';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function generateMetadata(): Metadata {
  return {
    title: 'Error - AI Chatbot Indonesia',
    description: 'An unexpected error occurred. We are working to fix this issue.',
    robots: {
      index: false,
      follow: false
    },
    other: {
      'error-boundary': 'true',
      'error-page': 'app-error',
      'sentry-enabled': process.env.NODE_ENV === 'production' ? 'true' : 'false'
    }
  };
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Report error to Sentry with rich context
    Sentry.captureException(error, {
      tags: {
        component: 'error-boundary',
        page: 'app-error',
        errorDigest: error.digest || 'unknown'
      },
      extra: {
        digest: error.digest,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      },
      level: 'error'
    });

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      message: 'App-level error occurred',
      level: 'error',
      data: {
        errorName: error.name,
        errorMessage: error.message,
        digest: error.digest
      }
    });
  }, [error]);

  const handleRetry = () => {
    // Track retry attempts
    Sentry.addBreadcrumb({
      message: 'User clicked retry after error',
      level: 'info',
      category: 'user-action'
    });
    
    reset();
  };

  const handleReportIssue = () => {
    // Track issue reporting
    Sentry.addBreadcrumb({
      message: 'User clicked report issue',
      level: 'info',
      category: 'user-action'
    });

    // Get feedback from user (optional)
    const feedback = prompt('Please describe what you were doing when this error occurred:');
    if (feedback) {
      Sentry.captureFeedback({
        name: 'Anonymous User',
        email: 'user@example.com',
        message: feedback
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Error Content */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Oops! Something went wrong
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            We encountered an unexpected error. Our team has been notified and is working to fix this issue.
          </p>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Development Error Details:
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
            >
              Try Again
            </button>
            
            <button
              onClick={handleReportIssue}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition duration-200"
            >
              Report Issue
            </button>
            
            <a
              href="/"
              className="block w-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium py-3 px-4 rounded-lg transition duration-200 text-center"
            >
              Back to Home
            </a>
          </div>

          {/* Error ID for support */}
          {error.digest && (
            <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}