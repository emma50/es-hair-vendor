# Emmanuel Sarah Hair — Spec Driven Development Document

**Project Codename:** ESHair
**Target Domain:** eshair.com
**Document Version:** 3.0
**Date:** April 1, 2026
**Engineer:** Emmanuel Okwuidegbe
**Client:** Sarah — Human Hair Boutique, Lagos, Nigeria
**Methodology:** Spec-Driven Development (SDD)
**Status:** Pre-Implementation — This document is the single source of truth. When this document and the code disagree, update whichever is wrong.

---

## Table of Contents

1. Executive Summary
2. Business Context & Objectives
3. Target Users & Personas
4. Functional Requirements
5. Non-Functional Requirements
6. Technology Stack & Version Pinnings
7. System Architecture
8. Project Directory Structure
9. Data Models & Database Schema
10. Authentication & Authorization
11. API & Data Layer Design
12. UI/UX Design System
13. Page-by-Page Specifications
14. WhatsApp-First Commerce
15. Payment Integration — Paystack
16. Media Management — Cloudinary
17. Shopping Cart System
18. Order Lifecycle
19. Admin Dashboard
20. Search Engine Optimization
21. Core Web Vitals & Performance
22. Accessibility (WCAG 2.1 AA)
23. Security
24. Error Handling & Resilience
25. Testing Strategy
26. Deployment & Infrastructure
27. Environment Variables
28. Dependency Manifest
29. Phased Rollout Plan
30. Risks, Constraints & Mitigations
31. Glossary

---

## 1. Executive Summary

Emmanuel Sarah Hair (ESHair) is a production e-commerce web application for a small human hair boutique in Lagos, Nigeria. The client, Sarah, operates from a modest physical shop and sells human hair products — bundles, closures, frontals, wigs, and accessories — in moderate quantities. She is not a large-scale distributor; she is a hands-on retailer who knows her customers personally and communicates with them primarily via WhatsApp.

The application serves two fundamental purposes. First, it gives Sarah a professional online presence — a digital storefront that conveys luxury, trust, and reliability to potential customers who discover her through social media, search engines, or word-of-mouth referrals. Second, it gives her operational tools — an admin dashboard where she can manage her product catalog, track orders, and monitor her business without needing a developer.

WhatsApp is treated as a first-class checkout channel, not an afterthought. In the Nigerian e-commerce context, many customers — especially for high-value products like human hair — prefer to speak with the seller before committing to a purchase. The application meets customers where they are: they can browse the catalog, build a cart, and then either pay directly through Paystack or send a pre-formatted order to Sarah's WhatsApp for a more personal transaction.

---

## 2. Business Context & Objectives

### 2.1 The Client's Situation

Sarah runs a small, physical human hair boutique in Lagos. Her shop is not spacious, and her inventory is curated rather than voluminous. She currently acquires customers through word-of-mouth, social media (Instagram, Facebook), and WhatsApp referrals. She has no online catalog — potential customers who find her on social media must DM her to ask about products, pricing, and availability. This creates friction, limits her reach, and means she misses customers who want to browse and compare before reaching out.

### 2.2 Business Objectives

**Visibility:** Be findable on Google and shareable on social media. When someone searches "buy human hair Lagos" or receives a link from a friend, they should land on a professional, trustworthy storefront — not a WhatsApp chat.

**Revenue Growth:** Convert browsing into buying. Customers who can see products, prices, and stock status are more likely to purchase than customers who have to ask about each item individually.

**Reliability & Trust:** A professional website with clear product photography, transparent pricing, and secure payment options signals legitimacy. In a market where scams are common, this is a competitive advantage.

**Customer Acquisition:** Pull in new customers who discover the shop through search engines, social media sharing, or link-in-bio referrals from Instagram.

**Customer Retention:** Give existing customers a reason to come back — a well-organized catalog they can bookmark, share with friends, and return to when they need a restock.

**Operational Efficiency:** Sarah should be able to add new products, update prices, mark items as sold out, and view incoming orders without calling a developer. The admin dashboard is her self-service control panel.

### 2.3 Success Metrics

| Metric                          | Target                         | Measurement                  |
| ------------------------------- | ------------------------------ | ---------------------------- |
| Monthly unique visitors         | 500+ within 3 months of launch | Vercel Analytics             |
| Conversion rate (visit → order) | 2–5%                           | Orders / unique visitors     |
| Average order value             | ₦50,000+                       | Order data                   |
| Page load time (LCP)            | < 2.5s on 4G, < 3.5s on 3G     | Lighthouse, Web Vitals       |
| Mobile usability score          | 95+                            | Google Lighthouse            |
| Admin task completion time      | < 2 minutes per product update | Qualitative (Sarah feedback) |
| WhatsApp inquiry rate           | Track clicks on WhatsApp CTAs  | Analytics events             |

---

## 3. Target Users & Personas

### 3.1 Primary: The Buyer — "Chioma"

Chioma is a 28-year-old professional woman living in Lagos. She buys human hair every 2–3 months, spending ₦50,000–₦200,000 per purchase. She shops primarily on her phone during her commute or lunch break. She discovered Sarah through an Instagram post a friend shared.

**Behaviors:** Browses on mobile, compares products visually (photos matter more than specs), checks prices before reaching out, prefers WhatsApp for questions but will pay online if she trusts the site. She is comfortable with Paystack and bank transfers. She will abandon a site that loads slowly or looks unprofessional.

**Needs:** Beautiful product photos, clear pricing in Naira, easy comparison across product types, visible stock status ("Is this available?"), fast checkout without account creation, WhatsApp access for questions, and reassurance that the seller is legitimate.

**Frustrations:** Slow websites on Lagos network conditions, sites that require account creation before browsing, hidden prices ("DM for price"), unclear product descriptions, and no way to know if something is in stock.

### 3.2 Secondary: The Store Owner — "Sarah"

Sarah is a non-technical business owner in her 30s. She manages her boutique, selects and sources inventory, handles customer relationships personally via WhatsApp, and takes product photos on her phone. She does not want to learn to code, use a terminal, or navigate a complex CMS.

**Behaviors:** Uses her phone and occasionally a laptop. Manages everything through WhatsApp and Instagram. Adds new inventory weekly. Responds to customer questions within minutes during business hours.

**Needs:** A simple admin dashboard where she can add/edit/remove products (including uploading photos from her phone), see incoming orders, update order status, and change basic store settings (shipping fees, announcement bar). She needs to do all of this without developer assistance.

**Frustrations:** Complex interfaces with too many options, unclear error messages, losing unsaved work, and any workflow that requires more than 3 clicks for a common task.

### 3.3 Tertiary: The Gift Buyer — "Tunde"

Tunde is buying human hair as a birthday gift for his girlfriend. He doesn't know the difference between a "closure" and a "frontal." He found the site through a Google search.

**Needs:** Clear category descriptions, a "help me choose" path (leading to WhatsApp), a way to see what's popular, and confidence that his payment is secure. He may not know what length or texture to pick, so the WhatsApp inquiry option is critical for him.

---

## 4. Functional Requirements

### 4.1 Public Storefront

| ID   | Requirement                                                                                         | Priority |
| ---- | --------------------------------------------------------------------------------------------------- | -------- |
| F-01 | Display a home page with hero imagery, featured categories, and featured products                   | Must     |
| F-02 | Display a product listing page with all active products, filterable by category                     | Must     |
| F-03 | Display individual product detail pages with images, description, price, variants, and stock status | Must     |
| F-04 | Allow customers to add products (with variant selection) to a persistent shopping cart              | Must     |
| F-05 | Display a cart page/drawer showing all items, quantities, and totals                                | Must     |
| F-06 | Allow customers to proceed to checkout and pay via Paystack (card, bank transfer, USSD)             | Must     |
| F-07 | Allow customers to send their cart as a pre-formatted WhatsApp message to Sarah                     | Must     |
| F-08 | Display a floating WhatsApp button on every public page                                             | Must     |
| F-09 | Generate dynamic Open Graph images for social media sharing (product pages)                         | Should   |
| F-10 | Display an announcement bar at the top of the storefront (configurable by admin)                    | Should   |
| F-11 | Display product search with instant results                                                         | Could    |
| F-12 | Display "Related Products" on product detail pages                                                  | Should   |
| F-13 | Display breadcrumb navigation on product and category pages                                         | Should   |
| F-14 | Display a custom 404 page matching the store's brand                                                | Must     |

### 4.2 Admin Dashboard

| ID   | Requirement                                                                                                                              | Priority |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F-20 | Authenticate Sarah via email/password before accessing the admin dashboard                                                               | Must     |
| F-21 | Display a dashboard overview with revenue summary, recent orders, and low-stock alerts                                                   | Must     |
| F-22 | Allow full CRUD operations on products: create, read, update, soft-delete                                                                | Must     |
| F-23 | Allow image upload for products via a drag-and-drop or file picker interface                                                             | Must     |
| F-24 | Allow reordering of product images (set primary image, change sort order)                                                                | Should   |
| F-25 | Allow creation and management of product variants (length, color, texture) with individual pricing and stock                             | Must     |
| F-26 | Allow management of product categories: create, edit, reorder, deactivate                                                                | Must     |
| F-27 | Display a list of all orders with filtering by status, date range, and channel (Paystack vs WhatsApp)                                    | Must     |
| F-28 | Allow updating order status through the fulfillment lifecycle                                                                            | Must     |
| F-29 | Allow one-click "Message Customer on WhatsApp" from the order detail page                                                                | Should   |
| F-30 | Allow updating store settings: store name, phone, WhatsApp number, shipping fee, free shipping threshold, announcement bar text          | Must     |
| F-31 | Allow toggling maintenance mode (shows "Under Maintenance" page to public visitors)                                                      | Should   |
| F-32 | Display basic analytics: total revenue, order count, top-selling products (calculated from order data, not a third-party analytics tool) | Could    |

### 4.3 Checkout & Payments

| ID   | Requirement                                                                                                        | Priority |
| ---- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| F-40 | Collect customer details at checkout: name, phone (required), email (optional), delivery address, city, state      | Must     |
| F-41 | Calculate order total including shipping fee (flat rate from store settings, waived above free shipping threshold) | Must     |
| F-42 | Process payment via Paystack inline popup (card, bank transfer, USSD, bank)                                        | Must     |
| F-43 | Verify payment via Paystack webhook before confirming order                                                        | Must     |
| F-44 | Display order confirmation page with order number and summary after successful payment                             | Must     |
| F-45 | Handle payment failure gracefully: display clear error message, allow retry without losing form data               | Must     |
| F-46 | Generate unique order numbers in a human-readable format (e.g., ESH-20260401-0001)                                 | Must     |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement                                               | Target                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Largest Contentful Paint (LCP)                            | < 2.5s on 4G; < 3.5s on 3G                                               |
| First Input Delay (FID) / Interaction to Next Paint (INP) | < 200ms                                                                  |
| Cumulative Layout Shift (CLS)                             | < 0.1                                                                    |
| Time to Interactive (TTI)                                 | < 3.5s on 4G                                                             |
| Total JavaScript bundle (initial load, public pages)      | < 150 KB gzipped                                                         |
| Image delivery                                            | Automatic format selection (WebP/AVIF), responsive sizing, CDN-delivered |

### 5.2 Accessibility

| Requirement           | Standard                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| WCAG compliance level | 2.1 AA minimum                                                                                                           |
| Keyboard navigability | All interactive elements reachable and operable via keyboard                                                             |
| Screen reader support | Semantic HTML, ARIA labels where necessary, live regions for dynamic content                                             |
| Color contrast        | Minimum 4.5:1 for normal text, 3:1 for large text                                                                        |
| Focus indicators      | Visible focus ring on all interactive elements (never removed, custom-styled to match brand)                             |
| Motion sensitivity    | Respect `prefers-reduced-motion` — disable animations and transitions                                                    |
| Touch targets         | Minimum 44×44px on mobile                                                                                                |
| Form accessibility    | Labels associated with inputs, error messages linked via `aria-describedby`, required fields marked with `aria-required` |

### 5.3 Security

| Requirement        | Implementation                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| HTTPS              | Enforced on all routes (Vercel default)                                                                             |
| Authentication     | Supabase Auth with secure httpOnly session cookies                                                                  |
| Authorization      | Admin routes protected by middleware; public routes fully open                                                      |
| Payment security   | Paystack handles card data — application never touches card numbers; webhook signatures verified via HMAC-SHA512    |
| Input validation   | All user inputs validated server-side with schema validation (Zod) before any database write                        |
| SQL injection      | Prevented by Prisma ORM parameterized queries — raw SQL is never used                                               |
| XSS prevention     | React's default output escaping; Content Security Policy headers; no `dangerouslySetInnerHTML` without sanitization |
| CSRF protection    | Built into Next.js Server Actions                                                                                   |
| Rate limiting      | Applied to checkout and webhook endpoints                                                                           |
| Secret management  | All secrets stored as environment variables, never committed to version control                                     |
| Image uploads      | Signed Cloudinary uploads only — prevents unauthorized uploads to the media account                                 |
| Row Level Security | Supabase RLS policies on all tables — public read for products, admin-only for orders and settings                  |

### 5.4 Scalability & Maintainability

| Requirement          | Strategy                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Horizontal scaling   | Serverless deployment on Vercel — auto-scales with traffic                                                    |
| Database scaling     | Supabase managed PostgreSQL — connection pooling via Supavisor, read replicas available if needed             |
| Image scaling        | Cloudinary CDN with global edge delivery — no self-hosted image server                                        |
| Code maintainability | TypeScript strict mode, consistent project structure, component co-location, no prop drilling beyond 2 levels |
| Dependency updates   | Tilde (~) ranges for framework dependencies, caret (^) for utilities — prevents unexpected breaking changes   |

### 5.5 Responsiveness

