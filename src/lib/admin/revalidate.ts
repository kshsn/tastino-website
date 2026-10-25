import { revalidatePath } from 'next/cache';

/**
 * Refreshes the cached public pages after a save, so changes show at once instead of after the 60 s cache.
 * Outside a running site (unit and integration tests) there is nothing to refresh, so a failure is ignored.
 */
export function refreshPublicSite(): void {
  try {
    revalidatePath('/', 'layout');
  } catch {
    /* no Next.js request context */
  }
}
