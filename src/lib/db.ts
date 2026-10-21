import { PrismaClient } from '@prisma/client';
import { env } from '@/env';

// Each process keeps a small pool. `next build` renders pages in many worker processes at once, so the default
// pool size (a few connections per CPU, per worker) would exceed PostgreSQL's connection limit.
const DEFAULT_POOL = 4;

function withPoolLimit(url: string): string {
  if (/[?&]connection_limit=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${DEFAULT_POOL}`;
}

// One client per process (dev hot reload would otherwise open a new pool on every change).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: withPoolLimit(env.DATABASE_URL) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
