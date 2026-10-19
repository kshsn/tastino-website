# Requirements — Tastino Foods Website (tastinofoods.com)

**Date:** 2026-10-18
**Status:** CONFIRMED 2026-10-18 (Phase 1 complete; /clarify run; design direction approved).

---

## Problem Statement
Tastino Foods Inc (10th of Ramadan, Egypt; food and beverage manufacturer) has a corporate site that does not represent the company. The current site (single-page Vite/React app, audited 2026-10-18) has a blank hero slider, all brands marked "Coming Soon", placeholder contact details (`+1 (555) 123-4567`), dead social links, and About copy borrowed from another company (Keurig Dr Pepper boilerplate: "$1 billion each in annual retail sales", "200 countries", "one billion times a day"). It has no real pages, no product information, and no way for the company to manage content. As a result it does not generate distributor or export leads and cannot be trusted by B2B buyers.

The rebuild must give Tastino a credible, bilingual (English + Arabic) corporate presence that generates distributor and export leads, and lets the team manage products, brands and leads without a developer.

---

## Confirmed Facts (from user)
- **Company:** Tastino Foods Inc, food and beverage manufacturer, 10th of Ramadan, Egypt.
- **Domain:** tastinofoods.com (same domain as current site).
- **Brands:**
  - LORA: sustainably grown tomato products, main product line.
  - TAMA Juices.
  - Andiamo.
  - "Others" (meaning unclear, see Open Questions).
  - TAMA and Andiamo are currently marked "Coming Soon".
- **Existing features to keep (content may be rewritten):**
  - About section.
  - Innovation section.
  - Brands section.
  - Contact section.
  - "Become a Distributor" pitch: competitive pricing, marketing support, quality assurance, training.
  - Contact form: name, email, phone, company, message.
- **Contact email:** info@tastinofoods.com.
- **Languages:** English + Arabic, with full RTL support for Arabic.
- **Stack direction:** Next.js 16 + React 19 + TypeScript + Tailwind CSS + PostgreSQL + Prisma 6 (confirmed in Phase 6; superseded the initial Next.js 14 default). Admin panel to manage products, brands and distributor leads. (Formal confirmation happens in Phase 6.)
- **Hosting:** Hostinger VPS, with PM2 + nginx + certbot.
- **Current assets:** only 3 images in the existing site, including a logo that contains Arabic text.

---

## Source Material Received (2026-10-18)
Files are stored under `.claude/source/`: `catalogue/` holds the 2026 company profile PDF as text and page previews, and `products/` holds 17 packshots and lineup images.

### Company facts (from the 2026 company profile)
- **Tagline:** "Crafted with care.. inspired by nature". Positioning line: "Pioneers in Food & Beverages Manufacturing".
- **Address:** Industrial City, 10th of Ramadan, C5, Building No. 21 (Arabic: مدينة العاشر من رمضان الصناعية، C5، مبنى رقم 21).
- **Phone / WhatsApp (sales):** +20 110 011 1887. **Email:** info@tastinofoods.com.
- **Original EN + AR copy available for:** About Us (modern facility, hygiene, team training), Food Safety Comes First, Innovation Begins with Taste, Brand Excellence, A Diverse Product Portfolio, and Let's Build a Successful Partnership. This replaces the borrowed Keurig Dr Pepper copy.
- **Channels served:** retail, wholesale, foodservice/HORECA, catering. **Partnership types:** distribution, agency representation, business collaboration.
- **Packaging formats:** glass jars and bottles, PET containers and bottles, metal cans.
- **Tomato paste claims:** added salt 2%, natural soluble solids 22–24%, free from additives, flavor enhancers and artificial colors.

