# Contributing to SynapsVault Frontend

A Stellar-powered marketplace UI built with React, TypeScript, Vite, and Tailwind CSS.

## Local Development

### Prerequisites
- Node.js 20+
- npm (or pnpm)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend (default: http://localhost:3000)

# Start dev server
npm run dev
# Open http://localhost:5173
```

Dev server includes hot module reload and TypeScript checking.

## Docker Development

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
# Open http://localhost:8080
```

## Branch Strategy

| Branch | Purpose | Deploy Target |
|--------|---------|----------------|
| `main` | Production-ready | Vercel → production |
| `dev` | Staging/integration | Vercel preview |
| `feat/*` | Feature branches | PR to `dev` |
| `fix/*` | Bug fixes | PR to `dev` |
| `chore/*` | Maintenance | PR to `dev` |

## Development Workflow

1. **Create feature branch from dev:**
   ```bash
   git checkout -b feat/my-feature dev
   ```

2. **Make changes and test locally:**
   ```bash
   npm run dev
   npm run test:watch
   ```

3. **Before committing, verify:**
   ```bash
   npm run typecheck   # Type safety
   npm run test        # All tests pass
   npm run build       # Production build works
   ```

4. **Commit with conventional format (see below)**

5. **Push and create PR to `dev`**

6. **After review + merge to `dev`:**
   - Staging deploy to Vercel preview
   - Create release PR to `main`

## Testing

```bash
npm run test           # Run all tests once
npm run test:watch    # Watch mode for development
npm run test:ui       # Visual UI for test runner
```

Tests use Vitest + React Testing Library. Focus on user behavior, not implementation details.

## Code Standards

- **TypeScript**: Strict mode, no `any` without comment
- **Components**: Functional components with hooks
- **Styling**: Use CSS custom properties (`var(--synapse-*)`)
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Code-split routes, memoize expensive renders
- **Errors**: Use Sentry for tracking, user-friendly error messages

## Design System

All design tokens live in `src/index.css` as CSS custom properties:

```css
/* Colors */
--synapse-bg:      #0a0d14  /* Page background */
--synapse-surface: #111622  /* Cards, sidebar */
--synapse-violet:  #7c5cfc  /* Primary accent */
--synapse-cyan:    #22d3ee  /* Secondary accent */

/* Fonts */
--font-display: Sora        /* Headings, brand */
--font-body:    Inter       /* Body copy */
--font-mono:    JetBrains Mono  /* Addresses, code */
```

**Never hardcode hex values** — use CSS variables instead. This ensures consistency and makes theme changes easy.

## Adding a New Page

1. **Create component:** `src/pages/MyPage.tsx`
2. **Add route:** Update `src/App.tsx`
3. **Add tests:** `src/pages/MyPage.test.tsx`
4. **Update nav:** Add link in main navigation
5. **Test:** `npm run dev` and verify routing works

## Commit Format (Conventional Commits)

```
feat(ui): add subscription plan selector
fix(wallet): handle Freighter disconnect race condition
test(catalog): add search filter tests
docs: update component library
refactor(theme): extract color variables to custom properties
chore: upgrade vite to 6.0
perf(catalog): memoize ResourceCard component
```

**Types:** feat, fix, test, docs, refactor, chore, perf, style

## Code Review Checklist

- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Tests pass (`npm run test`)
- [ ] Bundle size acceptable (check Vite output)
- [ ] No hardcoded colors/spacing (use CSS vars)
- [ ] Accessible (keyboard nav, ARIA labels)
- [ ] Mobile responsive (tested at 320px+)
- [ ] Follows conventional commit format
- [ ] PR description explains "why", not "what"

## Wallet Integration

Uses Stellar Freighter for wallet connection. See `src/api/agent.ts` for integration patterns.

## Payment Integration

Uses x402 protocol via `@x402/fetch` and `@x402/stellar`. See `src/api/payments.ts`.

## Troubleshooting

**Port 5173 already in use?**
```bash
npm run dev -- --port 5174
```

**Build too large?**
```bash
npm run bundle:stats
# Opens stats.html showing bundle breakdown
```

**Tests failing?**
```bash
npm run test:watch
# Rerun on file changes
```

## Questions?

- Open a GitHub issue
- Check existing PRs for similar work
- Ask in Stellar Dev Discord #synapsvault
