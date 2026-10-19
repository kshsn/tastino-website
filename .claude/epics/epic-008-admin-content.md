# Epic 008 — Admin Content Management

**Status:** Pending
**Phase:** 7 — Build
**Release:** MVP (basic) / R2 (full)
**Effort:** L

---

## Goal
Super admins and Content editors can create, edit, publish and unpublish brands, products, variants, media, hero slides, page copy and settings in English and Arabic, without a developer.

Roles in this epic: Super admin and Content editor have full access. Sales has none (403).

---

## Stories

### US-008.1 — Manage brands [MVP]
**As a** Content editor, **I want to** create and edit brands with English and Arabic fields and a status **so that** brand pages show correct, approved content.

#### Acceptance Criteria
- [ ] Given the brands screen, when the editor saves a brand with EN and AR name, tagline, description, accent color, logo and slug, then it is stored as Draft and is not visible on the public site.
- [ ] Given a brand with a status of Live, Coming Soon or Hidden, when it is saved, then the public `/brands` index shows Live with its products, shows Coming Soon as a card without a product list, and omits Hidden.
- [ ] Given a published brand, when the editor changes any field, then the public page reflects the change within 60 seconds (cache refreshed on save).
- [ ] Given a brand, when saved, then an audit entry (US-007.7) is written.

#### Edge Cases
- [ ] Empty required fields (slug, EN name, AR name): save as Draft is allowed only with a slug and one name; other missing fields show errors on publish (US-008.3).
- [ ] Unauthenticated request or Sales user: 401 / 403.
- [ ] Network failure on Save: the form keeps the typed values and offers retry; no partial record.
- [ ] Duplicate slug: rejected with "Slug already in use"; double-clicking Save creates one brand.
- [ ] Slug changed on a published brand: the old URL redirects 301 to the new one.
- [ ] Brand with published products is set to Hidden: its products disappear from the public brand page and listing, and the editor is warned before confirming.

**Status:** [ ] Pending

---

### US-008.2 — Manage products and variants [MVP]
**As a** Content editor, **I want to** create and edit products with their size and pack-type variants **so that** the catalogue is accurate.

#### Acceptance Criteria
- [ ] Given the products screen, when the editor saves a product with brand or Tastino master line, category, slug, EN and AR name and description, ingredients, shelf life and storage, then it is stored as Draft.
- [ ] Given a product, when the editor adds variants with size (value and unit) and pack type (glass, PET, can, tin), then the variants appear on the public product page and can be filtered on `/products`.
- [ ] Given a product with no image assigned, when the product list loads, then it shows an "Image missing" flag, and the public page shows the "image coming soon" placeholder.
- [ ] Given a variant, when it is removed, then it disappears from the public page after save and an audit entry is written.

#### Edge Cases
- [ ] Empty variant list on publish: publish is blocked with "Add at least one variant".
- [ ] Unauthenticated request or Sales user: 401 / 403.
- [ ] Network failure on Save: nothing is half-saved (product and variants save in one transaction).
- [ ] Duplicate slug or duplicate variant (same size + pack type) on one product: rejected with a clear message.
- [ ] Size value zero, negative or non-numeric: rejected.
- [ ] Product assigned to a brand that is later deleted or hidden: the brand cannot be deleted while it has products; hiding it hides the products from public views.

**Status:** [ ] Pending

---

### US-008.3 — Draft, publish and unpublish with both languages required [MVP]
**As a** Content editor, **I want to** publish an item only when English and Arabic are both complete **so that** no page goes live half-translated.

#### Acceptance Criteria
- [ ] Given a Draft item (brand, product, hero slide or page block) with all required EN and AR fields filled, when the editor clicks Publish, then its status becomes Published and it appears on the public site in both `/en` and `/ar`.
- [ ] Given a Draft item with any required AR or EN field empty, when the editor clicks Publish, then publishing is refused and each missing field is listed by name and language.
- [ ] Given a Published item, when the editor clicks Unpublish, then it returns to Draft and the public URL answers 404 (or redirects to its parent listing).
- [ ] Given a status change, when it completes, then an audit entry records the actor and time.

#### Edge Cases
- [ ] A field containing only whitespace counts as empty.
- [ ] Unauthenticated request or Sales user to the publish endpoint: 401 / 403.
- [ ] Network failure on Publish: the status shown in the UI always matches the server after reload.
- [ ] Publish clicked twice: one status change and one audit entry.
- [ ] A field is cleared on an already-Published item: the save is refused for the required EN/AR fields (the item cannot become incomplete while live); editor must unpublish first.
- [ ] A Draft item is requested on the public site by URL: 404, never leaked through the sitemap or API.

**Status:** [ ] Pending

---

### US-008.4 — Media library with automatic resizing [MVP]
**As a** Content editor, **I want to** upload images into a media library **so that** I can reuse them across brands, products and slides in correct sizes.

#### Acceptance Criteria
- [ ] Given a JPG, PNG or WebP up to 10 MB, when uploaded, then the original is stored and resized derivatives (thumbnail, medium, large) in WebP and AVIF are generated by `sharp`.
- [ ] Given an uploaded image, when the editor enters EN and AR alt text and saves, then the alt text is stored and used on the public site.
- [ ] Given the library, when the editor searches by filename or alt text, then only matching assets are listed.
- [ ] Given an image assigned to a product or slide, when the editor tries to delete it, then deletion is blocked and the places using it are listed.

