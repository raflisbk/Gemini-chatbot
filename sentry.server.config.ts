import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
  
  // Server-specific error filtering
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    if (error && error instanceof Error) {
      // Skip database connection errors during development
      if (process.env.NODE_ENV === 'development' && 
          error.message.includes('ECONNREFUSED')) {
        return null;
      }
      
      // Skip rate limit errors (they're expected)
      if (error.message.includes('Rate limit exceeded')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Server-specific scope
  initialScope: {
    tags: {
      component: 'backend',
      app: 'ai-chatbot-indonesia'
    }
  }
});