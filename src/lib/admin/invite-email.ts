import { env } from '@/env';
import { buildInvitation } from './invite-content';
import { getTransport, withRetry, type EmailTransport } from '@/lib/leads/mailer';

export type InviteDelivery = 'sent' | 'failed' | 'not_configured';

export const inviteLink = (token: string): string => `${env.SITE_URL}/admin/invite/${token}`;

/**
 * Sends the invitation. It never throws: a failed or impossible send leaves the user as "invite pending", and a
 * Super admin can resend it (or copy the link) from the users screen.
 */
export async function sendInvitation(user: { name: string; email: string }, token: string, reset = false, transport: EmailTransport | null | undefined = undefined): Promise<InviteDelivery> {
  const mail = transport === undefined ? getTransport() : transport;
  if (!mail) return 'not_configured';
  try {
    const ok = await withRetry(() => mail.send(buildInvitation(user, inviteLink(token), reset)));
    return ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
