import { db } from '@/lib/db';
import { runSeed } from './seed/run';

runSeed(db, { log: console.log })
  .then((r) => {
    if (r.skipped.length) console.warn(`Skipped rows:\n- ${r.skipped.join('\n- ')}`);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
