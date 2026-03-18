// Në shfletues: të gjitha kërkesat shkojnë te /api/* (proxy Next.js). Në server: URL e backend-it.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = typeof window !== 'undefined' ? '' : BACKEND_URL;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/** Nxjerr mesazhin e gabimit nga përgjigja e API */
function getErrorMessage(data: unknown, status: number, path?: string): string {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  if (d) {
    if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
    if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
    if (typeof d.msg === 'string' && d.msg.trim()) return d.msg.trim();
    if (Array.isArray(d.errors) && d.errors.length > 0) {
      const first = d.errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && 'msg' in first) return String((first as { msg: string }).msg);
    }
  }
  if (status === 503) return 'Backend-i nuk është i arritshëm. Nisni: cd backend && npm run start';
  if (status === 403) return path && isPublicAuthPath(path) ? 'Kërkesa nuk u pranua. Kontrolloni të dhënat.' : 'Nuk keni leje për këtë veprim.';
  if (status === 401) return path && isPublicAuthPath(path) ? 'Email ose fjalëkalim i gabuar.' : 'Sesioni ka skaduar ose nuk jeni të kyçur.';
  return `Gabim (${status}). Provoni përsëri.`;
}

/** Rrugët auth publike – nuk bëjmë redirect te /kycu për 401/403, vetëm hedhim gabimin */
const PUBLIC_AUTH_PATHS = [
  '/api/auth/regjistrohu',
  '/api/auth/kycu',
  '/api/auth/harruar-fjalekalimin',
  '/api/auth/rifresko-fjalekalimin',
  '/api/auth/verifiko-email',
];
function isPublicAuthPath(path: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => path.startsWith(p));
}

const DEFAULT_TIMEOUT_MS = 30000;

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Timeout në ms; 0 = pa timeout. Default 30s. */
  timeout?: number;
  signal?: AbortSignal;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, method = 'GET', timeout = DEFAULT_TIMEOUT_MS, signal: userSignal, ...rest } = options;
  const hasBody = body !== undefined;
  const headers: HeadersInit = {
    ...(hasBody && { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token && !isPublicAuthPath(path)) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const url = `${API_URL}${path}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = timeout > 0 && controller
    ? setTimeout(() => controller.abort(), timeout)
    : null;
  const signal = userSignal ?? controller?.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      method,
      headers,
      signal,
      ...(hasBody && { body: JSON.stringify(body) }),
    });
    if (timeoutId) clearTimeout(timeoutId);
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Kërkesa u anulua ose kaloi koha.');
    }
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Nuk mund të lidhet me serverin. Nisni backend-in: cd backend && npm run start');
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = getErrorMessage(data, res.status, path);
    if (
      typeof window !== 'undefined' &&
      (res.status === 401 || res.status === 403) &&
      !isPublicAuthPath(path)
    ) {
      try {
        localStorage.removeItem('token');
        window.location.replace('/kycu?reason=' + (res.status === 403 ? 'forbidden' : 'session'));
      } catch (_) {}
    }
    throw new Error(msg);
  }
  return data as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  method = 'POST'
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const url = `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: formData });
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Nuk mund të lidhet me serverin. Nisni backend-in: cd backend && npm run start');
    }
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = getErrorMessage(data, res.status, path);
    if (
      typeof window !== 'undefined' &&
      (res.status === 401 || res.status === 403) &&
      !isPublicAuthPath(path)
    ) {
      try {
        localStorage.removeItem('token');
        window.location.replace('/kycu?reason=' + (res.status === 403 ? 'forbidden' : 'session'));
      } catch (_) {}
    }
    throw new Error(msg);
  }
  return data as T;
}

export { API_URL, BACKEND_URL };