### Brand architecture (supersedes the earlier "Brands" list)
| Brand | Category | Products and sizes (from catalogue) |
|---|---|---|
| **Lora** (jams) / **Liora** (tomato) | Jams / tomato products | Tomato paste: glass 285/300/320g; tin 400g/800g/1kg/3kg. Jams: strawberry, mixed berry, fig, apricot, peach, mango, orange (marmalade), guava, blueberry; glass 360–400g/650g |
| **Andiamo** ("inspired by nature") | Sauces and condiments | Ketchup, mustard, BBQ, hummus tahini, sesame tahini (PET squeeze 400–420g); hot sauce (glass 200g); tomato paste can 400g |
| **TAMA** | Juices and nectars | Mango, guava, strawberry, peach, apple, cocktail, cranberry, orange, guava-orange, lemon, berry (200ml/250ml/1L) |
| **Freshness** ("More Flavor in Every Drop", Syrup Line) | Flavor concentrates / syrups | Hazelnut, vanilla, caramel, berry, mojito, piña colada, passion fruit (800ml; caramel also in pump bottle) |
| Traditional beverages (brand TBC) | Ready-to-drink | Hibiscus/Karkadeh, Carob/Kharrub, Qamar Al Din, Licorice/Erq Sous (330ml) |
| THE LEAF (brand TBC) | Iced tea / RTD | Flavours 330ml |

- The old "Others" slot is now known to cover Freshness, the traditional beverages and THE LEAF.
- **Products appear to be live, not "Coming Soon".** Packshots exist for most of the range.

### User decisions (2026-10-18, after source review)
- **Lora and Liora are two separate brands, each with its own brand page.** RESOLVED 2026-10-18: **Lora = jams**, **Liora = tomato products** (paste, ketchup). Asset note: the supplied Liora apricot, strawberry and blueberry jam packshots carry the Liora name on jams. Client to confirm or supply Lora-labelled versions before Phase 5.
- **Pack size: 400g is the standard** for jams and sauces. Discard the 360/370/420g variants seen in the catalogue and on labels.
- **Freshness, the traditional beverages and THE LEAF all sit under the Tastino name.** They are Tastino product lines, not standalone brands, so they get no separate brand pages. They are listed in Products under the Tastino master brand.
- **The website uses correct spelling** (Ketchup, Sesame Tahini, Orange, Net Volume for liquids), whatever the printed labels say.

### Motion and animation (user requirement, 2026-10-18)
- The site must feel alive, not static. In scope:
  - Floating, bobbing packshots in the hero.
  - Brand showcase that cycles automatically, with the background changing color per brand.
  - Sections and cards that reveal with a stagger as you scroll.
  - An infinite strip of product packshots.
  - Hover lift and tilt on brand and product cards.
  - Count-up numbers.
  - Smooth page transitions.
- Guardrails:
  - Respect `prefers-reduced-motion` (all motion off or reduced).
  - No animation may block reading or delay content.
  - Animations must not push mobile Lighthouse performance below 85.
  - Motion mirrors correctly in Arabic (RTL).

### Phase 4 decisions (2026-10-18)
- **Publishing needs both languages.** An item cannot be published without both English and Arabic. There is no English fallback. This supersedes the fallback default in Q-B8/Q-F3.
- **Leads older than 24 months** are flagged for Super admin to review and export. Nothing is deleted or anonymised automatically.
- **Accepted operational defaults:**
  - Login lockout after 5 failed attempts, for 15 minutes.
  - Session timeout after 30 minutes idle or 12 hours absolute.
  - Form rate limit of 5 submissions per 10 minutes per IP.
  - Daily pg_dump at 02:00, kept for 14 days.
  - Staging protected by basic auth.
  - At most 3 published hero slides.
  - Uploads up to 10 MB.
  - DMARC starts at p=none.

### /analyze resolutions (2026-10-18)
- **Stack:** Next.js 16 everywhere (supersedes the Next 14 references).
- **No English fallback anywhere.** Missing Arabic means the item stays unpublished.
- **About, Quality and Innovation** are separate pages using the approved about.html design.
- **One form on /distributors** with 4 reason tabs: Become a distributor, Request catalogue, Product inquiry, Other.
  - Fields: name, company, email, country, message and consent (required); phone, company type, brands of interest and product (optional).
  - Inline success screen with a reference number.
  - /contact redirects to /distributors.
  - This supersedes the Q-E2 and Q-E3 field defaults.

