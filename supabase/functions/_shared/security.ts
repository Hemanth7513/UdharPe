// _shared/security.ts

/**
 * Recursively sanitizes string inputs in an object/array.
 * Removes dangerous HTML tags and script injections.
 */
export function sanitizeStrings(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/<[^>]*>?/gm, ''); // Basic stripping of HTML tags
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

/**
 * Validates the raw request body size against a maximum limit (e.g. 10kb).
 * Returns true if valid, throws error if invalid.
 */
export async function validatePayloadSize(req: Request, maxBytes: number = 10240): Promise<boolean> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new Error('Payload too large. Maximum allowed size is 10kb.');
  }
  return true;
}

/**
 * Basic in-memory rate limiting implementation for Edge Functions.
 * Note: Deno deploy isolates instances, so this is per-instance, but still effective for bursting.
 */
const rateLimitCache = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(ip: string, windowMs: number = 60000, maxRequests: number = 10): void {
  const now = Date.now();
  const record = rateLimitCache.get(ip);

  if (!record) {
    rateLimitCache.set(ip, { count: 1, timestamp: now });
    return;
  }

  if (now - record.timestamp > windowMs) {
    // Reset window
    rateLimitCache.set(ip, { count: 1, timestamp: now });
    return;
  }

  if (record.count >= maxRequests) {
    throw new Error('Too many requests. Please try again later.');
  }

  record.count += 1;
}
