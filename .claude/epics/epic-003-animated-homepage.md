# Epic 003 — Animated Homepage

**Status:** Complete (PR open, awaiting review)
**Phase:** 7 — Build
**Release:** MVP · **Effort:** L

---

## Goal
Build the homepage exactly as the approved mockup (`.claude/design/mockup/index.html`), with every section and animation, in English and Arabic, while meeting reduced-motion and a mobile Lighthouse performance score of 85 or higher.

---

## Stories

### US-003.1 — Hero showcase with floating packshots and per-brand color [MVP]
**As a** B2B visitor, **I want to** see Tastino's brands in the first screen **so that** I understand what the company makes within seconds.

#### Acceptance Criteria
- [ ] Given the homepage loads, when the first screen renders, then it shows the headline, lead text, a primary CTA ("Explore our brands"), a secondary CTA ("Request catalogue"), as in the approved mockup (the header keeps "Become a Distributor"), and a bobbing packshot, all in the current language.
- [ ] Given the hero is visible, when 8 seconds pass without interaction (the old website's pace; it was 4 seconds in the first version), then the showcase advances to the next brand, the packshot swaps with the in/out animation, and the blob, highlight and chip colors change to that brand's accent.
- [ ] Given the dots control, when a dot is activated by click or keyboard, then the showcase jumps to that brand and the auto-cycle restarts its timer.
- [ ] Given hero content is managed as HeroSlide records, when 3 published slides exist, then exactly those 3 are cycled in their `sortOrder`.

#### Edge Cases
- [ ] Empty/null input: with zero published slides, the hero shows the static headline and CTAs with the Tastino lineup image, not an empty area.
- [ ] Unauthenticated user: the hero is fully public; no personalised content.
- [ ] Network failure: if a packshot fails to load, the placeholder shows and the cycle continues without error.
- [ ] Duplicate submission: rapid clicks on dots never leave two packshots on screen or two running timers.
- [ ] Arabic: with `dir="rtl"`, the stage, chips and dots mirror and the headline has no letter-spacing.

**Status:** [x] Complete

---

### US-003.2 — Value strip and count-up numbers [MVP]
**As a** B2B visitor, **I want to** a quick 4-point summary with figures **so that** I can judge Tastino's strengths at a glance.

#### Acceptance Criteria
- [ ] Given the strip scrolls into view, when it first becomes 30% visible, then four feature items (Food Safety First, Natural Ingredients, Modern Facility, Partner Ready, as in the approved mockup) appear with a staggered reveal, taking the text from the official copy.
- [ ] Given a stat block, when it enters view, then each number counts from 0 to its final value in at most 2 seconds and ends exactly on the stored value.
- [ ] Given the stat values, when rendered, then each comes from data that can be verified from the database (count of brands, count of published products, number of packaging formats = 3), and no invented figures such as years in business or export countries are shown.

#### Edge Cases
- [ ] Empty/null input: a stat with no value is hidden rather than shown as 0.
- [ ] Unauthenticated user: stats are public and computed server-side with no private data.
- [ ] Network failure: the final number is present in the server-rendered HTML, so it shows even if the count-up script never runs.
- [ ] Duplicate submission: scrolling in and out repeatedly runs the count-up only once.
- [ ] Reduced motion: numbers appear at their final value instantly.

**Status:** [x] Complete

---

### US-003.3 — About and scroll-reveal sections [MVP]
**As a** B2B visitor, **I want to** read Tastino's story in sections that reveal as I scroll **so that** the page feels alive without slowing me down.

#### Acceptance Criteria
- [ ] Given the About section, when rendered, then its text equals the published About PageBlock in the current language (official copy, no third-party boilerplate).
- [ ] Given a section or card group, when it enters the viewport, then children appear with a staggered fade-and-rise of at most 80ms between items and 600ms each.
- [ ] Given content below the fold, when JavaScript is disabled, then all text is still visible in the page.

#### Edge Cases
- [ ] Empty/null input: a block without Arabic text is never published, so its section is omitted in both languages and nothing crashes (no English fallback).
- [ ] Unauthenticated user: only published blocks are shown.
- [ ] Network failure: reveal animation never hides content permanently; elements default to visible if the observer script fails.
- [ ] Duplicate submission: re-entering the viewport does not replay or double-apply the transform.
- [ ] Reading is never delayed: text is in the DOM at first paint and the reveal runs after first contentful paint.

**Status:** [x] Complete

---

### US-003.4 — Brand cards with hover lift and tilt [MVP]
**As a** B2B visitor, **I want to** brand cards that I can open **so that** I can go straight to Lora, Liora, Andiamo, TAMA or the Tastino lines.

#### Acceptance Criteria
- [ ] Given the Brands section, when rendered, then it shows cards for Lora (jams), Liora (tomato), Andiamo (sauces and tahini) and TAMA (juices) with accent color, category label and packshot, plus one "Tastino lines" card (Freshness, traditional beverages, THE LEAF) that links to `/products/tastino-lines`.
- [ ] Given a brand card, when hovered or focused, then the packshot lifts and tilts and the card shadow uses the brand color; the card is a single link to `/[locale]/brands/[slug]`.
- [ ] Given a touch device, when a card is tapped, then it navigates directly with no hover requirement.

#### Edge Cases
- [ ] Empty/null input: a brand with no packshot shows the placeholder, and the card remains clickable.
- [ ] Unauthenticated user: only brands with status Live are listed; Hidden brands never appear.
- [ ] Network failure: card text and links render from server HTML without client JS.
- [ ] Duplicate submission: double-clicking a card produces one navigation.
- [ ] No "Freshness", "THE LEAF" or traditional beverages brand page link exists anywhere on the card set.

**Status:** [x] Complete

---

### US-003.5 — Infinite product strip [MVP]
**As a** B2B visitor, **I want to** a moving strip of product packshots **so that** I see the breadth of the range.

#### Acceptance Criteria
- [ ] Given the strip, when rendered, then it loops continuously with no visible jump and pauses on hover and on keyboard focus.
- [ ] Given `/ar`, when the strip runs, then it scrolls in the opposite direction (RTL mirrored) as in the mockup.
- [ ] Given each image in the strip, when inspected, then it is lazy-loaded, has a localized `alt`, and links to its product page or is decorative with `aria-hidden` on the duplicate set.

#### Edge Cases
- [ ] Empty/null input: with fewer than 4 published products, the strip is not rendered.
- [ ] Unauthenticated user: strip content is public and only lists published products.
- [ ] Network failure: failed images are removed from the strip or replaced by the placeholder without breaking the loop.
- [ ] Duplicate submission: not applicable; the duplicated set used for looping is hidden from screen readers so products are announced once.
- [ ] Reduced motion: the strip is static and horizontally scrollable by touch or keyboard.

**Status:** [x] Complete

---

### US-003.6 — Food Safety band, Innovation and Portfolio shelf [MVP]
**As a** B2B visitor, **I want to** see the quality, innovation and range messages **so that** I trust Tastino as a supplier.

#### Acceptance Criteria
- [ ] Given the Food Safety band, when rendered, then it uses the official "Food Safety Comes First" copy with a link to `/quality`, and its background image shifts with scroll by at most 40px.
- [ ] Given the Innovation block, when rendered, then it uses the official "Innovation in Every Taste" copy with a link to `/innovation`.
- [ ] Given the Portfolio shelf, when rendered, then it shows the six Andiamo bottles as separate images that rise in one by one (about 110ms stagger) and lift with a name label on hover, as in the approved mockup, and the "A Diverse Product Portfolio" copy, mentioning glass, PET and metal packaging, with a link to `/products`.
- [ ] Given the homepage, when read in full, then no claim appears (certification, sustainability, "competitive pricing" as a number) that lacks documented substantiation; the official phrase on value is shown only as written in the copy file.

#### Edge Cases
- [ ] Empty/null input: if a block is unpublished, its section is omitted without leaving an empty band.
- [ ] Unauthenticated user: not applicable; all content is public.
- [ ] Network failure: the shelf image falls back to the placeholder; text remains.
- [ ] Duplicate submission: not applicable; links are plain anchors and a repeated click only navigates once.
- [ ] Reduced motion: parallax is disabled and the image is static.

**Status:** [x] Complete

---

### US-003.7 — Partnership call to action band [MVP]
**As a** distributor, **I want to** a clear next step at the bottom of the home page **so that** I can start a partnership conversation.

#### Acceptance Criteria
- [ ] Given the CTA band, when rendered, then it shows the "Let's Build a Successful Partnership" headline, a button to `/[locale]/distributors`, and a WhatsApp button to `https://wa.me/201100111887`.
- [ ] Given the band, when rendered, then the animated gradient background runs at 10s per loop and is static under reduced motion.
- [ ] Given a WhatsApp click, when activated on mobile, then it opens in a new tab with `rel="noopener noreferrer"`.

#### Edge Cases
- [ ] Empty/null input: if the WhatsApp number setting is empty, the WhatsApp button is hidden and the form button remains.
- [ ] Unauthenticated user: public; no login needed.
- [ ] Network failure: both buttons are plain links that work offline-to-online without client JS.
- [ ] Duplicate submission: not applicable to links; repeated clicks open one tab each with no data created.
- [ ] Arabic: button arrows mirror and the phone number reads left-to-right inside the Arabic text.

**Status:** [x] Complete

---

### US-003.8 — Page transitions and homepage performance budget [MVP]
**As a** mobile visitor, **I want to** smooth navigation that never feels slow **so that** the animation adds polish without cost.

#### Acceptance Criteria
- [ ] Given navigation between two internal pages, when a link is activated, then a fade/slide transition of at most 300ms runs and the new page's content is readable at the end of it.
- [ ] Given the deployed homepage, when Lighthouse runs with the mobile preset (throttled), then Performance is 85 or higher, CLS is 0.1 or lower and LCP is 2.5 s or lower, in both `/en` and `/ar`.
- [ ] Given the Lighthouse run, when completed, then the browser console shows zero errors on `/en` and `/ar`.

#### Edge Cases
- [ ] Empty/null input: navigating to a route that fails to load shows the localized error page, not a blank transition.
- [ ] Unauthenticated user: transitions also apply to public pages and do not reveal admin routes.
- [ ] Network failure: if the target page loads slowly, the old page remains until content arrives, then transitions, with no frozen overlay longer than 10 seconds.
- [ ] Duplicate submission: clicking two links quickly cancels the first transition and completes only the second.
- [ ] Reduced motion: navigation is instant with no transition.

**Status:** [x] Complete

---

## Epic Checklist
- [x] All stories marked complete
- [x] Type check passing (`tsc --noEmit`)
- [x] Linter passing (`eslint .`)
- [x] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
