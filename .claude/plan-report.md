# Plan Report — Tastino Foods Website

**Date:** 2026-10-18 · **Phase:** 3 (Plan Report) · **Status:** CONFIRMED 2026-10-18
**Builds on:** `requirements.md` (Phase 1 confirmed), `plan.md` (Phase 2 confirmed), and the approved mockup `design/mockup/index.html`

---

## Solution Overview
We are rebuilding tastinofoods.com from scratch as a modern, animated, bilingual (English and Arabic, with Arabic right-to-left) corporate website. It is aimed at distributors, wholesalers, supermarket chains and HORECA buyers in Egypt and MENA.

The site presents Tastino Foods Inc and its brands:
- **Lora:** jams
- **Liora:** tomato products
- **Andiamo:** sauces and tahini
- **TAMA:** juices and nectars
- **Tastino lines:** Freshness syrups, traditional beverages, THE LEAF iced tea

It uses the official copy, packshots and logo. Every page leads to a distributor or catalogue request, or to WhatsApp. Leads are saved in the database and emailed to info@tastinofoods.com.

A private admin panel with three roles lets the team manage brands, products, media, the hero slides, page copy and leads without a developer.

The site is built on Next.js 16, React 19, TypeScript, Tailwind 4, PostgreSQL and Prisma 6, and hosted on the existing Hostinger VPS.

**Visual reference:** the homepage mockup approved on 2026-10-18 (E Chips-inspired: warm white base, per-brand accent colors, floating packshots, scroll animations).

---

## Epic Breakdown
| # | Epic | Description | Effort | Release |
|---|---|---|---|---|
| E1 | Foundation | Repo, Next.js setup, design tokens from the mockup, `/en` and `/ar` routing with automatic detection and RTL, layout, header and footer with the official logo | M | MVP |
| E2 | Data and media | Prisma model (brands, products, variants, media, leads, users, page copy), seed from the catalogue, cutout and image-size pipeline | M | MVP |
| E3 | Animated homepage | Every mockup section, built as reusable animated components that respect reduced motion | L | MVP |
| E4 | Brands and products | Brands index, one page per brand, product listing with filters, product detail pages, Tastino lines page | L | MVP |
| E5 | Company pages | About, Quality, Innovation, Privacy, Terms | S | MVP (basic) / R2 polish |
| E6 | Leads and contact | Distributor and catalogue form, validation, spam protection, email to info@, WhatsApp and phone links, inline success screen with auto-reply | M | MVP |
| E7 | Admin access | Login, 2FA, three roles, user management, audit log | M | MVP (basic) / R2 full |
| E8 | Admin content management | Edit brands, products, variants, media, hero slides, page copy and settings in both languages | L | MVP (basic) / R2 full |
| E9 | Admin leads | Lead inbox with statuses, notes, assignee, archive and CSV export | S | MVP |
| E10 | SEO and quality | Language alternates (hreflang), sitemap, structured data, GA4 after consent, performance and accessibility pass | M | MVP (metadata, sitemap, performance, accessibility, browser pass) / R2 (structured data, GA4 + consent, conversion events) |
| E11 | Deploy and cutover | Staging subdomain, production on the VPS, SSL, backups, email DNS records (SPF/DKIM/DMARC), redirects, rollback plan | M | MVP |

**Effort scale:** S is about 1–2 days, M about 3–5 days, L about 1–2 weeks.

---

## Key Decisions
- **Positioning:** a business-to-business lead generation site only. There is no online ordering or pricing.
- **Languages and markets:** English and Arabic only. Language is auto-detected and kept in the URL. Markets are Egypt and MENA.
- **Brand architecture:**
  - Lora and Liora are separate brands. Lora is jams; Liora is tomato products.
  - Freshness, the traditional beverages and THE LEAF are Tastino lines without their own brand pages.
  - 400g is the standard pack size for jams and sauces.
- **Content rules:**
  - Official copy only (`source/content/official-copy.md`).
  - The official logo SVG is used as-is and never redrawn or modified.
  - The website uses correct spelling, even where labels have typos.
- **Leads:** saved in the database and emailed to info@tastinofoods.com only. No CRM in version 1.
- **Admin:** three roles (Super admin, Content editor, Sales) with two-factor login. Every item has an English and an Arabic version, and both are required before it can be published.
- **Motion:** animations are part of the brand. They respect reduced-motion settings, and mobile Lighthouse performance must be 85 or higher.
- **Stack and hosting:** Next.js 16, React 19, TypeScript, Tailwind 4, PostgreSQL, Prisma 6, `next-intl` and Framer Motion, on the existing Hostinger VPS with PM2, nginx and certbot. Confirmed in Phase 6 (`tech-stack.md`).

---

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Low-resolution source packshots (the Andiamo lineup is about 380px tall) | Request packshots at 2000px or larger. Until then, show them at limited sizes. |
| Jam packshots are labelled Liora, but jams are Lora | Client supplies Lora-labelled packshots. Until then, use the Lora lineup image. |
| Missing images for THE LEAF, the traditional beverages and some flavours | The admin panel shows placeholders. Client supplies the images. |
| Label typos and old sizes (KATCHUP, SESAM, 420g) | The website uses correct spelling and 400g. Fixing the labels is the client's decision. |
| Arabic copy is shorter than the English | Publish the official Arabic as written. The client can extend it in the admin panel. |
| Animations could hurt mobile performance | Load animation code only when needed, use AVIF images, test performance on mobile, honour reduced motion. |
| The VPS is shared with other apps | Separate port, PM2 app and database. Check memory before deploying. |
| Lead emails may land in spam | Set up SPF, DKIM and DMARC. Leads are always saved in the admin panel as a backup. |
| Cutover downtime or SEO loss | Launch on staging first, switch over through nginx, keep a 7-day rollback, redirect old URLs. |
| Deferred inputs: certifications, factory photos, social accounts, legal texts, final SKU list | Build the sections anyway and fill them in when the material arrives. Legal texts are required before launch. |

---

## Out of Scope
- Online ordering, e-commerce, a shopping cart or payments.
- Visitor accounts, logins or loyalty programmes.
- A native mobile app.
- CRM integration (leads are exported to CSV instead).
- Publishing prices or showing multiple currencies.
- Languages other than English and Arabic (no French).
- A blog or news section.
- Carrying over the old site's content.

---

## Success Criteria
- All copy is the official Tastino content in English and Arabic. There is no placeholder text or borrowed boilerplate.
- Contact details are real, and there are no dead links. Social links appear only once the accounts are confirmed.
- A visitor can submit a distributor or catalogue request in either language. The lead appears in the admin panel and an email reaches info@tastinofoods.com.
- An admin can add or edit a brand, product or content block in both languages and publish it without a developer.
- Arabic pages are fully right-to-left, with correct typography and no layout breaks on mobile.
- The homepage matches the approved mockup, animations included. Animations turn off for reduced-motion visitors.
- Mobile Lighthouse performance is 85 or higher, Core Web Vitals are "good", the site meets WCAG 2.1 AA, and main pages have no console errors.
- Both languages are fully indexable: sitemap, metadata and language alternates (hreflang) are in place.
- The site is live over HTTPS on tastinofoods.com and replaces the old site without breaking the lead flow.
