'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report critical global error to Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'global-error-boundary',
        level: 'critical'
      },
      extra: {
        digest: error.digest,
        isGlobalError: true,
        timestamp: new Date().toISOString()
      },
      level: 'fatal'
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-red-600 mb-4">
              Critical Error
            </h1>
            <p className="text-gray-700 mb-6">
              A critical error occurred. Please refresh the page or contact support.
            </p>
            <button
              onClick={reset}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}