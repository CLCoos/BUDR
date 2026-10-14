import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Kun aktiv når en DSN er sat (Netlify); lokalt og i test er der ingen DSN.
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  // Sundhedsdata: ingen IP, cookies eller brugerdata i fejlrapporter.
  sendDefaultPii: false,
});