### Approved design direction (2026-10-18)
- The homepage mockup at `.claude/design/mockup/index.html` is APPROVED by the user as the visual reference. It uses AI-cut packshots from `source/cutouts/`, the official logo SVG at `source/logo/tastino-logo.svg` (must never be modified or redrawn), and the official copy from `source/content/official-copy.md`.

### Visual direction reference
- The user shared a Dribbble/Pinterest reference called "E Chips — Modern Snack Food Website". Its style: a clean warm-white base, one bold accent color, big confident headline type, products as large floating cutouts, rounded pill CTAs, a 4-up feature/benefit strip, a product lineup band, a full-width lifestyle band and a CTA banner.
- **Adaptation for Tastino:** keep that structure and energy, but make it corporate/B2B. Each brand gets its own accent color (Lora red, TAMA green/orange, Andiamo red/gold, Freshness deep green). The Tastino corporate blue and leaf green come from the logo.

---

## Target Users
- **Primary user (B2B):** Distributors, wholesalers, importers and retail chain buyers, in Egypt and export markets, who want to carry or source Tastino / LORA / TAMA / Andiamo products. They evaluate the company's credibility, product range, quality assurance and distributor terms, then submit an inquiry.
- **Secondary user (internal):** Tastino marketing/sales team who publish and maintain content and manage products, brands and leads through the admin panel.
- **Tertiary (low priority, see Open Questions):** Consumers looking for product information and where to buy; job seekers; journalists; investors.

---

## Core User Actions
1. **Visitor (B2B):** Understand who Tastino is and what it makes, in English or Arabic, within the first screen.
2. **Visitor (B2B):** Browse brands and products (including the LORA line) and see their details.
3. **Visitor (B2B):** Submit a "Become a Distributor" application or a general inquiry, and receive a confirmation on screen.
4. **Visitor:** Find company contact details (email, phone, address, map) and switch language between English and Arabic at any point.
5. **Admin (internal):** Log in, create and edit products, brands and bilingual page content, publish or unpublish them, and manage and follow up on distributor leads and inquiries.

---

## Out of Scope (proposed for this version; confirm)
- **Online ordering, e-commerce, shopping cart, or payments.** Proposed: B2B lead generation only.
- **Consumer loyalty, accounts or user profiles for visitors.** Visitors only submit forms; no visitor login.
- **Native mobile app.**
- **Full CRM integration** (Salesforce, HubSpot, etc.). Proposed: leads stored in the platform database with email notification and CSV export.
- **Multi-country / multi-currency pricing display.** Distributor pricing is discussed directly, not published.
- **Languages beyond English and Arabic.** Proposed: no French or other languages in v1.
- **Blog / news engine.** Proposed: not in v1 unless the user confirms a press section is needed (see Open Questions).
- **Migrating or preserving the old site's content as-is.** Old copy is replaced, not carried over.

---