| Breakpoint       | Width       | Target Devices                                               |
| ---------------- | ----------- | ------------------------------------------------------------ |
| Mobile (default) | 0–639px     | Phones (iPhone SE through iPhone 16 Pro Max, Samsung Galaxy) |
| Tablet           | 640–1023px  | iPad Mini, iPad Air, small laptops                           |
| Desktop          | 1024–1279px | Laptops, standard monitors                                   |
| Wide             | 1280px+     | Large monitors, ultrawide                                    |

The application is designed mobile-first. All layouts, typography, and interactions are defined for mobile first, then progressively enhanced for larger screens. This reflects the reality that 80%+ of traffic will come from mobile devices in the Lagos market.

---

## 6. Technology Stack & Version Pinnings

All versions are pinned to the latest stable LTS release as of April 1, 2026. The governing principle is **"latest stable, not bleeding edge"** — every technology chosen has been in production for at least 3–6 months and is in an active support window.

### 6.1 Runtime & Language

| Technology     | Pinned Version      | Channel              | Support Window                            | Rationale                                                                                                                                                                                                                                                |
| -------------- | ------------------- | -------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**    | 24.x LTS (24.14.1)  | Active LTS "Krypton" | Active → Oct 2026, Maintenance → Apr 2028 | Production applications must run on Active or Maintenance LTS. Node 25 is Current (not LTS) and Node 22 "Jod" is entering late Maintenance. Node 24 is the correct production choice.                                                                    |
| **TypeScript** | 6.0.x (6.0.2)       | Stable               | Final JS-based release                    | TS 6.0 is the bridge between TS 5.9 and the upcoming Go-native TS 7.0. It aligns type-checking behavior with 7.0 while maintaining full ecosystem compatibility. TS 7.0 is still in preview and does not yet support the Strada API required by tooling. |
| **pnpm**       | 9.x (latest stable) | Stable               | Actively maintained                       | Preferred over npm for strict dependency resolution, faster installs via content-addressable storage, and native workspace support. Recommended by the Next.js team.                                                                                     |

### 6.2 Framework & UI

| Technology       | Pinned Version            | Rationale                                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next.js**      | ~15.5.0 (Maintenance LTS) | 6+ months of production hardening. Full App Router, React Server Components, Server Actions, Turbopack dev server, ISR, and Middleware. Next.js 16.x is the current Active release but has not had sufficient production hardening for a client project. Upgrade path to 16.x is well-documented when ready. |
| **React**        | ~19.2.4                   | Required by Next.js 15. Includes Server Components, Server Actions, the Activity API, Suspense improvements, and the `use` hook.                                                                                                                                                                             |
| **React DOM**    | ~19.2.4                   | Must match React version exactly.                                                                                                                                                                                                                                                                            |
| **Tailwind CSS** | ~4.2.2                    | Complete rewrite from v3. CSS-native configuration via `@theme` directives replaces the JavaScript config file. Rust-based engine delivers 5x faster builds. Uses cascade layers, registered custom properties via `@property`, and OKLCH color space by default.                                            |

### 6.3 Backend & Database

| Technology                | Pinned Version         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase (Platform)**   | Managed cloud (latest) | Managed PostgreSQL with built-in Auth, Storage, Realtime subscriptions, and Edge Functions. The platform auto-updates; we pin client libraries. PostgREST v14 is the current data API with ~20% RPS improvement and JWT caching.                                                                                                                                                                                 |
| **@supabase/supabase-js** | ^2.99.0                | Isomorphic JavaScript client for Auth, database queries, Storage, Realtime, and Edge Functions. v2.99.3 includes auth guard improvements and storage error detection fixes.                                                                                                                                                                                                                                      |
| **@supabase/ssr**         | ^0.6.0                 | Server-side cookie management for Supabase Auth in Next.js App Router. Required for middleware-based session validation.                                                                                                                                                                                                                                                                                         |
| **Supabase CLI**          | 2.84.x                 | Local development environment, database migrations, type generation, and Edge Function management.                                                                                                                                                                                                                                                                                                               |
| **Prisma ORM**            | ~7.4.0 (GA)            | Major v7 rewrite: the Rust query engine is replaced with a TypeScript-native query compiler running on the JS main thread. Ships as ES modules. Configuration moved from `.env` auto-loading to an explicit `prisma.config.ts` file. Requires driver adapters (@prisma/adapter-pg) for PostgreSQL. Includes mapped enums, rebuilt Prisma Studio, and a query compilation cache for high-concurrency performance. |
| **@prisma/client**        | ~7.4.0                 | Auto-generated, type-safe query builder. Must match the Prisma CLI version exactly.                                                                                                                                                                                                                                                                                                                              |
| **@prisma/adapter-pg**    | ~7.4.0                 | Required driver adapter connecting Prisma's TypeScript query compiler to PostgreSQL via the `pg` driver. Replaces the previous binary engine approach.                                                                                                                                                                                                                                                           |

### 6.4 Payments

| Technology              | Pinned Version   | Rationale                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@paystack/inline-js** | ^2.22.0 (2.22.8) | Paystack's official client-side library for loading the checkout popup. Supports card, bank transfer, USSD, and bank payment channels. Can be loaded via CDN (`https://js.paystack.co/v2/inline.js`) or npm. Server-side payment verification is done via Paystack's REST API — no dedicated server SDK is required. |

### 6.5 Media & Image Management

| Technology                | Pinned Version   | Rationale                                                                                                                                                                                                                 |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **next-cloudinary**       | ^6.17.0 (6.17.5) | Community-maintained Next.js integration providing `CldImage` (wraps Next.js Image with Cloudinary transformations), `CldUploadWidget` (signed upload interface), and `CldOgImage` (dynamic Open Graph image generation). |
| **cloudinary** (Node SDK) | ^2.9.0           | Server-side SDK for programmatic uploads, transformations, and admin API calls. Used in the signed upload route handler and for server-side image operations.                                                             |

### 6.6 Client-Side State & Utilities

| Technology         | Pinned Version | Purpose                                                                                                                                                                                                                            |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zustand**        | ^5.0.0         | Lightweight state management for the shopping cart. Persisted to localStorage via Zustand's `persist` middleware. Chosen over React Context for its simplicity, performance (no unnecessary re-renders), and built-in persistence. |
| **Zod**            | ^3.24.0        | Schema validation for all form inputs (checkout form, admin product form, settings form). Used both client-side (for instant feedback) and server-side (in Server Actions, as the canonical validation layer).                     |
| **clsx**           | ^2.1.0         | Conditional CSS class composition.                                                                                                                                                                                                 |
| **tailwind-merge** | ^3.0.0         | Intelligent Tailwind class merging to resolve conflicts when composing utility classes.                                                                                                                                            |
| **Lucide React**   | ^0.468.0       | Icon library. Tree-shakeable, accessible SVG icons.                                                                                                                                                                                |

### 6.7 Developer Tooling

| Technology   | Pinned Version | Purpose                                                                                       |
| ------------ | -------------- | --------------------------------------------------------------------------------------------- |
| **ESLint**   | ^9.0.0         | Linting. Flat config format. Integrated with `eslint-config-next` for Next.js-specific rules. |
| **Prettier** | ^3.0.0         | Code formatting. `prettier-plugin-tailwindcss` for automatic Tailwind class sorting.          |
| **Husky**    | ^9.0.0         | Git hooks. Runs lint and format checks on pre-commit.                                         |
| **tsx**      | ^4.19.0        | TypeScript execution for scripts (seed script, one-off migrations).                           |

### 6.8 Version Decision Summary

The version choices prioritize stability over novelty. Node 24 LTS instead of Node 25 Current. Next.js 15 Maintenance LTS instead of Next.js 16 Active. TypeScript 6.0 stable instead of TypeScript 7.0 preview. Prisma 7 GA instead of Prisma Next (early access). Tailwind v4 stable instead of v3 (entering end-of-life). Every dependency has a clear LTS or stable designation and an active support window extending at least 12 months from today.

---

## 7. System Architecture

### 7.1 High-Level Overview

The system follows a standard modern Next.js architecture: a React-based frontend rendered via Next.js App Router (mixing server and client components), backed by a PostgreSQL database on Supabase accessed through Prisma ORM, with Cloudinary handling media delivery and Paystack handling payment processing.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│                                                               │
│  Next.js App Router                                           │
│  ├─ React Server Components (HTML streamed from server)       │
│  ├─ Client Components (hydrated interactivity)                │
│  ├─ Tailwind CSS v4 (utility-first styling)                   │
│  ├─ Zustand (cart state, persisted to localStorage)           │
│  ├─ next-cloudinary (optimized image delivery)                │
│  └─ @paystack/inline-js (checkout popup)                      │
│                                                               │
└────────────┬─────────────────────────┬────────────────────────┘
             │                         │
             │  Server Components /    │  Client-side
             │  Server Actions         │  fetch / popup
             │                         │
┌────────────▼─────────────────────────▼────────────────────────┐
│                      NEXT.JS SERVER (Vercel)                   │
│                                                               │
│  ├─ App Router (file-system routing)                          │
│  ├─ Middleware (auth gate for /admin, security headers)        │
│  ├─ Server Actions (mutations: create order, update product)  │
│  ├─ Route Handlers (webhooks, signed uploads)                 │
│  ├─ Prisma 7 ORM (TypeScript query compiler → SQL)            │
│  └─ ISR / SSR / Static rendering per route                    │
│                                                               │
└───┬──────────────┬──────────────┬──────────────┬──────────────┘
    │              │              │              │
┌───▼─────┐  ┌────▼─────┐  ┌────▼────┐  ┌──────▼──────┐
│Supabase │  │Supabase  │  │Paystack │  │ Cloudinary  │
│Postgres │  │Auth /    │  │         │  │             │
│         │  │Storage / │  │REST API │  │CDN + Upload │
│(via     │  │Realtime  │  │Webhooks │  │Transforms   │
│Prisma)  │  │(via JS   │  │         │  │(via next-   │
│         │  │client)   │  │         │  │cloudinary)  │
└─────────┘  └──────────┘  └─────────┘  └─────────────┘
```

### 7.2 Rendering Strategy by Route

| Route                    | Method        | Cache                       | Rationale                                                                                                              |
| ------------------------ | ------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/` (Home)               | SSR + ISR     | `revalidate: 3600` (1 hour) | Featured products change at most daily. ISR provides static-like performance with periodic freshness.                  |
| `/products`              | SSR + ISR     | `revalidate: 1800` (30 min) | Catalog updates when Sarah adds/edits products. 30-minute staleness is acceptable.                                     |
| `/products/[slug]`       | SSR + ISR     | `revalidate: 1800` (30 min) | Individual product pages. Dynamic OG metadata requires SSR. ISR caches the rendered result.                            |
| `/cart`                  | CSR (Client)  | None                        | Cart state lives in localStorage. No server rendering needed. The page shell can be static with client-side hydration. |
| `/checkout`              | CSR (Client)  | None                        | Contains sensitive form data and the Paystack popup. Must be fully client-rendered.                                    |
| `/checkout/success`      | SSR           | None                        | Fetches order details server-side by reference. Not cached because each order is unique.                               |
| `/admin/*`               | CSR (Client)  | None                        | Fully dynamic, authenticated. Server Components fetch initial data; mutations via Server Actions.                      |
| `/api/webhooks/paystack` | Route Handler | None                        | Stateless webhook endpoint. Must process every request individually.                                                   |

### 7.3 Data Flow: The Two Checkout Paths

**Path A — Paystack Checkout:**

1. Customer browses products and adds items to cart (localStorage via Zustand).
2. Customer navigates to `/checkout` and fills in delivery details.
3. On form submission, a Server Action validates the input (Zod), creates an Order record in the database with status PENDING, and returns the order reference.
4. The client initializes the Paystack inline popup with the order reference, amount, and customer email.
5. Customer completes payment inside the Paystack popup.
6. On client-side success callback: the customer is redirected to `/checkout/success?ref={reference}`. The cart is cleared.
7. Separately and asynchronously, Paystack sends a webhook POST to `/api/webhooks/paystack`.
8. The webhook handler verifies the HMAC-SHA512 signature, parses the event, and updates the order status to CONFIRMED.
9. The confirmation page displays the order number and details. A "Chat with us on WhatsApp" link is provided for follow-up.

**Path B — WhatsApp Checkout:**

1. Customer browses products and adds items to cart (same as Path A).
2. From the cart page or product page, customer clicks "Order via WhatsApp."
3. The application constructs a pre-formatted WhatsApp message containing: all cart items (name, variant, quantity, price), subtotal, and a greeting.
4. The `wa.me` link opens WhatsApp (mobile app or WhatsApp Web) with the message pre-filled.
5. Sarah receives the message, confirms product availability, and negotiates delivery.
6. Sarah manually creates the order in her admin dashboard with status CONFIRMED and channel WHATSAPP.
7. No Paystack transaction occurs — payment is handled directly between Sarah and the customer (bank transfer, cash on delivery, etc.).

### 7.4 Server-Side Singleton Pattern

The Prisma client must be instantiated as a singleton to avoid exhausting database connections during development (Next.js hot reloading creates new module instances). In production, this is handled by the module system. A utility file exports a single Prisma client instance attached to the global object in development and created fresh in production.

---

## 8. Project Directory Structure

