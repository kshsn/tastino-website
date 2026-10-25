import { z } from 'zod';

// Empty strings in .env files count as "not set".
const optional = z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  SITE_URL: z.url().transform((u) => u.replace(/\/+$/, '')),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  /** Where processed images are written; served at MEDIA_URL_BASE (nginx alias in production). */
  MEDIA_DIR: z.string().min(1).default('public/media'),
  MEDIA_URL_BASE: z.string().startsWith('/').default('/media'),
  /**
   * Outgoing email (lead notifications and auto-replies). All optional: without a host the site still runs and
   * stores every lead, and emails are sent later once SMTP is configured.
   */
  SMTP_HOST: optional,
  SMTP_PORT: optional.transform((v) => (v === undefined ? undefined : Number(v))).pipe(z.number().int().min(1).max(65535).optional()),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  /** Sender address, e.g. "Tastino Foods <info@tastinofoods.com>". */
  SMTP_FROM: optional,
  /**
   * 32 random bytes, base64: encrypts the authenticator secrets stored for admin users. Optional so the public site
   * runs without it; without it the admin sign-in answers "not configured".
   */
  ADMIN_ENCRYPTION_KEY: optional,
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
