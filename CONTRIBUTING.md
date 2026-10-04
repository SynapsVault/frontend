# Contributing to SynapsVault Frontend

## Setup

```bash
pnpm install
cp .env.example .env   # fill in values
pnpm dev
```

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deploys to Vercel |
| `dev`  | Staging — PRs target this branch |
| `feat/*` | Feature branches |
| `fix/*`  | Bug fix branches |

## Workflow

1. Branch from `dev`: `git checkout -b feat/your-feature dev`
2. Write code + tests
3. `pnpm test` must pass
4. `pnpm exec tsc --noEmit` must pass
5. Open PR → `dev`
6. After review + merge to `dev`, open PR → `main` for release

## Commit format (Conventional Commits)

```
feat: add subscription plan UI
fix: wallet disconnect race condition
docs: update README setup steps
refactor: extract ResourceCard component
chore: bump soroban-sdk to 21.1
```

## Design tokens

All colours and spacing live in `src/index.css` as CSS custom properties.
Never hardcode hex values in components — use `var(--synapse-*)`.
