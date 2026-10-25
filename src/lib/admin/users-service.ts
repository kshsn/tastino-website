import { Prisma, type Role, type User } from '@prisma/client';
import { z } from 'zod';
import { env } from '@/env';
import { db } from '@/lib/db';
import { diffFields, writeAudit } from './audit';
import { withUserLock } from './auth-service';
import { INVITE_TTL_MS } from './config';
import { newToken, parseKey, sha256 } from './crypto';
import { sendInvitation, type InviteDelivery } from './invite-email';
import { checkNewPassword, hashPassword, type PasswordProblem } from './password';
import { revokeAllSessions, createSession } from './session';

export interface Actor {
  /** The Super admin doing this (null for the command-line bootstrap). */
  id: string | null;
  ip?: string | null;
}

export type UserField = 'name' | 'email' | 'role' | 'active';
export type UserErrors = Partial<Record<UserField, 'required' | 'email' | 'tooLong' | 'invalid'>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const createSchema = z.object({
  name: z.string({ error: 'required' }).trim().min(1, 'required').max(100, 'tooLong'),
  email: z.string({ error: 'required' }).trim().toLowerCase().min(1, 'required').max(254, 'tooLong').regex(EMAIL, 'email'),
  role: z.enum(['SUPER_ADMIN', 'CONTENT_EDITOR', 'SALES'], { error: 'invalid' }),
});

const updateSchema = z
  .object({
    name: z.string({ error: 'invalid' }).trim().min(1, 'required').max(100, 'tooLong'),
    role: z.enum(['SUPER_ADMIN', 'CONTENT_EDITOR', 'SALES'], { error: 'invalid' }),
    active: z.boolean({ error: 'invalid' }),
  })
  .partial();

function fieldErrors(error: z.ZodError): UserErrors {
  const out: UserErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as UserField | undefined;
    if (field && !out[field]) out[field] = (['required', 'email', 'tooLong', 'invalid'].includes(issue.message) ? issue.message : 'invalid') as UserErrors[UserField];
  }
  return out;
}

export type UserStatus = 'active' | 'invite_pending' | 'locked' | 'deactivated';

/** What the users screen shows. It never carries password hashes, secrets or recovery codes. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  twoFactor: boolean;
  lockedUntil: string | null;
  createdAt: string;
}

export function toRow(u: User, now: Date = new Date()): UserRow {
  const status: UserStatus = !u.active ? 'deactivated' : u.lockedUntil && u.lockedUntil > now ? 'locked' : !u.passwordHash ? 'invite_pending' : 'active';
  return { id: u.id, name: u.name, email: u.email, role: u.role, status, twoFactor: u.totpEnabled, lockedUntil: u.lockedUntil && u.lockedUntil > now ? u.lockedUntil.toISOString() : null, createdAt: u.createdAt.toISOString() };
}

export async function listUsers(now: Date = new Date()): Promise<UserRow[]> {
  const users = await db.user.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'asc' }] });
  return users.map((u) => toRow(u, now));
}

// One lock for "who are the Super admins", so two people cannot each remove the other at the same moment.
const ADMINS_LOCK = 'admin-users';
const lockAdmins = (tx: Prisma.TransactionClient) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ADMINS_LOCK}))`;

const inviteExpiry = (now: Date) => new Date(now.getTime() + INVITE_TTL_MS);

export type CreateResult =
  | { status: 'created'; user: UserRow; inviteToken: string; delivery: InviteDelivery }
  | { status: 'invalid'; errors: UserErrors }
  | { status: 'duplicate' };

/**
 * Creates a user and a single-use invitation (48 hours). The user, the invitation and the audit entry are saved together.
 * The email is sent afterwards; if it cannot be, the user simply stays "invite pending" and the invitation can be resent.
 */
export async function createUser(actor: Actor, raw: unknown, now: Date = new Date()): Promise<CreateResult> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { status: 'invalid', errors: fieldErrors(parsed.error) };
  const { name, email, role } = parsed.data;
  const inviteToken = newToken();
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { name, email, role, active: true } });
      await tx.userToken.create({ data: { userId: created.id, tokenHash: sha256(inviteToken), purpose: 'INVITE', expiresAt: inviteExpiry(now), createdAt: now } });
      await writeAudit(tx, { actorId: actor.id, action: 'user.create', entityType: 'user', entityId: created.id, ip: actor.ip, changes: { name, email, role } });
      return created;
    });
    const delivery = await sendInvitation(user, inviteToken);
    return { status: 'created', user: toRow(user, now), inviteToken, delivery };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { status: 'duplicate' };
    throw e;
  }
}

