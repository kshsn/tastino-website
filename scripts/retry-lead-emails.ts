import { db } from '@/lib/db';
import { retryPendingEmails } from '@/lib/leads/service';

// Sends lead emails that are still waiting or failed (run by cron, and after SMTP is first configured).
retryPendingEmails()
  .then((r) => console.log(`Checked ${r.checked} lead(s); ${r.sent} fully emailed.`))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
