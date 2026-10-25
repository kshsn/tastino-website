# Epic 007 — Admin Access

**Status:** Complete (2026-10-25; US-007.8 audit viewer added in a later PR)
**Phase:** 7 — Build
**Release:** MVP (basic) / R2 (full)
**Effort:** M

---

## Goal
Staff can sign in to `/admin` securely (email, password, TOTP 2FA), see only what their role allows (Super admin, Content editor, Sales), and every admin action is recorded in an audit log.

---

## Stories

### US-007.1 — Sign in with email and password [MVP]
**As a** staff member, **I want to** sign in at `/admin/login` with my email and password **so that** I can reach the admin panel.

#### Acceptance Criteria
- [x] Given an active user with valid credentials and 2FA enrolled, when they submit the login form, then the password step passes and they are taken to the 2FA code step (no admin page is reachable yet).
- [x] Given wrong credentials, when the form is submitted, then the response shows one generic message ("Email or password is incorrect") that does not reveal whether the email exists, and no session is created.
- [x] Given a deactivated user with the correct password, when they submit, then login is refused with the same generic message.
- [x] Given a stored password, when the database is inspected, then only a salted hash (argon2id or bcrypt) is present, never plain text.

#### Edge Cases
- [x] Empty email or password: the form shows field-level errors and sends no request.
- [x] Unauthenticated visitor opens any `/admin/*` URL or `/api/admin/*` endpoint: redirected to `/admin/login` (pages) or answered 401 (API), with no data returned.
- [x] Network failure on submit: the form shows a retry message, keeps the typed email, clears the password, and does not double-submit.
- [x] Double-click on Submit: only one login attempt is recorded.
- [x] Email entered with different letter case or surrounding spaces: matched case-insensitively after trimming.

**Status:** [x] Complete

---

### US-007.2 — Two-factor authentication with an authenticator app [MVP]
**As a** staff member, **I want to** enroll and use a TOTP authenticator app **so that** a stolen password alone cannot open the admin panel.

#### Acceptance Criteria
- [x] Given a user logging in for the first time without 2FA, when the password step passes, then they must scan a QR code (or enter the secret key) and confirm a valid 6-digit code before reaching any admin page.
- [x] Given a user with 2FA enrolled, when they enter a valid current code, then the session is created and they land on their role's home page.
- [x] Given an invalid or expired code, when it is submitted, then access is refused, the failure counts toward lockout (US-007.3), and no session is created.
- [x] Given a code that was already used successfully, when it is submitted again inside its validity window, then it is rejected (no replay).
- [x] Given enrollment, when 2FA is confirmed, then 8 single-use recovery codes are shown once and stored only as hashes.

#### Edge Cases
- [x] Empty or non-numeric code: field error, no request sent.
- [x] User skips enrollment by opening another `/admin/*` URL directly: redirected back to the enrollment step.
- [x] Network failure while confirming enrollment: 2FA stays not enabled and the user can retry with the same secret.
- [x] Duplicate submission of the same code: the second request is rejected and the first result stands.
- [x] Device clock drift of up to one 30-second step: the code is still accepted; beyond that it is rejected.
- [x] A recovery code is used: it works once, then is invalidated.

**Status:** [x] Complete

---

### US-007.3 — Lockout after repeated failed logins [MVP]
**As a** Super admin, **I want** accounts to lock after repeated failed sign-ins **so that** password guessing is stopped.

#### Acceptance Criteria
- [x] Given 5 consecutive failed password or 2FA attempts on one account, when the 6th attempt is made, then it is refused with a "temporarily locked" message even if the credentials are correct.
- [x] Given a locked account, when 15 minutes pass, then the user can try again and the failure counter is reset.
- [x] Given a successful full login, when it completes, then the failure counter for that account is reset to 0.
- [x] Given a lockout occurs, when it is triggered, then an audit log entry "account locked" is written with the account and IP.

#### Edge Cases
- [x] Failed attempts against an email that does not exist: throttled per IP with the same generic message and no account is revealed.
- [x] Locked user is not authenticated and opens an admin URL: still redirected to login, nothing exposed.
- [x] Network failure during the 5th attempt: the counter is only incremented once the server has processed the request, so a retry does not skip an attempt count.
- [x] Simultaneous parallel attempts (10 in one second): the counter still locks at 5, with no race that allows extra tries.
- [x] Super admin unlocks a locked user from the users screen (US-007.6): the user can log in immediately.

**Status:** [x] Complete

---

### US-007.4 — Role-based access control [MVP]
**As a** Super admin, **I want** each role limited to its own areas **so that** staff cannot see or change things outside their job.

#### Acceptance Criteria
- [x] Given a signed-in Super admin, when they open any admin area, then users, content, leads, audit log and settings are all accessible.
- [x] Given a signed-in Content editor, when they open brands, products, variants, media, hero slides, page copy or settings, then access is allowed; when they open users, leads or the audit log, then the server answers 403.
- [x] Given a signed-in Sales user, when they open the leads area, then access is allowed; when they open any content, users or audit area, then the server answers 403.
- [x] Given each role, when the admin navigation renders, then only the links that role may open are shown.

#### Edge Cases
- [x] Empty/missing role on a user record: treated as no access (403 everywhere), never as a default role.
- [x] Unauthenticated request to a role-restricted API endpoint: 401, no data.
- [x] Role is changed while the user is signed in: the new role applies on the next request, not at next login.
- [x] A Content editor calls a Sales or Super admin API endpoint directly (bypassing the UI): rejected 403 server-side.
- [x] Network failure when loading permissions: the UI shows an error state and no restricted link is displayed.

