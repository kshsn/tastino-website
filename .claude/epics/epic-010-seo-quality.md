# Epic 010 — SEO and Quality

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP for US-010.1, .2, .6, .7, .8 (quality bars must hold at launch); R2 for US-010.3 (structured data), .4 (cookie consent + GA4), .5 (conversion events)
**Effort:** M

---

## Goal
Both language versions are fully indexable, analytics run only with consent, and every public page meets the performance and accessibility bars (mobile Lighthouse 85 or higher, Core Web Vitals good, WCAG 2.1 AA).

---

## Stories

### US-010.1 — Per-page metadata and hreflang alternates [MVP]
**As a** search engine and as a B2B buyer, **I want** every page to declare its language versions and metadata **so that** the right language shows in search results.

#### Acceptance Criteria
- [ ] Given any public page at `/en/...`, when the HTML is fetched, then it contains `<link rel="alternate" hreflang="en">`, `hreflang="ar"` and `hreflang="x-default"` pointing to absolute URLs on tastinofoods.com, plus a self-referencing canonical.
- [ ] Given any public page, when fetched in either language, then it has a unique title (under 60 characters) and meta description (under 160 characters) in that page's language, and `<html lang>` and `dir` match (`ar` with `rtl`).
- [ ] Given a page shared on social media, when fetched, then Open Graph title, description, URL, locale and image are present.
- [ ] Given an unpublished item (both languages are required to publish, so there are no single-language pages), when any page or the sitemap is fetched, then no hreflang or link points to it.

#### Edge Cases
- [ ] Product or brand with an empty SEO title/description: generated from the item name and summary, never blank.
- [ ] Unauthenticated visitors are the normal case: no login is needed to view metadata; `/admin/*` pages return `noindex`.
- [ ] Network failure fetching the Open Graph image: the page still renders and the tag points to the default site image.
- [ ] Duplicate content via query strings (e.g. `?brand=lora`): the canonical points to the clean URL.
- [ ] Unknown path: 404 page with `noindex`.

**Status:** [ ] Pending

---

### US-010.2 — XML sitemap and robots.txt [MVP]
**As a** search engine, **I want** a complete sitemap **so that** all published pages in both languages are discovered.

#### Acceptance Criteria
- [ ] Given `/sitemap.xml`, when fetched, then it lists every Published page, brand, product and Tastino-lines URL in both `/en` and `/ar`, each with `xhtml:link` alternates and a `lastmod` date.
- [ ] Given an item is Unpublished or Draft, when the sitemap is next requested, then its URL is absent.
- [ ] Given `/robots.txt`, when fetched on production, then it allows public pages, disallows `/admin` and `/api`, and references the sitemap; when fetched on staging, then it disallows everything.
- [ ] Given a newly published product, when the sitemap is fetched within 60 seconds, then the product is included.

#### Edge Cases
- [ ] No published products yet: the sitemap still lists the static pages and is valid XML.
- [ ] Unauthenticated: sitemap and robots are public; admin URLs never appear in them.
- [ ] Database unreachable when generating: the server returns the last good cached sitemap, or 503, never an empty 200.
- [ ] More than 50,000 URLs: the sitemap is split into an index (limit stated for future growth).
- [ ] Slug with Arabic characters or spaces: correctly URL-encoded.

**Status:** [ ] Pending

---

### US-010.3 — Organization and Product structured data [R2]
**As a** search engine, **I want** structured data **so that** the company and products appear as rich results.

#### Acceptance Criteria
- [ ] Given the homepage, when fetched, then it contains valid JSON-LD `Organization` with name, URL, logo (official SVG/PNG URL), address, `email` info@tastinofoods.com, telephone +20 110 011 1887 and only verified `sameAs` social URLs.
- [ ] Given a product page, when fetched, then it contains JSON-LD `Product` with name, description, image, brand and variants in the page's language, and no price or `offers` (prices are not published).
- [ ] Given the structured data of any page, when run through the Rich Results / schema validator, then it reports zero errors.
- [ ] Given Arabic pages, when fetched, then the JSON-LD values are in Arabic and `inLanguage` is `ar`.

#### Edge Cases
- [ ] Product without an image: the `image` property is omitted rather than empty.
- [ ] No confirmed social accounts: `sameAs` is omitted.
- [ ] Unauthenticated: public; Draft products produce no page and no JSON-LD.
- [ ] Network failure: schema is rendered on the server with the page, so it does not depend on a client request.
- [ ] Text with quotes or HTML in names: correctly escaped so the JSON stays valid.

**Status:** [ ] Pending

---

### US-010.4 — Cookie consent and consent-gated GA4 [R2]
**As a** visitor, **I want to** accept or refuse analytics cookies **so that** I control my data.

#### Acceptance Criteria
- [ ] Given a first-time visitor, when any public page loads, then a consent banner appears in the page language with Accept and Reject buttons of equal prominence, and no GA4 script is loaded and no analytics cookie is set.
- [ ] Given the visitor clicks Accept, when the choice is saved, then the GA4 script loads and its cookies are set; a page view is sent.
- [ ] Given the visitor clicks Reject, when the choice is saved, then GA4 never loads on any page and no analytics cookie exists.
- [ ] Given a stored choice, when the visitor returns, then the banner does not reappear, and a footer "Cookie settings" link lets them change it; withdrawing consent stops tracking immediately.

#### Edge Cases
- [ ] The GA4 measurement ID setting is empty: the banner is not shown and nothing is loaded.
- [ ] Visitor has Do Not Track or blocks scripts: the site works fully with no console errors.
- [ ] Network failure loading the GA4 script: the page works, with no visible error or broken layout.
- [ ] Double-click on Accept: one consent record, no duplicated page views.
- [ ] Banner on an Arabic page: right-to-left, keyboard-operable, and does not cover the WhatsApp or main CTA permanently.
- [ ] Legal text for the cookie notice is empty: Privacy page link is shown and the build is flagged (legal text is required before launch).

