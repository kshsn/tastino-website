# Epic 004 — Brands and Products

**Status:** Complete (PR open, awaiting review)
**Phase:** 7 — Build
**Release:** MVP · **Effort:** L

---

## Goal
Let visitors browse every brand, filter and find any product, and read its details in English or Arabic, with the right brand architecture, 400g standard size and correct spelling.

---

## Stories

### US-004.1 — Brands index page [MVP]
**As a** B2B visitor, **I want to** a page listing all brands **so that** I can choose which to explore.

#### Acceptance Criteria
- [ ] Given `/en/brands` or `/ar/brands`, when loaded, then it lists Lora, Liora, Andiamo and TAMA, each with name, category, accent color, packshot and a link to its page.
- [ ] Given the page, when rendered, then a separate "Tastino lines" block names Freshness syrups, traditional beverages and THE LEAF and links to `/products/tastino-lines`, without a brand page link for any of the three.
- [ ] Given a brand status of Coming Soon, when the index renders, then its card shows a "Coming soon" badge and no product count; given Hidden, then it is not listed.

#### Edge Cases
- [ ] Empty/null input: with no published brands, the page shows a localized "No brands yet" message with a Contact link.
- [ ] Unauthenticated user: page is public; draft and hidden brands are never returned.
- [ ] Network failure: a database error returns the localized error page, not a partial list.
- [ ] Duplicate submission: not applicable; opening the page twice yields the same order (sorted by `sortOrder`).

**Status:** [x] Complete

---

### US-004.2 — Brand pages for Lora, Liora, Andiamo and TAMA [MVP]
**As a** B2B visitor, **I want to** a page per brand **so that** I can see its range and ask to carry it.

#### Acceptance Criteria
- [ ] Given `/[locale]/brands/lora`, when loaded, then it shows only jams (strawberry, mixed berry, fig, apricot, peach, mango, orange marmalade, guava, blueberry) in 400g (standard) and 650g, and no tomato products.
- [ ] Given `/[locale]/brands/liora`, when loaded, then it shows tomato products (paste in glass 285/300/320g and tin 400g/800g/1kg/3kg, plus ketchup if assigned) and no jams.
- [ ] Given `/[locale]/brands/andiamo` and `/[locale]/brands/tama`, when loaded, then Andiamo shows sauces, tahini and hot sauce and TAMA shows juices and nectars, each with accent color, brand intro, product grid and a "Become a Distributor" CTA.
- [ ] Given a request for `/brands/freshness`, `/brands/the-leaf` or any non-brand slug, when requested, then the response is HTTP 404.

#### Edge Cases
- [ ] Empty/null input: a brand with no published products shows a "Range coming soon" message and the CTA, not an empty grid.
- [ ] Unauthenticated user: public; unpublished products are omitted.
- [ ] Network failure: the page is statically generated and revalidated on content change, so a database outage serves the last good version.
- [ ] Duplicate submission: not applicable; slug lookups are case-insensitive and redirect `/brands/Lora` to `/brands/lora`.

**Status:** [x] Complete

---

### US-004.3 — Product listing with filters [MVP]
**As a** B2B visitor, **I want to** filter products by brand, category and pack type **so that** I can quickly find what suits my business.

#### Acceptance Criteria
- [ ] Given `/[locale]/products`, when loaded, then all published products appear as cards (image or placeholder, localized name, brand tag, available sizes).
- [ ] Given the filters, when I choose brand "TAMA" and pack type "PET", then only matching products show, the URL updates with query parameters (e.g. `?brand=tama&pack=pet`) and reloading the URL reproduces the result.
- [ ] Given active filters, when no product matches, then a localized "No products match" message appears with a "Clear filters" action that restores the full list.
- [ ] Given the filter controls, when used by keyboard, then every control is reachable and the result count is announced in an `aria-live` region.

#### Edge Cases
- [ ] Empty/null input: an empty or unknown filter value in the URL is ignored and the full list shows.
- [ ] Unauthenticated user: public; only published products are returned.
- [ ] Network failure: filtering via URL parameters works server-side, so it still functions if client JavaScript fails.
- [ ] Duplicate submission: changing filters rapidly shows only the last result (earlier requests are cancelled).
- [ ] Tastino-line products (Freshness, traditional beverages, THE LEAF) appear in the listing with the "Tastino" tag instead of a brand.

**Status:** [x] Complete

---

### US-004.4 — Product detail page [MVP]
**As a** B2B buyer, **I want to** a detail page for each product **so that** I can check sizes, packaging and information before enquiring.

