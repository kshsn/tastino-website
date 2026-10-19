# Epic 011 — Deploy and Cutover

**Status:** Pending
**Phase:** 7 — Build (deployment runs in Phase 9)
**Release:** MVP
**Effort:** M

---

## Goal
The new site runs on the existing shared Hostinger VPS without disturbing other apps, is tested on a staging subdomain first, and replaces the old site on tastinofoods.com through nginx with a 7-day rollback, working lead email and daily backups.

---

## Stories

### US-011.1 — Isolated app on the shared VPS [MVP]
**As a** developer, **I want** the site to run as its own PM2 app, port and database **so that** it cannot interfere with the other apps on the server.

#### Acceptance Criteria
- [ ] Given the VPS, when the app is deployed, then it runs as a PM2 process named `tastino-web` on port 3060 (or another port not used by any other app (checked against `ss -tlnp` and the PM2 list beforehand) if 3060 is taken) and is bound to 127.0.0.1 only.
- [ ] Given PostgreSQL, when the database is created, then it is a separate database `tastino_prod` (staging: `tastino_staging`) with its own role whose privileges cover only that database; no other app's role can connect to it.
- [ ] Given `pm2 save` and the startup hook, when the VPS reboots, then the app comes back online without manual action.
- [ ] Given the memory check before deploy, when free memory is below 500 MB after the other apps, then the deploy is paused and reported instead of started.

#### Edge Cases
- [ ] Empty/missing environment variable (DB URL, auth secret, SMTP password): the app refuses to start and logs which variable is missing; no default secrets are used.
- [ ] Unauthenticated: the PM2 port is not reachable from the internet (firewall/loopback check returns refused).
- [ ] Database unreachable at start: the app exits with a clear log and PM2 restarts it with back-off, not in a tight loop.
- [ ] Port conflict found at deploy: the deploy is aborted without stopping the other app.
- [ ] Deploy script run twice: idempotent; one PM2 app and one database, no duplicates.
- [ ] `.env` committed to git: the repository check fails (secrets exist only on the server).

**Status:** [ ] Pending

---

### US-011.2 — Staging subdomain with HTTPS [MVP]
**As a** client decision-maker, **I want** to review the full site on a staging subdomain **so that** I can approve it before launch.

#### Acceptance Criteria
- [ ] Given the DNS record for the staging subdomain (e.g. `staging.tastinofoods.com`), when nginx and certbot are configured, then the subdomain serves the new app over HTTPS with a valid certificate and HTTP redirects to HTTPS.
- [ ] Given the staging site, when crawled, then every response carries `X-Robots-Tag: noindex` and `/robots.txt` disallows all.
- [ ] Given staging, when the lead form is submitted, then it is saved in the staging database only, and any notification email is clearly marked "[STAGING]" and does not create production leads.
- [ ] Given staging, when opened without credentials, then it is protected by HTTP basic auth so only reviewers reach it.

#### Edge Cases
- [ ] DNS record not yet propagated: certbot fails with a clear message and the deploy checklist stops there.
- [ ] Unauthenticated visitor: receives 401 from basic auth, not the site.
- [ ] Network failure during certificate issuance: nginx keeps its previous working config (`nginx -t` must pass before reload).
- [ ] Certbot run twice: no duplicate certificates; renewal timer exists and a dry-run (`certbot renew --dry-run`) passes.
- [ ] Rate limit from Let's Encrypt: reported and the deploy waits rather than looping.

**Status:** [ ] Pending

---

### US-011.3 — Email DNS records and delivery test for info@ [MVP]
**As a** sales manager, **I want** lead emails from info@tastinofoods.com to be delivered **so that** no lead is missed in spam.

#### Acceptance Criteria
- [ ] Given the DNS zone for tastinofoods.com, when SPF, DKIM and DMARC records are published, then a DNS lookup shows a valid SPF record covering the Hostinger mail sender, a DKIM selector record, and a DMARC record starting with `p=none` (moved to `quarantine` after 2 clean weeks).
- [ ] Given a test submission on staging and then on production, when sent through Nodemailer over Hostinger SMTP, then the message arrives in an external Gmail and an Outlook inbox (not spam) and its headers show SPF, DKIM and DMARC as pass.
- [ ] Given a lead submission, when the email send fails, then the lead is still saved in the database and visible in the admin panel, and the failure is logged.
- [ ] Given the visitor auto-reply (Epic 006), when sent, then it passes the same header checks.

#### Edge Cases
- [ ] Empty SMTP credentials: the app starts, but the health check reports email as "not configured" and the lead flow still stores leads.
- [ ] Unauthenticated: SMTP credentials are never exposed in client code or responses.
- [ ] SMTP host unreachable (network failure): the send is retried with back-off up to 3 times, then marked failed, and Sales can still see the lead.
- [ ] Duplicate submission: one notification email per lead, not one per retry.
- [ ] Existing SPF record at the domain already used for other mail: the new record is merged into one SPF record (two SPF records are invalid).

**Status:** [ ] Pending

---

### US-011.4 — Daily database backups with a tested restore [MVP]
**As a** Super admin, **I want** the database backed up every day **so that** leads and content survive a failure.

#### Acceptance Criteria
- [ ] Given a cron job, when 02:00 server time arrives, then `pg_dump` of the `tastino_prod` database runs and writes a compressed, timestamped file to a backup folder with permissions readable only by the backup user.
- [ ] Given the retention rule, when a backup runs, then the last 14 daily files are kept and older ones are removed.
- [ ] Given a backup file, when restored into a scratch database, then the restored database contains the same lead and product row counts as the source (restore test done once before launch, then monthly).
- [ ] Given a backup fails (non-zero exit or empty file), when detected, then the failure is logged and an email alert goes to info@.

