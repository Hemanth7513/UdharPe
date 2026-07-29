const allowedOrigins = new Set([
  'https://udhar-pe.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/**
 * Returns CORS headers for a single validated Origin.
 * Never joins multiple origins — browsers reject that and break preflight.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : '';

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
  }

  return headers;
}

/** @deprecated Prefer getCorsHeaders(req) — kept only if a caller forgets to pass req */
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://udhar-pe.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};
