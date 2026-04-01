import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1, // 10% of transactions in production
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0, // Capture replay on errors
    environment: process.env.NODE_ENV,
  });
}
