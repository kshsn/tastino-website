import { generate, generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { TOTP_ISSUER } from './config';

export const newTotpSecret = (): string => generateSecret();

export const totpUri = (secret: string, email: string): string => generateURI({ issuer: TOTP_ISSUER, label: email, secret });

/** The QR code as an image the browser can show without running any script. */
export async function qrDataUrl(uri: string): Promise<string> {
  const svg = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export type TotpCheck = { valid: false } | { valid: true; step: number };

/**
 * Checks a 6-digit code. One 30-second step either side is accepted (clock drift); anything further is not.
 * The result includes the time step, so the caller can refuse the same code a second time.
 */
export async function checkTotp(secret: string, token: string, nowMs = Date.now()): Promise<TotpCheck> {
  if (!/^\d{6}$/.test(token)) return { valid: false };
  const nowSec = Math.floor(nowMs / 1000);
  const result = await verify({ secret, token, epoch: nowSec, epochTolerance: 30 });
  if (!result.valid) return { valid: false };
  // `delta` is how many 30-second steps the matching code is away from "now" (-1, 0 or 1).
  return { valid: true, step: Math.floor(nowSec / 30) + (result.delta ?? 0) };
}

/** A valid code for the given moment (tests and the seed use it). */
export const currentTotp = (secret: string, nowMs = Date.now()): Promise<string> => generate({ secret, epoch: Math.floor(nowMs / 1000) });
