/**
 * Proxy për /api/* – i dërgon kërkesat te backend me të gjitha header-at (përfshirë Authorization).
 * Siguron që backend merr tokenin dhe nuk kthen 401/403 për shkak të header-ave të humbura.
 */
const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const PUBLIC_AUTH_PATHS = ['auth/regjistrohu', 'auth/kycu', 'auth/harruar-fjalekalimin', 'auth/rifresko-fjalekalimin', 'auth/verifiko-email'];

function forwardHeaders(req: Request, path: string): Headers {
  const out = new Headers();
  const isPublicAuth = PUBLIC_AUTH_PATHS.some((p) => path.startsWith(p));
  if (!isPublicAuth) {
    const auth = req.headers.get('authorization');
    if (auth) out.set('Authorization', auth);
  }
  const ct = req.headers.get('content-type');
  if (ct) out.set('Content-Type', ct);
  return out;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  return proxy(request, context, 'GET');
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  return proxy(request, context, 'POST');
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  return proxy(request, context, 'PUT');
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  return proxy(request, context, 'PATCH');
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  return proxy(request, context, 'DELETE');
}

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
  method: string
) {
  const rawParams = context.params;
  const params = typeof (rawParams as Promise<{ path: string[] }>).then === 'function'
    ? await (rawParams as Promise<{ path: string[] }>)
    : (rawParams as { path: string[] });
  const path = Array.isArray(params.path) ? params.path.join('/') : '';
  const search = request.url.includes('?') ? new URL(request.url).search : '';
  const url = `${BACKEND}/api/${path}${search}`;
  const headers = forwardHeaders(request, path);
  const body = method !== 'GET' && method !== 'HEAD' ? await request.arrayBuffer() : undefined;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (err) {
    const message = 'Backend-i nuk është i arritshëm. Nisni me: cd backend && npm run start';
    return new Response(JSON.stringify({ message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resBody = await res.arrayBuffer();
  const contentType = res.headers.get('Content-Type') || 'application/json';
  return new Response(resBody, {
    status: res.status,
    statusText: res.statusText,
    headers: { 'Content-Type': contentType },
  });
}
