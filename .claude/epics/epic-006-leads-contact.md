# Epic 006 — Leads and Contact

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP · **Effort:** M

---

## Goal
Let distributors and buyers contact Tastino through one bilingual form on `/distributors` (matching the approved `design/mockup/distributors.html`; `/contact` redirects there), WhatsApp or phone, with every submission stored in the database, emailed only to info@tastinofoods.com, protected from spam and covered by PDPL consent.

---

## Stories

### US-006.1 — Distributor application form [MVP]
**As a** distributor, **I want to** submit an application in Arabic or English **so that** the Tastino sales team can contact me.

#### Acceptance Criteria
- [ ] Given `/[locale]/distributors`, when loaded, then it shows the pitch (partner terms discussed directly; no prices) and a form with four reason tabs (Become a distributor, Request catalogue, Product inquiry, Other), required fields name, company, email, country and message plus PDPL consent, and optional phone with country code, company type (Distribution company, Wholesaler, Supermarket chain, Hotel/restaurant/café, Catering, Other), brands of interest (Lora, Liora, Andiamo, TAMA, Tastino lines) and, for Product inquiry, a product field.
- [ ] Given valid required fields and consent ticked, when the form is submitted, then a Lead with the selected reason and the current locale is saved and the form is replaced in place by the success screen.
- [ ] Given a field error, when submitted, then the error message appears next to the field in the current language, focus moves to the first invalid field, and entered values are preserved.

#### Edge Cases
- [ ] Empty/null input: submitting with any required field empty is blocked client-side and rejected server-side with HTTP 422 and nothing saved.
- [ ] Unauthenticated user: the form is public by design; no admin data is exposed in the response.
- [ ] Network failure: if the request fails, a localized "Could not send, please try again or use WhatsApp" message shows with the form data kept.
- [ ] Duplicate submission: double-clicking submit sends one request (button disabled while pending), and an identical submission (same email and message) within 10 minutes is stored once.
- [ ] Message longer than 2000 characters, emails without a valid domain, and phones with Arabic-Indic digits are handled (limit enforced, rejected, accepted and normalised).

**Status:** [ ] Pending

---

### US-006.2 — Server validation and lead persistence [MVP]
**As a** sales manager, **I want to** every valid submission saved reliably **so that** no lead is lost even if email fails.

#### Acceptance Criteria
- [ ] Given a valid submission, when the API handles it, then the Lead is committed to PostgreSQL before any email is attempted and the API returns success only after the commit.
- [ ] Given the SMTP server is down, when a valid submission arrives, then the Lead is still saved with status New, the visitor sees the success screen, and the email failure is logged for retry.
- [ ] Given a request with HTML or script in text fields, when saved and later displayed, then the content is escaped and never executed.

#### Edge Cases
- [ ] Empty/null input: a JSON body that is empty or not JSON returns HTTP 400.
- [ ] Unauthenticated user: the endpoint accepts public POST only; GET returns 405 and never lists leads.
- [ ] Network failure: a database failure returns HTTP 503 with no partial row and a localized retry message.
- [ ] Duplicate submission: a retry with the same idempotency key creates one Lead.
- [ ] Extra unknown fields in the payload are ignored, not stored.

**Status:** [ ] Pending

---

### US-006.3 — Spam protection with honeypot and rate limit [MVP]
**As a** sales manager, **I want to** bots blocked without annoying real buyers **so that** the lead inbox stays clean.

#### Acceptance Criteria
- [ ] Given the form, when rendered, then it includes a hidden honeypot field that is not visible, not focusable by keyboard, and ignored by screen readers; and no CAPTCHA or third-party challenge script is loaded.
- [ ] Given a submission where the honeypot field has any value, when received, then the server responds as if successful but stores no Lead and sends no email.
- [ ] Given more than 5 submissions from one IP address within 10 minutes, when a sixth arrives, then the server returns HTTP 429 with a localized "Too many requests, try later" message and stores nothing.

#### Edge Cases
- [ ] Empty/null input: a missing IP header falls back to the connection address; if none, the limit applies to a shared "unknown" bucket.
- [ ] Unauthenticated user: limits apply to all public visitors equally.
- [ ] Network failure: if the rate-limit store is unavailable, the form fails open for the visitor but logs an alert (a lead is never lost).
- [ ] Duplicate submission: rapid resubmits count against the limit once per accepted request.
- [ ] A real user behind a shared office IP can submit again once the window passes (limit resets after 10 minutes).

**Status:** [ ] Pending

---

### US-006.4 — Notification email to info@tastinofoods.com only [MVP]
**As a** sales manager, **I want to** an email for each new lead sent to info@tastinofoods.com **so that** I can respond quickly.

#### Acceptance Criteria
- [ ] Given a saved Lead, when the email job runs, then exactly one message is sent whose only recipient is info@tastinofoods.com (no cc or bcc) and which contains all submitted fields, reason, locale and timestamp.
- [ ] Given the message, when read, then the visitor's address is set as Reply-To, and the subject starts with the reason and company name.
- [ ] Given any other code path (contact form, catalogue request), when it sends internal mail, then the recipient list comes from one setting that defaults to info@tastinofoods.com and a test fails if any other address is configured.

