import { INVITE_TTL_MS } from './config';
import type { OutgoingEmail } from '@/lib/leads/email-content';

const oneLine = (v: string) => v.replace(/[\r\n\u0000-\u001f\u007f‪-‮⁦-⁩]+/g, ' ').trim();

/** The email that invites a new staff member: a single-use link, valid for 48 hours. */
export function buildInvitation(user: { name: string; email: string }, link: string, reset = false): OutgoingEmail {
  const hours = Math.round(INVITE_TTL_MS / 3_600_000);
  return {
    to: [user.email],
    subject: reset ? 'Reset your Tastino Foods admin password' : 'Your Tastino Foods admin account',
    text: [
      `Hello ${oneLine(user.name)},`,
      '',
      reset ? 'A Super admin has sent you a link to choose a new password for the Tastino Foods admin.' : 'An admin account has been created for you on the Tastino Foods website.',
      reset ? `Use this link to choose a new password. You will still need the code from your authenticator app. It works once and expires in ${hours} hours:` : `Use this link to choose your password and set up your authenticator app. It works once and expires in ${hours} hours:`,
      '',
      link,
      '',
      'If you were not expecting this email, ignore it: nothing happens until the link is used. Your current password keeps working until then.',
      '',
      'Tastino Foods',
    ].join('\n'),
  };
}
