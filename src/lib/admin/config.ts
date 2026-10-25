// One place for every number the admin sign-in rules depend on (US-007.1 to US-007.6).

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
/** A half-finished sign-in (password done, code or enrolment still to do) lasts only this long. */
export const PENDING_TIMEOUT_MS = 10 * 60 * 1000;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
export const RECOVERY_CODE_COUNT = 8;

/** The last-seen time is written at most this often, so reads do not turn into a write per request. */
export const TOUCH_INTERVAL_MS = 60 * 1000;

export const SESSION_COOKIE = 'tf_admin';
export const SESSION_COOKIE_SECURE = '__Host-tf_admin';

export const TOTP_ISSUER = 'Tastino Foods';

export const PASSWORD_MIN_LENGTH = 12;
/** bcrypt only reads the first 72 bytes, so longer passwords are refused instead of silently cut. */
export const PASSWORD_MAX_BYTES = 72;
export const BCRYPT_COST = 12;