export type UpdateResult =
  | { status: 'ok'; user: UserRow }
  | { status: 'unchanged'; user: UserRow }
  | { status: 'invalid'; errors: UserErrors }
  | { status: 'not_found' }
  | { status: 'last_super_admin' };

/**
 * Changes a name, a role or the active flag. Changing the role or deactivating signs the user out everywhere.
 * The last active Super admin cannot be demoted or deactivated (not even by themselves). Saving without an
 * actual change writes nothing.
 */
export async function updateUser(actor: Actor, id: string, raw: unknown, now: Date = new Date()): Promise<UpdateResult> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { status: 'invalid', errors: fieldErrors(parsed.error) };
  const patch = parsed.data;

  return db.$transaction(async (tx): Promise<UpdateResult> => {
    await lockAdmins(tx);
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) return { status: 'not_found' };

    const next = { name: patch.name ?? target.name, role: patch.role ?? target.role, active: patch.active ?? target.active };
    const losesAdmin = target.role === 'SUPER_ADMIN' && target.active && (next.role !== 'SUPER_ADMIN' || !next.active);
    if (losesAdmin) {
      // Only a Super admin who can really sign in counts (password chosen, authenticator set up).
      const others = await tx.user.count({ where: { role: 'SUPER_ADMIN', active: true, id: { not: id }, passwordHash: { not: null }, totpEnabled: true } });
      if (others === 0) return { status: 'last_super_admin' };
    }

    const changes = diffFields({ name: target.name, role: target.role, active: target.active }, next);
    if (Object.keys(changes).length === 0) return { status: 'unchanged', user: toRow(target, now) };

    const updated = await tx.user.update({ where: { id }, data: next });
    if (changes.role || changes.active) await revokeAllSessions(tx, id, now);
    await writeAudit(tx, { actorId: actor.id, action: 'user.update', entityType: 'user', entityId: id, ip: actor.ip, changes });
    return { status: 'ok', user: toRow(updated, now) };
  });
}

export type SimpleResult = { status: 'ok'; user: UserRow } | { status: 'unchanged'; user: UserRow } | { status: 'not_found' };

/** Lets a locked user try again right away. */
export async function unlockUser(actor: Actor, id: string, now: Date = new Date()): Promise<SimpleResult> {
  return withUserLock(id, async (tx) => {
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) return { status: 'not_found' };
    if (!target.lockedUntil && target.failedAttempts === 0) return { status: 'unchanged', user: toRow(target, now) };
    const updated = await tx.user.update({ where: { id }, data: { failedAttempts: 0, lockedUntil: null } });
    await writeAudit(tx, { actorId: actor.id, action: 'user.unlock', entityType: 'user', entityId: id, ip: actor.ip });
    return { status: 'ok', user: toRow(updated, now) };
  });
}

/** For someone who lost their authenticator and recovery codes: they must enrol again at the next sign-in. */
export async function resetTwoFactor(actor: Actor, id: string, now: Date = new Date()): Promise<SimpleResult> {
  return withUserLock(id, async (tx) => {
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) return { status: 'not_found' };
    const updated = await tx.user.update({ where: { id }, data: { totpEnabled: false, totpSecret: null, lastTotpStep: null, recoveryCodeHashes: [] } });
    await revokeAllSessions(tx, id, now);
    await writeAudit(tx, { actorId: actor.id, action: 'user.reset_2fa', entityType: 'user', entityId: id, ip: actor.ip });
    return { status: 'ok', user: toRow(updated, now) };
  });
}

export type ResendResult = { status: 'ok'; inviteToken: string; delivery: InviteDelivery; user: UserRow; reset: boolean } | { status: 'not_found' } | { status: 'not_pending' };

/**
 * A new link for a user: an invitation when they have not chosen a password yet, a password reset when they have
 * (for someone who forgot it). Either way the old link stops working. A deactivated user gets nothing.
 */