#### Edge Cases
- [ ] Empty (0-byte) dump: counted as failure and does not replace a previous good file or trigger deletion of old backups.
- [ ] Unauthenticated: backup folder is outside the web root and not served by nginx.
- [ ] Disk almost full: the backup is skipped with an alert instead of filling the disk the other apps share.
- [ ] Job runs twice in the same minute: file names include seconds, no overwrite.
- [ ] Off-server copy: not yet decided, so the story records this as a manual follow-up; local backups still work without it.

**Status:** [ ] Pending

---

### US-011.5 — Redirects from old URLs and hash anchors [MVP]
**As a** returning visitor with an old link or bookmark, **I want** to land on the matching new page **so that** old links are not broken.

#### Acceptance Criteria
- [ ] Given the old links `/#about`, `/#innovation`, `/#brands`, `/#contact` and the distributor anchor, when opened, then the visitor ends on `/{locale}/about`, `/{locale}/innovation`, `/{locale}/brands`, `/{locale}/distributors` and `/{locale}/distributors` respectively, where locale follows the language detection.
- [ ] Given that a URL fragment (`#...`) is never sent to the server, when the root page loads, then a small client-side script reads `location.hash` and replaces the URL with the mapped path, without a back-button loop.
- [ ] Given a request for `/` without a locale, when received, then the visitor is sent to `/ar` or `/en` with a 302 and the choice is remembered.
- [ ] Given any other old URL found in the old-site audit or Search Console (e.g. `/index.html`, old asset paths), when requested, then it answers a single 301 to the closest new page.

#### Edge Cases
- [ ] Empty hash or unknown hash (`/#xyz`): the visitor lands on the locale home page.
- [ ] Unauthenticated: redirects are public; `/admin` is not affected by any redirect rule.
- [ ] JavaScript disabled: the visitor still reaches the locale home page and can use navigation.
- [ ] Redirect chains: no URL needs more than one redirect hop.
- [ ] Hash includes uppercase or trailing slash (`/#Brands/`): normalised and mapped.
- [ ] Search engine bots: `/` returns a crawlable page with hreflang rather than a loop.

**Status:** [ ] Pending

---

### US-011.6 — Production cutover through nginx with a 7-day rollback [MVP]
**As a** client decision-maker, **I want** the switch from the old site to the new one to be short and reversible **so that** a problem does not take the website down.

#### Acceptance Criteria
- [ ] Given the staging sign-off (US-011.7), when the cutover is run, then nginx for tastinofoods.com and www points to the new app's port, HTTPS works with a valid certbot certificate, and `www` redirects to the apex (or the reverse, as decided) in one hop.
- [ ] Given the old site's build and nginx config, when the cutover happens, then both are kept untouched on the server for 7 days, and a documented rollback command restores the old config and passes `nginx -t` in under 2 minutes.
- [ ] Given the cutover, when it finishes, then a smoke test passes: `/en` and `/ar` return 200, a test lead is stored and emailed, `/admin/login` loads, `/sitemap.xml` is valid and the certificate expiry is more than 60 days away.
- [ ] Given day 7 after cutover with no incident, when the owner approves, then the old build is archived and the rollback config is removed.

#### Edge Cases
- [ ] The smoke test fails: the rollback is run immediately and the failure reported; the old site is never left down.
- [ ] Unauthenticated: during cutover, `/admin` is reachable only at the login page and no admin data is exposed.
- [ ] Network failure/dropped SSH during the switch: the script applies the nginx config atomically (test, then reload), so there is no half-applied state.
- [ ] Reload twice: idempotent.
- [ ] Other apps on the VPS: their nginx server blocks are untouched, and their health is checked before and after the reload.
- [ ] DNS TTL: lowered before the day of cutover if the IP changes; if the same VPS serves both, no DNS change is needed.

**Status:** [ ] Pending

---

### US-011.7 — Pre-launch sign-off checklist and post-launch support [MVP]
**As a** client decision-maker, **I want** a clear launch checklist and a monitored first two weeks **so that** I can approve launch with confidence.

#### Acceptance Criteria
- [ ] Given the staging site, when the checklist is completed, then it confirms: official copy in both languages with no placeholders, real contact details, no dead links, legal texts (privacy, terms) present, plus the cookie notice once analytics is enabled (R2), and first Super admin account with 2FA created.
- [ ] Given the checklist, when the client decision-maker signs off in writing (email), then the cutover (US-011.6) may start; without sign-off it must not.
- [ ] Given production after launch, when monitored, then an uptime check runs every 5 minutes against `/en` and `/ar`, and alerts go to info@ on two consecutive failures.
- [ ] Given the 2-week support window, when a defect is reported, then it is logged with a date and either fixed or scheduled; at the end a handover note covers admin usage, backups and rollback.

#### Edge Cases
- [ ] Deferred inputs missing (legal text, certifications, social accounts, Search Console access): legal text blocks launch; the others are logged as "to add later" and their sections are hidden, not shown empty.
- [ ] Unauthenticated: monitoring uses a public health endpoint (`/api/health`) that returns only status OK/FAIL and no secrets or versions.
- [ ] Monitoring service itself unreachable: a second check (manual or from another source) is listed in the handover.
- [ ] Sign-off given on an old staging version: the checklist records the commit SHA reviewed, and a later change requires re-approval.
- [ ] Google Search Console and Business Profile access not yet granted: recorded as an open item with an owner.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
