# Epic 005 — Company Pages

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP (basic pages) / R2 (polish)  · **Effort:** S

---

## Goal
Publish About, Quality, Innovation, Privacy and Terms pages in both languages using only the official copy, so buyers can judge Tastino's credibility and legal basis. About, Quality and Innovation stay **separate pages** (`/about`, `/quality`, `/innovation`) built on the approved `design/mockup/about.html` design. Its sticky tab bar (Our story, Food safety, Innovation, Certifications) links between the three pages, and Certifications is a section of `/quality`.

---

## Stories

### US-005.1 — About page [MVP]
**As a** B2B visitor, **I want to** read who Tastino is **so that** I can judge whether to partner with it.

#### Acceptance Criteria
- [ ] Given `/[locale]/about`, when loaded, then it shows the official "Crafted with Care. Inspired by Nature." copy (modern facility, hygiene and sanitation, team training) and the address and phone from settings.
- [ ] Given the page, when its text is searched, then it contains none of the removed boilerplate ("Keurig", "$1 billion", "200 countries").
- [ ] Given the page, when rendered, then it includes a CTA to `/distributors` and sets a unique localized `<title>` and meta description.

#### Edge Cases
- [ ] Empty/null input: if the Arabic block is empty, the block stays Draft, its section is omitted (no English fallback) and an admin warning is logged.
- [ ] Unauthenticated user: public page; no gated content.
- [ ] Network failure: the page is pre-built and served even if the database is down.
- [ ] Duplicate submission: not applicable; a read page. Facts not yet supplied (founding year, headcount, leadership) are not shown rather than invented.

**Status:** [ ] Pending

---

### US-005.2 — Quality page with certifications section [MVP]
**As a** B2B buyer, **I want to** understand Tastino's food safety approach **so that** I can trust the supply.

#### Acceptance Criteria
- [ ] Given `/[locale]/quality`, when loaded, then it shows the official "Food Safety Comes First" copy covering sanitation, process monitoring, filling, packaging and delivery.
- [ ] Given no certificates have been uploaded, when the page renders, then the Certifications section is hidden (no empty heading, no "Coming soon" claim of certification).
- [ ] Given the page, when read, then no certification name (ISO, HACCP, halal) appears unless a certificate record exists.

#### Edge Cases
- [ ] Empty/null input: a certificate record without a title or file is not displayed.
- [ ] Unauthenticated user: public; certificate files are readable by anyone once published.
- [ ] Network failure: the text is available without loading certificate files.
- [ ] Duplicate submission: not applicable; the same certificate uploaded twice shows once (dedupe by file hash).

**Status:** [ ] Pending

---

### US-005.3 — Innovation page [MVP]
**As a** B2B visitor, **I want to** see how Tastino develops its products **so that** I see value beyond price.

#### Acceptance Criteria
- [ ] Given `/[locale]/innovation`, when loaded, then it shows the official "Innovation in Every Taste" copy and the "Brand Excellence" copy in the current language.
- [ ] Given the page, when rendered, then it links to `/products` and `/distributors`.
- [ ] Given the page, when read, then the value statement appears only as in the official copy, with no price number or unsubstantiated percentage added.

#### Edge Cases
- [ ] Empty/null input: unpublished blocks are omitted without leaving empty sections.
- [ ] Unauthenticated user: public.
- [ ] Network failure: pre-built page served.
- [ ] Duplicate submission: not applicable; read page.

**Status:** [ ] Pending

---

### US-005.4 — Privacy policy page with Egypt PDPL wording [MVP]
**As a** visitor submitting a form, **I want to** read how my data is used **so that** I can give informed consent.

#### Acceptance Criteria
- [ ] Given `/[locale]/privacy`, when loaded, then it states what is collected (name, email, phone, company, country, message), why, that it is stored in the Tastino database and emailed to info@tastinofoods.com, the retention period (24 months), and how to request access or deletion, referencing Egypt's Personal Data Protection Law No. 151 of 2020.
- [ ] Given the page, when the text is the draft, then a visible internal flag prevents the production launch checklist from passing until the client's legal contact approves the text.
- [ ] Given a lead form, when rendered, then its consent text links to this page in the current locale.

#### Edge Cases
- [ ] Empty/null input: if the legal text is not yet supplied, the page shows the clearly marked draft, and the launch gate fails.
- [ ] Unauthenticated user: public.
- [ ] Network failure: the page is static and available when the database is unavailable.
- [ ] Duplicate submission: not applicable; a read page. Version date is shown so text changes are traceable.

**Status:** [ ] Pending

---

### US-005.5 — Terms of use page [MVP]
**As a** visitor, **I want to** read the site's terms **so that** I know the rules for using it.

#### Acceptance Criteria
- [ ] Given `/[locale]/terms`, when loaded, then it shows the short terms text in the current language and a last-updated date.
- [ ] Given the footer, when any page renders, then Terms and Privacy links are present and resolve with HTTP 200.
- [ ] Given a draft terms text, when the launch checklist runs, then it fails until client legal approval is recorded.

#### Edge Cases
- [ ] Empty/null input: with no Arabic text, the Terms page cannot be published and the launch checklist fails (no English fallback).
- [ ] Unauthenticated user: public.
- [ ] Network failure: static page served.
- [ ] Duplicate submission: not applicable; read page.

**Status:** [ ] Pending

---

### US-005.6 — Certificate gallery with uploaded files [R2]
**As a** B2B buyer, **I want to** view and download Tastino's certificates **so that** I can verify quality claims.

#### Acceptance Criteria
- [ ] Given a published certificate (title EN/AR, issuer, expiry, PDF or image), when `/quality` renders, then it appears in the Certifications section with a view/download link.
- [ ] Given a certificate whose expiry date has passed, when the page renders, then it is not displayed publicly and is flagged in the admin.
- [ ] Given a PDF link, when activated, then it opens in a new tab with the correct localized file name.

#### Edge Cases
- [ ] Empty/null input: a certificate with no file is rejected on save.
- [ ] Unauthenticated user: certificates are public after publish; unpublished files return 404.
- [ ] Network failure: a failed download shows the browser error and the page stays usable.
- [ ] Duplicate submission: the same file uploaded twice produces one entry.

**Status:** [ ] Pending

---

### US-005.7 — Factory and team photo gallery and content polish [R2]
**As a** B2B visitor, **I want to** see the facility and team **so that** I trust that the company is real and capable.

#### Acceptance Criteria
- [ ] Given at least 5 factory photos uploaded, when `/about` or `/quality` renders, then a lazy-loaded gallery of them shows with localized alt text.
- [ ] Given fewer than 5 photos exist, when the page renders, then the gallery is hidden and no stock or AI-generated factory image is used in its place.
- [ ] Given the extended Arabic copy supplied by the client, when saved, then `/ar` shows the extended text in place of the official short version.

#### Edge Cases
- [ ] Empty/null input: a photo without alt text in both languages cannot be published.
- [ ] Unauthenticated user: public gallery; upload endpoints need an admin session.
- [ ] Network failure: a failed image shows the placeholder and the layout stays stable.
- [ ] Duplicate submission: the same photo uploaded twice shows once.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
