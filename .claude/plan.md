# Plan — Tastino Foods Website

**Date:** 2026-10-18 · **Phase:** 2 (Planning) · **Status:** CONFIRMED 2026-10-18
**Inputs:** `requirements.md` (confirmed), the approved mockup `design/mockup/index.html`, `source/content/official-copy.md`, `source/cutouts/`, and `source/logo/tastino-logo.svg`

---

## 1. Solution Approach

A bilingual (English and Arabic, with Arabic shown right-to-left) corporate website for tastinofoods.com. It is built to generate leads from distributors and export buyers in Egypt and MENA. The team manages it through its own admin panel.

**How it works:**
1. **Arriving.** A visitor lands on the site and is sent to `/ar` or `/en` automatically, based on their browser language and region. A language switch is visible on every page, and the choice is remembered.
2. **Browsing.** They browse the animated homepage, then the brand pages (Lora, Liora, Andiamo, TAMA), product pages, and the company pages (About, Quality, Innovation).
3. **Getting in touch.** Every page leads to one of three ways to contact Tastino:
   - The **Become a Distributor** form.
   - **WhatsApp** (+20 110 011 1887).
   - **Request catalogue**, which is the same form with the reason pre-set to catalogue.
4. **Handling leads.** Every form submission is saved in the database and emailed to info@tastinofoods.com. The sales team handles leads in the admin panel.
5. **Managing content.** Staff edit brands, products, the hero slides, page copy and media in the admin panel, in both languages, without a developer.

**Sitemap (each page in `/en` and `/ar`):**
- `/` Home. It follows the approved mockup: hero showcase, value strip, About, Brands, product strip, Food Safety, Innovation, Portfolio shelf, Partnership call to action.
- `/about`, `/quality`, `/innovation`
- `/brands` (index), then one page per brand: `/brands/lora`, `/brands/liora`, `/brands/andiamo`, `/brands/tama`
- `/products` (filter by brand, category and pack type), then `/products/[slug]` for each product
- `/products/tastino-lines` for Freshness syrups, the traditional beverages and THE LEAF, which belong to Tastino rather than to a brand
- `/distributors` (pitch, contact details and the one form with 4 reason tabs; inline success screen); `/contact` 301-redirects here
- `/privacy`, `/terms`
- `/admin/*` (private)

---

## 2. Key Technical Decisions
These are proposals. The stack is formally confirmed in Phase 6.

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 16 App Router + React 19 + TypeScript (confirmed in Phase 6, see `tech-stack.md`) | Updated from the Next 14 default. Pages are rendered on the server for SEO, and public pages are pre-built and refreshed whenever content changes. |
| Languages | `next-intl`, locale in the URL (`/en`, `/ar`), automatic detection in middleware, `dir="rtl"` for Arabic | Gives search engines a separate page per language, and Arabic layout works properly. |
| Styling | Tailwind with design tokens taken from the mockup: per-brand accent colors, Plus Jakarta Sans for English, Cairo for Arabic | Reproduces the approved look exactly. Tailwind's logical properties (`ps/pe`) handle right-to-left layout. |
| Animation | Framer Motion (`LazyMotion`) plus CSS keyframes, the same motions as the mockup | Each animation turns off when the visitor has asked for reduced motion. Target: mobile Lighthouse performance score of 85 or higher. |
| Data | PostgreSQL + Prisma | Your default. Each table holds both languages, e.g. `nameEn`/`nameAr`. |
| Data model | Brand, Category, Product, ProductVariant (size and pack type), MediaAsset, HeroSlide, PageBlock (editable copy), Setting, Lead, LeadNote, User, AuditLog | Covers everything in the requirements, including lead statuses, assignee and archive. |
| Admin auth | Auth.js login with email and password, plus a one-time code from an authenticator app (2FA), session timeout, lockout after repeated failures | Three roles: Super admin, Content editor, Sales. |
| Media | Uploaded to the VPS disk and served by nginx. `sharp` resizes images and converts them to WebP/AVIF. The product cutout script is kept in the repo. | No paid storage needed. Product cutouts stay consistent. |
| Email | Nodemailer over Hostinger SMTP, sending as info@ | Needs SPF and DKIM records on the domain, so emails don't land in spam. |
| Spam protection | Hidden honeypot field plus a limit on submissions per IP address | As agreed in requirements. No CAPTCHA, so no extra effort for real visitors. |
| SEO | Each page links its other-language version (hreflang), plus a sitemap, Organization and Product structured data, Open Graph images, and redirects from the old `#anchor` links | Lets search engines index both languages correctly. |
| Analytics | GA4, loaded only after cookie consent. Tracked conversions: form submit, WhatsApp click, phone click. | As agreed in requirements. |
| Hosting | The existing Hostinger VPS: PM2 + nginx + certbot, Postgres on the same server, a daily database backup | Same setup as your other projects. Staging runs on a subdomain before cutover. |

