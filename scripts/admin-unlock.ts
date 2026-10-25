import { db } from '@/lib/db';
import { unlockUser } from '@/lib/admin/users-service';

// For the day a Super admin is locked out and no other Super admin can unlock them:
//   npm run admin:unlock -- --email owner@tastinofoods.com
// It clears the failed-attempt counter and the lock. The action is written to the audit log with no actor.

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run admin:unlock -- --email <email>');
    process.exitCode = 1;
    return;
  }
  const user = await db.user.findFirst({ where: { email }, select: { id: true } });
  if (!user) {
    console.error(`No user with the email ${email}.`);
    process.exitCode = 1;
    return;
  }
  const result = await unlockUser({ id: null, ip: null }, user.id);
  console.log(result.status === 'ok' ? `Unlocked ${email}.` : `${email} was not locked.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
