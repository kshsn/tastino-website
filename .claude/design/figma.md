# Phase 5 — Design Inventory

**Decision (2026-10-18):** The user chose to **skip Figma**. All screens are designed as clickable HTML mockups in `.claude/design/mockup/`, in the same visual system as the approved homepage.

**Preview:** serve `.claude/` on port 5180 (launch config `tastino-mockup`), then open `http://localhost:5180/design/mockup/<file>`.

**Shared system:** `mockup/shared.css` holds the tokens and components, and `mockup/shared.js` holds the header, footer, EN/AR switch and reveal animations.

| # | Screen | File | Epic / stories | Status |
|---|---|---|---|---|
| 1 | Home (EN/AR, animated) | `index.html` | E3 (US-003.x), E1 | Approved 2026-10-18 |
| 2 | Brand page (TAMA example) | `brand.html` | E4 | Batch 1 |
| 3 | Products listing with filters | `products.html` | E4 | Batch 1 |
| 4 | Product detail (TAMA Mango Nectar) | `product.html` | E4 | Batch 1 |
| 5 | Company page (About / Quality / Innovation template) | `about.html` | E5 | Batch 2 |
| 6 | Become a Distributor form, plus success and error states | `distributors.html` | E6 | Batch 2 |
| 7 | Admin login with 2FA | `admin-login.html` | E7 | Batch 3 |
| 8 | Admin lead inbox and lead detail | `admin-leads.html` | E9 | Batch 3 |
| 9 | Admin product editor with EN/AR tabs and publish rules | `admin-product.html` | E8 | Batch 3 |

Every public screen must be checked in English, in Arabic (RTL), and at mobile width (375px).
