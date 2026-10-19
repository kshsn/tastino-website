# Tech Stack — Tastino Foods Website

**Date:** 2026-10-18 · **Phase:** 6 · **Status:** CONFIRMED 2026-10-18 (user approved Next 16 over the Next 14 default)
Versions were checked against the npm registry on 2026-10-18. Pin exact versions in `package.json` and commit the lockfile.

---

## Framework & Language
| Package | Version | Notes |
|---|---|---|
| Node.js | 22 LTS (≥ 20.9 required) | Must match the VPS runtime. Verify with `node -v` before deploy. |
| next | **16.4.2** | App Router, server components, ISR and `revalidateTag` after admin edits. **Deviates from the global default (Next 14)**. See Reasoning. |
| react / react-dom | 19.1.10 | Required by Next 16. |
| typescript | 5.9.3 | TypeScript 7 (the native rewrite) is too new for the Next and ESLint toolchain. |
| next-intl | 4.14.9 | `/en` and `/ar` routes, middleware detection by `Accept-Language` and country, RTL via `dir`. |
| zod | 4.6.7 | One validation schema shared by the forms, server actions and admin. |
| react-hook-form | 7.90.0 | Distributor form and admin editors. |
| framer-motion | 14.3.0 | Uses `LazyMotion` + `m`. Reveal, stagger, shelf and hero animations. `useReducedMotion` is respected everywhere. |

## Database & ORM
| Package | Version | Notes |
|---|---|---|
| PostgreSQL | Existing VPS server (version 13) | New database `tastino_prod` with its own user. Staging gets a separate `tastino_staging`. |
| prisma / @prisma/client | **6.19.3 (pinned)** | Prisma 7 changed its config format and broke another app on this same VPS, so we stay on 6.x. |
| Migrations | `prisma migrate deploy` | Any raw-SQL migration (for example a partial index) is also listed in the CI step. This lesson comes from another project on the same VPS. |

## Auth & Security (admin)
| Package | Version | Notes |
|---|---|---|
| bcryptjs | 3.0.3 | Password hashing (cost 12). |
| otplib | 13.5.0 | TOTP 2FA (6 digits, 30 seconds), plus one-time recovery codes stored hashed. |
| Sessions | own implementation | A `Session` table and an httpOnly, Secure, SameSite=Lax cookie. 30 minutes idle and 12 hours absolute timeout. Lockout after 5 failures for 15 minutes. Auth.js v5 is still in beta (5.0.0-beta.32), so I don't recommend it for production. |
| Roles | — | Super admin, Content editor and Sales. Checked in middleware and in every server action. |
| Spam protection | — | Honeypot field, plus a limit of 5 submissions per 10 minutes per IP, stored in Postgres. No CAPTCHA. |

## Styling
| Package | Version | Notes |
|---|---|---|
| tailwindcss | 4.3.3 | Tokens are copied from `design/mockup/shared.css` and `admin.css`: colors, brand accents and radii. Logical properties (`ps-`, `pe-`, `start-`) handle RTL. |
| Fonts | `next/font/google` | Plus Jakarta Sans (English) and Cairo (Arabic), self-hosted and subset. |
| Images | sharp 0.35.5 + `next/image` | Generates AVIF and WebP. Uploads are run through the rembg cutout script, kept in `scripts/`. |
| Logo | `public/brand/tastino-logo.svg` | The official file, unmodified. |

## Email
| Package | Version | Notes |
|---|---|---|
| nodemailer | 10.1.7 | Hostinger SMTP, sending as info@tastinofoods.com. Covers the internal lead notification and the visitor auto-reply. SPF, DKIM and DMARC (`p=none`) are set up at deploy. |

## Testing Tools
| Package | Version | Use |
|---|---|---|
| vitest | 5.0.5 | Unit tests (validation, roles, publish rules) and integration tests against a real Postgres. |
| @testing-library/react | 16.3.3 | Component tests (forms, filters). |
| @playwright/test | 1.64.1 | End-to-end tests in English and Arabic: lead submit, admin login with 2FA, publishing, role locks. |
| @axe-core/playwright | 4.14.0 | WCAG 2.1 AA checks inside the end-to-end tests. |
| Lighthouse CI | latest | Mobile performance must score 85 or higher on Home, Brand, Product and Distributors. |
| eslint-config-next | 16.4.2 | Linting. `tsc --noEmit` runs in CI. |
| CSV export | papaparse 5.7.0 | Admin lead export. |

## Deployment Platform
- **Server:** the existing shared Hostinger VPS. Host, user and paths are in the gitignored `.claude/deployment/server.md`.
- **Process:** PM2 app `tastino-web` on **port 3060**. Ports 3000–3005, 3020, 3040, 3099 and 3200 are taken. Check that 3060 is free before deploying.
- **Web server:** an nginx vhost for `tastinofoods.com` and `www`, and a staging vhost `staging.tastinofoods.com` behind basic auth. Certificates from Let's Encrypt via certbot.
- **Media:** `/var/www/tastino/uploads`, served directly by nginx with long cache headers.
- **Backups:** a daily `pg_dump` at 02:00, kept for 14 days. An off-server copy is still to be decided.
- **CI:** GitHub Actions running typecheck, lint, unit and integration tests (with a Postgres service), then the build. Deploys go through `/deploy` and `deploy-agent`, with a health check and rollback.
- **Cutover:** switch the nginx vhost from the old static SPA to the new app. Keep the old build for 7 days. Old `#anchor` links redirect on the client side.

---

## Reasoning
1. **Next 16 instead of the default Next 14.** Next 14 is two major versions behind and its support window has ended. Next 16 + React 19 + Prisma 6 already runs in production on this VPS (another project), so the setup is known to work there. The App Router, ISR and server actions cover public pages and the admin panel in one app.
2. **Prisma 6 pinned.** The newest Prisma 7 config format is incompatible with that proven setup on this server's PostgreSQL 13. Prisma 6.19 is mature and fully supports everything in our data model.
3. **Our own sessions plus TOTP.** The 2FA, lockout and timeout rules are specific and must be testable. A small session table is simpler and safer than depending on a beta auth library.
4. **Tailwind 4 with logical properties.** This is the cleanest way to get true RTL Arabic layouts from one codebase. The mockup tokens carry over directly.
5. **Framer Motion with LazyMotion.** It reproduces the approved animations while keeping the JavaScript bundle small, which matters for the mobile Lighthouse target of 85.
6. **Same VPS, same tooling as your other projects.** No new hosting costs. Deploys follow the existing PM2 and nginx pattern and `deploy-agent`.
