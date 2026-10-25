import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { listMedia, uploadMedia } from '@/lib/admin/media-service';
import { MAX_BYTES } from '@/lib/media/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  return jsonResponse({ assets: await listMedia(new URL(req.url).searchParams.get('q')) });
}

/** Multipart upload: `file` plus optional `altEn` and `altAr`. The type is checked by content, never by name. */
export async function POST(req: Request) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES + 100_000) return jsonResponse({ error: 'too_large', message: 'The file is larger than 10 MB.' }, 413);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ error: 'bad_upload', message: 'The upload could not be read.' }, 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) return jsonResponse({ error: 'bad_upload', message: 'Choose an image to upload.' }, 400);
  if (file.size > MAX_BYTES) return jsonResponse({ error: 'too_large', message: 'The file is larger than 10 MB.' }, 413);
  const alt = (k: string) => (typeof form.get(k) === 'string' ? (form.get(k) as string) : null);
  const r = await uploadMedia({ id: auth.user.id, ip: auth.ip }, Buffer.from(await file.arrayBuffer()), file.name, alt('altEn'), alt('altAr'));
  if (r.status === 'invalid') return jsonResponse({ error: 'invalid_file', message: r.error }, 422);
  return jsonResponse({ asset: r.asset, duplicate: !r.created }, r.created ? 201 : 200);
}
