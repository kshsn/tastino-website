import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const PRISMA = path.resolve('node_modules/.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** Throws unless the URL points at a local database named `*_test` that is not the app database. */
export function assertSafeTestDatabase(url: string, appUrl = process.env.DATABASE_URL) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL');
  }
  const dbName = decodeURIComponent(parsed.pathname.slice(1));
  if (!dbName.endsWith('_test')) throw new Error(`Refusing to touch a non-test database: "${dbName}"`);
  if (!LOCAL_HOSTS.has(parsed.hostname)) throw new Error(`Refusing to touch a remote database host: "${parsed.hostname}"`);
  if (appUrl && appUrl === url) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL');
  return dbName;
}

/**
 * Brings the dedicated local test database up to the latest migrations (including the raw-SQL guards)
 * and empties every table, so each run starts clean.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? '';
  const dbName = assertSafeTestDatabase(url, process.env.APP_DATABASE_URL);

  execFileSync(PRISMA, ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const [{ current }] = await db.$queryRaw<{ current: string }[]>`SELECT current_database() AS current`;
    if (current !== dbName || !current.endsWith('_test')) throw new Error(`Connected to "${current}", expected "${dbName}"`);
    // Built in SQL with format(%I) so every identifier is safely quoted.
    const [{ stmt }] = await db.$queryRaw<{ stmt: string | null }[]>`
      SELECT 'TRUNCATE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE' AS stmt
      FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    // TRUNCATE does not fire the row-level "no delete" triggers, which guard real data only.
    if (stmt) await db.$executeRawUnsafe(stmt);
  } finally {
    await db.$disconnect();
  }
  rmSync(path.resolve('tests/.media'), { recursive: true, force: true });
}
