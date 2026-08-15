# MiniCountant

A local-first, offline-first personal finance tracker for solo operators.

- **Stack:** Nuxt 4 · `@nuxt/ui` v4 · Dexie (IndexedDB) · VeeValidate + Zod · `@vite-pwa/nuxt`
- **Scope (MVP):** IDR only · single user · single company · funds / capital / transactions / assets / monthly closing / reports / backup
- **No backend, no network calls.** Everything lives in your browser's IndexedDB.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Nuxt dev server with PWA enabled in dev |
| `pnpm build` | Production build |
| `pnpm generate` | Static build (requires `NUXT_PUBLIC_SITE_URL`) |
| `pnpm preview` | Preview the built app |
| `pnpm lint` | ESLint over the whole repo |
| `pnpm typecheck` | `nuxt typecheck` (vue-tsc) |
| `pnpm test` | Vitest unit/integration tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm lint:no-money` | Bash guard against float literals / `parseFloat` / `toFixed` in financial paths |
| `pnpm postinstall` | Runs `nuxt prepare` (required; do not skip) |

## Money rules

All monetary amounts are **integer minor units** (IDR has no sub-unit, so 1 unit = Rp 1). Never `parseFloat`, never `Number("0.x")`, never `toFixed` on amounts. Fund balances and net worth are **derived**, never persisted.

## Docs

- `docs/README.md` — product spec index
- `plan/TODO.md` — implementation plan (local, gitignored)
- `AGENTS.md` — repo-specific guidance for AI coding agents
