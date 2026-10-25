import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { RECOVERY_CODE_COUNT } from './config';

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** An unguessable value for a cookie or a link (256 bits). */
export const newToken = (): string => randomBytes(32).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ───────── recovery codes ─────────
// 15 characters from a 32-letter alphabet without look-alikes (75 bits): too long to guess, so a fast hash is enough.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const hashRecoveryCode = (input: string): string => sha256(`recovery:${normalizeRecoveryCode(input)}`);

/** Eight single-use codes, shown once as `XXXXX-XXXXX-XXXXX`; only their hashes are stored. */
export function newRecoveryCodes(count = RECOVERY_CODE_COUNT): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: count }, () => {
    const bytes = randomBytes(15);
    const chars = Array.from(bytes, (b) => ALPHABET[b % 32]).join('');
    return `${chars.slice(0, 5)}-${chars.slice(5, 10)}-${chars.slice(10, 15)}`;
  });
  return { plain, hashes: plain.map(hashRecoveryCode) };
}

// ───────── secrets at rest ─────────
/** Reads the 32-byte key from the environment (base64). Returns null when it is missing or the wrong size. */
export function parseKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}

/** AES-256-GCM: `v1.<iv>.<tag>.<ciphertext>`, so a leaked database does not hand out the authenticator secrets. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decryptSecret(blob: string, key: Buffer): string {
  const [version, iv, tag, data] = blob.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unknown secret format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
