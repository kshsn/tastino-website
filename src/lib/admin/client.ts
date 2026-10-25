// Browser-side helper for the admin API. Every call answers with a result object instead of throwing, so a screen
// can always show something (including when the network is down).

export type ApiResult<T = Record<string, unknown>> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string; data: Record<string, unknown> };

export async function api<T = Record<string, unknown>>(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, status: res.status, data: data as T };
    return { ok: false, status: res.status, error: typeof data.error === 'string' ? data.error : 'unknown', data };
  } catch {
    return { ok: false, status: 0, error: 'network', data: {} };
  }
}

/** Plain-language text for the answers the sign-in endpoints give. */
export function signInMessage(error: string, data: Record<string, unknown>): string {
  switch (error) {
    case 'invalid':
      return 'Email or password is incorrect.';
    case 'locked': {
      const minutes = typeof data.retryAfterSec === 'number' ? Math.max(1, Math.ceil(data.retryAfterSec / 60)) : 15;
      return `Too many failed attempts. This account is temporarily locked; try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    }
    case 'rate_limited':
      return 'Too many attempts from this address. Please wait a few minutes and try again.';
    case 'expired':
      return 'Your sign-in took too long. Please start again.';
    case 'not_enrolled':
      return 'Your account is not fully set up yet. Ask a Super admin to send you a new link, then follow it to finish the set-up.';
    case 'unavailable':
      return 'Sign-in is not available right now. Please contact the site administrator.';
    case 'network':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