#### Acceptance Criteria
- [ ] Given `/[locale]/products/[slug]`, when loaded, then it shows localized name, brand (linked) or Tastino line, category, description, image or placeholder, and a table of variants (size, unit, pack type).
- [ ] Given a jam or sauce product, when variants are listed, then the standard size shown is 400g and no 360g, 370g or 420g appears.
- [ ] Given a product, when a visitor clicks "Enquire about this product", then they go to `/[locale]/distributors?product=[slug]` with the Product inquiry tab selected and the product field pre-filled.
- [ ] Given a product with optional fields (ingredients, shelf life, storage, nutrition), when a field is empty, then that block is hidden, not shown blank.

#### Edge Cases
- [ ] Empty/null input: a product with no variants shows "Sizes on request" and the enquiry CTA.
- [ ] Unauthenticated user: draft or unpublished slugs return 404.
- [ ] Network failure: if the image fails, the placeholder shows and the rest of the page is intact.
- [ ] Duplicate submission: not applicable to a read page; a renamed slug redirects the old slug (301) to the new one.
- [ ] Liquid products display "Net Volume" (not "Net Weight") and spelling is correct in both languages.

**Status:** [x] Complete

---

### US-004.5 — Tastino lines page [MVP]
**As a** B2B visitor, **I want to** a page for Freshness syrups, traditional beverages and THE LEAF **so that** I can see the products that sit under the Tastino name.

#### Acceptance Criteria
- [ ] Given `/[locale]/products/tastino-lines`, when loaded, then it has three sections: Freshness ("More Flavor in Every Drop", syrups in 800ml), Traditional beverages (Hibiscus/Karkadeh, Carob/Kharrub, Qamar Al Din, Licorice/Erq Sous, 330ml) and THE LEAF (iced tea, 330ml).
- [ ] Given the page, when rendered, then no section links to a brand page and the Tastino logo is the only brand mark used.
- [ ] Given any item without a packshot, when rendered, then the "Image coming soon" placeholder shows.

#### Edge Cases
- [ ] Empty/null input: a section with no published products is hidden.
- [ ] Unauthenticated user: public; unpublished products excluded.
- [ ] Network failure: the page is served from the pre-built version when the database is unavailable.
- [ ] Duplicate submission: not applicable; a product exists in only one line (unique constraint on productLine).
- [ ] Arabic names of traditional beverages (e.g. عرق سوس) render with correct shaping and RTL order.

**Status:** [x] Complete

---

### US-004.6 — Catalogue content accuracy rules [MVP]
**As a** content owner, **I want to** automated checks on brand, size and spelling **so that** the public site never shows a known wrong value.

#### Acceptance Criteria
- [ ] Given the built site, when an automated content test crawls `/en` and `/ar` brand and product pages, then it fails if any banned string appears (Katchup, Sesam, Orang, 360g, 370g, 420g on jams/sauces).
- [ ] Given each product page, when the test runs, then each product appears under exactly one of Lora, Liora, Andiamo, TAMA or a Tastino line.
- [ ] Given the test, when it runs in CI, then a failing check blocks the build.

#### Edge Cases
- [ ] Empty/null input: a product with missing brand and no productLine fails the test with its slug listed.
- [ ] Unauthenticated user: the test uses public URLs only.
- [ ] Network failure: the test runs against a local build, with no external dependency.
- [ ] Duplicate submission: duplicate product names within a brand are reported as errors.
- [ ] Tomato paste in tin 400g is allowed; the 400g rule is not flagged as an error for Liora.

**Status:** [x] Complete

---

### US-004.7 — Brand status handling and brand-to-form linking [MVP]
**As a** sales manager, **I want to** each brand and product page to lead to an enquiry **so that** interest turns into leads.

#### Acceptance Criteria
- [ ] Given any brand or product page, when rendered, then it contains a CTA to `/[locale]/distributors?brand=[slug]` and a WhatsApp link with prefilled text mentioning the brand or product name.
- [ ] Given a brand with status Coming Soon, when its page is opened, then the product grid is replaced by a "Coming soon" notice and the CTA still works.
- [ ] Given the distributors form, when opened with `?brand=lora`, then the "brands of interest" field has Lora selected.

#### Edge Cases
- [ ] Empty/null input: an unknown `?brand=` value is ignored and the form opens normally.
- [ ] Unauthenticated user: no login needed to use the CTA.
- [ ] Network failure: the CTA is a normal link and works without JavaScript.
- [ ] Duplicate submission: not applicable to links; the prefilled WhatsApp text is URL-encoded, including Arabic.

**Status:** [x] Complete

---

## Epic Checklist
- [x] All stories marked complete
- [x] Type check passing (`tsc --noEmit`)
- [x] Linter passing (`eslint .`)
- [x] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
