import type { Metadata } from 'next';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';

export function generateMetadata(): Metadata {
  // Track 404 occurrences
  Sentry.addBreadcrumb({
    message: '404 page accessed',
    level: 'warning',
    category: 'navigation',
    data: {
      timestamp: new Date().toISOString()
    }
  });

  return {
    title: '404 - Page Not Found | AI Chatbot Indonesia',
    description: 'The page you are looking for does not exist or has been moved.',
    robots: {
      index: false,
      follow: false
    },
    other: {
      'error-type': '404',
      'error-page': 'not-found',
      'sentry-tracked': 'true'
    }
  };
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* 404 Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-6">
            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.467-.732-6.229-1.977M15 17.5a5 5 0 11-6 0" />
            </svg>
          </div>

          {/* 404 Content */}
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            404
          </h1>
          
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Page Not Found
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved to a different location.
          </p>

          {/* Navigation Buttons */}
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
            >
              Back to Home
            </Link>
            
            <Link
              href="/chat"
              className="block w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition duration-200"
            >
              Start New Chat
            </Link>
          </div>

          {/* Search suggestion */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Looking for something specific?
            </p>
            <div className="flex space-x-4 text-sm">
              <Link href="/about" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                About
              </Link>
              <Link href="/contact" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                Contact
              </Link>
              <Link href="/help" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