## Constraints
| Constraint | Detail |
|------------|--------|
| Deadline   | OPEN QUESTION (see Q-D1). Proposed default: no hard date; plan MVP first. |
| Budget     | OPEN QUESTION (see Q-D2). Hosting is an existing Hostinger VPS. Domain and SSL (certbot) are existing or free. |
| Platform   | Responsive web (mobile, tablet, desktop). Hosted on Hostinger VPS (PM2 + nginx + certbot). Same domain tastinofoods.com. |
| Language   | English + Arabic. Full RTL layout for Arabic, not a translated overlay. |
| Legal / data | Lead forms collect personal data (name, email, phone). Egyptian Personal Data Protection Law No. 151 of 2020 is the likely applicable regime (to be confirmed with the client's legal contact). Requires consent wording, a privacy policy and secure storage. |
| Content    | No product, sustainability or certification claim goes live without documented substantiation from Tastino. The 2026 company catalogue counts as substantiation for the tomato paste figures it prints (decision 2026-10-18). |
| Other      | Only original company copy, no third-party boilerplate. |

---

## Success Criteria
Proposed. Confirm or edit during /clarify.
- All copy is original Tastino content, in English and Arabic. No placeholder text or third-party boilerplate remains on launch.
- Phone number, address and social links are real and verified, or removed. No dead links.
- All brands show correct status (Live / Coming Soon) and are managed from the admin panel.
- A visitor can submit a distributor application or general inquiry in either language, and the team receives a notification email and sees the lead in the admin panel.
- An admin with no developer help can add or edit a product, brand or bilingual content block and publish it.
- Arabic pages render full RTL with correct typography, with no layout breaks at mobile widths.
- Site is served over HTTPS on tastinofoods.com with valid certbot certificate, and the old single-page site is replaced without broken contact or lead flow.
- Proposed performance and quality bars: WCAG 2.1 AA accessibility; Core Web Vitals "good" on mobile; no console errors on main pages.
- Search engines can index all public pages in both languages (sitemap, per-page metadata, language alternates).

---

## Open Questions

Each question has a proposed default. The main session should ask these one at a time (or in small groups) and record the answer in this file. Items marked **[Blocking]** must be answered before Phase 2 planning.

### A. Sitemap and Content Scope
- **Q-A1 [Blocking] Which pages are needed?**
  - Proposed default: Home; About (company story, leadership, mission, sustainability); Factory & Quality (facilities, QA process, certifications); Brands index with a page per brand (LORA, TAMA Juices, Andiamo); Products listing with product detail pages under each brand; Become a Distributor; Contact; Privacy Policy; Terms (short).
  - **RESOLVED 2026-10-18:** Full corporate site — Home, About, Factory & Quality (certifications), Brands index + per-brand pages, Products listing + detail pages, Become a Distributor, Contact, Privacy, Terms.
- **Q-A2 Do product detail pages exist?** How many SKUs (approximately) and what details does each have?
  - Proposed default: yes. Each product has name (EN/AR), brand, category, description, pack sizes, main image, ingredients, optional nutrition facts, shelf life and storage, and "markets available."
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-A3 Careers page?** Are there open roles to publish?
  - Proposed default: no for v1. Add a simple careers page later if roles exist (job posts through the admin panel as a future item).
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-A4 News / press / certifications page?** Are there press releases, awards or certificates (e.g., food safety certificates, halal, ISO, HACCP) to show?
  - Proposed default: a Certifications section on the Factory & Quality page, with uploadable certificate files. No news section in v1.
  - **DEFERRED 2026-10-18:** Certifications list/files not yet supplied; section built, populated when received.
- **Q-A5 "Others" brand.** What is this? A real brand, a catch-all category, or a placeholder?
  - Proposed default: treat as a product category ("Other products") and not a standalone brand card, unless the client confirms it is a real brand with its own products.
  - **RESOLVED 2026-10-18:** "Others" = Freshness syrups, traditional beverages, THE LEAF iced tea (see Source Material). Brand vs sub-line naming still to confirm.
- **Q-A6 Status of TAMA Juices and Andiamo.** Are they launched or still "Coming Soon"? If coming soon, is a launch date known?
  - Proposed default: admin toggles status per brand (Live / Coming Soon / Hidden). Coming Soon brands show a card with no product list.
  - **RESOLVED 2026-10-18:** Products appear live (packshots exist). Treat all as Live unless the user says otherwise.
- **Q-A7 Hero slider content.** What should the homepage hero show, and how many slides?
  - Proposed default: 3 slides, each with an image, a headline, a sub-line and a CTA, managed in the admin panel. Images to be supplied by the client.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-A8 Distributor or store locator ("Where to buy").** Does the public need to see where products are sold or which distributors carry them?
  - Proposed default: no store locator in v1. Optionally a simple "Our distributors/partners by country" list, managed in the admin panel, if the client confirms they want to publish partners.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-A9 Sustainability claims.** The LORA line is described as "sustainably grown." What evidence exists (farm practices, certifications, sourcing data)?
  - Proposed default: publish only claims the client can substantiate. Wording is reviewed by the client before launch. Vague claims are replaced with specific, verifiable statements.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.

### B. Content and Assets
- **Q-B1 [Blocking] Company facts.** Who provides the verified facts that replace the borrowed About copy? Specifically: founding year, HQ and factory address, factory size, production capacity, product categories, export countries (count and list), number of employees, leadership names and titles, certifications, and awards.
  - Proposed default: the client fills in a short fact sheet. We then draft EN copy, and a professional Arabic translation is reviewed by a native Arabic speaker from the client side. The client approves all copy before launch.
  - **DEFERRED 2026-10-18:** Remaining facts (founding year, capacity, headcount, leadership, awards) - not blocking architecture; client supplies before content entry.
- **Q-B2 Photos and media.** What photos exist (product packshots, factory, production lines, team, brand lifestyle)? Quality and resolution?
  - Proposed default: client supplies high-resolution product packshots for every live product, at least 5 factory/production photos, and 1 hero image per brand. Missing images get a neutral placeholder and are flagged in the admin panel until replaced. Video is out of scope for v1 unless supplied.
  - **DEFERRED 2026-10-18:** Factory/team photos not yet supplied; packshots received. Placeholders until delivered.
- **Q-B3 Logo files.** Do vector files exist (SVG, AI or EPS) for the EN and AR logo versions? The current logo is a raster image with Arabic text.
  - Proposed default: request vector logo files for the English, Arabic and combined versions. Until received, use the existing logo as-is.
  - **DEFERRED 2026-10-18:** Vector logos (Tastino, Lora, Liora, TAMA, Andiamo, Freshness) not yet supplied; needed before Phase 5 final design.
- **Q-B4 Brand guidelines.** Brand colors, typography (including an Arabic-capable font family), tone of voice, and per-brand visual identity (LORA, TAMA, Andiamo).
  - Proposed default: derive the palette from the logo and existing brand materials. Confirm the official colors (hex values). Use an Arabic-capable font pair for both languages, chosen in Phase 5 (Figma design) and approved by the client. If no guidelines exist, the design phase proposes one.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-B5 Contact details.** Real phone number(s), WhatsApp number, office and factory addresses, office hours, and a map location.
  - Proposed default: publish email info@tastinofoods.com, one main phone, the factory address and a map embed. Remove the placeholder number. Do not publish any number until the client confirms it.
  - **RESOLVED 2026-10-18:** Partially answered: address Industrial City, 10th of Ramadan, C5, Bldg 21; sales phone/WhatsApp +20 110 011 1887; info@tastinofoods.com. Still needed: social accounts and office hours.
- **Q-B6 Social media.** Which accounts are active (Facebook, X, Instagram, LinkedIn, TikTok, others)?
  - Proposed default: show only accounts the client confirms are active and owned by Tastino. Remove the rest. Each link is checked before launch.
  - **DEFERRED 2026-10-18:** Active social accounts not yet confirmed; footer shows only confirmed ones.
- **Q-B7 Legal pages.** Privacy policy (Arabic and English), terms of use, cookie notice, and company registration/tax details for the footer.
  - Proposed default: client's legal contact supplies texts or approves a draft. Site includes cookie consent if analytics is used. Company registration number shown in footer if the client wants it.
  - **DEFERRED 2026-10-18:** Legal texts need client legal review; needed before launch, not before build.
- **Q-B8 Translation ownership.** Who translates and reviews Arabic content, and in what timeframe?
  - Proposed default: client or agency provides professional Arabic review. Content is not published in Arabic until reviewed. ~~If Arabic is missing for an item, the page falls back to English~~ SUPERSEDED 2026-10-18: no English fallback, both languages required to publish (see Phase 4 decisions).
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.

### C. Target Audiences and Markets
- **Q-C1 [Blocking] Audience priority.** Confirm the primary audience is B2B (distributors, importers, retail chains). Is consumer-facing content (where to buy, recipes, brand stories) also a goal?
  - Proposed default: primary is B2B; consumer content is secondary and light-weight (product pages double as consumer information).
  - **RESOLVED 2026-10-18:** B2B distributors + export buyers are primary; product pages double as consumer info.
- **Q-C2 [Blocking] Geographic focus.** Which markets does Tastino sell in now and which does it target? Egypt only, MENA, Africa, Europe, other?
  - Proposed default: lead form asks for country; site content mentions "Egypt and export markets" without listing countries until the client provides the list. Country list added to admin as a managed setting.
  - **RESOLVED 2026-10-18:** Target markets are Egypt + MENA (Gulf, Levant). Languages EN + AR only; no French version.
- **Q-C3 Default language.** Which language should load by default?
  - Proposed default: detect browser language and default to Arabic for visitors in Egypt and Arabic-speaking regions, English otherwise. A visible language switch on every page. Language is stored in the URL so it can be shared and indexed.
  - **RESOLVED 2026-10-18:** Auto-detect: Arabic for Arabic-language browsers or Egypt/MENA visitors, English otherwise; language switch visible on every page.

### D. Deadline, Budget, Ownership
- **Q-D1 [Blocking] Deadline.** Is there a launch date, trade show, or campaign that the site must be ready for?
  - Proposed default: no hard date. Phase 4 plans an MVP (Home, Brands, Products, Distributor form, Contact, admin for products/brands/leads) first, then extras.
  - **RESOLVED 2026-10-18:** No hard date. MVP first, then the rest.
- **Q-D2 Budget.** Is there a budget for third-party services (email delivery, stock photography, translation, design support)?
  - Proposed default: use existing Hostinger VPS and existing domain. Use free SSL via certbot. Third-party services only if the client approves a cost.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-D3 Who owns the project on the client side?** Who approves content, copy, designs and launch?
  - Proposed default: one named client decision-maker for approvals, plus one content owner who supplies facts and assets.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-D4 Cutover plan.** The current live site is served on the same domain. When can it be replaced, and is downtime acceptable?
  - Proposed default: build on a staging subdomain or separate port, test, then switch nginx to the new app at launch with a short maintenance window. Keep the old site available for quick rollback for 7 days.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.

### E. Distributor Application and Leads
- **Q-E1 [Blocking] Lead handling.** Who receives lead notifications (names and emails)? Are leads only stored, or also sent somewhere else?
  - Proposed default: every submission is stored in the database and triggers an email to 1–2 named recipients (sales plus info@). Admin panel shows all leads with CSV export. No CRM in v1.
  - **RESOLVED 2026-10-18:** Notifications go to info@tastinofoods.com only; every lead is also stored and viewable in the admin panel.
- **Q-E2 Distributor form fields.** Beyond name, email, phone, company and message, what is needed?
  - Proposed default: country and city, company type (distributor / wholesaler / retailer / importer / other), territory or channels served, years in business, existing brands carried, approximate annual volume band, and how they heard about Tastino. Keep required fields to the minimum (name, email, company, country).
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-E3 General contact form.** Is it the same form as distributor, or a separate one (e.g., media, careers, consumer complaints)?
  - Proposed default: one form with a "reason" dropdown (Distributor / Export buyer / Media / Consumer / Other) that controls which fields appear.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-E4 Lead workflow in admin.** Do leads need statuses and notes?
  - Proposed default: statuses New / In contact / Qualified / Closed, with assignee and internal notes. Leads are never deleted, only archived.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-E5 Spam protection.** Any anti-spam requirement for forms?
  - Proposed default: honeypot field plus rate limiting per IP. Add a stronger challenge only if spam is observed.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-E6 Pricing claim.** The site says "competitive pricing." Is any pricing published or promised?
  - Proposed default: no prices published. Wording changed to something verifiable (e.g., "Partner terms discussed directly") unless the client supplies a pricing policy.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-E7 Confirmation.** What does the visitor receive after submitting?
  - Proposed default: on-screen thank-you message in the chosen language, plus an auto-reply email to the visitor with the team's expected response time (client to confirm the time).
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.

### F. Admin Panel
- **Q-F1 [Blocking] Admin users and roles.** How many admin users, and who are they?
  - Proposed default: three roles. Super admin (everything, including user management). Content editor (products, brands, pages, media; no user management). Sales (view and update leads only). Expected initial count: 2–5 users.
  - **RESOLVED 2026-10-18:** Three roles (Super admin, Content editor, Sales), 2–5 users.
- **Q-F2 Login security.** Are there requirements for two-factor login, password rules, session timeout?
  - Proposed default: email and password with two-factor authentication, session timeout after inactivity, and account lockout after repeated failed logins.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-F3 Bilingual editing.** Do editors need to enter both English and Arabic for every item?
  - Proposed default: yes. Each text field has EN and AR inputs. Items can be saved as draft; publishing requires both languages (or an explicit override that shows fallback).
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-F4 Publishing workflow.** Is there a review or approval step before publish?
  - Proposed default: no approval step in v1. Drafts and publish/unpublish only. Audit log records who changed what and when.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-F5 Media library.** Who uploads images and documents (certificates, brochures, spec sheets)? Are downloadable brochures or product spec sheets needed?
  - Proposed default: admin media library with image resizing. Product spec sheets (PDF) downloadable per product, if the client supplies them.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-F6 Backups and data retention.** How long are leads kept, and who may export them?
  - Proposed default: leads kept for 24 months unless the client's policy says otherwise, exportable by Super admin and Sales roles. Automated daily database backups on the VPS, with off-server copy to be confirmed.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.

### G. SEO, Analytics and Launch
- **Q-G1 SEO targets.** Which keywords or markets matter most (e.g., "tomato paste Egypt", "LORA tomato", "Egyptian juice exporter")?
  - Proposed default: bilingual metadata per page, sitemap, language alternates for each page, Organization structured data, and a focus on brand names plus "Egypt" and "export" terms. Keyword research is done in Phase 2 if the client wants it.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-G2 Google presence.** Is there a Google Business Profile for the factory or HQ? Is Google Search Console set up for tastinofoods.com?
  - Proposed default: client claims or creates a Google Business Profile and gives access to Search Console. We set both up at launch if missing.
  - **DEFERRED 2026-10-18:** Google Business Profile / Search Console access needed at launch (Phase 9).
- **Q-G3 Analytics.** Is Google Analytics (GA4) or another tool wanted? What counts as a conversion?
  - Proposed default: GA4 with cookie consent. Conversions: distributor form submit, general form submit, email click, phone click.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-G4 Old URLs.** The current site uses hash anchors only (e.g., /#brands). Are there any other public URLs (PDFs, old links in email signatures or directories) that need redirects?
  - Proposed default: root URL stays the same. Old hash anchors map to the matching new page (e.g., #brands to /brands) where practical. Any other old URLs found are redirected.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-G5 Launch readiness.** Who signs off launch and who monitors after go-live?
  - Proposed default: client's decision-maker signs off after staging review. Post-launch support window of 2 weeks for bug fixes, then content maintenance by client team through the admin panel.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.
- **Q-G6 Browser and device support.** Any specific requirements?
  - Proposed default: latest two versions of Chrome, Edge, Safari, Firefox; iOS and Android current versions and one prior version. Mobile-first layout.
  - **RESOLVED 2026-10-18:** Proposed default accepted by user.

---

## Items Explicitly Not Yet Decided
- Final stack confirmation (Phase 6).
- Visual design direction and brand palette (Phase 5, after client brand inputs).
- Epics and stories (Phase 4).
