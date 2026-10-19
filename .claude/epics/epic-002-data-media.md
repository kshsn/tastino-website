# Epic 002 — Data and Media

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP · **Effort:** M

---

## Goal
Provide a bilingual PostgreSQL/Prisma data model, a seed built from the catalogue and official copy, and an image pipeline with placeholders, so every public page can read real content.

---

## Stories

### US-002.1 — Catalogue schema with EN and AR fields [MVP]
**As a** developer, **I want to** Prisma models for Brand, Category, Product and ProductVariant with `...En`/`...Ar` text fields **so that** every catalogue item carries both languages.

#### Acceptance Criteria
- [ ] Given the schema, when `prisma migrate dev` runs on an empty database, then the tables are created with no error.
- [ ] Given a Product, when stored, then it has `nameEn`, `nameAr`, `descriptionEn`, `descriptionAr`, a unique `slug`, a status (draft/published), an optional `brandId`, and a `productLine` value that identifies Tastino lines (Freshness, traditional beverages, THE LEAF) so those products need no brand.
- [ ] Given a ProductVariant, when stored, then it holds size value, unit (g, kg, ml, L), pack type (glass, PET, can, tin) and an optional SKU, and belongs to exactly one Product.

#### Edge Cases
- [ ] Empty/null input: saving a Product with an empty `slug` or empty `nameEn` is rejected by validation.
- [ ] Unauthenticated user: database access is only through server code; no table is exposed through a public endpoint.
- [ ] Network failure: a dropped database connection during a read returns a handled error (HTTP 503 page), not an unhandled crash.
- [ ] Duplicate submission: creating two products with the same slug fails with a unique-constraint error that is surfaced as a readable message.

**Status:** [ ] Pending

---

### US-002.2 — Content, leads and admin schema [MVP]
**As a** developer, **I want to** models for MediaAsset, HeroSlide, PageBlock, Setting, Lead, LeadNote, User and AuditLog **so that** content, leads and admin accounts have a home from day one.

#### Acceptance Criteria
- [ ] Given the schema, when migrated, then Lead has name, email, phone, company, country, city, reason, message, status (New, In contact, Qualified, Closed), assignee, archived flag, consent flag, consent timestamp, locale and created time.
- [ ] Given the schema, when migrated, then User has a role enum (Super admin, Content editor, Sales), a password hash, and 2FA secret fields, and no plaintext password column exists.
- [ ] Given the schema, when migrated, then AuditLog stores actor, action, entity, entity id and timestamp, and Lead has no hard-delete path in the data layer (archive only).

#### Edge Cases
- [ ] Empty/null input: a Lead with an empty email or `consent=false` is rejected at the data layer.
- [ ] Unauthenticated user: Setting rows marked private (e.g. SMTP credentials) are never returned by public read functions.
- [ ] Network failure: a failed migration leaves the database in its prior version (transactional migration).
- [ ] Duplicate submission: two Users with the same email (case-insensitive) cannot be created.

**Status:** [ ] Pending

---

### US-002.3 — Seed the brand architecture [MVP]
**As a** content owner, **I want to** the brand structure seeded exactly as decided **so that** the site shows the right brand for each product from day one.

#### Acceptance Criteria
- [ ] Given a fresh database, when the seed runs, then exactly four brands exist: Lora (jams), Liora (tomato products), Andiamo (sauces and tahini), TAMA (juices and nectars), each with EN and AR names, a category, an accent color and status Live.
- [ ] Given the seed, when it completes, then Freshness, traditional beverages and THE LEAF exist as Tastino product lines and not as Brand rows.
- [ ] Given the seed has run, when it runs again, then it upserts and the row counts are unchanged.

#### Edge Cases
- [ ] Empty/null input: a brand missing an Arabic name makes the seed fail with a message naming the brand.
- [ ] Unauthenticated user: the seed runs only from the CLI or CI and is not reachable through any HTTP route.
- [ ] Network failure: the seed uses only local files and needs no network.
- [ ] Duplicate submission: re-running the seed does not duplicate brands or lines (idempotent by slug).

**Status:** [ ] Pending

---

### US-002.4 — Seed products and variants from the catalogue with house rules [MVP]
**As a** content owner, **I want to** the catalogue loaded with correct spelling and standard sizes **so that** product pages are accurate without manual entry.

#### Acceptance Criteria
- [ ] Given the seed, when it completes, then each catalogue product is stored under the correct brand: jams under Lora, tomato paste and ketchup under Liora, sauces/tahini/hot sauce under Andiamo, juices under TAMA.
- [ ] Given a jam or sauce, when stored, then its standard variant is 400g and no variant of 360g, 370g or 420g exists.
- [ ] Given the seed, when queried, then product names use "Ketchup" (not Katchup), "Sesame Tahini" (not Sesam), "Orange" (not Orang), and liquid sizes are labelled "Net Volume".
- [ ] Given tomato paste, when stored, then its sizes keep the catalogue values (glass 285/300/320g; tin 400g/800g/1kg/3kg) and the claims "added salt 2%, natural soluble solids 22–24%, free from additives, flavor enhancers and artificial colors" are stored and shown exactly as printed in the client-approved 2026 catalogue (accepted as substantiation on 2026-10-18), for tomato paste only.

