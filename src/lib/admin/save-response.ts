import { jsonResponse } from './guard';
import type { PublishResult, SaveResult } from './content-service';

/** One mapping from a save or publish outcome to an HTTP answer, so every content endpoint answers alike. */
export function saveResponse<T>(r: SaveResult<T> | PublishResult, created = false): Response {
  switch (r.status) {
    case 'ok':
      return jsonResponse(r, created ? 201 : 200);
    case 'invalid':
      return jsonResponse({ error: 'invalid', errors: r.errors }, 422);
    case 'needs_confirm':
      return jsonResponse({ error: 'needs_confirm', publishedProducts: r.publishedProducts }, 409);
    default:
      return jsonResponse({ error: 'not_found' }, 404);
  }
}
