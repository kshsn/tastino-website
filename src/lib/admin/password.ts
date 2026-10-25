import bcrypt from 'bcryptjs';
import { BCRYPT_COST, PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from './config';

export type PasswordProblem = 'tooShort' | 'tooLong' | 'weak';

/** Rules for a new password. The sign-in form never applies them (an old password must still work). */
export function checkNewPassword(password: string, email = ''): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return 'tooLong';
  if (new Set(password).size < 5) return 'weak';
  const lower = password.toLowerCase();
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  if (lower === email.toLowerCase() || (local.length >= 4 && lower.includes(local))) return 'weak';
  return null;
}

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_COST);

// A real hash of a random string: comparing against it takes as long as a real check, so a missing account
// cannot be told apart from a wrong password by timing.
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= bcrypt.hash(`not-a-password-${Math.random()}`, BCRYPT_COST));

/** True when `password` matches `hash`. With no hash (unknown or invited user) it still spends the same time and returns false. */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, await dummyHash());
    return false;
  }
  return bcrypt.compare(password, hash);
}
