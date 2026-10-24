# Tastino Website — CLAUDE.md

Rebuild and modernization of https://tastinofoods.com (Tastino Foods Inc, 10th of Ramadan, Egypt).

## Status
- **Current Phase:** 7
- **Last Completed Phase:** 6 (2026-10-18; /analyze clean)
- **Last Completed Epic:** E6 Leads and Contact (2026-10-24, PR open)
- **Deployment Status:** IN PROGRESS

---

## Project Folder Structure
```
tastino-website/
├── CLAUDE.md
└── .claude/
    ├── requirements.md
    ├── plan.md
    ├── plan-report.md
    ├── epics/
    │   └── epic-001-<slug>.md
    ├── design/
    │   ├── figma.md
    │   └── decisions.md
    ├── tech-stack.md
    └── deployment/
        └── server.md
```

---

## Session Start Checklist
At the start of every session:
1. Read this file to know the current phase
2. Read `.claude/requirements.md` to recall scope
3. Read the relevant epic file for the current epic
4. Ask the user: "Ready to continue Phase [N]?"

---

## Phase Progress
- [x] Phase 1 — Requirements
- [x] Phase 2 — Planning
- [x] Phase 3 — Plan Report
- [x] Phase 4 — Epics & Stories
- [x] Phase 5 — Design (HTML mockups, Figma skipped)
- [x] Phase 6 — Tech Stack
- [ ] Phase 7 — Build
- [ ] Phase 8 — Testing
- [ ] Phase 9 — Deploy
- [ ] Phase 10 — Report

---

## Tech Stack
*(Confirmed in Phase 6 — see `.claude/tech-stack.md`)*
- Framework: Next.js 16.4 (App Router) + React 19, next-intl (EN/AR, RTL)
- Language: TypeScript 5.9
- Database: PostgreSQL (VPS) + Prisma 6.19 (pinned)
- Styling: Tailwind 4 + Framer Motion
- Testing: Vitest, Testing Library, Playwright + axe, Lighthouse CI
- Deployment: existing Hostinger VPS (host details in gitignored `.claude/deployment/server.md`), PM2 + nginx + certbot

---

## GitHub Repo
- URL: https://github.com/kshsn/tastino-website
- Default Branch: main

---

## Notes
- Approved design reference: `.claude/design/mockup/index.html` (serve `.claude/` on port 5180). Official logo: `.claude/source/logo/tastino-logo.svg`. Do NOT modify or redraw it. Official copy: `.claude/source/content/official-copy.md`.
- Current live site (2026-10-18): single-page Vite/React SPA, hash-anchor nav only, 3 images, blank hero, all brands "Coming Soon", placeholder phone `+1 (555) 123-4567`, dead social links, About copy borrowed from Keurig Dr Pepper boilerplate — must be replaced with original copy.
- Brands: Lora (jams), Liora (tomato), Andiamo (sauces), TAMA (juices). Tastino lines (no own brand page): Freshness syrups, traditional beverages, THE LEAF iced tea.
- Scope from kickoff: public site + admin panel (products, brands, distributor leads).
