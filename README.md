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
| CI | GitHub Actions (lint, typecheck, test, build, Docker smoke test) |

## Quick start

```bash
# Prerequisites: Node 24.15+
git clone https://github.com/SynapsVault/frontend SynapsVault-frontend
cd SynapsVault-frontend
npm install

# Environment
cp .env.example .env
# Leave VITE_API_URL empty in dev. Never put API keys in VITE_* variables.

# Run the backend (SynapsVault/backend) on http://localhost:3000, then:
npm run dev         # http://localhost:5173 (API routes are proxied to the backend)
npm run lint        # ESLint (typescript-eslint + react-hooks)
npm run typecheck   # type checking
npm run test        # unit tests
npm run build       # production build → dist/
npm run check       # everything CI runs: lint, typecheck, test, build + bundle budgets
```

## Docker

```bash
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_NETWORK=mainnet \
  -t synapsvault-frontend .

docker run -p 8080:8080 synapsvault-frontend
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Defaults to `/api` in production and same-origin backend paths in development. Vercel and Docker forward `/api/*` to the configured backend. |
| `VITE_DEV_PROXY_TARGET` | No | Development backend (default `http://localhost:3000`). |
| `VITE_AUTH_PROXY_URL` | Sign-in only | Optional wallet authentication service; see `.env.example` for the challenge/session contract. The marketplace backend currently has no session endpoints. |
| `VITE_NETWORK` | No | `testnet` (default) or `mainnet`. |
| `VITE_SENTRY_DSN` | No | Sentry DSN. |

### Vercel API connection troubleshooting

Use an empty `VITE_API_URL` or `/api` for Vercel builds. The rewrites in
`vercel.json` forward requests to `https://backend-1bhj.vercel.app`;
update the destination if the backend moves. Redeploy after changing build variables.
The Docker proxy destination is in `nginx.conf`.

On 2026-10-22 the live frontend bundle pointed to `https://backend-two-virid-26.vercel.app`, and
`GET /resources` returned HTTP 500 with `FUNCTION_INVOCATION_FAILED`.
This means the backend function crashed. Inspect **the backend project's Vercel
function logs**, correct the reported startup/runtime error and required environment
variables, and redeploy it. In particular, `src/config.ts` exits during startup if
production `BASE_URL` or `WEB_APP_URL` is missing, or if required database,
Supabase, OpenRouter, and Stellar settings fail validation. The function log
identifies the actual missing or invalid value; do not put these secrets in the frontend.
Verify `/resources` returns a JSON array before testing
the frontend catalog. Changing the frontend's error text cannot restore a crashed API.

Publisher secrets must stay on a server that authenticates and authorizes each
user. A wallet signature is not itself an API key or server-issued session token.

## Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full branch strategy and commit format.

### CI/CD pipeline

Every push to `main` or `dev`, and every PR targeting those branches, runs three jobs: **lint + typecheck + test**, **build + bundle
budgets** (initial JS ≤ 250 KB gz, any chunk ≤ 800 KB gz, total ≤ 1 MB gz, and no
circular chunk imports — see `scripts/check-bundle-size.mjs`), and a **Docker
smoke test** that boots nginx and checks `/health` and SPA routing.

```
Push to main/dev or PR to main/dev ──► CI (lint + typecheck + test + build + docker)
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
