/**
 * Server instrumentation (Next.js): starts Sentry on the Next.js server when
 * a DSN is set, and reports errors thrown while rendering pages or running
 * route handlers (onRequestError). Off by default.
 */
const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Called once when the server starts. */
export async function register() {
  if (!DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    release: `selfvibe-web@${process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}`,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

/**
 * Report a server-side render / route error.
 * @param {...any} args - (error, request, context) from Next.js
 */
export async function onRequestError(...args) {
  if (!DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
