<div align="center">
  <h1>⬡ SynapsVault — Frontend</h1>
  <p><strong>Advanced Stellar-powered knowledge vault marketplace</strong></p>
  <p>
    <a href="https://github.com/SynapsVault/frontend/actions"><img src="https://github.com/SynapsVault/frontend/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <img src="https://img.shields.io/badge/React-18-61dafb" alt="React 18">
    <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript">
    <img src="https://img.shields.io/badge/Stellar-Soroban-7D00FF" alt="Stellar">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
  </p>
</div>

---

## What is SynapsVault?

SynapsVault is a decentralised marketplace where creators publish **paywalled digital resources** — APIs, datasets, documents, and research — secured by **x402 Stellar micropayments** and **Soroban smart contracts**. Buyers pay once (or subscribe) and get on-chain proof of access.

This repo is the **React/Vite web UI**.

## Architecture

```
Browser (React/Vite)
    │  Freighter wallet (Stellar)
    │  x402/fetch — payment over HTTP
    ▼
SynapsVault-backend  (Express + Supabase)
    │  Stellar Horizon RPC
    ▼
SynapsVault-contracts  (Soroban — vault-registry, access-lease, subscription)
```

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + custom design system (CSS vars) |
| Wallet | Stellar Freighter via `@stellar/freighter-api` |
| Payments | x402 protocol via `@x402/fetch` + `@x402/stellar` |
| i18n | i18next (English + Español included) |
| Testing | Vitest + React Testing Library |
| Error tracking | Sentry |
| Deployment | Vercel (via GitHub Actions) |

## Quick start

```bash
# Prerequisites: Node 20+
git clone https://github.com/SynapsVault/frontend SynapsVault-frontend
cd SynapsVault-frontend
npm install

# Environment
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend, VITE_API_KEY if you're a publisher

npm run dev         # http://localhost:5173
npm run lint        # ESLint (typescript-eslint + react-hooks)
npm run typecheck   # type checking
npm run test        # unit tests
npm run build       # production build → dist/
npm run check       # everything CI runs: lint, typecheck, test, build + bundle budgets
```

## Docker

```bash
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_NETWORK=mainnet \
  -t synapsvault-frontend .

docker run -p 8080:80 synapsvault-frontend
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API base URL |
| `VITE_API_KEY` | Publisher only | API key for creator features |
| `VITE_NETWORK` | ✅ | `testnet` or `mainnet` |
| `VITE_SENTRY_DSN` | ❌ | Sentry DSN for error tracking |

## Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full branch strategy and commit format.

### CI/CD pipeline

Every push and PR runs three jobs: **lint + typecheck + test**, **build + bundle
budgets** (initial JS ≤ 250 KB gz, any chunk ≤ 800 KB gz, total ≤ 1 MB gz, and no
circular chunk imports — see `scripts/check-bundle-size.mjs`), and a **Docker
smoke test** that boots nginx and checks `/health` and SPA routing.

```
Push to feat/* ──► CI (lint + typecheck + test + build + docker)
                         │
Merge to dev   ──► CI + preview deploy
                         │
Merge to main  ──► CI + production deploy (Vercel)
```

## Design system

Token-driven (primitive scales → semantic tokens → components) with first-class
light and dark themes, WCAG AA contrast, and reduced-motion support. Tokens live
in [`src/styles/tokens.css`](./src/styles/tokens.css) and are exposed to Tailwind
as semantic classes (`bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`, …).

See **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** for the full reference.

## Keyboard shortcuts

Press <kbd>?</kbd> in the app for the full list. Highlights: <kbd>/</kbd> search,
<kbd>1</kbd>–<kbd>6</kbd> switch tabs, <kbd>T</kbd> toggle theme, <kbd>L</kbd> switch language,
<kbd>Esc</kbd> close dialogs.

## Screens

| Tab | Description |
|---|---|
| Catalog | Browse + search + filter all listed resources |
| My Vault | Creator dashboard — manage, price, register your resources |
| Analytics | Revenue charts, access counts, payment history |
| Purchases | All resources you've bought |
| Leaderboard | Top publishers by revenue |
| Agent | AI agent status and live reasoning feed |

## Repo siblings

| Repo | Description |
|---|---|
| [SynapsVault-backend](https://github.com/SynapsVault/backend) | Express API + Supabase |
| [SynapsVault-contracts](https://github.com/SynapsVault/contracts) | Soroban smart contracts |

## License

MIT © 2025 Busiii-adetiba