```
eshair/
├── .nvmrc                              # Node version: 24
├── .env.local                          # Local environment variables (git-ignored)
├── .env.example                        # Template for required env vars (committed)
├── .husky/
│   └── pre-commit                      # Lint + format check
├── prisma/
│   ├── schema.prisma                   # Database models and relations
│   ├── migrations/                     # Prisma Migrate history (committed)
│   └── seed.ts                         # Seed data: categories, sample products, admin user
├── prisma.config.ts                    # Prisma 7 database configuration
├── public/
│   ├── fonts/                          # Self-hosted Playfair Display + Inter
│   ├── icons/                          # Favicons, Apple touch icons, PWA manifest icons
│   └── og-fallback.jpg                 # Default Open Graph image
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout: fonts, metadata, global providers
│   │   ├── page.tsx                    # Home page
│   │   ├── not-found.tsx              # Custom 404
│   │   ├── error.tsx                   # Global error boundary
│   │   ├── loading.tsx                 # Global loading state
│   │   ├── products/
│   │   │   ├── page.tsx               # Product listing with filters
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Product detail
│   │   ├── cart/
│   │   │   └── page.tsx               # Shopping cart
│   │   ├── checkout/
│   │   │   ├── layout.tsx             # Checkout layout (loads Paystack script)
│   │   │   ├── page.tsx               # Checkout form + Paystack
│   │   │   └── success/
│   │   │       └── page.tsx           # Order confirmation
│   │   ├── admin/
│   │   │   ├── layout.tsx             # Admin layout: sidebar, auth gate
│   │   │   ├── page.tsx               # Dashboard overview
│   │   │   ├── login/
│   │   │   │   └── page.tsx           # Admin login form
│   │   │   ├── products/
│   │   │   │   ├── page.tsx           # Product list + management
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx       # Create product form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx       # Edit product form
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx           # Order list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx       # Order detail + status update
│   │   │   ├── categories/
│   │   │   │   └── page.tsx           # Category management
│   │   │   └── settings/
│   │   │       └── page.tsx           # Store settings
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── paystack/
│   │   │           └── route.ts       # Paystack webhook handler
│   │   └── actions/                    # Server Actions (co-located by domain)
│   │       ├── orders.ts              # createOrder, updateOrderStatus
│   │       ├── products.ts            # createProduct, updateProduct, deleteProduct
│   │       ├── categories.ts          # createCategory, updateCategory
│   │       ├── settings.ts            # updateStoreSettings
│   │       └── upload.ts              # generateUploadSignature
│   ├── components/
│   │   ├── ui/                         # Primitive, reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── VisuallyHidden.tsx     # Accessibility: screen-reader-only text
│   │   ├── layout/
│   │   │   ├── Header.tsx             # Public header: logo, nav, cart icon
│   │   │   ├── Footer.tsx             # Public footer: links, socials, copyright
│   │   │   ├── MobileNav.tsx          # Slide-out mobile navigation
│   │   │   ├── AnnouncementBar.tsx    # Configurable top banner
│   │   │   └── AdminSidebar.tsx       # Admin navigation sidebar
│   │   ├── product/
│   │   │   ├── ProductCard.tsx        # Card for grid listing
│   │   │   ├── ProductGrid.tsx        # Responsive grid container
│   │   │   ├── ProductGallery.tsx     # Image gallery with thumbnails
│   │   │   ├── ProductDetails.tsx     # Name, price, description, actions
│   │   │   ├── VariantSelector.tsx    # Length/color/texture picker
│   │   │   ├── PriceDisplay.tsx       # Formatted Naira price with compare-at
│   │   │   ├── StockBadge.tsx         # In Stock / Low Stock / Out of Stock
│   │   │   ├── CategoryFilter.tsx     # Horizontal pill filter bar
│   │   │   └── SortSelector.tsx       # Sort dropdown
│   │   ├── cart/
│   │   │   ├── CartDrawer.tsx         # Slide-out cart panel
│   │   │   ├── CartItem.tsx           # Individual cart line item
│   │   │   ├── CartSummary.tsx        # Subtotal, shipping, total
│   │   │   └── CartIcon.tsx           # Header cart icon with item count badge
│   │   ├── checkout/
│   │   │   ├── CheckoutForm.tsx       # Customer details form
│   │   │   ├── PaystackButton.tsx     # Triggers Paystack popup
│   │   │   ├── WhatsAppCheckout.tsx   # "Order via WhatsApp" button
│   │   │   └── OrderConfirmation.tsx  # Success page content
│   │   └── shared/
│   │       ├── WhatsAppFAB.tsx        # Floating action button
│   │       ├── Breadcrumbs.tsx        # Navigation breadcrumbs
│   │       ├── EmptyState.tsx         # Empty cart, empty results
│   │       ├── SocialProof.tsx        # Trust signals section
│   │       └── StructuredData.tsx     # JSON-LD schema injection
│   ├── lib/
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client factory
│   │   │   └── server.ts             # Server Supabase client factory (cookie-based)
│   │   ├── paystack.ts               # Webhook signature verification, API helpers
│   │   ├── cloudinary.ts             # Server-side Cloudinary config and helpers
│   │   ├── whatsapp.ts               # WhatsApp URL builder (order + inquiry)
│   │   ├── validations.ts            # Zod schemas (checkout, product, settings)
│   │   ├── formatters.ts             # formatNaira, formatDate, formatOrderNumber
│   │   └── constants.ts              # App-wide constants (categories, status labels)
│   ├── hooks/
│   │   ├── useCart.ts                 # Hook wrapping Zustand cart store
│   │   ├── useMediaQuery.ts          # Responsive breakpoint detection
│   │   └── useDebounce.ts            # Input debounce for search
│   ├── stores/
│   │   └── cart-store.ts             # Zustand store definition + persist middleware
│   ├── types/
│   │   ├── product.ts                # Product, Category, Variant, Image types
│   │   ├── order.ts                  # Order, OrderItem, OrderStatus types
│   │   ├── cart.ts                   # CartItem, CartState types
│   │   └── admin.ts                  # Admin-specific types
│   └── styles/
│       └── globals.css                # Tailwind v4 @import + @theme definitions
├── next.config.ts                     # Next.js config (images, headers, redirects)
├── tsconfig.json                      # TypeScript config (strict mode, path aliases)
├── eslint.config.mjs                  # ESLint flat config
├── .prettierrc                        # Prettier configuration
└── package.json                       # Dependencies, scripts, engines
```

---

## 9. Data Models & Database Schema

### 9.1 Entity Relationship Summary

```
Category  1 ─── * Product
Product   1 ─── * ProductImage
Product   1 ─── * ProductVariant
Product   1 ─── * OrderItem
ProductVariant 1 ─── * OrderItem
Order     1 ─── * OrderItem
StoreSettings (singleton — single row with id = "default")
```

### 9.2 Model Definitions

**Category**

| Field       | Type     | Constraints                 | Notes                                                         |
| ----------- | -------- | --------------------------- | ------------------------------------------------------------- |
| id          | CUID     | Primary key, auto-generated |                                                               |
| name        | String   | Unique, required            | e.g., "Bundles", "Closures & Frontals", "Wigs", "Accessories" |
| slug        | String   | Unique, required            | URL-safe, auto-generated from name                            |
| description | String   | Optional                    | Displayed on category pages                                   |
| image       | String   | Optional                    | Cloudinary public ID for category banner                      |
| sortOrder   | Integer  | Default: 0                  | Controls display order in navigation and filters              |
| isActive    | Boolean  | Default: true               | Inactive categories hidden from storefront                    |
| createdAt   | DateTime | Auto-set                    |                                                               |
| updatedAt   | DateTime | Auto-updated                |                                                               |

Relations: One-to-many with Product.

**Product**

| Field            | Type          | Constraints            | Notes                                                                 |
| ---------------- | ------------- | ---------------------- | --------------------------------------------------------------------- |
| id               | CUID          | Primary key            |                                                                       |
| name             | String        | Required               | e.g., "Brazilian Body Wave Bundle"                                    |
| slug             | String        | Unique, required       | URL-safe. Auto-generated from name, editable.                         |
| description      | String        | Required               | Full product description (rich text stored as HTML or markdown)       |
| shortDescription | String        | Optional               | One-liner for cards and meta descriptions (max 160 chars)             |
| categoryId       | String        | Foreign key → Category |                                                                       |
| basePrice        | Decimal(10,2) | Required               | Price in Naira. Used when no variant is selected.                     |
| compareAtPrice   | Decimal(10,2) | Optional               | "Was" price for strikethrough display                                 |
| currency         | String        | Default: "NGN"         |                                                                       |
| sku              | String        | Unique, optional       | Stock keeping unit for Sarah's internal tracking                      |
| stockQuantity    | Integer       | Default: 0             | Aggregate stock. If variants exist, this is the sum of variant stock. |
| isActive         | Boolean       | Default: true          | Inactive products hidden from storefront                              |
| isFeatured       | Boolean       | Default: false         | Featured on home page                                                 |
| tags             | String[]      | Default: []            | Freeform tags for future filtering/search                             |
| metadata         | JSON          | Optional               | Extensible field for future attributes                                |
| createdAt        | DateTime      | Auto-set               |                                                                       |
| updatedAt        | DateTime      | Auto-updated           |                                                                       |

Relations: Belongs to Category. Has many ProductImage, ProductVariant, OrderItem.
Indexes: categoryId, (isActive + isFeatured) composite, slug.

**ProductImage**

| Field     | Type    | Constraints                           | Notes                                                   |
| --------- | ------- | ------------------------------------- | ------------------------------------------------------- |
| id        | CUID    | Primary key                           |                                                         |
| productId | String  | Foreign key → Product, cascade delete |                                                         |
| url       | String  | Required                              | Full Cloudinary URL                                     |
| publicId  | String  | Required                              | Cloudinary public ID (for transformations)              |
| alt       | String  | Optional                              | Alt text for accessibility. Falls back to product name. |
| width     | Integer | Optional                              | Original image width                                    |
| height    | Integer | Optional                              | Original image height                                   |
| sortOrder | Integer | Default: 0                            | Controls gallery order                                  |
| isPrimary | Boolean | Default: false                        | The primary image shown on cards and OG                 |

Indexes: productId.

**ProductVariant**

| Field         | Type          | Constraints                           | Notes                                           |
| ------------- | ------------- | ------------------------------------- | ----------------------------------------------- |
| id            | CUID          | Primary key                           |                                                 |
| productId     | String        | Foreign key → Product, cascade delete |                                                 |
| name          | String        | Required                              | Internal name, e.g., "18-inch"                  |
| label         | String        | Required                              | Display label, e.g., "18 inches"                |
| price         | Decimal(10,2) | Required                              | Variant-specific price (overrides basePrice)    |
| stockQuantity | Integer       | Default: 0                            | Variant-level stock tracking                    |
| sku           | String        | Unique, optional                      | Variant-level SKU                               |
| isActive      | Boolean       | Default: true                         |                                                 |
| metadata      | JSON          | Optional                              | Future-proofing (e.g., color hex, texture type) |

Indexes: productId.

**Order**

| Field            | Type                | Constraints      | Notes                                                                            |
| ---------------- | ------------------- | ---------------- | -------------------------------------------------------------------------------- |
| id               | CUID                | Primary key      |                                                                                  |
| orderNumber      | String              | Unique, required | Human-readable: ESH-YYYYMMDD-NNNN                                                |
| status           | Enum (OrderStatus)  | Default: PENDING | PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED (or CANCELLED / REFUNDED) |
| channel          | Enum (OrderChannel) | Required         | PAYSTACK or WHATSAPP                                                             |
| customerName     | String              | Required         |                                                                                  |
| customerEmail    | String              | Optional         | Not required for WhatsApp orders                                                 |
| customerPhone    | String              | Required         | Nigerian phone format                                                            |
| shippingAddress  | String              | Optional         | Full address text                                                                |
| shippingCity     | String              | Optional         | e.g., "Lekki", "Ikeja", "Victoria Island"                                        |
| shippingState    | String              | Optional         | Default: "Lagos"                                                                 |
| subtotal         | Decimal(10,2)       | Required         | Sum of line item totals                                                          |
| shippingCost     | Decimal(10,2)       | Default: 0       | From store settings; 0 if above free shipping threshold                          |
| total            | Decimal(10,2)       | Required         | subtotal + shippingCost                                                          |
| currency         | String              | Default: "NGN"   |                                                                                  |
| paymentReference | String              | Optional         | Paystack transaction reference (null for WhatsApp orders)                        |
| paymentStatus    | String              | Optional         | "paid", "failed", null                                                           |
| notes            | String              | Optional         | Customer notes from checkout form                                                |
| adminNotes       | String              | Optional         | Sarah's internal notes                                                           |
| createdAt        | DateTime            | Auto-set         |                                                                                  |
| updatedAt        | DateTime            | Auto-updated     |                                                                                  |

Relations: Has many OrderItem.
Indexes: orderNumber, status, customerPhone, createdAt.

**OrderItem**

| Field       | Type          | Constraints                           | Notes                                      |
| ----------- | ------------- | ------------------------------------- | ------------------------------------------ |
| id          | CUID          | Primary key                           |                                            |
| orderId     | String        | Foreign key → Order, cascade delete   |                                            |
| productId   | String        | Foreign key → Product                 |                                            |
| variantId   | String        | Optional foreign key → ProductVariant |                                            |
| name        | String        | Required                              | Snapshot of product name at time of order  |
| variantName | String        | Optional                              | Snapshot of variant label at time of order |
| price       | Decimal(10,2) | Required                              | Snapshot of unit price at time of order    |
| quantity    | Integer       | Required                              |                                            |
| total       | Decimal(10,2) | Required                              | price × quantity                           |

Indexes: orderId.

Note: OrderItem stores snapshots of product data (name, price, variant name) rather than relying solely on foreign key relations. This ensures that historical orders remain accurate even if products are later renamed or repriced.

**StoreSettings (Singleton)**

