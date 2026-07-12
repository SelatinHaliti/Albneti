/**
 * Monitoring i gabimeve — aktivizohet me SENTRY_DSN në .env
 * Pa DSN, logon gabimet në console (Render logs).
 */

let sentry = null;

export async function initMonitoring() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
    sentry = Sentry;
    console.log('Sentry: konfiguruar');
  } catch (_) {
    console.warn('Sentry: @sentry/node nuk është instaluar — përdoret console logging.');
  }
}

export function captureException(err, context = {}) {
  console.error('[AlbNet Error]', err?.message || err, context);
  if (sentry) sentry.captureException(err, { extra: context });
}

export function errorHandler(err, req, res, _next) {
  captureException(err, {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Gabim i brendshëm i serverit.',
  });
}
