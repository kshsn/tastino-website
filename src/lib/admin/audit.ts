import type { Prisma, PrismaClient } from '@prisma/client';

/** Anything that can run a query: the shared client, or the connection of a running transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;

export type FieldChange = { before: unknown; after: unknown };

export interface AuditEntry {
  /** The signed-in user, or null for something nobody was signed in for (a failed sign-in, a system task). */
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ip?: string | null;
  /** Changed fields with their old and new values, or any small facts about the event. Never secrets. */
  changes?: Record<string, unknown> | null;
}

/** Fields that must never be copied into the log, whatever else is. */
export const SECRET_FIELDS: readonly string[] = ['passwordHash', 'totpSecret', 'recoveryCodeHashes', 'tokenHash', 'lastTotpStep', 'password', 'code'];

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The fields that really changed, with before and after. Secrets are left out; no change gives an empty object. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, FieldChange> {
  const out: Record<string, FieldChange> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (SECRET_FIELDS.includes(key)) continue;
    if (!same(before[key], after[key])) out[key] = { before: before[key] ?? null, after: after[key] ?? null };
  }
  return out;
}

/** Removes secret fields from a facts object before it is stored. */
export function scrub(facts: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(facts).filter(([k]) => !SECRET_FIELDS.includes(k)));
}

/**
 * Adds one entry to the audit log. Call it with the transaction's connection so the entry and the change it
 * describes are saved together or not at all: no change can exist without its entry (US-007.7).
 */
export async function writeAudit(client: Db, entry: AuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      ip: entry.ip ?? null,
      changes: entry.changes ? (scrub(entry.changes) as Prisma.InputJsonValue) : undefined,
    },
  });
}
