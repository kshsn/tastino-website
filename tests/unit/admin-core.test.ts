import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { diffFields, scrub } from '@/lib/admin/audit';
import { decryptSecret, encryptSecret, hashRecoveryCode, newRecoveryCodes, newToken, normalizeRecoveryCode, parseKey, safeEqual, sha256 } from '@/lib/admin/crypto';
import { checkNewPassword, hashPassword, verifyPassword } from '@/lib/admin/password';
import { safeNext } from '@/lib/admin/paths';
import { tokenFromCookieHeader } from '@/lib/admin/session';
import { buildInvitation } from '@/lib/admin/invite-content';
import { checkTotp, currentTotp, newTotpSecret, qrDataUrl, totpUri } from '@/lib/admin/totp';

const KEY = Buffer.alloc(32, 7);

describe('secrets at rest', () => {
  it('encrypts and decrypts, and the stored text hides the secret', () => {
    const blob = encryptSecret('JBSWY3DPEHPK3PXP', KEY);
    expect([blob.startsWith('v1.'), blob.includes('JBSWY3DPEHPK3PXP'), decryptSecret(blob, KEY)]).toEqual([true, false, 'JBSWY3DPEHPK3PXP']);
  });
  it('gives a different text each time (fresh random start)', () => {
    expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY));
  });
  it('refuses to decrypt with another key or a damaged text', () => {
    const blob = encryptSecret('secret', KEY);
    expect(() => decryptSecret(blob, Buffer.alloc(32, 9))).toThrow();
    expect(() => decryptSecret(blob.slice(0, -2) + 'xx', KEY)).toThrow();
    expect(() => decryptSecret('garbage', KEY)).toThrow();
  });
  it('accepts only a 32-byte base64 key', () => {
    expect([parseKey(undefined), parseKey('c2hvcnQ='), parseKey(KEY.toString('base64'))?.length]).toEqual([null, null, 32]);
  });
});

describe('recovery codes', () => {
  it('makes eight different codes in the form XXXXX-XXXXX-XXXXX, with no look-alike letters', () => {
    const { plain } = newRecoveryCodes();
    expect([plain.length, new Set(plain).size, plain.every((c) => /^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){2}$/.test(c))]).toEqual([8, 8, true]);
  });
  it('stores hashes that match the code however it is typed', () => {
    const { plain, hashes } = newRecoveryCodes();
    expect([hashes[0] === hashRecoveryCode(plain[0]), hashRecoveryCode(plain[0].toLowerCase().replace(/-/g, ' ')) === hashes[0], hashes.includes(plain[0])]).toEqual([true, true, false]);
  });
  it('ignores spaces, dashes and case when comparing', () => {
    expect(normalizeRecoveryCode(' ab-cd 12 ')).toBe('ABCD12');
  });
});

describe('tokens and hashes', () => {
  it('makes long unguessable tokens', () => {
    expect([newToken().length >= 43, newToken() === newToken()]).toEqual([true, false]);
  });
  it('hashes with SHA-256 and compares in constant time', () => {
    expect([sha256('a').length, safeEqual('abc', 'abc'), safeEqual('abc', 'abd'), safeEqual('abc', 'abcd')]).toEqual([64, true, false, false]);
  });
});

describe('passwords', () => {
  it('requires at least 12 characters', () => {
    expect([checkNewPassword('short one', 'a@b.test'), checkNewPassword('a long enough passphrase', 'a@b.test')]).toEqual(['tooShort', null]);
  });
  it('refuses more than 72 bytes (bcrypt would cut the rest off silently)', () => {
    expect([checkNewPassword('x1'.repeat(40), 'a@b.test'), checkNewPassword('é'.repeat(40), 'a@b.test')]).toEqual(['tooLong', 'tooLong']);
  });
  it('refuses the email itself, the name part of it and a run of one character', () => {
    expect([checkNewPassword('sara.ali@tastinofoods.com', 'sara.ali@tastinofoods.com'), checkNewPassword('my-sara.ali-secret!', 'sara.ali@tastinofoods.com'), checkNewPassword('aaaaaaaaaaaaaaaa', 'x@y.test')]).toEqual(['weak', 'weak', 'weak']);
  });
  it('hashes with bcrypt and verifies', async () => {
    const hash = await hashPassword('a long enough passphrase');
    expect([hash.startsWith('$2'), await verifyPassword('a long enough passphrase', hash), await verifyPassword('a long enough passphrasE', hash)]).toEqual([true, true, false]);
  });
  it('spends real time and returns false when there is no hash (a missing account looks the same)', async () => {
    const t0 = Date.now();
    const ok = await verifyPassword('anything at all', null);
    expect([ok, Date.now() - t0 > 50]).toEqual([false, true]);
  });
  it('reads the cost from the hash, so old hashes keep working', async () => {
    expect(await verifyPassword('pw', await bcrypt.hash('pw', 4))).toBe(true);
  });
});

