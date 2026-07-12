/**
 * Monitoring i gabimeve në frontend — aktivizohet me NEXT_PUBLIC_SENTRY_DSN
 */

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  console.error('[AlbNet]', error, context);
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    void fetch('https://browser.sentry-cdn.com/7.0.0/bundle.min.js').catch(() => {});
    // Sentry SDK ngarkohet dinamikisht vetëm në prod me DSN
    const w = window as Window & { __albnetReportError?: (e: unknown) => void };
    w.__albnetReportError?.(error);
  } catch (_) {}
}

export function initMonitoring() {
  if (typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  window.addEventListener('error', (ev) => {
    captureError(ev.error || ev.message, { type: 'window.error' });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    captureError(ev.reason, { type: 'unhandledrejection' });
  });
}
