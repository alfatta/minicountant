# Changelog

All notable changes to MiniCountant are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-08-18

First releasable build. Local-first, offline accounting for a single
homelab company (IDR only).

### Added
- **Money core** — integer-minor-unit money helpers with a lint guard
  forbidding float literals, `parseFloat`, and `toFixed` in financial paths.
- **Persistence** — Dexie/IndexedDB schema with typed CRUD repos.
- **Security** — PBKDF2 password (≥100k iterations), inactivity auto-lock,
  and a global lock middleware.
- **Company + onboarding** — single-row company invariant; onboarding is
  the only path to READY (company → password → funds).
- **Funds & capital allocation** — fund balances derived from the ledger,
  rollover rule (Opsi A), atomic capital injection with allocations.
- **Transactions ledger** — Zod-validated inputs, derived cash/capital/
  interest/opEx selectors, QuickAdd + filterable list.
- **Assets** — buy/sell atomic flows, inline current-value editor, net
  worth invariant (cash + active asset value).
- **Dashboard** — hero + 7 metric cards, 3 sparklines, fund cards,
  recent transactions, assets summary, empty states, loading skeletons.
- **Monthly closing** — derived snapshot per (year, month), preview,
  close (refuses duplicates), reopen with audit trail.
- **Reports** — monthly summary, cash flow, net worth, fund performance;
  month/year filter; per-section CSV export.
- **Backup & restore** — `.hcb` JSON backup (secrets stripped),
  validation, transactional restore with auto-backup + rollback, CSV export.
- **Settings** — company (currency locked), security (change password,
  lock now, auto-lock timeout), data (backup/restore/reset with 2-step
  typed-shortName confirm), appearance (theme persists + real-time).
- **PWA** — manifest + offline shell via Nuxt PWA.
- **e2e** — Playwright happy-path spec (onboarding → dashboard).

### Verified
- No float literals anywhere in financial paths (money-guard lint clean).
- No duplicated derived values persisted in the DB.
- Domain validation (Zod) cannot be bypassed by the UI.
- Destructive actions (reset company, restore) require explicit confirmation.
- Offline-first: no network calls in app code.
- All 345 unit/integration tests green.
