import { z } from 'zod';

const schema = z.object({
  SITE_URL: z.url().transform((u) => u.replace(/\/+$/, '')),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  /** Where processed images are written; served at MEDIA_URL_BASE (nginx alias in production). */
  MEDIA_DIR: z.string().min(1).default('public/media'),
  MEDIA_URL_BASE: z.string().startsWith('/').default('/media'),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => i.path.join('.')))].join(', ');
    throw new Error(`Missing or invalid environment variable(s): ${names}. See .env.example.`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
