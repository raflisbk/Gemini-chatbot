import * as Sentry from '@sentry/nextjs';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    const error = hint.originalException;
    
    if (error && error instanceof Error) {
      // Skip network errors in development
      if (process.env.NODE_ENV === 'development' && 
          (error.message.includes('NetworkError') || 
           error.message.includes('fetch'))) {
        return null;
      }
      
      // Skip cancelled requests
      if (error.message.includes('AbortError') || 
          error.message.includes('The operation was aborted')) {
        return null;
      }
      
      // Skip hydration errors (common in development)
      if (error.message.includes('Hydration') || 
          error.message.includes('hydrating')) {
        return null;
      }
    }
    
    return event;
  },
  
  // User context
  initialScope: {
    tags: {
      component: 'frontend',
      app: 'ai-chatbot-indonesia'
    }
  },
  
  integrations: [
    new Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});