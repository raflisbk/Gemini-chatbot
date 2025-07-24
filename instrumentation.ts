// instrumentation.ts - FIXED VERSION (Optional - Create if doesn't exist)

export async function register() {
  // Only register Sentry on server-side and if not already registered
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { register: registerSentry } = await import('./sentry.server.config');
    registerSentry();
  }

  // Client-side Sentry is handled by sentry.client.config.ts
}