| Field             | Type          | Constraints                     | Notes                                                     |
| ----------------- | ------------- | ------------------------------- | --------------------------------------------------------- |
| id                | String        | Primary key, default: "default" | Only one row exists                                       |
| storeName         | String        | Default: "Emmanuel Sarah Hair"  |                                                           |
| storeEmail        | String        | Optional                        |                                                           |
| storePhone        | String        | Optional                        |                                                           |
| whatsappNumber    | String        | Optional                        | Sarah's WhatsApp-enabled phone number                     |
| currency          | String        | Default: "NGN"                  |                                                           |
| shippingFee       | Decimal(10,2) | Default: 0                      | Flat-rate shipping fee in Naira                           |
| freeShippingMin   | Decimal(10,2) | Optional                        | Order minimum for free shipping. Null = no free shipping. |
| announcementBar   | String        | Optional                        | Text displayed in the top banner. Null = hidden.          |
| isMaintenanceMode | Boolean       | Default: false                  | When true, public pages show "Under Maintenance"          |
| metadata          | JSON          | Optional                        | Extensible settings                                       |
| updatedAt         | DateTime      | Auto-updated                    |                                                           |

### 9.3 Database Indexing Strategy

Indexes are defined on columns used in WHERE clauses, JOIN conditions, and ORDER BY clauses for the most frequent queries: product listing (isActive, isFeatured, categoryId), product detail (slug), order listing (status, createdAt), and customer lookup (customerPhone). The composite index on (isActive, isFeatured) supports the home page featured products query without a sequential scan.

### 9.4 Seed Data

The seed script creates: default categories (Bundles, Closures & Frontals, Wigs, Accessories), the default StoreSettings row, and optionally 3–5 sample products with placeholder images for development/staging environments.

---

## 10. Authentication & Authorization

### 10.1 Design Decisions

The storefront is fully public. No customer accounts. No login required to browse, add to cart, or check out. Cart state is persisted to localStorage. Checkout collects customer details inline without registration.

This is a deliberate choice based on the client's context: Sarah's customers are accustomed to ordering via WhatsApp without creating accounts. Forcing registration would increase friction and reduce conversion. Customer data is captured at checkout and stored with each order.

Admin authentication is required only for Sarah to access the dashboard at `/admin/*`. Authentication is handled by Supabase Auth using email/password. Sarah is the sole admin user, provisioned either via the Supabase dashboard or via the seed script.

### 10.2 Admin Authentication Flow

1. Sarah navigates to `/admin` (or any `/admin/*` route).
2. Next.js Middleware intercepts the request and checks for a valid Supabase session cookie.
3. If no valid session exists, Middleware redirects to `/admin/login`.
4. Sarah enters her email and password on the login page.
5. The client calls Supabase Auth `signInWithPassword`.
6. On success, Supabase sets a secure, httpOnly session cookie.
7. Sarah is redirected to `/admin` (the dashboard overview).
8. Subsequent requests to `/admin/*` routes are validated by Middleware reading the session cookie and calling `supabase.auth.getUser()` to verify the session hasn't expired or been revoked.
9. Logout clears the session cookie and redirects to `/admin/login`.

### 10.3 Authorization Rules

| Resource               | Public (anonymous)                                    | Admin (authenticated)                 |
| ---------------------- | ----------------------------------------------------- | ------------------------------------- |
| Products (read)        | Yes — active products only                            | Yes — all products including inactive |
| Products (write)       | No                                                    | Yes — full CRUD                       |
| Categories (read)      | Yes — active categories only                          | Yes — all categories                  |
| Categories (write)     | No                                                    | Yes — full CRUD                       |
| Orders (read)          | No                                                    | Yes — all orders                      |
| Orders (write)         | Create only (via checkout)                            | Yes — update status, add notes        |
| Store Settings (read)  | Public settings only (announcement bar, shipping fee) | Yes — all settings                    |
| Store Settings (write) | No                                                    | Yes — full update                     |
| Image upload           | No                                                    | Yes — signed uploads only             |

### 10.4 Supabase Row Level Security

All database tables have RLS enabled. Policies enforce: products and categories are publicly readable (SELECT) when `is_active = true`; all write operations (INSERT, UPDATE, DELETE) require an authenticated session with a matching admin user ID; orders are readable and writable only by authenticated admin sessions; store settings are readable publicly for display-critical fields but writable only by admin.

---

## 11. API & Data Layer Design

### 11.1 Philosophy

The application uses Next.js Server Actions as the primary mutation layer and React Server Components as the primary data-fetching layer. This means there are very few traditional REST API endpoints. Data flows through the framework's built-in patterns rather than a separate API layer.

### 11.2 Server Actions (Mutations)

Server Actions are TypeScript functions marked with `'use server'` that run on the server but can be called from client components like regular function calls. They handle all state mutations.

| Action                  | Domain     | Input                                     | Output                                                       | Side Effects                                                 |
| ----------------------- | ---------- | ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| createOrder             | Orders     | Validated checkout form data + cart items | `{ success: true, orderRef }` or `{ success: false, error }` | Creates Order + OrderItems, decrements stock                 |
| updateOrderStatus       | Orders     | Order ID + new status                     | Success/failure result                                       | Updates order, optionally triggers notification              |
| createProduct           | Products   | Product form data                         | Success with new product ID, or validation errors            | Creates Product + Images + Variants                          |
| updateProduct           | Products   | Product ID + updated fields               | Success or validation errors                                 | Updates product, handles image reordering                    |
| deleteProduct           | Products   | Product ID                                | Success/failure                                              | Soft-delete (sets isActive = false), preserves order history |
| createCategory          | Categories | Category form data                        | Success or errors                                            | Creates category with auto-slug                              |
| updateCategory          | Categories | Category ID + updated fields              | Success or errors                                            | Updates category                                             |
| updateStoreSettings     | Settings   | Settings form data                        | Success or errors                                            | Updates the singleton row                                    |
| generateUploadSignature | Upload     | Desired public ID prefix                  | Signed params for Cloudinary                                 | None — returns signed data for client-side upload            |

### 11.3 Server Action Result Shape

Every Server Action returns a discriminated union result type to ensure consistent error handling across the application. On success, the `data` field contains the relevant payload. On failure, the `error` field contains a human-readable message and optionally `fieldErrors` maps specific validation errors to form field names for inline display.

### 11.4 Route Handlers (External Integrations)

Only two Route Handlers (traditional HTTP endpoints) exist, both for receiving external webhooks or handling operations that cannot be Server Actions:

**Paystack Webhook** (`POST /api/webhooks/paystack`): Receives payment confirmation events from Paystack. Verifies the HMAC-SHA512 signature against the Paystack secret key. On `charge.success`, updates the matching order to CONFIRMED status. Returns a 200 response. On signature mismatch, returns 401. This endpoint must be idempotent — processing the same event twice should not cause duplicate side effects.

**Signed Upload** (`POST /api/admin/upload` — optional fallback): If the Cloudinary Upload Widget's direct-to-Cloudinary signed upload is insufficient for any reason, this Route Handler accepts an image upload server-side and forwards it to Cloudinary. In the default implementation, this is not needed because `CldUploadWidget` handles uploads directly.

### 11.5 Data Fetching in Server Components

Public pages (home, product listing, product detail) fetch data directly in React Server Components using Prisma queries. There is no client-side data fetching library (no SWR, no TanStack Query) for public pages — Server Components eliminate the need for client-side fetch-render-fetch waterfalls.

Admin pages use Server Components for the initial data load. After mutations (Server Actions), the client calls `router.refresh()` to revalidate server data without a full page reload.

---

## 12. UI/UX Design System

### 12.1 Design Philosophy

The design communicates luxury, trust, and simplicity. It must feel premium enough to justify ₦100,000+ purchases while being straightforward enough for a non-technical user browsing on a crowded Lagos bus on a 3G connection.

The visual language is **dark-themed** — deep blacks, warm neutrals, and champagne/gold accents — evoking the aesthetic of a high-end beauty boutique. Product photography is the hero; the UI frames it without competing with it.

### 12.2 Color System

**Background Scale (darkest to lightest):**