#### Edge Cases
- [ ] Empty/null input: a lead with optional fields empty shows "—" for them and sends without error.
- [ ] Unauthenticated user: the email endpoint is internal and cannot be triggered by a public request.
- [ ] Network failure: SMTP errors are retried 3 times with backoff and the failure is recorded on the Lead (`emailStatus=failed`).
- [ ] Duplicate submission: a retried job for the same Lead never sends a second notification once `emailStatus=sent`.
- [ ] Header injection through newlines in name or subject fields is stripped.

**Status:** [ ] Pending

---

### US-006.5 — Inline success screen and visitor auto-reply [MVP]
**As a** distributor, **I want to** a clear confirmation after I submit **so that** I know my request arrived.

#### Acceptance Criteria
- [ ] Given a successful submission, when the form completes, then the form is replaced in place (no page redirect) by an animated success screen in the language of the form, showing the lead reference number (e.g. `TF-2026-0142`) and a WhatsApp fallback button.
- [ ] Given a successful submission, when processed, then one auto-reply email is sent to the visitor's address in their locale with the expected response time from settings and the company contact details; this email is separate from the internal notification.
- [ ] Given the success screen is shown, when the visitor reloads the page, then an empty form is shown, nothing is resubmitted and no lead data is displayed.

#### Edge Cases
- [ ] Empty/null input: if the expected-response-time setting is empty, the auto-reply omits that sentence rather than showing a placeholder.
- [ ] Unauthenticated user: public page; no personal data on it.
- [ ] Network failure: if the auto-reply fails, the Lead and internal notification are unaffected and the success screen still shows.
- [ ] Duplicate submission: reloading after success does not resubmit the form or send another email.

**Status:** [ ] Pending

---

### US-006.6 — Contact details panel, reason preselection and `/contact` redirect [MVP]
**As a** visitor, **I want to** contact details next to the form and the right reason preselected **so that** I can reach the right team, including catalogue requests.

#### Acceptance Criteria
- [ ] Given `/[locale]/distributors`, when loaded, then a side panel shows email info@tastinofoods.com, phone and WhatsApp +20 110 011 1887 and the factory address; and given `/[locale]/contact`, when requested, then it answers a single 301 to `/[locale]/distributors`.
- [ ] Given `/[locale]/distributors?reason=catalogue` (or `?product=[slug]`), when opened, then the matching reason tab is preselected (Product inquiry with the product field filled for `?product=`), and fields that do not apply to the reason are hidden.
- [ ] Given any reason tab, when a valid submission is sent, then the same save, email, spam and success-screen flow applies.
- [ ] Given a map is shown, when the page loads, then it is embedded for the factory address only after the visitor activates it (click to load), or replaced by a plain address link.

#### Edge Cases
- [ ] Empty/null input: switching the reason keeps entered name, email and message while hiding fields that no longer apply.
- [ ] Unauthenticated user: public.
- [ ] Network failure: if the map embed fails, the text address and an external map link remain.
- [ ] Duplicate submission: same protections as the distributor form (one request, one Lead).

**Status:** [ ] Pending

---

### US-006.7 — WhatsApp and phone links on every page [MVP]
**As a** buyer, **I want to** reach sales instantly by WhatsApp or phone **so that** I can start a conversation without a form.

#### Acceptance Criteria
- [ ] Given any public page, when rendered, then a WhatsApp button links to `https://wa.me/201100111887` with prefilled text in the current language, and a phone link uses `tel:+201100111887` while displaying "+20 110 011 1887".
- [ ] Given a brand or product page, when the WhatsApp button is used, then the prefilled text includes the brand or product name, URL-encoded.
- [ ] Given the number is stored in one setting, when it changes, then all links update and no page contains the old placeholder `+1 (555) 123-4567`.

#### Edge Cases
- [ ] Empty/null input: if the number setting is empty, the buttons are not rendered (no dead link).
- [ ] Unauthenticated user: public.
- [ ] Network failure: links are plain anchors that work without client JavaScript.
- [ ] Duplicate submission: not applicable; repeated clicks open WhatsApp each time without creating data. If analytics consent is given, one click event is sent per click.

**Status:** [ ] Pending

---

### US-006.8 — Egypt PDPL consent on all forms [MVP]
**As a** visitor, **I want to** be told how my data will be used and to agree to it **so that** I stay in control of my personal data.

#### Acceptance Criteria
- [ ] Given any lead form, when rendered, then an unticked consent checkbox is shown with localized wording that names Tastino Foods Inc, the purpose (responding to my enquiry), storage in the Tastino database, delivery to info@tastinofoods.com, and links to the Privacy page, referencing Law No. 151 of 2020.
- [ ] Given the checkbox is unticked, when submit is attempted, then submission is blocked with a localized error and the server rejects any request with `consent=false`.
- [ ] Given a saved Lead, when viewed, then it records consent true, the consent text version and the timestamp.

#### Edge Cases
- [ ] Empty/null input: a missing consent field in the payload is treated as false and rejected.
- [ ] Unauthenticated user: consent applies to all public submitters; there is no pre-ticked state.
- [ ] Network failure: the consent state is kept in the form so the visitor does not re-tick after a failed send.
- [ ] Duplicate submission: a second submission by the same visitor records its own consent entry.
- [ ] The Arabic and English wording are both approved by the client's legal contact before launch (tracked in the launch checklist).

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
