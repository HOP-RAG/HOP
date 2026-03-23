// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const sentryEnabled =
  process.env.NEXT_PUBLIC_ENABLE_THIRD_PARTY_ANALYTICS?.toLowerCase() ===
    "true" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Disable performance monitoring and only capture errors
    tracesSampleRate: 0,
    profilesSampleRate: 0,
  });
}