**Status:** [ ] Pending

---

### US-010.5 — Conversion events: form submit, WhatsApp click, phone click [R2]
**As a** marketing manager, **I want** conversions measured **so that** I can see which pages generate leads.

#### Acceptance Criteria
- [ ] Given consent was accepted, when a visitor successfully submits the distributors form (any reason), then one `generate_lead` event is sent with parameters for reason and language, and no personal data (name, email, phone).
- [ ] Given consent was accepted, when a visitor clicks any WhatsApp link, then one `whatsapp_click` event is sent with the page and placement.
- [ ] Given consent was accepted, when a visitor clicks any `tel:` link, then one `phone_click` event is sent.
- [ ] Given consent was not given or was rejected, when any of these actions occur, then no event is sent and the action itself (submit, link) still works.

#### Edge Cases
- [ ] Form submit fails validation or is rejected as spam: no `generate_lead` event.
- [ ] Unauthenticated visitors only; admin pages never load GA4.
- [ ] Network failure sending the event: the user action is not blocked or delayed.
- [ ] Double-click on the WhatsApp link: events are de-duplicated within 1 second.
- [ ] Reload after the success screen: does not fire a second `generate_lead`.

**Status:** [ ] Pending

---

### US-010.6 — Performance budget: mobile Lighthouse 85+ and good Core Web Vitals [MVP]
**As a** visitor on a mobile connection, **I want** pages to load and respond quickly **so that** I can reach the content and the contact options.

#### Acceptance Criteria
- [ ] Given the homepage, brand page, product page, distributors page and about page, when each is measured with Lighthouse mobile (simulated slow 4G, in both `/en` and `/ar`), then the performance score is 85 or higher on every one.
- [ ] Given field or lab measurement, when each page is measured, then LCP is at most 2.5 s, INP at most 200 ms and CLS at most 0.1.
- [ ] Given animation code, when the homepage first loads, then animation libraries load after the hero content is displayed, and the hero image is preloaded in AVIF/WebP at the right size.
- [ ] Given a visitor with `prefers-reduced-motion: reduce`, when any page loads, then motion is off and the scores are not lower.

#### Edge Cases
- [ ] Product with an oversized or missing image: derivatives from the media pipeline are used, or the placeholder; no layout shift (width and height are reserved).
- [ ] Unauthenticated is the tested case; admin pages are excluded from the budget.
- [ ] Throttled or failing network: content text shows before images, and a failed image shows its reserved box with alt text.
- [ ] Score regressions: the measurement is repeated 3 times and the median is used so a single noisy run does not fail or pass the story.
- [ ] Arabic web font failing to load: fallback font shows without layout shift (font-display swap with size-adjusted fallback).

**Status:** [ ] Pending

---

### US-010.7 — Accessibility to WCAG 2.1 AA [MVP]
**As a** visitor using a keyboard or screen reader, **I want** every public page to be accessible **so that** I can use the whole site.

#### Acceptance Criteria
- [ ] Given every public page in `/en` and `/ar`, when scanned with axe-core, then there are zero serious or critical violations.
- [ ] Given a keyboard-only user, when they tab through any page, then focus order is logical and in the reading direction (right-to-left in Arabic), focus is always visible, and the language switch, forms, carousels and consent banner are all operable without a mouse.
- [ ] Given body text and controls on every brand accent background, when contrast is measured, then it is at least 4.5:1 for text (3:1 for large text and UI components).
- [ ] Given form fields, when a screen reader reads them, then each has a programmatic label, errors are announced and linked to the field, and images carry alt text in the page language.

#### Edge Cases
- [ ] Image with empty alt (decorative): marked `alt=""`; informative images with empty alt fail the check.
- [ ] Unauthenticated: public pages are the scope; admin pages get the same axe scan as a secondary check.
- [ ] Auto-cycling brand showcase: can be paused, and stops at reduced-motion.
- [ ] Zoom to 200% and text spacing changes: no content is cut off or overlapping on a 320 px viewport.
- [ ] Duplicate IDs or a missing `lang` change on mixed EN/AR text: flagged by the scan and fixed.

**Status:** [ ] Pending

---

### US-010.8 — Browser, device and console-error pass [MVP]
**As a** product owner, **I want** the site verified on the agreed browsers and devices **so that** launch has no visible defects.

#### Acceptance Criteria
- [ ] Given the latest two versions of Chrome, Edge, Safari and Firefox and current plus one prior iOS and Android, when the main flows (home, brand, product, distributor form, contact, language switch) are exercised, then they complete with no layout break, in both languages.
- [ ] Given the main pages, when loaded with the console open, then there are zero console errors and zero failed network requests (404/500) for same-origin assets.
- [ ] Given the viewport widths 320, 375, 768, 1024 and 1440 px in Arabic RTL, when pages are checked, then there is no horizontal scrolling and no overlapping elements.
- [ ] Given all internal and external links, when a link checker runs, then there are zero dead links (social links appear only if confirmed).

#### Edge Cases
- [ ] JavaScript disabled: the content and navigation remain readable (server-rendered), and the form shows a notice that JavaScript is needed to submit.
- [ ] Unauthenticated: all checks run signed out.
- [ ] Offline or lost connection while navigating: the browser's standard error appears, and returning online restores normal use without a stuck state.
- [ ] Form submitted twice from a slow mobile connection: one lead only (idempotent submission).
- [ ] Browser outside the list (older version): content remains readable, nothing blocks the contact options.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