export async function resendInvite(actor: Actor, id: string, now: Date = new Date()): Promise<ResendResult> {
  const inviteToken = newToken();
  const user = await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) return 'not_found' as const;
    if (!target.active) return 'not_pending' as const;
    await tx.userToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: now } });
    await tx.userToken.create({ data: { userId: id, tokenHash: sha256(inviteToken), purpose: 'INVITE', expiresAt: inviteExpiry(now), createdAt: now } });
    await writeAudit(tx, { actorId: actor.id, action: target.passwordHash ? 'user.password_reset_sent' : 'user.invite_resent', entityType: 'user', entityId: id, ip: actor.ip });
    return target;
  });
  if (user === 'not_found' || user === 'not_pending') return { status: user };
  const reset = !!user.passwordHash;
  const delivery = await sendInvitation(user, inviteToken, reset);
  return { status: 'ok', inviteToken, delivery, user: toRow(user, now), reset };
}

export type InviteInfo = { status: 'valid'; name: string; email: string; reset: boolean } | { status: 'expired' };

/** Checks an invitation link without using it (the page shows who it is for, or "expired"). */
export async function inspectInvite(rawToken: string, now: Date = new Date()): Promise<InviteInfo> {
  if (!rawToken || rawToken.length > 200) return { status: 'expired' };
  const token = await db.userToken.findUnique({ where: { tokenHash: sha256(rawToken) }, include: { user: true } });
  if (!token || token.purpose !== 'INVITE' || token.usedAt || token.expiresAt <= now || !token.user.active) return { status: 'expired' };
  return { status: 'valid', name: token.user.name, email: token.user.email, reset: !!token.user.passwordHash };
}

export type AcceptResult =
  | { status: 'ok'; token: string; next: 'verify' | 'enroll' }
  | { status: 'expired' }
  | { status: 'weak'; problem: PasswordProblem }
  | { status: 'unavailable' };

/**
 * Uses an invitation or reset link: the user chooses a password and is taken to the authenticator step (not signed in yet).
 * The link works once; a second use, an old link or an expired one all give "expired".
 */
export async function acceptInvite(rawToken: string, password: unknown, ctx: { ip?: string | null; userAgent?: string | null; now?: Date; key?: Buffer | null } = {}): Promise<AcceptResult> {
  const now = ctx.now ?? new Date();
  if (!(ctx.key !== undefined ? ctx.key : parseKey(env.ADMIN_ENCRYPTION_KEY))) return { status: 'unavailable' };
  const info = await inspectInvite(rawToken, now);
  if (info.status !== 'valid') return { status: 'expired' };
  const pw = typeof password === 'string' ? password : '';
  const problem = checkNewPassword(pw, info.email);
  if (problem) return { status: 'weak', problem };
  const passwordHash = await hashPassword(pw);

  try {
    return await db.$transaction(async (tx): Promise<AcceptResult> => {
      // Marking the link as used and reading it back is one statement: two people (or two clicks) cannot both win.
      const used = await tx.userToken.updateMany({ where: { tokenHash: sha256(rawToken), usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (used.count !== 1) return { status: 'expired' };
      const token = await tx.userToken.findUniqueOrThrow({ where: { tokenHash: sha256(rawToken) } });
      const user = await tx.user.findUniqueOrThrow({ where: { id: token.userId } });
      if (!user.active) return { status: 'expired' };
      // A reset (the user already had a password): every older sign-in ends, and the authenticator code is still required.
      const reset = !!user.passwordHash;
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, failedAttempts: 0, lockedUntil: null } });
      if (reset) await revokeAllSessions(tx, user.id, now);
      const next = user.totpEnabled ? 'verify' : 'enroll';
      const { token: sessionToken } = await createSession(tx, user.id, user.totpEnabled ? 'PENDING_VERIFY' : 'PENDING_ENROLL', { ip: ctx.ip, userAgent: ctx.userAgent, now });
      await writeAudit(tx, { actorId: user.id, action: reset ? 'user.password_reset' : 'invite.accepted', entityType: 'user', entityId: user.id, ip: ctx.ip });
      return { status: 'ok', token: sessionToken, next };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) return { status: 'expired' };
    throw e;
  }
}
