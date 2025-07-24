// sentry.server.config.ts - SERVER-SIDE SENTRY CONFIG

import * as Sentry from "@sentry/nextjs";

// Prevent multiple initialization
let isServerInitialized = false;

export function register() {
  if (!isServerInitialized && process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || "https://bea25b86f3b290dba83ab1c8efe053c7@o4509596648013904.ingest.de.sentry.io/4509596648013904",

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Debug mode
      debug: process.env.NODE_ENV === 'development',

      // Environment
      environment: process.env.NODE_ENV || 'development',

      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

      // Server-specific configuration
      integrations: [
        // Add server-specific integrations here
      ],

      // Error filtering for server
      beforeSend(event, hint) {
        // Filter server-side errors if needed
        if (process.env.NODE_ENV === 'development') {
          console.warn('Server Sentry event captured:', event);
        }

        return event;
      },
    });

    isServerInitialized = true;
  }
}