- Midnight (#0A0A0A): Primary page background
- Charcoal (#1A1A1A): Card backgrounds, elevated surfaces
- Graphite (#2A2A2A): Input fields, secondary surfaces
- Slate (#3A3A3A): Borders, dividers, subtle separators

**Text Scale (dimmest to brightest):**

- Muted (#6B6B6B): Tertiary text, placeholders
- Silver (#A0A0A0): Secondary text, captions
- Pearl (#E8E8E8): Primary body text
- Ivory (#F5F5F0): Headings, emphasis
- White (#FFFFFF): High-contrast text on dark backgrounds

**Accent — Champagne/Gold:**

- Gold (#D4A853): Primary action color — CTAs, active states, price highlights
- Gold Dark (#B8922E): Hover state for gold elements
- Gold Light (#F0D48A): Decorative accents, subtle highlights
- Champagne (#F7E7CE): Light accent backgrounds, badges
- Rose Gold (#E8C4B8): Secondary accent for feminine touches

**Semantic Colors:**

- Success: #4ADE80 (green — stock badges, confirmations)
- Warning: #FBBF24 (amber — low stock alerts)
- Error: #F87171 (red — validation errors, out of stock)
- Info: #60A5FA (blue — informational notices)
- WhatsApp Green: #25D366 (WhatsApp brand color for all WhatsApp CTAs)

All color combinations meet WCAG 2.1 AA contrast ratios. Pearl text (#E8E8E8) on Midnight background (#0A0A0A) achieves a contrast ratio of 17.4:1 (exceeds AAA). Gold (#D4A853) on Midnight achieves 8.6:1 (exceeds AA for normal text).

### 12.3 Typography

**Font Families:**

- Display: Playfair Display (serif) — headings, hero text, product names. Self-hosted via `next/font` to eliminate render-blocking Google Fonts requests.
- Body: Inter (sans-serif) — body text, UI elements, buttons, inputs. Self-hosted.
- Mono: JetBrains Mono — admin code/ID displays only (order numbers, SKUs).

**Type Scale:**

| Element            | Font             | Weight         | Size                        | Tracking           | Line Height |
| ------------------ | ---------------- | -------------- | --------------------------- | ------------------ | ----------- |
| Hero Headline      | Playfair Display | 700 (Bold)     | clamp(2.5rem, 6vw, 4rem)    | -0.02em            | 1.1         |
| Page Title (H1)    | Playfair Display | 700            | clamp(2rem, 5vw, 3rem)      | -0.02em            | 1.2         |
| Section Title (H2) | Playfair Display | 600 (SemiBold) | clamp(1.5rem, 3vw, 2.25rem) | -0.01em            | 1.25        |
| Card Title (H3)    | Inter            | 600            | 1.25rem                     | 0                  | 1.3         |
| Body               | Inter            | 400 (Regular)  | 1rem (16px)                 | 0.01em             | 1.6         |
| Body Small         | Inter            | 400            | 0.875rem (14px)             | 0.02em             | 1.5         |
| Caption            | Inter            | 400            | 0.75rem (12px)              | 0.03em             | 1.4         |
| Price              | Inter            | 700            | 1.25rem                     | 0                  | 1.2         |
| Button             | Inter            | 600            | 0.875rem                    | 0.05em (uppercase) | 1           |
| Badge              | Inter            | 600            | 0.75rem                     | 0.04em             | 1           |

### 12.4 Spacing & Layout

**Spacing Scale:** Based on a 4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

**Page Padding:** `clamp(1rem, 5vw, 4rem)` — responsive horizontal padding that expands proportionally on larger screens.

**Content Max Width:** 1280px for the main content area. Full-bleed for hero sections and banners.

**Grid System:** CSS Grid for product grids. 1 column (mobile), 2 columns (≥640px), 3 columns (≥1024px), 4 columns (≥1280px). Gap: 16px (mobile), 24px (desktop).

### 12.5 Component Design Patterns

**Buttons:**

- Primary: Gold background, dark text, medium shadow. Hover: darker gold, glow shadow. Active: slightly darker, reduced shadow. Focus: 2px gold ring offset.
- Secondary: Transparent background, gold border, gold text. Hover: gold background at 10% opacity. Focus: 2px gold ring.
- WhatsApp: WhatsApp green (#25D366) background, white text, WhatsApp icon (Lucide `MessageCircle` or custom SVG). Hover: darker green.
- Ghost: Transparent, pearl text. Hover: charcoal background. Used for less-prominent actions.
- Destructive (admin only): Error red background, white text. Used for delete confirmations.
- All buttons: minimum height 44px (touch target), rounded corners (radius-md), disabled state at 50% opacity with `cursor-not-allowed`.

**Cards:**

- Background: charcoal (#1A1A1A). Border: 1px slate (#3A3A3A). Border-radius: radius-lg.
- Product cards: image fills the top (aspect ratio 4:5), content section below with padding.
- Hover: scale(1.02) transform, shadow-glow, image zoom (scale 1.05, overflow hidden).
- Focus-within: gold ring (for keyboard navigation to card links).
- Loading state: pulse skeleton animation matching card dimensions.

**Inputs:**

- Background: graphite (#2A2A2A). Border: 1px slate. Text: pearl. Placeholder: muted.
- Focus: gold border, subtle gold glow (box-shadow).
- Error: error red border, error message below linked via `aria-describedby`.
- Labels: silver text, positioned above input, required fields marked with gold asterisk and `aria-required="true"`.
- Height: 48px (comfortable touch target).

**Modals:**

- Backdrop: black at 60% opacity. Modal body: charcoal background, rounded-xl.
- Focus trapped inside modal. Closes on Escape key and backdrop click.
- Announced to screen readers via `role="dialog"` and `aria-modal="true"`.

**Toasts:**

- Position: bottom-right (desktop), top-center (mobile).
- Auto-dismiss after 5 seconds. Dismissable by click or swipe.
- Color-coded by type: success (green), error (red), info (blue), warning (amber).
- Announced to screen readers via `role="status"` and `aria-live="polite"`.

---

## 13. Page-by-Page Specifications

### 13.1 Home Page (`/`)

**Purpose:** First impression. Establish brand identity, showcase best products, drive browsing or WhatsApp engagement.

**Sections (top to bottom):**

1. **Announcement Bar** — Conditionally rendered. Displays text from StoreSettings.announcementBar. Dismissable (stores dismissal in sessionStorage). Gold background, dark text.

2. **Header** — Logo (left), navigation links: "Shop", "Categories" dropdown, "About" (center or right), cart icon with item count badge (right). On mobile: hamburger menu (left), logo (center), cart icon (right).

3. **Hero Section** — Full-viewport-width. Background: high-quality lifestyle image (Cloudinary, auto-format, quality auto, responsive sizes). Overlay: gradient from transparent to semi-transparent black (bottom). Content: headline ("Premium Human Hair, Delivered to You"), sub-headline (one sentence about the boutique), two CTAs — "Shop Collection" (gold button, links to `/products`) and "Chat on WhatsApp" (green button, opens WhatsApp with generic greeting). Mobile: stacked buttons, full width.

4. **Featured Categories** — 2×2 grid (mobile: 2 columns, desktop: 4 columns). Each card: category image (Cloudinary, `c_fill`, 400×300), category name overlay on bottom gradient. Links to `/products?category={slug}`. Categories sorted by `sortOrder`.

5. **Featured Products** — Section title: "Our Bestsellers" or "Featured This Week". Product grid: 4 products (desktop) or horizontal scroll (mobile). Products where `isFeatured = true`, sorted by `updatedAt` descending. Each product card (see component spec above). "View All Products" link below.

6. **Trust Signals** — Three-column layout (icons + text). "100% Human Hair Guaranteed" (shield icon), "Lagos Delivery in 24–48hrs" (truck icon), "Chat Anytime on WhatsApp" (message icon). On mobile: horizontal scroll or stacked.

7. **WhatsApp CTA** — Full-width section. Soft background (graphite). "Have Questions? Chat With Us" headline. "We're here to help you find the perfect hair." sub-text. Green WhatsApp button.

8. **Footer** — Logo, brief tagline. Quick links: Shop, Categories, About, Contact. Social links: Instagram, WhatsApp, Facebook. Copyright: "© 2026 Emmanuel Sarah Hair. All rights reserved." Subtle developer credit.

**Data Requirements:** Featured categories (top 4 active, sorted by sortOrder), featured products (up to 8 active where isFeatured = true), store settings (announcement bar, WhatsApp number).

**SEO:** Static title: "Emmanuel Sarah Hair — Premium Human Hair in Lagos." Meta description: "Shop premium Brazilian, Peruvian, and Indian human hair bundles, closures, frontals, and wigs. Lagos delivery in 24–48hrs. Chat with us on WhatsApp." OG image: branded fallback image.

### 13.2 Product Listing Page (`/products`)

**Purpose:** Browse the full catalog. Filter and sort to find the right product.

**URL Structure:**

- `/products` — all active products
- `/products?category=bundles` — filtered by category slug
- `/products?category=bundles&sort=price-asc` — filtered + sorted
- All filter/sort state lives in URL query params (shareable, bookmarkable, SEO-indexable)

**Layout:**

1. **Breadcrumbs** — "Home > Products" or "Home > Products > Bundles"
2. **Page Title** — "Our Collection" (or category name if filtered)
3. **Filter Bar** — Horizontal scroll of category pills. "All" pill is always first. Active pill has gold background. Below or beside: sort dropdown (Newest, Price: Low to High, Price: High to Low).
4. **Results Count** — "Showing 24 products" or "Showing 8 products in Bundles"
5. **Product Grid** — Responsive: 2 columns (mobile), 3 (tablet), 4 (desktop). Gap: 16px (mobile), 24px (desktop). Each card links to `/products/{slug}`.
6. **Load More** — "Load More Products" button (not infinite scroll — avoids footer inaccessibility). Loads next batch of 12 products. If all loaded, button disappears.
7. **Empty State** — If no products match filters: illustration, "No products found" message, "Clear Filters" link, "Browse All Products" link.

**Product Card Specification:**

- Image: Primary product image, aspect ratio 4:5, `CldImage` with `c_fill`, `g_auto`, `f_auto`, `q_auto`, responsive sizes `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw`.
- Content: Product name (H3, Inter SemiBold), category name (caption, silver text), price display (Naira formatted, gold text; compare-at price with strikethrough if present).
- Hover: card lifts (translateY -2px), shadow glow, image zooms slightly.
- "Add to Cart" button: appears on hover (desktop) or always visible (mobile). If product has variants, button text is "Select Options" and links to product detail instead.
- Stock badge: "Out of Stock" overlay on image if stockQuantity = 0.
- Keyboard accessible: entire card is a link, focus ring on focus-visible.

### 13.3 Product Detail Page (`/products/[slug]`)

**Purpose:** Convince the customer to buy. Provide all information needed to make a purchase decision.

**Layout:** Two-column on desktop (gallery left, info right). Single column on mobile (gallery top, info below).

**Image Gallery (left column / top):**

- Primary image: large, fills column width, aspect ratio 4:5. `CldImage` with `q_auto:best`, responsive sizes. On hover (desktop): zoomed view (scale 1.5 inside overflow:hidden container) following cursor position. On mobile: pinch-to-zoom.
- Thumbnail strip: below (mobile) or beside (desktop) the primary image. Horizontal scroll. Clicking a thumbnail sets it as the primary. Active thumbnail has gold border.
- If only one image: no thumbnail strip.

**Product Info (right column / below):**

- Breadcrumbs: "Home > {Category} > {Product Name}"
- Product name: H1, Playfair Display Bold. One line, truncated with ellipsis if very long.
- Price: large gold text. If compare-at price exists: show compare-at in muted text with strikethrough, then current price in gold. Percentage discount badge: "−20%" in champagne background.
- Stock status badge: "In Stock" (green), "Low Stock — {n} left" (amber, shown when quantity ≤ 5), "Out of Stock" (red).
- Variant selector (if variants exist): pill-style buttons for each variant (e.g., "14 inches", "16 inches", "18 inches"). Active variant has gold background. Selecting a variant updates the price display and stock badge. If a variant is out of stock, its pill is dimmed with strikethrough.
- Quantity selector: minus/plus stepper with numeric display. Minimum 1, maximum limited by stock. Disabled if out of stock.
- "Add to Cart" button: full-width, primary gold. Disabled with "Out of Stock" text if unavailable. On click: adds item to Zustand cart store, shows success toast ("Added to cart!"), cart icon badge updates.
- "Order via WhatsApp" button: full-width, WhatsApp green. Opens WhatsApp with pre-formatted product inquiry message including product name and page URL.
- SKU: small text, muted. Visible but de-emphasized.

**Description Section (below both columns on all sizes):**

- Tabbed or accordion interface. Tabs: "Description", "Care Instructions", "Shipping & Returns."
- Description tab: full product description. Supports basic formatting (bold, italic, line breaks, bullet lists).
- Care Instructions tab: standard care advice (can be per-product or a global default).
- Shipping tab: shipping fee from store settings, estimated delivery time, return policy.

**Related Products:**

- Section title: "You May Also Like"
- 4 products from the same category (excluding the current product). Horizontal scroll on mobile.
- Uses the same ProductCard component as the listing page.

**SEO:**

- Dynamic `<title>`: "{Product Name} — {Category} | Emmanuel Sarah Hair"
- Dynamic `<meta description>`: shortDescription or first 160 characters of description.
- Dynamic Open Graph image: `CldOgImage` generating a 1200×630 card with the primary product image and brand overlay.
- JSON-LD structured data: Product schema with name, image, description, brand, offers (price, currency, availability).

**Accessibility:**

- Image gallery: images have descriptive alt text. Thumbnails are buttons with `aria-label`. Active thumbnail indicated with `aria-current="true"`.
- Variant selector: fieldset with legend "Select length" (or appropriate attribute). Each variant is a radio-style button with `aria-pressed`.
- Quantity stepper: `role="spinbutton"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Tab interface: `role="tablist"`, `role="tab"`, `role="tabpanel"` with proper `aria-selected` and `aria-controls`.

### 13.4 Cart Page (`/cart`)

**Purpose:** Review selected items, adjust quantities, and choose a checkout path.

**Layout:** Cart items list (left/top) + Summary sidebar (right/bottom, sticky on desktop).

**Cart Items:**

- Each item: product image (thumbnail, 80×100), product name (link to product detail), variant name (if applicable), unit price, quantity stepper (same component as product detail), line total, remove button (trash icon, requires confirmation on mobile — "Remove item?" — to prevent accidental taps).
- If a product has become unavailable since it was added: dim the item, show "This item is no longer available" notice, disable quantity controls.

**Cart Summary:**

- Subtotal: sum of all line totals.
- Shipping: displays the shipping fee from store settings, or "FREE" if subtotal exceeds the free shipping threshold. Shows "Calculated at checkout" if the store hasn't configured shipping.
- Total: subtotal + shipping.
- "Proceed to Checkout" button: primary gold, full-width. Links to `/checkout`.
- "Order via WhatsApp" button: WhatsApp green, full-width. Generates WhatsApp URL with all cart items and opens the link.
- "Continue Shopping" text link below buttons.

**Empty Cart:**

- Centered illustration (shopping bag outline or similar).
- "Your cart is empty" heading.
- "Looks like you haven't added anything yet." subtext.
- "Browse Products" button (gold, links to `/products`).

### 13.5 Checkout Page (`/checkout`)

**Purpose:** Collect delivery details and process payment.

**Prerequisite:** Cart must not be empty. If empty, redirect to `/cart`.

**Layout:** Two-column desktop (form left, order summary right). Single-column mobile (summary collapsed at top, form below).

**Customer Details Form:**

- Full Name (text input, required)
- Phone Number (tel input, required. Validation: Nigerian format 080/081/070/071/090/091 + 8 digits)
- Email Address (email input, optional. "We'll send your order confirmation here" helper text)
- Delivery Address (text input, required)
- City (text input with autocomplete suggestions for common Lagos areas: Lekki, Ikeja, Victoria Island, Surulere, Yaba, Ajah, etc.)
- State (select dropdown, required, default: "Lagos")
- Order Notes (textarea, optional, placeholder: "Any special instructions for your order?")
- All required fields marked with gold asterisk. `aria-required="true"` on required inputs.
- Validation: client-side with Zod for instant feedback, server-side in the Server Action as the canonical check.
- Error messages appear inline below the relevant field, linked via `aria-describedby`.

**Order Summary (sidebar):**

- Collapsible on mobile (shows "Order Summary — ₦{total}" header, expands on tap).
- Line items (read-only): image thumbnail, name, variant, quantity × price.
- Subtotal, shipping, total.

**Payment Button:**

- "Pay ₦{total} with Paystack" (gold button, full-width).
- On click: Server Action validates form data, creates Order (PENDING status), returns transaction parameters. Then the Paystack inline popup opens.
- While the Server Action runs: button shows spinner, is disabled.

**Error Handling:**

- Validation errors: inline field errors, scroll to first error.
- Server Action failure: toast notification with error message.
- Paystack popup closed without completing: order remains PENDING. Show "Payment was not completed. You can try again." message. Form data is preserved.
- Paystack payment failure: show Paystack's error message in a toast. Allow retry.

### 13.6 Order Success Page (`/checkout/success`)

**Purpose:** Confirm the order was placed. Provide next steps.

**URL:** `/checkout/success?ref={paymentReference}`

**Layout:** Centered content, celebratory but restrained.

- Checkmark icon (animated, gold, `prefers-reduced-motion` respected).
- "Thank You for Your Order!" heading (Playfair Display).
- Order number: "ESH-20260401-0001" (large, mono font, copyable).
- Order summary: items, total.
- "What happens next?" section: "We'll prepare your order and reach out on WhatsApp to confirm delivery details."
- "Chat with us on WhatsApp" button (green).
- "Continue Shopping" button (secondary).
- Cart is cleared on page load.

### 13.7 Admin Pages

Admin page specifications are covered in Section 19 (Admin Dashboard).

### 13.8 404 Page (`/not-found`)

**Purpose:** Handle missing pages gracefully, maintain brand.

- Dark themed, consistent with storefront.
- "404" large display text (Playfair Display, gold, semi-transparent).
- "We Couldn't Find That Page" heading.
- "The page you're looking for may have been moved or doesn't exist." subtext.
- Two CTAs: "Back to Home" (primary), "Browse Products" (secondary).

---

## 14. WhatsApp-First Commerce

### 14.1 Rationale

WhatsApp is not a fallback or an afterthought. It is a first-class checkout channel that reflects how commerce actually works in Nigeria. Many customers — especially for high-value purchases like human hair — want to speak with the seller before buying. They want to ask about lengths, textures, availability, delivery timing, and sometimes negotiate bundle deals. This is normal and expected.

The application meets customers where they are by providing three WhatsApp touchpoints:

1. **Floating WhatsApp Button:** Present on every public page (bottom-right corner, above mobile navigation if present). Opens a generic inquiry to Sarah's WhatsApp number. On product pages, the message is pre-filled with the product name and URL.

2. **Product Page Inquiry:** "Ask About This Product on WhatsApp" button in the product detail actions. Pre-fills a message with the product name and a link back to the product page.

3. **Cart Checkout via WhatsApp:** "Order via WhatsApp" button on the cart page and checkout page. Generates a complete, formatted message with all cart items, quantities, prices, subtotal, and a friendly greeting. The customer taps the button, WhatsApp opens with the message ready to send, and Sarah receives a structured order inquiry.

### 14.2 WhatsApp Message Format (Cart Checkout)

The generated WhatsApp message follows this structure:

```
🛒 *New Order from eshair.com*

*Items:*
1. Brazilian Body Wave Bundle (18 inches) × 2 — ₦170,000
2. HD Lace Closure (14 inches) × 1 — ₦45,000

*Subtotal:* ₦215,000

Hi! I'd like to place this order. Please confirm availability and total with delivery. Thank you! 🙏
```

The phone number in the `wa.me` link is Sarah's WhatsApp number from StoreSettings, normalized to international format (leading 0 replaced with 234).

### 14.3 WhatsApp Message Format (Product Inquiry)

```
Hi! I'm interested in *Brazilian Body Wave Bundle*.

https://eshair.com/products/brazilian-body-wave-bundle

Is this available? What lengths/options do you have?
```

---

## 15. Payment Integration — Paystack

### 15.1 Overview

Paystack is Nigeria's leading payment gateway. It handles all sensitive payment data (card numbers, bank details) — the application never touches or stores card information. Paystack supports multiple payment channels relevant to the Nigerian market: card (Visa, Mastercard, Verve), bank transfer, USSD, and direct bank payment.

### 15.2 Integration Architecture

**Client-Side:** The `@paystack/inline-js` library loads the Paystack checkout as a popup/modal overlaid on the checkout page. The customer completes payment within the popup without leaving the site. The library is loaded via the `next/script` component with `strategy="lazyOnload"` to avoid blocking the initial page render.

**Server-Side:** A Route Handler at `/api/webhooks/paystack` receives POST requests from Paystack when payment events occur. The handler verifies the webhook signature (HMAC-SHA512 using the Paystack secret key), parses the event payload, and updates the corresponding order in the database.

### 15.3 Payment Flow (Detailed)

1. Customer fills the checkout form and clicks "Pay with Paystack."
2. Client-side validation runs (Zod schema). If errors, they are displayed inline. Flow stops.
3. A Server Action is called with the validated form data and cart contents.
4. Server Action: validates data again (server-side Zod — canonical validation), generates a unique order number, calculates totals, creates the Order record (status: PENDING, channel: PAYSTACK) and associated OrderItems, decrements stock quantities, and returns the order reference and Paystack transaction parameters.
5. The client receives the response and initializes the Paystack popup with: public key, customer email, amount (in kobo — ₦1 = 100 kobo), reference (the order reference), currency (NGN), and available channels.
6. The customer completes payment within the Paystack popup.
7. On success (client callback): the customer is redirected to `/checkout/success?ref={reference}`. The cart store is cleared.
8. On cancellation (client callback): the popup closes. The customer sees a message that payment was not completed. The order remains PENDING. The customer can retry.
9. Asynchronously, Paystack sends a `charge.success` webhook to `/api/webhooks/paystack`.
10. The webhook handler: reads the raw request body, computes HMAC-SHA512 hash using the Paystack secret key, compares with the `x-paystack-signature` header. If they don't match, responds with 401. If they match, parses the event, finds the order by `paymentReference`, updates status to CONFIRMED and paymentStatus to "paid", and responds with 200.

### 15.4 Idempotency

The webhook handler must be idempotent. If Paystack sends the same event twice (which can happen due to network retries), processing it a second time should not cause problems. This is achieved by checking the order's current status before updating — if it's already CONFIRMED, the handler returns 200 without making changes.

### 15.5 Security Considerations

- The Paystack secret key is stored in an environment variable and never exposed to the client.
- The Paystack public key (used in the popup) is safe to expose — it can only initialize transactions, not verify or refund them.
- Webhook signature verification is mandatory and must happen before any database operations.
- The order reference is generated server-side and included in both the Paystack transaction and the database record. This links the payment to the order unambiguously.
- The amount is set server-side (not from the client's cart total) to prevent tampering.

---

## 16. Media Management — Cloudinary

### 16.1 Strategy

All product images are stored on Cloudinary and delivered via their global CDN. The application never stores or serves images from its own server or filesystem. Cloudinary handles format selection (WebP, AVIF, or JPEG depending on browser support), quality optimization, responsive sizing, and transformations (crop, resize, overlay).

### 16.2 Image Delivery (Storefront)

The `next-cloudinary` library's `CldImage` component wraps the Next.js `Image` component, passing Cloudinary transformation parameters while maintaining Next.js's built-in lazy loading, responsive sizing, and priority loading.

**Transformation Presets:**

| Context                     | Crop                 | Quality             | Dimensions  | Priority                                 |
| --------------------------- | -------------------- | ------------------- | ----------- | ---------------------------------------- |
| Product card (grid)         | `c_fill`, `g_auto`   | `q_auto`            | 400 × 500   | Lazy (below fold), Priority (above fold) |
| Product detail (main image) | `c_fill`, `g_auto`   | `q_auto:best`       | 800 × 1000  | Priority                                 |
| Product detail (zoom)       | `c_fill`             | `q_auto:best`       | 1200 × 1500 | Lazy (loaded on interaction)             |
| Thumbnail (gallery strip)   | `c_thumb`, `g_auto`  | `q_auto`            | 100 × 125   | Lazy                                     |
| Category banner             | `c_fill`, `g_center` | `q_auto`            | 1200 × 400  | Priority (if above fold)                 |
| OG social card              | `c_fill`             | `q_80` (fixed JPEG) | 1200 × 630  | N/A (server-side)                        |
| Admin thumbnail             | `c_thumb`, `g_face`  | `q_60`              | 80 × 80     | Lazy                                     |
| Cart line item              | `c_thumb`, `g_auto`  | `q_auto`            | 80 × 100    | Lazy                                     |

All transformations include `f_auto` (automatic format selection) unless a fixed format is specified (OG images must be JPEG for universal compatibility).

### 16.3 Image Upload (Admin)

When Sarah adds images to a product in the admin dashboard, the `CldUploadWidget` component opens a Cloudinary-hosted upload interface. The upload is signed — meaning the server generates a signature that authorizes the upload, preventing unauthorized users from uploading to the Cloudinary account.

Upload flow:

1. Sarah clicks "Add Images" on the product edit form.
2. The client calls a Server Action (`generateUploadSignature`) to get signed upload parameters.
3. The `CldUploadWidget` opens with these parameters. Sarah selects or drags images.
4. Images upload directly from Sarah's browser to Cloudinary (no server transit — faster, especially on slow connections).
5. On upload success, the widget returns the `public_id`, `secure_url`, `width`, and `height`.
6. This data is added to the product form's image list in local state.
7. When Sarah saves the product, the image metadata is persisted to the `ProductImage` table via a Server Action.

### 16.4 Image Organization

All product images are stored under a Cloudinary folder path: `eshair/products/{productSlug}/`. This keeps the Cloudinary media library organized and allows Sarah (or a developer) to find images by product.

---

## 17. Shopping Cart System

### 17.1 Architecture

The cart is fully client-side. No server state. No database table. Cart data is managed by a Zustand store with the `persist` middleware, which serializes the cart to `localStorage` on every change and rehydrates it on page load.

This means: no user accounts are needed to maintain a cart; the cart survives page refreshes and browser tab closes; the cart is device-specific (not synced across devices — acceptable for this use case); and the server never handles cart state, which simplifies the architecture and eliminates a category of potential bugs.

### 17.2 Cart Store Shape

The cart store contains: an array of cart items (each with productId, variantId, name, variantName, price, quantity, image URL, slug, and maxStock), a computed total items count, a computed subtotal, and actions for addItem, removeItem, updateQuantity, and clearCart.

### 17.3 Cart Behavior Rules

- Adding a product that is already in the cart (same productId + variantId combination) increments the quantity rather than creating a duplicate entry.
- Quantity cannot exceed the product's current stock. The maximum is set at add-time based on the stock data from the product detail page. This is a soft check — final stock validation happens server-side at checkout.
- Removing the last quantity of an item removes the entire line item.
- The cart icon in the header displays a badge with the total number of items (sum of all quantities). The badge is not shown when the cart is empty.
- Cart subtotal is calculated client-side and displayed in Naira (₦).
- The cart store exposes a `clearCart` action called after successful checkout (both Paystack and WhatsApp paths).

### 17.4 Cart Persistence

Zustand's `persist` middleware uses localStorage with a versioned key (`eshair-cart-v1`). If the storage schema changes in a future release, the version number increments and old cart data is discarded gracefully (the user sees an empty cart, not an error).

---

## 18. Order Lifecycle

### 18.1 Status Flow

```
                    ┌─── CANCELLED
                    │
PENDING ──→ CONFIRMED ──→ PROCESSING ──→ SHIPPED ──→ DELIVERED
                    │
                    └─── REFUNDED
```

| Status     | Meaning                                                      | Trigger                                                               |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| PENDING    | Order created, payment not yet confirmed                     | Server Action (checkout form submission)                              |
| CONFIRMED  | Payment received (Paystack) or order acknowledged (WhatsApp) | Paystack webhook OR admin manual action                               |
| PROCESSING | Sarah is preparing the order                                 | Admin action                                                          |
| SHIPPED    | Order dispatched to customer                                 | Admin action                                                          |
| DELIVERED  | Customer received the order                                  | Admin action                                                          |
| CANCELLED  | Order cancelled before fulfillment                           | Admin action                                                          |
| REFUNDED   | Payment returned to customer                                 | Admin action (refund processed outside system via Paystack dashboard) |

### 18.2 Order Number Format

`ESH-YYYYMMDD-NNNN` where YYYYMMDD is the order creation date and NNNN is a zero-padded sequential counter for that day. Example: `ESH-20260401-0003` is the third order on April 1, 2026. The counter resets daily.

Generation: a Server Action queries the count of orders created on the current date and increments by 1. A unique constraint on `orderNumber` prevents duplicates even under race conditions (the insert will fail and retry with the next number).

### 18.3 Stock Management

Stock is decremented at order creation (optimistic) and restored if the order is cancelled. The system does not prevent overselling in race conditions at the application level — the stock check is a soft check (client-side stock display + server-side validation at order creation). For Sarah's moderate volume (likely fewer than 10 orders per day), this is acceptable. Database-level constraints can be added later if volume increases.

---

## 19. Admin Dashboard

### 19.1 Layout

The admin dashboard uses a distinct layout from the public storefront. Sidebar navigation on the left (collapsed to icons on mobile, expandable). Top bar with Sarah's name/email and a logout button. Content area on the right.

Sidebar links: Dashboard (home icon), Products (package icon), Categories (grid icon), Orders (shopping bag icon), Settings (gear icon). Active link highlighted with gold accent.

### 19.2 Dashboard Overview (`/admin`)

Displays at a glance:

- **Revenue Cards (top row):** Today's revenue, this week's revenue, this month's revenue. Each shows the total from CONFIRMED/PROCESSING/SHIPPED/DELIVERED orders in the period. Formatted in Naira.
- **Recent Orders (middle):** Table showing the 5 most recent orders. Columns: order number, date, customer name, total, channel (badge: "Paystack" blue, "WhatsApp" green), status (color-coded badge). Each row links to the order detail page.
- **Low Stock Alerts (sidebar or below):** List of products with `stockQuantity ≤ 5`. Shows product name, current stock, and a "Restock" link to the product edit page.
- **Quick Actions:** "Add New Product" button, "View All Orders" button.

### 19.3 Product Management (`/admin/products`)

**List View:**

- Table: thumbnail image (80×80), product name, category, price (Naira), stock quantity, status toggle (active/inactive switch), actions (edit, delete).
- Search bar: searches by product name or SKU.
- Filters: category dropdown, stock status (All, In Stock, Low Stock, Out of Stock).
- Sort: by name, price, date created, stock.
- Pagination: 20 products per page with Previous/Next controls.

**Create / Edit Product Form (`/admin/products/new`, `/admin/products/[id]`):**

- General Section: name (auto-generates slug, editable), short description, full description (textarea with basic markdown support), category (dropdown), tags (comma-separated input).
- Pricing Section: base price, compare-at price (optional). Displayed side-by-side.
- Inventory Section: SKU (optional), stock quantity (numeric input).
- Media Section: image upload area. Supports drag-and-drop and file picker. Uses `CldUploadWidget`. Shows uploaded image thumbnails in a reorderable list (drag to reorder). Each thumbnail has a "Set as Primary" option and a "Remove" button. First image is primary by default.
- Variants Section: "Add Variant" button. Each variant has: label (text input), price (numeric), stock quantity (numeric), SKU (optional). Variants are displayed as a list with inline editing. Remove button per variant.
- Status Section: "Active" toggle (controls visibility on storefront), "Featured" toggle (controls display on home page).
- Form Actions: "Save Product" (primary), "Save & Add Another" (secondary, create mode only), "Cancel" (ghost).
- Validation: name required, category required, base price required (positive number), stock required (non-negative integer). Errors displayed inline.
- On save: Server Action processes form, creates/updates records, redirects to product list with success toast.

**Delete Behavior:**
Deleting a product sets `isActive = false` (soft delete). The product disappears from the storefront and the admin product list (unless a "Show Inactive" filter is applied). It is never hard-deleted because historical orders reference it. A confirmation dialog appears before soft-deletion: "This will hide {Product Name} from your store. Existing orders will not be affected."

### 19.4 Category Management (`/admin/categories`)

Simpler than product management. A single page with an inline list of categories and an "Add Category" form at the top.

Each category row: drag handle (for reordering), category name, product count, active/inactive toggle, edit button (expands inline edit form), delete button (disabled if category has products — shows tooltip "Remove all products from this category first").

Add/edit form: name (auto-generates slug), description (optional), image upload (single image for category banner).

### 19.5 Order Management (`/admin/orders`)

**List View:**

- Table: order number, date/time, customer name, customer phone, total (Naira), channel (badge), status (color-coded badge).
- Filters: status dropdown (All, Pending, Confirmed, Processing, Shipped, Delivered, Cancelled), date range picker, channel dropdown (All, Paystack, WhatsApp).
- Sort: by date (newest first, default), by total.
- Search: by order number or customer phone number.
- Pagination: 20 orders per page.

**Order Detail (`/admin/orders/[id]`):**

- Order header: order number (large, mono font), status badge, channel badge, date created.
- Status update: dropdown to change status. "Update Status" button. Status change is immediate (Server Action). Previous status history could be a future enhancement.
- Customer Info: name, phone (clickable — opens dialer), email (if provided), delivery address.
- Order Items: table with product image, name, variant, quantity, unit price, line total.
- Order Totals: subtotal, shipping, total.
- Payment Info (Paystack orders only): Paystack reference, payment status.
- Admin Notes: textarea for Sarah to add internal notes (e.g., "Delivered to customer's office receptionist"). Saved via Server Action.
- Actions: "Message Customer on WhatsApp" button — opens WhatsApp with a pre-formatted message including the order number and a friendly status update. "Print Order" button (CSS print styles for a clean printable view).

### 19.6 Store Settings (`/admin/settings`)

Single form with sections:

- **Store Info:** store name, store email, store phone, WhatsApp number (this is the number used for all WhatsApp CTAs on the storefront).
- **Shipping:** default shipping fee (Naira), free shipping minimum threshold (optional — leave blank to disable free shipping).
- **Storefront:** announcement bar text (leave blank to hide), maintenance mode toggle.
- **Save Settings** button at the bottom. Success toast on save.

---

## 20. Search Engine Optimization

### 20.1 Technical SEO

- **Server-side rendering:** All public pages are rendered server-side (SSR or ISR), ensuring search engine crawlers receive fully-rendered HTML with all content, metadata, and structured data.
- **Sitemap:** Automatically generated `sitemap.xml` at build time listing all active product pages, category-filtered listing pages, and the home page. Updated on each build (or via on-demand ISR revalidation).
- **Robots.txt:** Allows crawling of all public pages. Disallows `/admin/*`, `/api/*`, and `/checkout/*`.
- **Canonical URLs:** Every page includes a `<link rel="canonical">` tag pointing to its canonical URL to prevent duplicate content issues from query parameters.
- **URL structure:** Clean, descriptive slugs. `/products/brazilian-body-wave-bundle` instead of `/products/abc123`.

### 20.2 On-Page SEO

- **Title tags:** Unique per page, following the pattern "{Page-Specific Title} | Emmanuel Sarah Hair". Max 60 characters.
- **Meta descriptions:** Unique per page, max 160 characters. Product pages use shortDescription. Listing pages describe the category. Home page describes the store.
- **Open Graph tags:** `og:title`, `og:description`, `og:image`, `og:url`, `og:type` on every page. Product pages use dynamic OG images generated via `CldOgImage`.
- **Twitter cards:** `twitter:card` set to `summary_large_image` on product pages.
- **Heading hierarchy:** One H1 per page (page title), H2 for sections, H3 for cards/subsections. No skipped levels.

### 20.3 Structured Data (JSON-LD)

**Product pages:** Schema.org `Product` type with: name, image, description, brand ("Emmanuel Sarah Hair"), sku, offers (price, priceCurrency: NGN, availability, seller).

**Breadcrumbs:** Schema.org `BreadcrumbList` on product and category pages.

**Organization:** Schema.org `Organization` on the home page with: name, url, logo, contactPoint (phone, WhatsApp).

### 20.4 Performance as SEO

Google's ranking algorithm incorporates Core Web Vitals. The performance targets in Section 21 are therefore also SEO targets. A fast-loading, stable, responsive site ranks higher than a slow one.

---

## 21. Core Web Vitals & Performance

### 21.1 Targets

| Metric                              | Target (Good) | Strategy                                                                                                                                                                                |
| ----------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LCP** (Largest Contentful Paint)  | < 2.5s        | Self-hosted fonts (eliminate Google Fonts blocking request), Cloudinary CDN images with `priority` on above-fold images, ISR for pre-rendered pages, minimal JavaScript on initial load |
| **INP** (Interaction to Next Paint) | < 200ms       | Server Components reduce client JS, avoid blocking the main thread, use `startTransition` for non-urgent state updates                                                                  |
| **CLS** (Cumulative Layout Shift)   | < 0.1         | Explicit `width` and `height` on all images (via CldImage), `font-display: swap` with self-hosted font metrics, no dynamically injected content above the fold                          |

### 21.2 Image Optimization

- All images delivered via Cloudinary CDN with automatic format selection (`f_auto`) and quality optimization (`q_auto`).
- Responsive `sizes` attribute on all `CldImage` components matching the actual rendered size at each breakpoint.
- `priority` prop on above-fold images (hero image, first row of product grid).
- Lazy loading (default) for all below-fold images.
- Blur placeholder (Cloudinary low-quality image placeholder) displayed during load to prevent layout shift and improve perceived performance.

### 21.3 Font Loading

- Playfair Display and Inter are self-hosted using `next/font/local` (not Google Fonts CDN).
- `font-display: swap` ensures text is visible immediately with a fallback font while custom fonts load.
- Font files are preloaded via `<link rel="preload">` automatically by `next/font`.
- Font subsetting: only Latin character set to minimize file size.

### 21.4 JavaScript Budget

- React Server Components render on the server and send HTML — no JS shipped for server-only components.
- Client components are limited to interactive elements: cart drawer, variant selector, quantity stepper, Paystack popup, WhatsApp buttons, admin forms.
- Route-based code splitting is automatic with Next.js App Router — each page loads only the JS it needs.
- Third-party scripts (Paystack inline.js) loaded with `strategy="lazyOnload"` — after the page is interactive.
- Target: < 150 KB gzipped total JavaScript on initial load for public pages.

### 21.5 Caching Strategy

- ISR pages cached at the edge (Vercel CDN). Revalidation intervals ensure freshness without sacrificing speed.
- Static assets (fonts, icons) cached with immutable headers (`Cache-Control: public, max-age=31536000, immutable`).
- Cloudinary images cached at Cloudinary's CDN edge — no additional caching layer needed.
- API routes and Server Actions are not cached.

---

## 22. Accessibility (WCAG 2.1 AA)

### 22.1 Semantic HTML

Every page uses correct semantic elements: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<article>`, `<section>`. Landmark roles are implicit from semantic elements. Skip-to-content link is the first focusable element on every page, visually hidden until focused.

### 22.2 Keyboard Navigation

- All interactive elements (links, buttons, inputs, selects, tabs, modals) are reachable via Tab key.
- Tab order follows visual reading order (top-to-bottom, left-to-right).
- Custom components (variant selector, quantity stepper, image gallery) support expected keyboard interactions: arrow keys for selection, Enter/Space for activation, Escape for dismissal.
- Focus is never trapped except inside modals (where it is intentionally trapped until the modal is closed).
- Visible focus indicators on all elements: 2px solid gold ring with 2px offset. Never removed or hidden. Custom-styled to match the brand while remaining highly visible.

### 22.3 Screen Reader Support

- All images have meaningful `alt` text. Decorative images use `alt=""`.
- Form inputs have associated `<label>` elements (or `aria-label` for icon-only buttons).
- Error messages are linked to their inputs via `aria-describedby`.
- Required fields are marked with `aria-required="true"`.
- Dynamic content updates (toast notifications, cart count changes, form validation errors) are announced via `aria-live` regions.
- Page title changes on navigation are announced automatically by Next.js.
- The cart count badge uses `aria-label` to announce the count: "Cart, 3 items."
- Loading states are announced: `aria-busy="true"` on containers with pending content.

### 22.4 Color & Contrast

- All text/background combinations meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- Color is never the sole indicator of meaning. Status badges use both color and text ("In Stock" + green, not just a green dot). Error states use both red color and error text/icon.
- The gold accent color (#D4A853) on midnight background (#0A0A0A) achieves 8.6:1 contrast (exceeds AA).

### 22.5 Motion & Animation

- All animations and transitions respect the `prefers-reduced-motion` media query. When reduced motion is preferred, animations are disabled or replaced with instant state changes.
- No content depends on animation to be understood.
- Auto-dismissing toasts have a sufficient display duration (5 seconds) and can be dismissed manually.

### 22.6 Touch & Pointer

- All touch targets are at least 44×44 CSS pixels.
- Spacing between adjacent touch targets is at least 8px.
- Hover-only interactions (product card zoom, desktop gallery zoom) have non-hover equivalents on mobile (tap to enlarge, swipe to navigate).

### 22.7 Forms

- All form fields have visible labels positioned above the input.
- Placeholder text is supplementary (not a replacement for labels).
- Error messages are specific ("Phone number must be 11 digits" instead of "Invalid input").
- Form submission errors scroll the viewport to the first error field.
- Success states are clearly communicated (toast + visual confirmation).

---

## 23. Security

### 23.1 Environment & Secrets

All secrets (Paystack secret key, Supabase service role key, Cloudinary API secret, database URL) are stored as environment variables in the deployment platform (Vercel). They are never committed to version control. A `.env.example` file documents required variables without values.

### 23.2 Input Validation

Every piece of user input is validated twice: client-side (for instant UX feedback) and server-side (as the canonical security boundary). Server-side validation in Server Actions and Route Handlers uses Zod schemas. No user input is trusted — all is validated, sanitized, and typed before use.

### 23.3 SQL Injection Prevention

All database queries go through Prisma ORM, which uses parameterized queries exclusively. Raw SQL is never used anywhere in the application. This eliminates SQL injection as an attack vector.

### 23.4 Cross-Site Scripting (XSS) Prevention

React escapes all rendered output by default. Product descriptions stored as plain text or markdown are rendered through a sanitization step if they contain HTML. `dangerouslySetInnerHTML` is never used without prior sanitization. Content Security Policy headers are configured in `next.config.ts` to restrict script sources to the application's own origin and trusted CDNs (Paystack, Cloudinary).

### 23.5 CSRF Protection

Next.js Server Actions include built-in CSRF protection via origin checking. Route Handlers that accept POST requests from external sources (Paystack webhook) verify the request via HMAC signatures rather than CSRF tokens.

### 23.6 Payment Security

The application never handles, stores, or transmits payment card data. Paystack's PCI-DSS compliant infrastructure handles all sensitive payment information. The application only receives transaction references and status updates via signed webhooks.

### 23.7 Authentication Security

Supabase Auth handles password hashing (bcrypt), session management, and token rotation. Session cookies are httpOnly (not accessible via JavaScript), Secure (only sent over HTTPS), and SameSite=Lax. Admin session expiration is configured at the Supabase project level.

### 23.8 Rate Limiting

Checkout submission and the Paystack webhook endpoint are rate-limited to prevent abuse. Rate limiting is implemented in Middleware or via Vercel's built-in rate limiting. The checkout endpoint allows a maximum of 10 requests per IP per minute. The webhook endpoint allows a maximum of 60 requests per IP per minute (Paystack may retry).

### 23.9 Dependency Security

Dependencies are locked to specific version ranges (tilde for frameworks, caret for utilities). `pnpm audit` is run as part of the CI pipeline to detect known vulnerabilities. Critical vulnerabilities block deployment.

### 23.10 HTTP Security Headers

Configured in `next.config.ts`:

- `Strict-Transport-Security`: max-age=63072000; includeSubDomains; preload
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Content-Security-Policy`: restricts scripts, styles, images, and fonts to trusted origins
- `Permissions-Policy`: disables camera, microphone, geolocation (not needed)

---

## 24. Error Handling & Resilience

### 24.1 Server Action Errors

Every Server Action returns a consistent discriminated union result: either `{ success: true, data: T }` or `{ success: false, error: string, fieldErrors?: Record<string, string[]> }`. The calling component inspects the result and displays errors appropriately (field-level for validation errors, toast for general errors).

### 24.2 Error Boundaries

- **Global Error Boundary** (`src/app/error.tsx`): Catches unhandled runtime errors. Displays a branded error page with "Something went wrong" message, a "Try Again" button (calls `reset()`), and a "Go Home" link. In development, shows the error stack; in production, shows only the user-friendly message.
- **Not Found** (`src/app/not-found.tsx`): Handles 404s with a branded page.
- **Admin Error Boundary** (`src/app/admin/error.tsx`): Admin-specific error UI with a "Refresh Dashboard" button.

### 24.3 Loading States

- **Global Loading** (`src/app/loading.tsx`): Displayed during route transitions. Shows a minimal spinner or skeleton.
- **Page-Level Suspense**: Product listing and detail pages wrap data-fetching Server Components in `<Suspense>` with skeleton fallbacks matching the expected layout dimensions (preventing CLS).
- **Button Loading**: Form submission buttons show a spinner and disable during Server Action execution.

### 24.4 Network Resilience

- **Paystack popup failure**: If the popup fails to load (slow connection), a timeout of 10 seconds shows a message: "Payment is taking longer than expected. Please check your connection and try again."
- **Image loading failure**: `CldImage` components render a neutral placeholder (dark gray rectangle) if the Cloudinary image fails to load.
- **Cart hydration**: If localStorage is corrupted or the cart schema version doesn't match, the cart initializes as empty rather than crashing.

### 24.5 Optimistic Updates (Admin)

Admin actions like toggling product active/inactive status use optimistic UI updates — the toggle switches immediately in the UI while the Server Action processes in the background. If the Server Action fails, the toggle reverts and an error toast is shown.

---

## 25. Testing Strategy

### 25.1 Philosophy

This is a freelance client project with a single developer. Full unit test coverage is not the goal. Testing prioritizes the highest-risk, highest-impact areas: payment processing, order creation, and critical user flows. The strategy is to write fewer, more meaningful tests rather than chasing coverage metrics.

### 25.2 Testing Layers

**Unit Tests (Vitest):**

- Cart store: adding, removing, updating quantities, clearing, persistence serialization.
- Price formatting: `formatNaira` function with edge cases (0, decimals, large numbers).
- WhatsApp URL builder: correct message formatting, phone number normalization, URL encoding.
- Order number generation: format validation, daily counter behavior.
- Zod validation schemas: valid inputs pass, invalid inputs produce correct error messages.

**Integration Tests (Vitest + MSW for mocking):**

- Paystack webhook handler: valid signature → 200 + order updated; invalid signature → 401 + no changes; duplicate event → idempotent response.
- Create order Server Action: valid input → order created in DB with correct totals and status; invalid input → validation errors returned; insufficient stock → appropriate error.
- Product CRUD Server Actions: create, update, soft-delete, image association.

**End-to-End Tests (Playwright):**

- Full checkout flow: visit home → browse products → add to cart → fill checkout form → mock Paystack success → verify confirmation page.
- Admin product creation: login → navigate to products → create new product → verify it appears on the storefront.
- WhatsApp checkout: add to cart → click "Order via WhatsApp" → verify the `wa.me` URL contains correct message content.
- Mobile navigation: open hamburger menu → navigate to products → apply category filter → verify results.
- Accessibility: automated axe-core checks on home, product listing, product detail, cart, and checkout pages.

### 25.3 Test Execution

Tests run in CI (GitHub Actions or Vercel's build pipeline). Unit and integration tests run on every push. E2E tests run on pull requests targeting `main`. All tests must pass before a production deployment.

---

## 26. Deployment & Infrastructure

### 26.1 Service Architecture

| Service              | Purpose                                                                                | Tier                                                                           |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Vercel**           | Next.js hosting, serverless functions, edge middleware, preview deployments, analytics | Pro (or Hobby for initial launch)                                              |
| **Supabase**         | PostgreSQL database, Auth, Storage, Realtime, Edge Functions                           | Free tier (sufficient for launch volume; upgrade to Pro at ~1000 orders/month) |
| **Cloudinary**       | Image CDN, transformations, upload                                                     | Free tier (25K transformations/month; upgrade as needed)                       |
| **Paystack**         | Payment processing                                                                     | Standard (1.5% + ₦100 per transaction; no monthly fee)                         |
| **Domain registrar** | eshair.com domain                                                                      | Namecheap, Google Domains, or similar                                          |

### 26.2 Deployment Pipeline

1. Developer pushes code to a feature branch on GitHub.
2. Vercel automatically creates a preview deployment with a unique URL.
3. The preview URL is shared with Sarah for visual approval if needed.
4. Developer creates a pull request to `main`.
5. CI runs: type check (`tsc --noEmit`), lint (`eslint`), unit/integration tests (`vitest`), E2E tests (`playwright`).
6. On PR merge to `main`: Vercel auto-deploys to production.
7. Post-deployment: Prisma migrations (`prisma migrate deploy`) run as part of the Vercel build command.

### 26.3 Build Command

The Vercel build command is: `pnpm prisma generate && pnpm next build`. This ensures the Prisma client is generated before Next.js compiles the application.

### 26.4 Database Migrations

Migrations are managed by Prisma Migrate. In development, `prisma migrate dev` creates and applies migrations. In production, `prisma migrate deploy` applies pending migrations during the Vercel build. Migration files are committed to version control.

### 26.5 Environments

| Environment | URL                            | Database                                | Purpose                   |
| ----------- | ------------------------------ | --------------------------------------- | ------------------------- |
| Development | localhost:3000                 | Supabase local (via CLI) or dev project | Active development        |
| Preview     | \*.vercel.app (auto-generated) | Supabase dev project                    | PR review, client preview |
| Production  | eshair.com                     | Supabase production project             | Live site                 |

---

## 27. Environment Variables

| Variable                            | Scope           | Required | Description                                          |
| ----------------------------------- | --------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`               | Client + Server | Yes      | Application URL (https://eshair.com)                 |
| `NEXT_PUBLIC_SUPABASE_URL`          | Client + Server | Yes      | Supabase project URL                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Client + Server | Yes      | Supabase anonymous/public key                        |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server only     | Yes      | Supabase admin key (bypasses RLS)                    |
| `DATABASE_URL`                      | Server only     | Yes      | PostgreSQL connection string (Supabase)              |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`   | Client          | Yes      | Paystack publishable key                             |
| `PAYSTACK_SECRET_KEY`               | Server only     | Yes      | Paystack secret key (webhook verification + API)     |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Client + Server | Yes      | Cloudinary cloud name                                |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY`    | Client + Server | Yes      | Cloudinary API key (public, used for signed uploads) |
| `CLOUDINARY_API_SECRET`             | Server only     | Yes      | Cloudinary API secret (signing uploads)              |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`       | Client          | Yes      | Sarah's WhatsApp phone number                        |

`NEXT_PUBLIC_` prefixed variables are exposed to the browser. All others are server-only. A `.env.example` file documents all variables (without values) and is committed to version control. The actual `.env.local` file is git-ignored.

---

## 28. Dependency Manifest

### 28.1 Production Dependencies

| Package               | Version  | Purpose                            |
| --------------------- | -------- | ---------------------------------- |
| next                  | ~15.5.0  | React framework                    |
| react                 | ~19.2.4  | UI library                         |
| react-dom             | ~19.2.4  | React DOM renderer                 |
| @supabase/supabase-js | ^2.99.0  | Supabase client                    |
| @supabase/ssr         | ^0.6.0   | Supabase SSR cookie handling       |
| @prisma/client        | ~7.4.0   | Database ORM client                |
| @prisma/adapter-pg    | ~7.4.0   | PostgreSQL driver adapter          |
| next-cloudinary       | ^6.17.0  | Cloudinary + Next.js integration   |
| cloudinary            | ^2.9.0   | Cloudinary Node SDK                |
| @paystack/inline-js   | ^2.22.0  | Paystack checkout popup            |
| zustand               | ^5.0.0   | Client state management            |
| zod                   | ^3.24.0  | Schema validation                  |
| lucide-react          | ^0.468.0 | Icons                              |
| clsx                  | ^2.1.0   | Conditional class names            |
| tailwind-merge        | ^3.0.0   | Tailwind class conflict resolution |

### 28.2 Development Dependencies

| Package                     | Version | Purpose                                   |
| --------------------------- | ------- | ----------------------------------------- |
| typescript                  | ~6.0.2  | Type checking                             |
| prisma                      | ~7.4.0  | Prisma CLI (migrations, generate, studio) |
| tailwindcss                 | ~4.2.0  | CSS framework                             |
| @tailwindcss/vite           | ~4.2.0  | Tailwind Vite plugin                      |
| eslint                      | ^9.0.0  | Linting                                   |
| eslint-config-next          | ~15.5.0 | Next.js ESLint rules                      |
| prettier                    | ^3.0.0  | Formatting                                |
| prettier-plugin-tailwindcss | ^0.6.0  | Tailwind class sorting                    |
| @types/node                 | ^22.0.0 | Node.js type definitions                  |
| @types/react                | ^19.0.0 | React type definitions                    |
| @types/react-dom            | ^19.0.0 | React DOM type definitions                |
| tsx                         | ^4.19.0 | TypeScript execution for scripts          |
| husky                       | ^9.0.0  | Git hooks                                 |

### 28.3 Node and Package Manager

**.nvmrc:** `24`

**engines (package.json):** `{ "node": ">=24.0.0", "pnpm": ">=9.0.0" }`

**type (package.json):** `"module"` (required for Prisma 7 ESM)

---

## 29. Phased Rollout Plan

A complete build of the entire system described in this document is estimated at 8–12 weeks for a single developer. To deliver value incrementally and get Sarah online as quickly as possible, the project is divided into four phases.

### Phase 1: Coming Soon Landing Page (Week 1)

**Deliverable:** A single page deployed at eshair.com.

**Scope:**

- Hero section with brand imagery and luxury dark-themed design
- "Coming Soon" messaging with estimated launch date
- WhatsApp CTA: "Chat with us to order now" (links to Sarah's WhatsApp)
- Email collection form: "Get notified when we launch" (stored in a Supabase table)
- Social media links (Instagram, Facebook)
- Mobile responsive, fast, branded

**Value:** Sarah has a professional URL she can put in her Instagram bio immediately. Customers who visit see a legitimate business, not a blank domain. Email list starts building for launch announcement.

**Tech:** Static Next.js page. Supabase for email storage. Deployed on Vercel with eshair.com domain configured.

### Phase 2: Product Catalog + WhatsApp Commerce (Weeks 2–4)

**Deliverable:** Full browsable storefront with WhatsApp checkout.

**Scope:**

- Home page with all sections (hero, categories, featured products, trust signals, WhatsApp CTA)
- Product listing page with category filtering and sorting
- Product detail pages with image gallery, pricing, stock status, variants
- Shopping cart (Zustand + localStorage)
- WhatsApp checkout (pre-formatted message from cart)
- WhatsApp floating action button on all pages
- Product data entered by developer via Prisma Studio or seed script (admin dashboard not yet available)
- SEO: metadata, OG images, structured data, sitemap
- Accessibility: keyboard navigation, screen reader support, contrast compliance

**Value:** Customers can browse the full catalog, compare products, and order via WhatsApp — which is how Sarah already works. The site replaces "DM for price" with a transparent, professional catalog. Sarah can share product page links on social media.

**No Paystack, no admin dashboard yet.** Sarah provides product data to the developer for manual entry. This is acceptable for a small catalog (likely 20–50 products).

### Phase 3: Paystack Checkout + Admin Dashboard (Weeks 5–8)

**Deliverable:** Direct payment and self-service product management.

**Scope:**

- Checkout page with customer details form
- Paystack inline popup integration
- Paystack webhook handler for payment confirmation
- Order confirmation page
- Admin authentication (Supabase Auth)
- Admin dashboard: overview, product CRUD with image upload, order management, category management, store settings
- Order lifecycle management (status updates)
- Cloudinary upload widget integration in admin

**Value:** Customers can pay directly. Sarah can manage her own catalog, see orders, and run her business independently.

### Phase 4: Polish, Performance & Growth (Weeks 9–12)

**Deliverable:** Production-hardened, growth-ready platform.

**Scope:**

- Performance audit and optimization (Lighthouse, Web Vitals)
- Accessibility audit (axe-core, manual testing)
- End-to-end test suite (Playwright)
- Google Analytics / Vercel Analytics integration
- PWA manifest and "Add to Home Screen" support
- Print-friendly order pages for admin
- Email notifications (order confirmation to customer — optional, stretch goal)
- Customer review/testimonial section (stretch goal)
- Product search with instant results (stretch goal)

**Value:** The platform moves from "working" to "polished." Performance is verified, accessibility is audited, critical flows are tested, and analytics provide visibility into customer behavior.

---

## 30. Risks, Constraints & Mitigations

| Risk                                        | Likelihood             | Impact                                        | Mitigation                                                                                                                                                               |
| ------------------------------------------- | ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Slow network conditions in Lagos**        | High                   | Users abandon slow pages                      | Cloudinary CDN for images, ISR for pre-rendered pages, minimal JS bundle, image placeholders                                                                             |
| **Sarah struggles with admin dashboard**    | Medium                 | Products don't get updated, frustration       | Design for extreme simplicity. Test with Sarah during Phase 3. Iterate based on her feedback. Provide video walkthrough.                                                 |
| **Paystack downtime during checkout**       | Low                    | Lost sales                                    | WhatsApp checkout as fallback. "Having trouble paying? Order via WhatsApp" link on error.                                                                                |
| **Low initial traffic**                     | Medium                 | Business objectives not met                   | Not a technical problem — requires marketing effort. The site provides the foundation; Sarah must drive traffic via social media, Instagram bio link, and word-of-mouth. |
| **Product photography quality**             | Medium                 | Site looks unprofessional despite good design | Provide Sarah with basic photo guidelines: natural lighting, clean background, consistent angles. Cloudinary auto-enhancement can improve mediocre photos.               |
| **Scope creep**                             | High                   | Project never ships                           | This SDD defines the scope. The phased rollout ensures something ships in Week 1. Features not in this document are explicitly out of scope until a future version.      |
| **Single point of failure (one developer)** | Medium                 | If the developer is unavailable, no updates   | Clean code, TypeScript, documented architecture (this SDD), conventional project structure. Any competent Next.js developer can pick up the project.                     |
| **Supabase free tier limits**               | Low (at launch volume) | Database or auth limits hit                   | Monitor usage. Upgrade to Pro ($25/month) when approaching limits. Sarah's volume (est. < 100 orders/month initially) is well within free tier.                          |

---

## 31. Glossary

| Term              | Definition                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ISR**           | Incremental Static Regeneration — Next.js feature that serves pre-rendered pages from cache and regenerates them in the background at specified intervals |
| **RSC**           | React Server Components — React components that render on the server and send HTML to the client, reducing client-side JavaScript                         |
| **Server Action** | A TypeScript function marked with `'use server'` that executes on the server but can be called from client components                                     |
| **RLS**           | Row Level Security — Supabase/PostgreSQL feature that restricts which rows a user can access based on policies                                            |
| **CUID**          | Collision-resistant Unique Identifier — a string ID format used as primary keys                                                                           |
| **Kobo**          | The smallest unit of Nigerian currency. 1 Naira (₦1) = 100 kobo. Paystack accepts amounts in kobo.                                                        |
| **OG Image**      | Open Graph image — the preview image shown when a URL is shared on social media                                                                           |
| **FAB**           | Floating Action Button — a persistent button fixed to a corner of the viewport                                                                            |
| **Soft Delete**   | Setting a record's `isActive` flag to false instead of physically removing it from the database                                                           |
| **CLS**           | Cumulative Layout Shift — a Core Web Vital measuring unexpected visual movement during page load                                                          |
| **LCP**           | Largest Contentful Paint — a Core Web Vital measuring when the largest visible element finishes rendering                                                 |
| **INP**           | Interaction to Next Paint — a Core Web Vital measuring responsiveness to user interactions                                                                |

---

_End of document. This SDD is the single source of truth for the Emmanuel Sarah Hair project. All implementation decisions should reference and align with this specification. When this document and the code disagree, update whichever is wrong._
