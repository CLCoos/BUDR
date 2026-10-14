import * as Sentry from '@sentry/nextjs';

// Ligger i src/, fordi appen bruger src/app: Next.js finder kun instrumentation-filer ved siden af app-mappen.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
