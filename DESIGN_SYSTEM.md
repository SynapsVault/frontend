# SynapsVault Design System

A token-driven system in the style of Radix Colors and shadcn/ui: **primitive
scales → semantic tokens → components**. Light and dark themes come from the
same tokens; no component needs to know which theme is active.

```
src/styles/tokens.css   primitive scales + semantic tokens (light & .dark)
tailwind.config.js      exposes the tokens as Tailwind colors, radii, shadows
src/index.css           shell components (synapse-*) built on semantic tokens
```

## 1. Tokens

### Primitive scales

`--sv-gray-{50…950}` (cool neutral with a faint violet undertone) and
`--sv-violet-{50…950}` (brand). Values are space-separated RGB channels so
Tailwind opacity modifiers work: `bg-indigo-600/20`.

Tailwind's `gray` and `indigo` palettes are **remapped** onto these, and
`green` onto emerald. That's why existing components written with
`bg-gray-50 dark:bg-gray-900` or `bg-indigo-600` render in brand colors with
no code changes.

### Semantic tokens: use these in new code

| Tailwind class          | Token                    | Purpose                                 |
| ----------------------- | ------------------------ | --------------------------------------- |
| `bg-canvas`             | `--sv-canvas`            | Page background                         |
| `bg-surface`            | `--sv-surface`           | Cards, sidebar                          |
| `bg-surface-raised`     | `--sv-surface-raised`    | Modals, popovers, menus                 |
| `bg-surface-sunken`     | `--sv-surface-sunken`    | Wells, `<kbd>`, inset areas             |
| `bg-surface-hover`      | `--sv-hover`             | Hover fill for rows and ghost buttons   |
| `border-line`           | `--sv-line`              | Default borders and dividers            |
| `border-line-strong`    | `--sv-line-strong`       | Hovered borders, dashed empty states    |
| `text-fg`               | `--sv-fg`                | Primary text                            |
| `text-fg-muted`         | `--sv-fg-muted`          | Secondary text (AA on every surface)    |
| `text-fg-subtle`        | `--sv-fg-subtle`         | Captions and placeholders               |
| `bg-accent` / `text-accent-fg` | `--sv-accent` / `--sv-accent-fg` | Primary actions          |
| `text-accent-text`      | `--sv-accent-text`       | Accent-colored text (links, active nav) |
| `bg-accent-soft`        | `--sv-accent-soft`       | Tinted accent backgrounds               |
| `text-success` / `bg-success-soft` | `--sv-success…` | Verified, paid, healthy               |
| `text-warning` / `bg-warning-soft` | `--sv-warning…` | Pending, stale, attention              |
| `text-danger` / `bg-danger-soft`   | `--sv-danger…`  | Errors, rejected, destructive          |

Each of these flips automatically under `.dark`. All screens use them; the
one deliberate exception is `Toast`, an inverted surface (dark in light mode,
light in dark mode) that keeps explicit `gray-*` + `dark:` pairs. **Prefer them over
`gray-*` + `dark:` pairs.** One class instead of two, and it can't drift.

```tsx
// ✗ before
<p className="text-gray-500 dark:text-gray-400">…</p>
// ✓ after
<p className="text-fg-muted">…</p>
```

### Other tokens

| Group      | Tokens                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| Type       | `font-sans` Inter · `font-display` Sora · `font-mono` JetBrains Mono        |
| Radius     | `rounded-sm` 6 · `rounded-lg` 8 · `rounded-xl` 12 · `rounded-2xl` 16 · `rounded-3xl` 20 |
| Elevation  | `shadow-sm` · `shadow-md` · `shadow-lg` · `shadow-glow` (theme-tuned)        |
| Motion     | `--sv-duration-{fast,base,slow}`, `--sv-ease-out`. All 0 under `prefers-reduced-motion` |
| Layering   | `--sv-z-{header,sidebar,overlay,modal,toast}`                               |

## 2. Components (`src/index.css`)

| Class                                        | Use                                                  |
| -------------------------------------------- | ---------------------------------------------------- |
| `synapse-btn` + `--primary` `--secondary` `--ghost` `--danger`, `--sm` `--lg` | Buttons     |
| `synapse-icon-btn` (`--text`)                | Square icon buttons; always give an `aria-label`     |
| `synapse-input`, `synapse-select`            | Form controls                                        |
| `synapse-tag` + `--success` `--warning` `--danger` `--accent` `--neutral` | Status pills    |
| `synapse-kbd`                                | Keyboard key                                         |
| `synapse-modal-backdrop` › `synapse-modal` › `__header` / `__title` / `__body` | Dialogs |
| `synapse-empty` › `__icon` / `__title` / `__body` | Empty states                                    |
| `synapse-spinner` (`--lg`)                   | Indeterminate loading                                |

> **Tailwind purging:** these live in `@layer components`, so a rule is only
> emitted if its full class name appears literally in source. Never build
> modifiers with template strings (`` `synapse-tag--${tone}` ``); map to full
> names instead (see `TONE_CLASS` in `ResourceCard.tsx`).

## 3. Principles

- **Accessible by default.** Text tokens meet WCAG 2.2 AA (≥ 4.5:1) on their
  surfaces in both themes. Focus is always visible (`:focus-visible` ring).
  Touch targets are ≥ 44px on mobile. Motion respects `prefers-reduced-motion`.
- **Semantic over literal.** Name the intent (`danger`), not the hue (`red-600`).
- **Keyboard-first.** Every primary action has a shortcut; press `?` in the app.
- **No theme flash.** `index.html` applies the saved theme before first paint.
- **Localized.** All user-facing shell copy goes through i18next (`en`, `es`).
  Keep `src/i18n/locales/*.json` in key parity.
