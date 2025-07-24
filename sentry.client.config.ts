// sentry.client.config.ts - FIXED VERSION TO PREVENT DOUBLE INIT

import * as Sentry from "@sentry/nextjs";

// Prevent multiple initialization
let isInitialized = false;

if (!isInitialized && typeof window !== 'undefined') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://bea25b86f3b290dba83ab1c8efe053c7@o4509596648013904.ingest.de.sentry.io/4509596648013904",

    integrations: [
      // Only initialize replay in browser environment
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Debug mode
    debug: process.env.NODE_ENV === 'development',

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (process.env.NODE_ENV === 'development') {
        console.warn('Sentry event captured:', event);
      }

      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Skip common development errors
        if (error instanceof Error) {
          if (error.message.includes('Non-Error promise rejection captured')) {
            return null;
          }
          if (error.message.includes('ResizeObserver loop limit exceeded')) {
            return null;
          }
          if (error.message.includes('Network request failed')) {
            return null;
          }
        }
      }

      return event;
    },

    // Additional configuration
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      return breadcrumb;
    },
  });

  isInitialized = true;
}