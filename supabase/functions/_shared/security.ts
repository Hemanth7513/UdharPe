/**
 * Recursively sanitizes string inputs in an object/array.
 * Removes dangerous HTML tags and script injections.
 */
export function sanitizeStrings(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/<[^>]*>?/gm, '');
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeStrings(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeStrings(obj[key]);
      }
    }
    return sanitizedObj;
  }
  return obj;
}

/** Escape text for safe HTML email interpolation. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates the raw request body size against a maximum limit.
 */
export async function validatePayloadSize(req: Request, maxBytes: number = 10240): Promise<boolean> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new Error(`Payload too large. Maximum allowed size is ${maxBytes} bytes.`);
  }
  return true;
}

/**
 * Basic in-memory rate limiting for Edge Functions (per isolate).
 */
const rateLimitCache = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(key: string, windowMs: number = 60000, maxRequests: number = 10): void {
  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record) {
    rateLimitCache.set(key, { count: 1, timestamp: now });
    return;
  }

  if (now - record.timestamp > windowMs) {
    rateLimitCache.set(key, { count: 1, timestamp: now });
    return;
  }

  if (record.count >= maxRequests) {
    throw new Error('Too many requests. Please try again later.');
  }

  record.count += 1;
}

export function getClientIp(req: Request): string {
  return req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

export function isSuperAdmin(user: { email?: string | null; app_metadata?: Record<string, unknown> }): boolean {
  if (user.app_metadata?.role === 'superadmin') return true;

  const allowlist = (Deno.env.get('SUPERADMIN_EMAILS') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return !!(user.email && allowlist.includes(user.email.toLowerCase()));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
