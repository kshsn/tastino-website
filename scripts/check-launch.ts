import { db } from '@/lib/db';
import { getLaunchBlockers } from '@/lib/content/launch';

// Pre-launch gate: exits with code 1 and lists what still blocks the launch.
getLaunchBlockers()
  .then((blockers) => {
    if (blockers.length === 0) {
      console.log('Launch check passed: no blockers.');
      return;
    }
    console.error(`Launch check FAILED (${blockers.length} blocker${blockers.length === 1 ? '' : 's'}):`);
    for (const b of blockers) console.error(`- [${b.id}] ${b.message}`);
    process.exitCode = 1;
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
