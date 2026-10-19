# Epic 009 — Admin Leads

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP
**Effort:** S

---

## Goal
Sales and Super admin users can find every distributor, export and catalogue lead, move it through New / In contact / Qualified / Closed, assign it, annotate it, archive it (never delete) and export it to CSV.

Roles in this epic: Super admin and Sales have access. Content editor has none (403).

---

## Stories

### US-009.1 — Lead inbox list, search and detail [MVP]
**As a** Sales user, **I want to** see all incoming leads in one list and open any lead **so that** I can follow up quickly.

#### Acceptance Criteria
- [ ] Given leads submitted through the public form (Epic 006), when a Sales user opens the inbox, then they are listed newest first, 25 per page, showing name, company, country, reason, status, assignee and received date.
- [ ] Given filters for status, reason, country, assignee, archived and date range plus a text search on name, email and company, when applied, then only matching leads are shown.
- [ ] Given a lead, when opened, then all submitted fields (including reason, company type, brands of interest, product, language of submission and consent timestamp) are displayed.
- [ ] Given a Content editor, when they open the leads URL or call the leads API, then the server answers 403.

#### Edge Cases
- [ ] No leads yet or no filter match: an empty-state message, not an error.
- [ ] Unauthenticated request: 401 and no lead data.
- [ ] Network failure while loading: error with retry; the last loaded list stays visible.
- [ ] Lead with optional fields empty: shows "Not provided", not blank or "null".
- [ ] Message containing HTML or script: displayed as escaped text.
- [ ] Arabic text in names or messages: shown right-to-left correctly and searchable.

**Status:** [ ] Pending

---

### US-009.2 — Change lead status [MVP]
**As a** Sales user, **I want to** set a lead's status to New, In contact, Qualified or Closed **so that** the team knows where each lead stands.

#### Acceptance Criteria
- [ ] Given a new submission, when it is saved, then its status is New.
- [ ] Given a lead, when the user selects a different status and confirms, then the status is saved, the list reflects it, and an audit entry (US-007.7) records old and new status.
- [ ] Given a status other than the four allowed values sent to the API, when received, then it is refused with 422.
- [ ] Given a Closed lead, when the user sets it back to In contact, then it is allowed and logged.

#### Edge Cases
- [ ] Empty status in the request: 422.
- [ ] Unauthenticated or Content editor: 401 / 403.
- [ ] Network failure when saving: the UI reverts to the saved status and shows a retry.
- [ ] Two users change the same lead at once: the later save is warned that the lead changed and shows the latest status.
- [ ] Same status selected again: no change, no duplicate audit entry.

**Status:** [ ] Pending

---

### US-009.3 — Assign a lead and add notes [MVP]
**As a** Sales user, **I want to** assign a lead to a team member and add internal notes **so that** ownership and history are clear.

#### Acceptance Criteria
- [ ] Given a lead, when the user picks an assignee from active Sales and Super admin users, then the assignee is saved and shown in the list.
- [ ] Given a lead, when the user adds a note, then it is stored with author and timestamp and appears in the lead's notes, oldest first.
- [ ] Given a stored note, when viewed, then it cannot be edited or deleted by Sales users (notes are append-only); an audit entry is written on creation.
- [ ] Given a deactivated user who was an assignee, when the lead is opened, then the assignee shows as "Inactive user" and the lead can be reassigned.

#### Edge Cases
- [ ] Empty or whitespace-only note: rejected; maximum 2,000 characters.
- [ ] Unauthenticated or Content editor: 401 / 403.
- [ ] Network failure on Add note: the typed text stays; retry adds exactly one note.
- [ ] Double-click on Add note: one note.
- [ ] Assignee set to a Content editor user via API: rejected 422.
- [ ] Note text with HTML: stored and shown as plain escaped text.

**Status:** [ ] Pending

---

### US-009.4 — Archive and restore leads, never delete [MVP]
**As a** Sales user, **I want to** archive finished leads **so that** the inbox stays clean while records are kept.

#### Acceptance Criteria
- [ ] Given a lead, when the user archives it, then it leaves the default inbox view, remains visible under the Archived filter, and an audit entry is written.
- [ ] Given an archived lead, when the user restores it, then it returns to the inbox with its previous status, notes and assignee.
- [ ] Given any role including Super admin, when a delete request for a lead is sent to the API, then it is refused (405 or 403) and no row is removed; no delete control exists in the UI.
- [ ] Given a lead is archived, when a Super admin runs the CSV export with archived included, then the lead is in the file.

#### Edge Cases
- [ ] Archive action with an empty/unknown lead id: 404.
- [ ] Unauthenticated or Content editor: 401 / 403.
- [ ] Network failure on Archive: the UI shows the true state after reload; no half state.
- [ ] Archive clicked twice: one state change and one audit entry.
- [ ] A visitor re-submits with the same email after the earlier lead was archived: a new lead is created and both are kept.

**Status:** [ ] Pending

---

### US-009.5 — Export leads to CSV [MVP]
**As a** Super admin or Sales user, **I want to** export the filtered leads to CSV **so that** I can share or analyse them outside the panel.

#### Acceptance Criteria
- [ ] Given the active filters, when a Super admin or Sales user clicks Export CSV, then a UTF-8 file with a BOM downloads containing exactly the filtered leads, so Arabic opens correctly in Excel.
- [ ] Given a CSV, when opened, then columns include id, received date (UTC), name, email, phone, company, country, reason, status, assignee and notes count, with a header row.
- [ ] Given a cell starting with `=`, `+`, `-` or `@`, when exported, then it is prefixed so spreadsheets do not execute it (CSV injection protection).
- [ ] Given an export, when it completes, then an audit entry records who exported, the filters and the row count.
- [ ] Given a Content editor, when they call the export endpoint, then the server answers 403.

#### Edge Cases
- [ ] Zero matching leads: the file contains only the header row, or the button shows "No leads to export".
- [ ] Unauthenticated request to the export URL: 401.
- [ ] Network failure mid-download: the user can retry; no partial file is treated as complete (the audit entry is written on completed response only).
- [ ] Double-click on Export: one download and one audit entry.
- [ ] Commas, quotes and line breaks in messages: correctly quoted so the rows remain intact.
- [ ] Very large export (over 10,000 rows): streamed without timing out.

**Status:** [ ] Pending

---

### US-009.6 — 24-month retention flag [MVP]
**As a** Super admin, **I want** leads older than 24 months identified **so that** retention policy can be applied consciously.

#### Acceptance Criteria
- [ ] Given a lead received more than 24 months ago, when the inbox loads, then it carries a "Retention period ended" flag and can be filtered with "Past 24 months".
- [ ] Given flagged leads, when a Super admin views the retention screen, then they see the count and can export them to CSV.
- [ ] Given a lead is flagged, when any user opens it, then no data is deleted automatically.
- [ ] Given a lead received 23 months and 29 days ago, when the inbox loads, then it is not flagged.

#### Edge Cases
- [ ] No leads past 24 months: the screen shows a zero count, not an error.
- [ ] Unauthenticated or Sales/Content editor opening the retention screen: 401 / 403 (Super admin only).
- [ ] Network failure when loading the count: error with retry.
- [ ] Lead with a missing received date: flagged for review rather than ignored.
- [ ] Leap-year dates: 24 months is calculated by calendar month, not by 730 days.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
