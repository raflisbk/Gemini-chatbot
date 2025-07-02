import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
  
  initialScope: {
    tags: {
      component: 'edge',
      app: 'ai-chatbot-indonesia'
    }
  }
});
