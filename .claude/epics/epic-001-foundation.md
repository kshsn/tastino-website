# Epic 001 — Foundation

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP · **Effort:** M

---

## Goal
Deliver a running, deployable Next.js shell where every page exists in `/en` and `/ar`, renders correctly right-to-left in Arabic, and carries the official logo, header, footer and design tokens from the approved mockup.

---

## Stories

### US-001.1 — Project scaffold and quality gates [MVP]
**As a** developer, **I want to** a Next.js 16 + React 19 + TypeScript + Tailwind 4 project (versions pinned per `tech-stack.md`) with lint, type-check and test scripts **so that** every later epic is built on a verified, reproducible base.

#### Acceptance Criteria
- [ ] Given a fresh clone, when `npm install` and `npm run build` run, then the build exits with code 0 and no TypeScript errors.
- [ ] Given the repo, when `tsc --noEmit` and `eslint .` run, then both exit with code 0.
- [ ] Given the repo, when `.env` exists locally, then it is listed in `.gitignore` and a documented `.env.example` lists every required variable name with no values.

#### Edge Cases
- [ ] Empty/null input: a required env variable is missing at startup, so the app fails fast with an error naming the variable instead of starting.
- [ ] Unauthenticated user: `/admin/*` routes return a redirect to the login route (stub) and never render admin content.
- [ ] Network failure: the build does not depend on live network calls to Google Fonts (fonts are self-hosted or fetched at build with a local fallback).
- [ ] Duplicate submission: running the Prisma migrate and seed commands twice leaves the database unchanged the second time.

**Status:** [ ] Pending

---

### US-001.2 — Design tokens and typography from the approved mockup [MVP]
**As a** visitor, **I want to** a consistent look that matches the approved design **so that** the site feels like one credible brand.

#### Acceptance Criteria
- [ ] Given the Tailwind config, when inspected, then it defines the mockup tokens: background `#FFFBF5`, ink `#14213D`, blue `#1E6FD9`, green `#3FA34D`, and per-brand accents Lora `#E23B3B`, Liora `#C8102E`, Andiamo `#D62828`, TAMA `#2F8F3A`, Freshness `#0F6B3E`.
- [ ] Given an English page, when rendered, then body text uses Plus Jakarta Sans; given an Arabic page, then body text uses Cairo.
- [ ] Given any component, when it positions content horizontally, then it uses logical properties (`ps/pe/ms/me`, `start/end`) rather than `left/right`.

#### Edge Cases
- [ ] Empty/null input: a missing font file falls back to the system sans-serif stack without layout shift above 0.1 CLS.
- [ ] Unauthenticated user: tokens and fonts load identically for signed-out visitors (no auth dependency).
- [ ] Network failure: fonts are served from the same origin, so a blocked third-party font host does not change typography.
- [ ] Duplicate submission: not applicable; token file has a single source of truth and no duplicate color definitions (verified by a lint or test check).

**Status:** [ ] Pending

---

### US-001.3 — Locale routing with `/en` and `/ar` and auto-detection [MVP]
**As a** visitor, **I want to** be sent to my language automatically and see it in the URL **so that** I read the site in Arabic or English without effort and can share a link in that language.

#### Acceptance Criteria
- [ ] Given a first-time visitor whose `Accept-Language` starts with `ar`, when they open `/`, then they receive a redirect to `/ar`.
- [ ] Given a first-time visitor whose `Accept-Language` does not include `ar`, when they open `/`, then they receive a redirect to `/en`.
- [ ] Given a visitor who previously chose a language, when they open `/`, then the stored choice (cookie) overrides browser detection.
- [ ] Given any public route, when opened with `/en/...` or `/ar/...`, then it renders in that language with `<html lang>` set to `en` or `ar`.

#### Edge Cases
- [ ] Empty/null input: a request with no `Accept-Language` header redirects to `/en`.
- [ ] Unauthenticated user: locale routing applies to public pages without any login and `/admin` is excluded from locale prefixing.
- [ ] Network failure: detection runs only on request headers and cookie, with no external geo-IP call, so it works offline.
- [ ] Duplicate submission: an unsupported prefix such as `/fr/about` returns a redirect to the detected supported locale, not a 500 or a redirect loop.

**Status:** [ ] Pending

---

### US-001.4 — RTL layout and visible language switch [MVP]
**As an** Arabic-speaking visitor, **I want to** a fully mirrored layout and a language switch on every page **so that** the site reads naturally and I can change language at any point.

#### Acceptance Criteria
- [ ] Given an `/ar` page, when rendered, then `<html dir="rtl">` is set and the header, grids, cards, arrows and buttons are mirrored.
- [ ] Given any page in either language, when the language switch is activated, then the visitor lands on the same page in the other locale (e.g. `/en/brands/tama` to `/ar/brands/tama`) and the choice is stored in a cookie.
- [ ] Given a 375px-wide viewport on `/ar`, when any page loads, then there is no horizontal scrollbar.
- [ ] Given the `/ar` page head, when inspected, then it contains an `hreflang` alternate link to the `/en` equivalent and vice versa.

