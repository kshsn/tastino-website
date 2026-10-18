import { z } from 'zod';

const schema = z.object({
  SITE_URL: z.url().transform((u) => u.replace(/\/+$/, '')),
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
