import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  // Sundhedsdata: ingen IP, cookies eller brugerdata i fejlrapporter.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
