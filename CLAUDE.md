# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Emmanuel & Sarah Hair (eshair.com) — a hair business client project.

## Specification

See [SPEC.md](./SPEC.md) for the authoritative source on pinned technology versions, dependency constraints, and migration notes. Always consult SPEC.md before adding/upgrading dependencies or scaffolding new code to ensure version alignment.

- **Guiding principle:** "Latest stable LTS, not bleeding edge"

### Runtime & Language

| Technology     | Pinned Version                  | Notes                                                                                  |
| -------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| **Node.js**    | `24.x LTS` (latest: `24.14.1`) | Active LTS → Oct 2026, Maintenance → Apr 2028. Next.js 16 requires minimum Node 20.9. |
| **TypeScript** | `6.0.x` (latest: `6.0.2`)      | Final JS-based TS. Bridge to Go-based TS 7.0. TS 5.9 is a fallback if needed.         |
| **pnpm**       | `9.x` (latest stable)          | Preferred over npm for faster installs and strict dependency resolution.                |

### Framework & UI

| Technology       | Pinned Version               | Notes                                                                                                  |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Next.js**      | `15.x` (latest: `15.5.x`)   | Maintenance LTS. Full App Router, Turbopack (dev), React 19 support. Upgrade path to 16.x available.  |
| **React**        | `19.2.x` (latest: `19.2.4`) | Required by Next.js 15. Server Components, Actions, Activity API.                                      |
| **React DOM**    | `19.2.x` (latest: `19.2.4`) | Must match React version exactly.                                                                      |
| **Tailwind CSS** | `4.x` (latest: `4.2.2`)     | CSS-native `@theme` config replaces `tailwind.config.js`. Rust-based engine, OKLCH colors.             |

### Backend & Database

| Technology                | Pinned Version            | Notes                                                                                             |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| **Supabase (Platform)**   | Latest cloud (managed)    | Auto-updates. PostgREST v14 is default data API.                                                  |
| **@supabase/supabase-js** | `2.x` (latest: `2.99.3`)  | Isomorphic client for auth, database, storage, realtime, edge functions.                          |
| **Supabase CLI**          | `2.x` (latest: `2.84.2`)  | Local development, migrations, type generation.                                                   |
| **Prisma ORM**            | `7.x` (latest: `7.4.x`)   | TypeScript query compiler (Rust-free), ES module-first, `prisma.config.ts`, `@prisma/adapter-pg`. |
| **@prisma/client**        | `7.x` (match Prisma CLI)  | Must match `prisma` CLI version.                                                                  |
| **@prisma/adapter-pg**    | `7.x` (match Prisma CLI)  | Required driver adapter for PostgreSQL in Prisma 7.                                               |

### Payments

| Technology              | Pinned Version            | Notes                                                                                            |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| **@paystack/inline-js** | `2.x` (latest: `2.22.8`)  | Client-side checkout. Server-side verification via Paystack REST API — no dedicated Node SDK.    |

### Media & Image Management

| Technology                | Pinned Version            | Notes                                                                                |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| **next-cloudinary**       | `6.x` (latest: `6.17.5`)  | `CldImage`, `CldUploadWidget`, `CldOgImage` wrapping Next.js Image with transforms. |
| **cloudinary** (Node SDK) | `2.x` (latest: `2.9.0`)   | Server-side uploads, transformations, admin API.                                     |

### Developer Tooling

| Technology   | Pinned Version | Notes                                                                  |
| ------------ | -------------- | ---------------------------------------------------------------------- |
| **ESLint**   | `9.x`          | Flat config format. Use `eslint-config-next` for Next.js integration.  |
| **Prettier** | `3.x`          | Code formatting. Works alongside ESLint with `eslint-config-prettier`. |
| **Husky**    | `9.x`          | Git hooks for pre-commit linting/formatting.                           |

### Recommended `package.json` Version Constraints

Use exact or tilde ranges for production stability:

```json
{
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=9.0.0"
  },
  "dependencies": {
    "next": "~15.5.0",
    "react": "~19.2.4",
    "react-dom": "~19.2.4",
    "@supabase/supabase-js": "^2.99.0",
    "@prisma/client": "~7.4.0",
    "@prisma/adapter-pg": "~7.4.0",
    "next-cloudinary": "^6.17.0",
    "cloudinary": "^2.9.0",
    "@paystack/inline-js": "^2.22.0",
    "tailwindcss": "~4.2.0"
  },
  "devDependencies": {
    "typescript": "~6.0.2",
    "prisma": "~7.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "~15.5.0",
    "prettier": "^3.0.0",
    "@tailwindcss/vite": "~4.2.0"
  }
}
```

### `.nvmrc`

```
24
```

## Migration Notes (Next.js 14+ → 15.x)

1. **Async Request APIs:** `cookies()`, `headers()`, and `params` are now async in Next.js 15. All server components and route handlers must `await` these calls.

2. **Fetch caching:** Next.js 15 does NOT cache `fetch()` by default (unlike 14). Add explicit `cache: 'force-cache'` or `next: { revalidate: N }` where caching is needed (e.g., product catalog pages).

3. **Prisma 7 migration:** Prisma 7 is ES module-first and requires `prisma.config.ts` for database URL configuration. The `.env` auto-loading is removed — use `dotenv/config` import. `prisma generate` must be run explicitly after migrations.

4. **Tailwind CSS v4:** Replaces `tailwind.config.js` with CSS-native `@theme` directives. The automated upgrade tool (`npx @tailwindcss/upgrade`) handles ~90% of class renames. The luxury dark-themed aesthetic variables should be migrated to `@theme` blocks.

5. **TypeScript 6.0:** ES module alignment release. Adds `--stableTypeOrdering` flag for future TS 7.0 migration path. No major breaking changes from TS 5.9 for this project's patterns.

6. **Supabase JS v2.99:** No breaking changes from earlier v2.x — minor version bump with auth guard improvements and storage fixes.