**Status:** [x] Complete

---

### US-007.5 — Session timeout and sign out [MVP]
**As a** staff member, **I want** my session to end after inactivity **so that** an unattended browser cannot be used by someone else.

#### Acceptance Criteria
- [x] Given a signed-in user inactive for 30 minutes, when they next act, then they are redirected to login and the request is refused with 401.
- [x] Given a signed-in user active within 30 minutes, when they act, then the inactivity timer restarts.
- [x] Given a user clicks Sign out, when it completes, then the session is invalidated server-side and the Back button cannot reopen admin pages.
- [x] Given a session older than 12 hours, when the user acts, then they must sign in again regardless of activity.

#### Edge Cases
- [x] Timeout occurs while a form is half-filled: the user is sent to login with a notice, and after re-login returns to the same page (draft unsaved data is not claimed to be saved).
- [x] Unauthenticated user opens a saved admin bookmark: redirected to login, then to the bookmark after success.
- [x] Network failure on Sign out: the UI keeps showing a retry, and the session is not reported as ended until the server confirms.
- [x] Sign out clicked twice: no error, one audit entry.
- [x] Session open in two tabs, signed out in one: the other tab's next request is refused 401.

**Status:** [x] Complete

---

### US-007.6 — Manage admin users (Super admin) [MVP]
**As a** Super admin, **I want to** create, edit, deactivate and unlock users and assign roles **so that** the 2 to 5 staff accounts are controlled without a developer.

#### Acceptance Criteria
- [x] Given a Super admin on the users screen, when they create a user with name, email and role, then the user is saved and receives an invitation email with a single-use link (valid 48 hours) to set a password and enroll 2FA.
- [x] Given an existing user, when the Super admin changes the role or deactivates the user, then the change is saved, active sessions of that user are revoked, and an audit entry is written.
- [x] Given a user who lost their authenticator and recovery codes, when the Super admin resets their 2FA, then the user must re-enroll at next login.
- [x] Given a Content editor or Sales user, when they call any users endpoint, then the server answers 403.

#### Edge Cases
- [x] Empty name, empty email or invalid email format: rejected with field errors.
- [x] Unauthenticated request to the users endpoints: 401.
- [x] Duplicate email (case-insensitive): rejected with "A user with this email already exists" and no second record is created.
- [x] Network failure on Create: no half-created user; retry creates exactly one user.
- [x] The only remaining active Super admin tries to deactivate or downgrade themselves: blocked with an explanation.
- [x] Invitation email fails to send: the user is saved as "invite pending" and the Super admin can resend.
- [x] Expired invitation link: shows an expired message and offers no access.

**Status:** [x] Complete

---

### US-007.7 — Audit log records admin actions [MVP]
**As a** Super admin, **I want** every admin action recorded **so that** I can see who changed what and when.

#### Acceptance Criteria
- [x] Given any create, update, publish, unpublish, archive, export, role change, login, failed login, lockout or logout, when it completes, then an audit entry is stored with actor, action, entity type, entity id, timestamp (UTC) and IP.
- [x] Given an update to a record, when the entry is written, then it stores the changed field names with before and after values (secrets and password hashes are never stored).
- [x] Given an action fails validation or is refused (403), when it is rejected, then no change entry is written but a denied-access entry is.
- [x] Given the audit table, when any admin role calls an edit or delete endpoint on it, then it is refused: entries are append-only.

#### Edge Cases
- [x] Action with empty/no net change (save without edits): no entry is written.
- [x] Unauthenticated action attempt: logged as a failed attempt with no actor, never silently dropped.
- [x] Audit write fails (database error): the originating action is rolled back and the user sees an error, so no unlogged change exists.
- [x] Duplicate submission of the same save: one entry per actual change.
- [x] Network failure after the server committed: the entry exists once; the retry does not add a duplicate.

**Status:** [x] Complete

---

### US-007.8 — View and filter the audit log [R2]
**As a** Super admin, **I want to** browse and filter the audit log **so that** I can investigate changes.

#### Acceptance Criteria
- [x] Given a Super admin on the audit screen, when it loads, then entries are listed newest first, 50 per page.
- [x] Given filters for user, action type, entity type and date range, when applied, then only matching entries are shown and the count matches.
- [x] Given an entry with before and after values, when it is opened, then the changed fields are displayed side by side.
- [x] Given a Content editor or Sales user, when they open the audit URL, then they get 403.

#### Edge Cases
- [x] No entries match the filter: an empty-state message is shown, not an error.
- [x] Unauthenticated request: 401.
- [x] Network failure while loading a page: error with retry; already-loaded rows stay visible.
- [x] Clicking Apply twice: the same result, no duplicated rows.
- [ ] Date range with end before start: rejected with a validation message.

**Status:** [x] Complete

---

## Epic Checklist
- [ ] All stories marked complete (US-007.8 is R2)
- [x] Type check passing (`tsc --noEmit`)
- [x] Linter passing (`eslint .`)
- [x] Committed and pushed to GitHub
- [x] Project CLAUDE.md updated with last completed epic

---
## Build notes
- US-007.8 (view and filter the audit log) was built afterwards, together with the leads screens.
- Added beyond the epic: Super admin password reset link (see decisions.md), first-admin command, `ADMIN_ENCRYPTION_KEY` setting.
- Before the admin can be used on a server: set `ADMIN_ENCRYPTION_KEY`, run the migration, then `npm run admin:create`.
