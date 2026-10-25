import { db } from '@/lib/db';
import { inviteLink } from '@/lib/admin/invite-email';
import { createUser } from '@/lib/admin/users-service';

// Creates the first admin account (or any other one) from the command line, for the moment before anyone can sign in:
//   npm run admin:create -- --email owner@tastinofoods.com --name "Full Name" [--role SUPER_ADMIN]
// It prints the single-use invitation link (valid 48 hours). The link is the only way to set the password, and the
// action is written to the audit log with no actor.

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email');
  const name = arg('name');
  const role = arg('role') ?? 'SUPER_ADMIN';
  if (!email || !name) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<full name>" [--role SUPER_ADMIN|CONTENT_EDITOR|SALES]');
    process.exitCode = 1;
    return;
  }
  const result = await createUser({ id: null, ip: null }, { name, email, role });
  if (result.status === 'duplicate') {
    console.error(`A user with the email ${email} already exists.`);
    process.exitCode = 1;
  } else if (result.status === 'invalid') {
    console.error('Not created:', JSON.stringify(result.errors));
    process.exitCode = 1;
  } else {
    console.log(`Created ${result.user.role} ${result.user.email}.`);
    console.log(result.delivery === 'sent' ? 'The invitation email was sent.' : 'No email was sent. Give them this link (single use, valid 48 hours):');
    if (result.delivery !== 'sent') console.log(inviteLink(result.inviteToken));
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