#### Edge Cases
- [ ] Empty/null input: an item without Arabic content is never published (no English fallback), so no `/ar` page shows English body text; the shared chrome always renders `dir="rtl"`.
- [ ] Unauthenticated user: the switch works for signed-out visitors and keeps the query string where present.
- [ ] Network failure: the switch is a plain link (works without JavaScript hydration).
- [ ] Duplicate submission: clicking the switch repeatedly does not stack redirects or create history entries beyond one per switch.
- [ ] Mixed-direction text: Latin brand names and the phone number `+20 110 011 1887` render in correct order inside Arabic sentences.

**Status:** [ ] Pending

---

### US-001.5 — Header with the official logo and navigation [MVP]
**As a** visitor, **I want to** a clear header with the Tastino logo and main navigation **so that** I can reach any section from any page.

#### Acceptance Criteria
- [ ] Given any page, when the header renders, then it shows the SVG from `.claude/source/logo/tastino-logo.svg` byte-for-byte unmodified (the repo copy matches the source file hash) and links to the locale home.
- [ ] Given the header, when rendered, then it lists Home, About, Brands, Products, Quality, Innovation, Distributors and Contact, each linking to the page in the current locale.
- [ ] Given a viewport under 768px, when the menu button is activated, then a full navigation panel opens, is keyboard operable, closes on Escape and returns focus to the button.
- [ ] Given a scroll offset over 8px, when the page scrolls, then the header becomes sticky with a bottom border as in the mockup.

#### Edge Cases
- [ ] Empty/null input: the logo has a non-empty accessible name ("Tastino Foods") and no code recolors, crops or redraws it.
- [ ] Unauthenticated user: no admin link is shown to public visitors.
- [ ] Network failure: the logo is served locally and renders with no external request.
- [ ] Duplicate submission: double-tapping the mobile menu button leaves the menu in a consistent open or closed state.

**Status:** [ ] Pending

---

### US-001.6 — Footer with verified contact details and legal links [MVP]
**As a** visitor, **I want to** real company contact details and legal links in the footer **so that** I can trust the company and reach it.

#### Acceptance Criteria
- [ ] Given any page, when the footer renders, then it shows info@tastinofoods.com (mailto link), `+20 110 011 1887` (tel link), a WhatsApp link to `https://wa.me/201100111887`, and the address "Industrial City, 10th of Ramadan, C5, Building No. 21" (Arabic version in `/ar`).
- [ ] Given any page, when the footer renders, then it links to Privacy and Terms in the current locale and the page source contains no `+1 (555) 123-4567` placeholder.
- [ ] Given social accounts are not yet confirmed, when the footer renders, then no social icon or link is shown; once confirmed handles are set in settings, only those links are shown.

#### Edge Cases
- [ ] Empty/null input: a social setting with an empty URL renders nothing (no dead `#` link).
- [ ] Unauthenticated user: the footer is identical for signed-out visitors and contains no admin data.
- [ ] Network failure: contact details are rendered server-side from settings and appear without client JavaScript.
- [ ] Duplicate submission: not applicable to a read-only footer; a link-check test confirms zero broken internal links.

**Status:** [ ] Pending

---

### US-001.7 — Global reduced-motion and animation foundation [MVP]
**As a** visitor sensitive to motion, **I want to** animations to switch off when my device asks **so that** the site stays comfortable and readable.

#### Acceptance Criteria
- [ ] Given `prefers-reduced-motion: reduce`, when any page loads, then no looping, parallax, bobbing, marquee or count-up animation runs and content appears in its final state immediately.
- [ ] Given `prefers-reduced-motion: no-preference`, when a page loads, then the animation provider enables motion and is loaded lazily (not part of the initial critical bundle).
- [ ] Given a component using motion, when RTL is active, then directional transforms (slides, arrows, marquee) are mirrored.

#### Edge Cases
- [ ] Empty/null input: if the media query is unavailable, the default is reduced motion (safe state).
- [ ] Unauthenticated user: motion preference handling is identical for all visitors and needs no account.
- [ ] Network failure: if the lazy animation chunk fails to load, all content is still visible and readable without animation.
- [ ] Duplicate submission: toggling the OS setting while the page is open updates behavior without a reload and without double-registered listeners.

**Status:** [ ] Pending

---

### US-001.8 — Localized 404 and error pages [MVP]
**As a** visitor, **I want to** a helpful page when a link is wrong or the site errors **so that** I can get back on track.

#### Acceptance Criteria
- [ ] Given a non-existent URL under `/en` or `/ar`, when requested, then an HTTP 404 is returned with a page in that language containing links to Home and Contact.
- [ ] Given an unhandled server error on a public page, when it occurs, then a localized error page with a retry action is shown and no stack trace or internal path is displayed.
- [ ] Given an unpublished product or brand slug, when requested publicly, then the response is 404, not the draft content.

#### Edge Cases
- [ ] Empty/null input: a URL with an empty slug (`/en/products/`) redirects to the listing, not a 404.
- [ ] Unauthenticated user: requesting `/admin/anything` without a session redirects to login rather than showing 404 detail.
- [ ] Network failure: the error page has no dependency on the database or API to render.
- [ ] Duplicate submission: retrying the error page action does not repeat any non-idempotent action.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