---

## 3. Risks and Open Questions

| # | Risk / question | Impact | Mitigation |
|---|---|---|---|
| R1 | **Some source images are low resolution.** The Andiamo lineup bottles are only about 380px tall, and some single packshots are under 1000px. | They look blurry on large screens. | Ask for high-res packshots (2000px or more, PNG or TIFF). Until then, show the current images at limited sizes. |
| R2 | **The jam packshots carry the Liora name**, but jams are under Lora. | The wrong brand shows on product pages. | Client to send Lora-labelled packshots before content entry. Until then, use the Lora lineup image. |
| R3 | **Some product lines have no images:** THE LEAF, the traditional beverages, and several TAMA and jam flavours. | Product pages would be empty. | Admin shows "image coming soon" placeholders. Client supplies the images. |
| R4 | **Typos and old sizes on labels** (KATCHUP, SESAM, ORANG, 420g). | The website spelling and the packshots don't match. | The website uses correct spelling and 400g everywhere. Labels are the client's call. |
| R5 | **Arabic copy is shorter** than the English in places. | The two language versions of a page don't match in length. | Show the official Arabic as written. The client can extend it in the admin panel. |
| R6 | **Animations could slow down mobile.** | Worse SEO and user experience. | Load animation code only when needed, use AVIF images, test on mobile, and turn motion off for reduced-motion visitors. |
| R7 | **The VPS is shared with other apps.** | Port and memory conflicts. | Give the site its own port, PM2 app and Postgres database. Check memory before deploying. |
| R8 | **Email sent from the VPS may land in spam.** | Missed leads. | Set up SPF, DKIM and DMARC. Leads are always saved in the admin panel anyway. |
| R9 | **Cutover from the old site.** | Downtime and SEO loss. | Launch on staging first, cut over through nginx, keep the old build for 7 days for rollback, and redirect old URLs. |
| Q1 | Exact list of SKUs per brand (flavours and sizes). | Products need it before content entry. | Client confirms from the catalogue. |
| Q2 | Certifications, factory photos and social accounts (deferred). | Missing trust signals on the site. | The sections are built anyway and fill in when the material arrives. |

---

## 4. Suggested Epics (names only) and Effort

| # | Epic | Effort |
|---|---|---|
| E1 | Foundation: repo, Next.js, Tailwind tokens, bilingual routing with RTL, layout, header and footer with the official logo | M |
| E2 | Data model, seed data from the catalogue, media pipeline (cutouts, image sizes) | M |
| E3 | Animated homepage (matches the approved mockup) | L |
| E4 | Brands and products catalogue (brand pages, product listing with filters, product detail pages) | L |
| E5 | Company pages: About, Quality, Innovation, Privacy, Terms | S |
| E6 | Distributor and contact leads: form, validation, spam protection, email, WhatsApp and phone links, inline success screen | M |
| E7 | Admin: login, 2FA, roles, users, audit log | M |
| E8 | Admin: content management for brands, products, variants, media, hero slides, page copy and settings, in both languages | L |
| E9 | Admin: lead inbox with statuses, notes, assignee, archive and CSV export | S |
| E10 | SEO, analytics with cookie consent, performance and accessibility pass | M |
| E11 | Deploy: staging, production, SSL, backups, email DNS records, cutover with redirects | M |

**Effort scale:** S is about 1–2 days, M about 3–5 days, L about 1–2 weeks.
**MVP (first launch):** E1, E2, E3, E4, E6, E9 and E11, plus the basic parts of E7 and E8.
**Second release:** E5 polish, the full E8, and E10 extras.
