import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// A component marked 'use client' runs in the browser. If it imports the database, the environment parser or a service
// that uses them, the page crashes with "Missing or invalid environment variable(s)" (found in the browser, not by the
// other tests). Type-only imports are erased and are fine.

const ROOT = path.resolve('src');
const SERVER_ONLY = [
  /^@\/lib\/db$/,
  /^@\/env$/,
  /^@\/lib\/admin\/(auth-service|users-service|leads-service|leads-filters|session|guard|audit|crypto|totp|password|http|invite-email)$/,
  /^@\/lib\/leads\/(service|mailer)$/,
  /^@\/lib\/content\//,
  /^@prisma\/client$/,
  /^node:/,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const clientFiles = files(ROOT).filter((f) => /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8')));

describe('browser components', () => {
  it('finds the browser components', () => expect(clientFiles.length).toBeGreaterThan(10));

  it.each(clientFiles.map((f) => [path.relative(ROOT, f), f]))('%s imports nothing that only runs on the server', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    const bad: string[] = [];
    for (const m of source.matchAll(/^import\s+(type\s+)?([^;]*?)\s+from\s+['"]([^'"]+)['"]/gm)) {
      const [, typeOnly, clause, from] = m;
      if (typeOnly) continue;
      // `import { type A, type B } from` has no runtime import at all.
      const names = clause.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      if (names.length > 0 && names.every((n) => n.startsWith('type '))) continue;
      if (SERVER_ONLY.some((re) => re.test(from))) bad.push(from);
    }
    expect(bad).toEqual([]);
  });
});