#### Edge Cases
- [ ] Empty upload (0 bytes), unsupported type (e.g. .exe, .svg with scripts) or file over 10 MB: rejected with a specific message and nothing is stored. File type is checked by content, not extension.
- [ ] Unauthenticated or Sales user uploading: 401 / 403.
- [ ] Network failure mid-upload: no orphan record or partial file remains; retry works.
- [ ] Same file uploaded twice (identical hash): the editor is told it already exists and offered the existing asset.
- [ ] Image under 1000 px on its longest side: accepted with a "low resolution" warning shown on the asset.
- [ ] Missing alt text in either language on a published item that displays the image: publish is blocked.

**Status:** [ ] Pending

---

### US-008.5 — Manage homepage hero slides [MVP]
**As a** Content editor, **I want to** manage the homepage hero slides **so that** the first screen shows current messaging and products.

#### Acceptance Criteria
- [ ] Given the hero screen, when the editor saves a slide with EN and AR headline, EN and AR sub-line, CTA label (EN/AR), CTA link and an image from the library, then it is stored as Draft.
- [ ] Given up to 3 Published slides, when the editor reorders them, then the public homepage shows them in the new order after save.
- [ ] Given more than 3 slides are published, when the editor tries to publish a 4th, then it is refused with "Maximum 3 published slides".
- [ ] Given zero Published slides, when the homepage loads, then the default hero from the approved mockup is shown, not a blank area.

#### Edge Cases
- [ ] Empty CTA link: slide may be saved but cannot be published; a CTA link to an unpublished internal page is flagged.
- [ ] Unauthenticated or Sales user: 401 / 403.
- [ ] Network failure when saving the order: the previous order stays; the UI reloads the true order.
- [ ] Duplicate submission of a new slide: one slide.
- [ ] External CTA URL that is not https or has a `javascript:` scheme: rejected.

**Status:** [ ] Pending

---

### US-008.6 — Edit page copy blocks [R2]
**As a** Content editor, **I want to** edit the text of About, Quality, Innovation, Distributors, Contact, Privacy and Terms **so that** copy can be updated without a developer.

#### Acceptance Criteria
- [ ] Given a page, when the editor opens it, then each block shows EN and AR inputs side by side, with the official copy preloaded.
- [ ] Given edited blocks with both languages filled, when the editor publishes, then the public page updates within 60 seconds.
- [ ] Given a published block, when saved, then the previous version is stored so a Super admin can see the prior text in the audit log (US-007.7).
- [ ] Given Privacy and Terms, when their text is empty in either language, then publish is blocked so the legal pages can never go live blank.

#### Edge Cases
- [ ] Input containing HTML or `<script>`: sanitised; only a safe set of tags (paragraph, bold, list, link) is allowed.
- [ ] Unauthenticated or Sales user: 401 / 403.
- [ ] Network failure on Save: unsaved text stays in the form and a retry is offered.
- [ ] Two editors save the same block: the second save is warned about the newer version and does not silently overwrite it.
- [ ] Very long text (over 10,000 characters): rejected with a limit message.

**Status:** [ ] Pending

---

### US-008.7 — Manage site settings [MVP]
**As a** Content editor, **I want to** edit contact details, social links and managed lists **so that** the footer and the distributors contact panel stay correct.

#### Acceptance Criteria
- [ ] Given the settings screen, when the editor saves phone, WhatsApp number, email, address (EN/AR) and map link, then the header, footer, distributors contact panel and WhatsApp/phone links use the new values.
- [ ] Given social accounts, when a link is left empty, then no icon for that network appears on the public site.
- [ ] Given a social link, when saved, then it must be an https URL; otherwise it is rejected.
- [ ] Given the country list for the lead form, when the editor adds or removes a country, then the form options update.

#### Edge Cases
- [ ] Phone not in international format (+ and 8 to 15 digits): rejected.
- [ ] Unauthenticated or Sales user: 401 / 403.
- [ ] Network failure on Save: previous values stay live.
- [ ] Duplicate country entry: rejected.
- [ ] Email setting cleared: rejected, because it is the lead notification and contact address.

**Status:** [ ] Pending

---

### US-008.8 — Attach PDF spec sheets and certificates [R2]
**As a** Content editor, **I want to** upload optional PDF spec sheets per product and certificate files **so that** buyers can download supporting documents.

#### Acceptance Criteria
- [ ] Given a product, when the editor uploads a PDF (up to 10 MB) with EN and AR titles, then a "Download spec sheet" link appears on its public page.
- [ ] Given a product without a spec sheet, when its public page renders, then no download link or empty placeholder is shown.
- [ ] Given a certificate PDF or image uploaded with EN and AR titles, when published, then it appears in the Certifications section of `/quality`.
- [ ] Given a document, when removed, then the public link disappears and old URLs answer 404.

#### Edge Cases
- [ ] Empty, non-PDF (checked by content) or oversized file: rejected, nothing stored.
- [ ] Unauthenticated or Sales user: 401 / 403.
- [ ] Network failure mid-upload: no orphan file.
- [ ] Same file uploaded twice for one product: duplicate refused.
- [ ] No certificates exist: the Certifications section is hidden on the public site rather than shown empty.

**Status:** [ ] Pending

---

## Epic Checklist
- [ ] All stories marked complete
- [ ] Type check passing (`tsc --noEmit`)
- [ ] Linter passing (`eslint .`)
- [ ] Committed and pushed to GitHub
- [ ] Project CLAUDE.md updated with last completed epic
