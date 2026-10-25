/**
 * Error tracking in the browser (PRD §14 Observability, roadmap Day 10).
 * Sentry is loaded only when NEXT_PUBLIC_SENTRY_DSN is set, and only after the
 * page has loaded, so it costs nothing while it's off and never slows the
 * first paint. No personal data is sent (no IP, no cookies, no form values).
 */
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const RELEASE = `selfvibe-web@${process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}`;

let sentryPromise = null;

/**
 * Load and start Sentry once.
 * @returns {Promise<typeof import("@sentry/nextjs")|null>}
 */
export function loadSentry() {
  if (!DSN) return Promise.resolve(null);
  sentryPromise ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      environment: process.env.NODE_ENV,
      release: RELEASE,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      // Noise from browser extensions and cancelled requests
      ignoreErrors: ["AbortError", "ResizeObserver loop limit exceeded", "Load failed"],
    });
    return Sentry;
  });
  return sentryPromise;
}

/**
 * Report an unexpected error (render crash, failed boundary). Safe when off.
 * @param {unknown} error
 * @param {Object} [context] - Extra details shown in Sentry
 */
export function reportError(error, context) {
  loadSentry()
    .then((Sentry) => Sentry?.captureException(error, context ? { extra: context } : undefined))
    .catch(() => {});
}
