import nodemailer from 'nodemailer';
import { env } from '@/env';
import type { OutgoingEmail } from './email-content';

/** Anything that can send one email. The real one uses SMTP; tests pass a fake. */
export interface EmailTransport {
  send(message: OutgoingEmail): Promise<void>;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
}

let cached: EmailTransport | null = null;

/** The SMTP transport, or null when SMTP is not configured (leads are then stored and emailed later). */
export function getTransport(): EmailTransport | null {
  if (!isEmailConfigured()) return null;
  if (cached) return cached;
  const port = env.SMTP_PORT ?? 587;
  const smtp = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
  });
  cached = {
    async send(m) {
      await smtp.sendMail({ from: env.SMTP_FROM, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text });
    },
  };
  return cached;
}

export interface RetryOptions {
  attempts?: number;
  /** Wait before attempt 2, 3, ... in milliseconds. */
  delaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Runs `task`; on failure tries again with growing waits (default: 3 attempts, 1 s then 5 s). Returns true on success. */
export async function withRetry(task: () => Promise<void>, { attempts = 3, delaysMs = [1000, 5000], sleep = defaultSleep }: RetryOptions = {}): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      await task();
      return true;
    } catch (e) {
      console.error(`Email attempt ${i + 1} of ${attempts} failed:`, e instanceof Error ? e.message : e);
      if (i < attempts - 1) await sleep(delaysMs[Math.min(i, delaysMs.length - 1)] ?? 0);
    }
  }
  return false;
}