describe('authenticator codes', () => {
  const t = Date.UTC(2026, 9, 25, 9, 0, 0);
  it('accepts the current code and reports its time step', async () => {
    const secret = newTotpSecret();
    const r = await checkTotp(secret, await currentTotp(secret, t), t);
    expect(r).toEqual({ valid: true, step: Math.floor(t / 1000 / 30) });
  });
  it('accepts the previous and next 30-second step, and no more', async () => {
    const secret = newTotpSecret();
    const out = [];
    for (const off of [-30, 30, -60, 60]) out.push((await checkTotp(secret, await currentTotp(secret, t + off * 1000), t)).valid);
    expect(out).toEqual([true, true, false, false]);
  });
  it('rejects anything that is not six digits without checking it', async () => {
    const secret = newTotpSecret();
    expect((await Promise.all(['', 'abcdef', '12345', '1234567', '12 345'].map((c) => checkTotp(secret, c, t)))).every((r) => !r.valid)).toBe(true);
  });
  it('builds an otpauth link and a QR image', async () => {
    const secret = newTotpSecret();
    const uri = totpUri(secret, 'sara@tastinofoods.com');
    expect([uri.startsWith('otpauth://totp/'), uri.includes('Tastino'), (await qrDataUrl(uri)).startsWith('data:image/svg+xml;base64,')]).toEqual([true, true, true]);
  });
});

describe('audit helpers', () => {
  it('lists only the fields that changed, with before and after', () => {
    expect(diffFields({ role: 'SALES', name: 'A' }, { role: 'SALES', name: 'B' })).toEqual({ name: { before: 'A', after: 'B' } });
  });
  it('gives an empty result when nothing changed', () => {
    expect(diffFields({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toEqual({});
  });
  it('never includes secret fields', () => {
    expect(diffFields({ passwordHash: 'old', totpSecret: 'a', name: 'x' }, { passwordHash: 'new', totpSecret: 'b', name: 'y' })).toEqual({ name: { before: 'x', after: 'y' } });
    expect(scrub({ ok: 1, password: 'p', code: '123456', recoveryCodeHashes: ['h'] })).toEqual({ ok: 1 });
  });
});

describe('return-to address', () => {
  it('only accepts addresses inside the admin', () => {
    expect([safeNext('/admin/users'), safeNext('/admin'), safeNext('https://evil.example'), safeNext('//evil.example'), safeNext('/admin\\..\\x'), safeNext('/other'), safeNext(undefined), safeNext('/admin/a\r\nSet-Cookie: x=1')]).toEqual(['/admin/users', '/admin', '/admin', '/admin', '/admin', '/admin', '/admin', '/admin']);
  });
});

describe('cookie header', () => {
  it('finds the session cookie among others', () => {
    expect([tokenFromCookieHeader('a=1; tf_admin=abc.DEF-1; b=2', false), tokenFromCookieHeader('__Host-tf_admin=xyz', true), tokenFromCookieHeader('a=1', false), tokenFromCookieHeader(null, false), tokenFromCookieHeader('tf_admin=', false)]).toEqual(['abc.DEF-1', 'xyz', null, null, null]);
  });
  it('on HTTPS ignores a plain cookie that has the other name, and the other way round', () => {
    expect([tokenFromCookieHeader('tf_admin=planted', true), tokenFromCookieHeader('__Host-tf_admin=x', false), tokenFromCookieHeader('tf_admin=planted; __Host-tf_admin=real', true)]).toEqual([null, null, 'real']);
  });
});

describe('invitation email', () => {
  it('says it is a password reset, that the authenticator code is still needed, and that the old password keeps working', () => {
    const mail = buildInvitation({ name: 'Sara', email: 'sara@tastinofoods.com' }, 'https://site.test/admin/invite/T', true);
    expect([mail.subject.includes('Reset'), mail.text.includes('authenticator'), mail.text.includes('current password keeps working')]).toEqual([true, true, true]);
  });
  it('has the link, the 48 hours, and no way to inject a header through the name', () => {
    const mail = buildInvitation({ name: 'Sara\r\nBcc: x@evil.test', email: 'sara@tastinofoods.com' }, 'https://site.test/admin/invite/TOKEN');
    expect([mail.to, mail.text.includes('https://site.test/admin/invite/TOKEN'), mail.text.includes('48 hours'), /Hello Sara Bcc: x@evil.test,/.test(mail.text), mail.subject.includes('\n')]).toEqual([['sara@tastinofoods.com'], true, true, true, false]);
  });
});
