/** Visitor address as set by the reverse proxy (nginx overwrites these headers), or "unknown". */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real.slice(0, 64);
  const forwarded = headers.get('x-forwarded-for');
  const last = forwarded?.split(',').pop()?.trim();
  return last ? last.slice(0, 64) : 'unknown';
}

/**
 * True when a browser sent the request from another website (its Origin differs from this site's host).
 * Requests without an Origin header (curl, server to server) are not browsers submitting a foreign page.
 */
export function isCrossOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  if (!origin) return false;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export const MAX_BODY_BYTES = 20_000;