#### Edge Cases
- [ ] Empty/null input: a catalogue row without a size is skipped and listed in the seed report, not inserted with a blank size.
- [ ] Unauthenticated user: not applicable (CLI only); seed output contains no secrets.
- [ ] Network failure: the seed does not call external services.
- [ ] Duplicate submission: a product whose slug already exists is updated, not duplicated.
- [ ] A test fails the build if any stored name or description contains a banned misspelling (Katchup, Sesam, Orang).

**Status:** [ ] Pending

---

### US-002.5 — Image pipeline for cutouts and responsive sizes [MVP]
**As a** visitor on mobile, **I want to** small, sharp images **so that** pages load quickly and Lighthouse stays at 85 or above.

#### Acceptance Criteria
- [ ] Given an uploaded or seeded packshot from `source/cutouts/`, when processed, then `sharp` produces AVIF and WebP at widths 320, 640 and 1024 plus the original, stored under the media path.
- [ ] Given a rendered image, when inspected, then it has width and height attributes (no layout shift) and a non-empty localized `alt`.
- [ ] Given a hero image, when the page loads, then only the first-screen packshot is eager-loaded; all others are lazy-loaded.

#### Edge Cases
- [ ] Empty/null input: a zero-byte or non-image file is rejected with an error and nothing is written.
- [ ] Unauthenticated user: media files are public read-only, and no upload endpoint accepts a request without an admin session.
- [ ] Network failure: an interrupted upload leaves no partial file or orphan database row.
- [ ] Duplicate submission: uploading the same file twice stores one set of derivatives (hash match) or clearly versions it.
- [ ] A source smaller than 2000px (e.g. the Andiamo lineup, about 380px tall) is never upscaled beyond its natural size.

**Status:** [ ] Pending

---

### US-002.6 — Placeholder for missing packshots [MVP]
**As a** visitor, **I want to** a neutral "image coming soon" tile where a product has no photo **so that** pages never show a broken image or a wrong product.

#### Acceptance Criteria
- [ ] Given a Product with no main image (e.g. THE LEAF, traditional beverages, some TAMA flavours), when its card or page renders, then a branded placeholder with the localized text "Image coming soon" / Arabic equivalent is shown at the same dimensions as a real image.
- [ ] Given a product whose only available packshot shows a different brand name (jams labelled Liora), when it has the `imageNeedsReplacement` flag, then the placeholder or the Lora lineup image is shown instead of the mislabelled packshot.
- [ ] Given a Product using a placeholder, when queried by the admin API, then it is flagged "missing image" so staff can find it.

#### Edge Cases
- [ ] Empty/null input: an empty image URL or a deleted media row renders the placeholder, not a broken-image icon.
- [ ] Unauthenticated user: the placeholder is public, and the "missing image" flag is not exposed on public responses.
- [ ] Network failure: if an image file returns 404 or times out, the placeholder replaces it via an `onError` fallback.
- [ ] Duplicate submission: not applicable; replacing a placeholder by uploading a real image removes the flag in the same save.

**Status:** [ ] Pending

---

### US-002.7 — Seed official copy as bilingual page blocks [MVP]
**As a** content owner, **I want to** the official EN and AR copy stored as editable blocks **so that** the site uses only approved text and no borrowed boilerplate.

#### Acceptance Criteria
- [ ] Given the seed, when it completes, then PageBlock rows exist for About, Food Safety Comes First, Innovation in Every Taste, Brand Excellence, A Diverse Product Portfolio and Let's Build a Successful Partnership, each with `bodyEn` and `bodyAr` from `source/content/official-copy.md`.
- [ ] Given the database after seed, when searched, then none of the phrases "Keurig", "$1 billion", "200 countries" or "one billion times" appear.
- [ ] Given the tagline, when stored, then the English reads "Crafted with Care. Inspired by Nature." and the Arabic matches the supplied text.

#### Edge Cases
- [ ] Empty/null input: if the Arabic body for a block is empty, the block is stored as Draft and its section is omitted in both `/en` and `/ar` (no English fallback), with a logged warning.
- [ ] Unauthenticated user: only published blocks are returned by public read functions.
- [ ] Network failure: copy is read from a local file during seed, with no network call.
- [ ] Duplicate submission: re-seeding does not overwrite a block that an admin edited (compares a "modified by admin" marker).

**Status:** [ ] Pending

---

### US-002.8 — Publish rule: both languages required, no fallback [MVP]
**As a** content editor, **I want to** the system to enforce bilingual completeness **so that** no half-translated item goes live by accident.

#### Acceptance Criteria
- [ ] Given an item with `nameEn` set and `nameAr` empty, when publish is requested, then the data layer rejects it with a message naming the missing field.
- [ ] Given a published item, when an update would clear a required English or Arabic field, then the save is refused (the item must be unpublished first), so a live page never lacks a language and English is never shown in place of Arabic.
- [ ] Given a draft item, when any public query runs, then it is excluded from results.

#### Edge Cases
- [ ] Empty/null input: whitespace-only Arabic text is treated as empty.
- [ ] Unauthenticated user: public queries never return draft items, whatever the query parameters.
- [ ] Network failure: a failed publish request changes nothing (atomic update).
- [ ] Duplicate submission: publishing an already-published item is a no-op and writes one audit entry at most.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
