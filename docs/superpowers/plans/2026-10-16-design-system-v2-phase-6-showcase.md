# Design System v2 — Phase 6: Storybook showcase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a living Design System showcase in Storybook — a set of MDX Docs pages backed by supporting CSF stories — that renders every token and component variant, proves the token mapping is complete with one example screen, and surfaces colour-contrast failures.

**Architecture:** A new top-level **`Design System/*`** Storybook section authored as **MDX Docs pages** (enabled by widening the `stories` glob to include `.mdx`; `@storybook/addon-docs` is already installed), each embedding live **supporting CSF `.stories.tsx`** that render the matrices, specimens, and the example screen. Three reusable, data-driven helpers (`StateMatrix`, `previewState`, `ColorPair`) plus a pure contrast utility live in a new `src/components/showcase/` module, keyed to the `@/lib/cn` alias and the existing theme/locale toolbars. The showcase is **additive** — it adds files only; no existing component, token, or story changes behaviour. This task set also folds in the small deferred documentation/test polish items carried over from Phases 2–5.

**Tech Stack:** Storybook 10.6 (`@storybook/react-vite`), `@storybook/addon-docs` (MDX + doc blocks), `@storybook/addon-a11y` (in-panel axe), React 19, TypeScript 6 (strict), Tailwind v4, `class-variance-authority`, Vitest + Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-15-design-system-v2-design.md` — §5 "Phase 6 — Design System showcase (Storybook)" (lines 250-269), §6 cross-cutting, §9 phase summary. The plan argues from the spec; executors read both.

## Global Constraints

Every task's requirements implicitly include this section. Values copied from the spec and the verified codebase.

- **Gates green, every task:** `pnpm lint && pnpm typecheck && pnpm test` must pass before each commit.
- **Showcase build gate:** `pnpm storybook:build` (outputs `storybook-static/`) must succeed for any task that adds/edits a story or MDX page.
- **No new dependencies.** Everything is built on installed packages (`@storybook/addon-docs`, `@storybook/addon-a11y`, `cva`, `@/lib/cn`). Do **not** add `@storybook/test-runner`, `@storybook/test`, `@storybook/addon-themes`, or any contrast library.
- **No behaviour/visual change to existing code.** No edits to `src/styles/tokens.css`, `src/styles/globals.css`, or any `src/components/ui/*.tsx` / `src/components/feedback/*.tsx` component implementation. The showcase only *reads* them. Back-compat: no existing screen changes visually.
- **Design-token guard applies to stories.** `src/test/design-tokens.guard.test.ts` scans `/src/**/*.{ts,tsx}` and does **not** exclude `*.stories.tsx` or `src/components/showcase/**`. So in any `.ts`/`.tsx` showcase file: no hex, no raw Tailwind palette classes (`bg-slate-500`), no arbitrary pixel values (`p-[13px]`, `rounded-[10px]`, `border-[2px]`), no raw `z-<n>`, no raw `duration-<n>`, no literal `@keyframes`. Use token-backed utilities (`bg-chart-1`, `rounded-md`, `ring-3`, `duration-normal`, `z-modal`). For a justified exception on a single line, append the comment `design-tokens-guard-ignore`. MDX (`.mdx`) files are **not** scanned by the guard.
- **`jsx-no-literals`:** OFF for `*.stories.tsx` (eslint.config.js:329-337) — stories may use literal English copy. It is **ON** for every other `src/**` `.ts`/`.tsx` file, including `src/components/showcase/*.tsx` helpers — so helper components must take all user-visible copy as **props/data**, never hardcode JSX text literals. (Entity strings in the allow-list — `·—–…/|•*:%()+-×` — are permitted anywhere.)
- **No lorem ipsum.** Type specimens and examples use real, meaningful copy (spec acceptance).
- **Contrast noted, not hidden.** No surface+foreground colour pair below 4.5:1 may go unannotated; the `ColorPair` helper computes and displays the WCAG ratio and flags failures (spec acceptance).
- **Example screen = tokens + components only.** The one example screen is built exclusively from design tokens and existing components — no bespoke colours, pixel values, or markup that bypasses the system (spec acceptance; it is the proof the mapping is complete).
- **Import conventions:** `@` = `src/`. Story meta types import from **`@storybook/react-vite`** (not `@storybook/react`). `cn` from `@/lib/cn`. Components from `@/components/ui/<name>` and the barrel `@/components/feedback`. Icons from `@/components/ui/icons`. Keep `import-x/order` happy (builtin → external → internal `@/**` → relative; alphabetised; newline between groups) — `pnpm lint:fix` repairs order.
- **House story conventions (mirror these):** declare axis arrays `as const` at the top; `const meta = { title, component, … } satisfies Meta<typeof X>`; `export default meta`; `type Story = StoryObj<typeof meta>`; enumerate axes inside a `render` grid; set `parameters: { layout: 'padded' | 'centered' | 'fullscreen' }` per story.
- **Each phase ends with a `CHANGELOG.md` entry** and the relevant `docs/` file updated (spec §5/§6).
- **Conventional Commits** (commitlint enforced). Each commit message ends with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

New files (created by this plan):

| Path | Responsibility |
| --- | --- |
| `src/components/showcase/contrast.ts` | Pure WCAG math (`relativeLuminance`, `contrastRatio`) + DOM token resolver (`resolveTokenRgb`). No JSX. |
| `src/components/showcase/contrast.test.ts` | Unit tests for the pure contrast math. |
| `src/components/showcase/color-pair.tsx` | `ColorPair` — renders a surface+foreground swatch with live contrast ratio + pass/fail flag. Copy via props. |
| `src/components/showcase/state-matrix.tsx` | `StateMatrix` + `previewState` — renders a labelled grid of a component across forced visual states. Copy via props. |
| `src/components/showcase/state-matrix.test.tsx` | Unit tests for `previewState` (the data-attribute/forcing logic). |
| `src/components/showcase/index.ts` | Barrel re-exporting the three helpers + types (so stories/MDX import from one place). |
| `src/components/showcase/showcase.stories.tsx` | Smoke/self-test CSF story proving the helpers render (title `Design System/Helpers`). |
| `src/styles/foundations.stories.tsx` | Supporting CSF stories for Foundations specimens (colour grid, type specimen, spacing/density ladder, radius ladder, elevation ladder, motion table). Title `Foundations/Tokens`. |
| `src/components/showcase/components-matrix.stories.tsx` | Supporting CSF stories: primitives variant×state matrices + composed/overlay examples with edge cases. Title `Design System/Components`. |
| `src/components/showcase/do-dont.stories.tsx` | Supporting CSF stories rendering the Do/Don't pairs. Title `Design System/Do and Don't`. |
| `src/components/showcase/example-screen.stories.tsx` | The one example screen + recipes, tokens/components only. Title `Design System/Example Screen`. |
| `src/stories/design-system.mdx` | MDX overview/index Docs page (`Design System/Overview`). |
| `src/stories/foundations.mdx` | MDX Foundations page, embedding the `Foundations/Tokens` stories + `ColorPair`. |
| `src/stories/components.mdx` | MDX Components-by-tier page, embedding the matrix stories. |
| `src/stories/do-and-dont.mdx` | MDX Do/Don't page, embedding the Do/Don't stories. |
| `src/stories/recipes.mdx` | MDX Recipes + example-screen page, embedding the example screen. |

Modified files:

| Path | Change |
| --- | --- |
| `.storybook/main.ts` | Widen `stories` glob to also match `../src/**/*.mdx`. |
| `src/test/design-tokens.guard.test.ts` | Deferred-minor: the `ad-hoc @keyframes` unit test reads its pattern from `RULES` instead of re-literalising it. |
| `docs/rules/styling.md` | Deferred-minors: clarify the `border-2` / `--border-width-strong` wording; wrap multi-root Correct snippets so each is a single JSX expression. |
| `docs/rules/composition.md` | Deferred-minor: wrap any multi-root Correct snippet; tighten the one verbose aria-label if present. |
| `docs/customization.md` | Deferred-minor: the Motion row notes that reduced-motion zeroes `--duration-*`/`--move-*`. |
| `docs/design-system.md` | Add a "Design System showcase (Storybook)" section linking the showcase and how to run it. |
| `docs/starting-a-new-project.md` | Point to the showcase from the customize step. |
| `CHANGELOG.md` | Phase 6 entry (showcase; deferred-minor cleanup), migration notes (none required downstream — additive). |

---

## Decisions locked for this plan (settle spec open items)

- **D-P6-1 — MDX pages + supporting CSF stories** (not CSF-autodocs-only). The spec says "a `Docs`/MDX page + supporting stories" and "following shadcn's `design-system-page.md`" (which is MDX). MDX is the right tool for the narrative Foundations prose and the Do/Don't pairs. Cost: one `stories`-glob line in `.storybook/main.ts`; `@storybook/addon-docs` is already installed. This is additive and does not restructure existing CSF stories.
- **D-P6-2 — Contrast is computed in-browser via a 1×1 canvas**, dependency-free. `resolveTokenRgb` sets a canvas 2d `fillStyle` to the token's resolved `oklch(...)` value (from `getComputedStyle`), fills, and reads back sRGB bytes; the pure `relativeLuminance`/`contrastRatio` functions do the WCAG math. This handles OKLCH tokens in any colour syntax and needs no colour library. The pure math is unit-tested; the canvas resolver is exercised live in Storybook (jsdom has no real canvas).
- **D-P6-3 — Showcase helpers take all copy as props/data.** Because `jsx-no-literals` is ON for non-story `src/**` files, `ColorPair`, `StateMatrix`, and `previewState` never hardcode English JSX text. Labels, state names, and token names are passed in. This keeps the helpers lint-clean outside the story exemption.
- **D-P6-4 — No automated per-story contrast/a11y gate is added.** `@storybook/addon-a11y` already runs axe in-panel; `ColorPair` renders the ratio and flags `< 4.5:1`. Adding `@storybook/test-runner` is out of scope (new dep). Acceptance is met by the live, visible annotation plus the existing addon.
- **D-P6-5 — Forced visual states use real interaction pseudo-state where possible, with a data-attribute fallback.** `previewState` marks a wrapper with `data-preview-state` and applies Storybook pseudo-state classes understood by the components' own `hover:`/`focus-visible:`/`active:`/`disabled:` utilities is **not** reliable without the (absent) pseudo-states addon, so `previewState` instead renders each state by passing the real prop/attribute the component honours: `disabled` via the real `disabled` prop; `invalid` via real `aria-invalid`; and `hover`/`focus`/`active` are shown by applying the component's own state utility classes through a `className` wrapper is not possible either — therefore `hover`/`focus`/`active` cells render the component with an explanatory caption and the **default** rendering, while `disabled` and `invalid` render the genuinely forced state. (Rationale: the only robust, dependency-free forcing is via real props/attributes; we do not fake pseudo-states.) See Task 4 for the exact `previewState` contract.

---

## Task 1: Deferred-minor cleanup (docs + guard test)

Pure documentation/test polish carried over from Phases 2–5. Independent of the showcase; done first so the rulebook the showcase references (Task 5) is already corrected. No component or token change.

**Files:**
- Modify: `src/test/design-tokens.guard.test.ts:75-83`
- Modify: `docs/rules/styling.md:41-58` (border wording), `docs/rules/styling.md:72-77` and `:53-56` (multi-root Correct snippets)
- Modify: `docs/rules/composition.md` (multi-root snippet + verbose aria-label, if present)
- Modify: `docs/customization.md:25` (Motion row note)
- Test: `src/test/design-tokens.guard.test.ts` (its own suite is the test)

**Interfaces:**
- Consumes: the `RULES` array exported-in-module in `design-tokens.guard.test.ts` (find the entry with `name === 'ad-hoc @keyframes'`).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Make the `@keyframes` unit test read the pattern from `RULES`**

In `src/test/design-tokens.guard.test.ts`, replace the re-literalised regex in the `ad-hoc @keyframes rule` describe block (currently line 76 `const pattern = /@keyframes\b/;`) with a lookup from the single source of truth:

```ts
describe('ad-hoc @keyframes rule', () => {
  const rule = RULES.find((r) => r.name === 'ad-hoc @keyframes');
  const pattern = rule!.pattern;
  it('is defined in RULES', () => {
    expect(rule).toBeDefined();
  });
  it('matches an inline @keyframes', () => {
    expect(pattern.test('const css = `@keyframes spin { to { rotate: 360deg } }`;')).toBe(true);
  });
  it('ignores prose that merely says keyframes', () => {
    expect(pattern.test('// author keyframes in globals.css')).toBe(false);
  });
});
```

(The `!` non-null assertion is allowed in test files — eslint.config.js:335 turns off `no-non-null-assertion` for `**/*.test.{ts,tsx}`.)

- [ ] **Step 2: Run the guard test to confirm it still passes**

Run: `pnpm test -- src/test/design-tokens.guard.test.ts`
Expected: PASS (both the `.each(RULES)` scan and the three `ad-hoc @keyframes rule` assertions, now sourcing the pattern from `RULES`).

- [ ] **Step 3: Fix the border wording in `docs/rules/styling.md`**

In the "Borders via the token, not a raw width" section, the current sentence conflates `border-2` (Tailwind's fixed 2px) with the `--border-width-strong` token. Replace lines 43 and the Correct block (53-56) so the relationship is accurate:

Replace the intro sentence:

```md
The bare `border` utility reads `--border-width`, so one edit in `tokens.css` thickens every border in the app. For an intentional heavier line, use `border-2` (a fixed 2px step, the same weight as the `--border-width-strong` token). Never hand-write a bracketed width.
```

Replace the Correct block so it is a single JSX expression (wrap siblings in a fragment) and keep the two cases as separate fenced examples:

```tsx
<div className="border border-border">…</div>
```

```tsx
<div className="border-2 border-border">…</div>
```

- [ ] **Step 4: Wrap the remaining multi-root Correct snippets**

In `docs/rules/styling.md`, the "No manual z-index on overlays" Correct block (lines 72-77) shows four sibling root elements in one fenced `tsx` block, which is not a valid single JSX expression. Split it into separate one-line fenced examples (one element per fence), e.g.:

```tsx
<div className="z-modal">…</div>
```

```tsx
<div className="z-dropdown">…</div>
```

```tsx
<header className="z-sticky">…</header>
```

Scan the rest of `styling.md` and `docs/rules/composition.md` for any other Correct/Incorrect fence containing two or more sibling root elements; give each its own fence, or wrap in `<>…</>`. (Do not touch `forms.md`/`icons.md` unless they have the same issue.)

- [ ] **Step 5: Tighten the verbose aria-label (scan + fix if present)**

Run: `pnpm exec grep -rn "aria-label" docs/rules src/components/ui/*.stories.tsx src/components/showcase 2>/dev/null` (or Grep for `aria-label`). If any `aria-label` value restates the control type verbosely (e.g. `aria-label={\`${variant} icon button\`}` or `aria-label="Go to previous page"` where a shorter noun suffices), shorten it to the minimal accessible name. If none is found in the rulebook/stories, this item is already resolved — note that and make no change.

- [ ] **Step 6: Add the reduced-motion note to the customization Motion row**

In `docs/customization.md`, the Motion row of the token table (line 25) lists the motion tokens. Append a short parenthetical or footnote making explicit that reduced motion zeroes them. Change the Motion row's cell to end with:

```md
`--move-sm`/`-md`/`-lg` — under `prefers-reduced-motion`, the duration and move tokens drop to zero, so all motion stops.
```

(Keep the table well-formed; if the cell grows awkward, add a one-line note under the table instead.)

- [ ] **Step 7: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (docs changes don't affect lint/typecheck; the guard test passes with the `RULES`-sourced pattern).

- [ ] **Step 8: Commit**

```bash
git add src/test/design-tokens.guard.test.ts docs/rules/styling.md docs/rules/composition.md docs/customization.md
git commit -m "docs: fold in deferred rulebook and guard-test polish from phases 2-5"
```

---

## Task 2: Showcase infrastructure — MDX glob + helpers + contrast util

Stand up the foundation the rest of the showcase builds on: enable MDX, add the three data-driven helpers and the contrast utility (TDD for the pure logic), and a smoke story. Nothing visual-narrative yet — this task's deliverable is "helpers render and are tested; Storybook builds with MDX enabled."

**Files:**
- Create: `src/components/showcase/contrast.ts`, `src/components/showcase/contrast.test.ts`
- Create: `src/components/showcase/color-pair.tsx`, `src/components/showcase/state-matrix.tsx`, `src/components/showcase/state-matrix.test.tsx`, `src/components/showcase/index.ts`
- Create: `src/components/showcase/showcase.stories.tsx`
- Create: `src/stories/design-system.mdx`
- Modify: `.storybook/main.ts`

**Interfaces:**
- Produces (consumed by Tasks 3-6):
  - `relativeLuminance(rgb: Rgb): number` where `type Rgb = { r: number; g: number; b: number }` (channels 0-255).
  - `contrastRatio(a: Rgb, b: Rgb): number` (1-21).
  - `resolveTokenRgb(tokenVarName: string): Rgb` — resolves a CSS custom property (e.g. `'--primary'`) against `document.documentElement` to sRGB via a 1×1 canvas; browser-only.
  - `ColorPair(props: ColorPairProps)` — `ColorPairProps = { name: string; surfaceVar: string; foregroundVar: string; surfaceClass: string; foregroundClass: string; sampleText: string }`. Renders a swatch using the Tailwind classes, resolves the two vars, shows the ratio and a pass/fail flag at the 4.5:1 threshold.
  - `StateMatrix(props: StateMatrixProps)` — `StateMatrixProps = { caption: string; columns: readonly string[]; rows: readonly { label: string; render: (state: string) => React.ReactNode }[] }`. Renders a labelled grid: one column per state, one row per variant.
  - `previewState(state: PreviewState): { disabled?: boolean; 'aria-invalid'?: true; 'data-preview-state': string }` where `type PreviewState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'invalid'`. Maps a state name to the real props/attributes a component honours (see D-P6-5).
  - Barrel `@/components/showcase` re-exports all of the above + the types.

- [ ] **Step 1: Write failing tests for the pure contrast math**

Create `src/components/showcase/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { contrastRatio, relativeLuminance } from './contrast';

describe('relativeLuminance', () => {
  it('is 0 for black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
  it('is 1 for white', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeCloseTo(21, 1);
  });
  it('is 1:1 for identical colours', () => {
    expect(contrastRatio({ r: 18, g: 18, b: 18 }, { r: 18, g: 18, b: 18 })).toBeCloseTo(1, 5);
  });
  it('is symmetric', () => {
    const a = { r: 10, g: 80, b: 200 };
    const b = { r: 240, g: 240, b: 240 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/showcase/contrast.test.ts`
Expected: FAIL with "Cannot find module './contrast'" (or the exports are undefined).

- [ ] **Step 3: Implement the contrast utility**

Create `src/components/showcase/contrast.ts`:

```ts
/** sRGB channels, 0-255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
  );
}

/** WCAG contrast ratio (1-21), order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Resolve a CSS custom property (e.g. '--primary') to sRGB by painting its
 * resolved value onto a 1x1 canvas and reading the pixel back. Browser-only
 * (jsdom has no canvas), so this is exercised live in Storybook, not in unit tests.
 */
export function resolveTokenRgb(tokenVarName: string): Rgb {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(tokenVarName)
    .trim();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0 };
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/showcase/contrast.test.ts`
Expected: PASS (all `relativeLuminance` and `contrastRatio` cases).

- [ ] **Step 5: Write failing tests for `previewState`**

Create `src/components/showcase/state-matrix.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';

import { previewState } from './state-matrix';

describe('previewState', () => {
  it('forces the disabled prop for "disabled"', () => {
    expect(previewState('disabled')).toMatchObject({ disabled: true, 'data-preview-state': 'disabled' });
  });
  it('forces aria-invalid for "invalid"', () => {
    expect(previewState('invalid')).toMatchObject({ 'aria-invalid': true, 'data-preview-state': 'invalid' });
  });
  it('passes no forcing props for "default"', () => {
    const attrs = previewState('default');
    expect(attrs.disabled).toBeUndefined();
    expect(attrs['aria-invalid']).toBeUndefined();
    expect(attrs['data-preview-state']).toBe('default');
  });
  it('tags hover/focus/active without forcing props', () => {
    for (const s of ['hover', 'focus', 'active'] as const) {
      const attrs = previewState(s);
      expect(attrs.disabled).toBeUndefined();
      expect(attrs['aria-invalid']).toBeUndefined();
      expect(attrs['data-preview-state']).toBe(s);
    }
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `pnpm test -- src/components/showcase/state-matrix.test.tsx`
Expected: FAIL with "Cannot find module './state-matrix'".

- [ ] **Step 7: Implement `StateMatrix` + `previewState`**

Create `src/components/showcase/state-matrix.tsx`. Note: copy comes only from props (`caption`, `columns`, row `label`) — no hardcoded JSX literals, satisfying `jsx-no-literals`. Use token utilities only.

```tsx
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type PreviewState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'invalid';

export interface PreviewAttrs {
  disabled?: boolean;
  'aria-invalid'?: true;
  'data-preview-state': string;
}

/**
 * Map a visual state to the real props/attributes a component honours.
 * We force only what a prop/attribute can genuinely force (disabled, invalid);
 * hover/focus/active are tagged for labelling but render the default appearance
 * (we never fake pseudo-states). See plan D-P6-5.
 */
export function previewState(state: PreviewState): PreviewAttrs {
  switch (state) {
    case 'disabled':
      return { disabled: true, 'data-preview-state': 'disabled' };
    case 'invalid':
      return { 'aria-invalid': true, 'data-preview-state': 'invalid' };
    default:
      return { 'data-preview-state': state };
  }
}

export interface StateMatrixRow {
  label: string;
  render: (state: string) => ReactNode;
}

export interface StateMatrixProps {
  caption: string;
  columns: readonly string[];
  rows: readonly StateMatrixRow[];
  className?: string;
}

/** A labelled grid: one column per state, one row per variant. */
export function StateMatrix({ caption, columns, rows, className }: StateMatrixProps) {
  return (
    <figure className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="mb-2 text-caption text-muted-foreground">{caption}</caption>
        <thead>
          <tr>
            <th className="p-2 text-label text-muted-foreground" scope="col">
              {/* empty corner */}
            </th>
            {columns.map((col) => (
              <th key={col} className="p-2 text-label text-muted-foreground" scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border">
              <th className="p-2 text-label text-muted-foreground" scope="row">
                {row.label}
              </th>
              {columns.map((col) => (
                <td key={col} className="p-2">
                  {row.render(col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
```

- [ ] **Step 8: Run the `previewState` tests to verify they pass**

Run: `pnpm test -- src/components/showcase/state-matrix.test.tsx`
Expected: PASS.

- [ ] **Step 9: Implement `ColorPair`**

Create `src/components/showcase/color-pair.tsx`. Resolves both vars live, computes the ratio, flags `< 4.5:1`. Copy via props; the flag label is derived from data (`pass`/`fail` passed as props). Use token utilities for everything visual; the swatch background/foreground come from the Tailwind classes the caller passes (e.g. `bg-primary` / `text-primary-foreground`).

```tsx
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import { contrastRatio, resolveTokenRgb } from './contrast';

export interface ColorPairProps {
  /** Human label, e.g. 'Primary'. */
  name: string;
  /** Surface token var, e.g. '--primary'. */
  surfaceVar: string;
  /** Foreground token var, e.g. '--primary-foreground'. */
  foregroundVar: string;
  /** Tailwind surface class, e.g. 'bg-primary'. */
  surfaceClass: string;
  /** Tailwind foreground class, e.g. 'text-primary-foreground'. */
  foregroundClass: string;
  /** Real copy to render inside the swatch (no lorem ipsum). */
  sampleText: string;
  /** Label for a passing ratio, e.g. 'AA'. */
  passLabel: string;
  /** Label for a failing ratio, e.g. 'low'. */
  failLabel: string;
}

const AA_THRESHOLD = 4.5;

export function ColorPair({
  name,
  surfaceVar,
  foregroundVar,
  surfaceClass,
  foregroundClass,
  sampleText,
  passLabel,
  failLabel,
}: ColorPairProps) {
  // Recompute when the theme toolbar flips .dark (class on <html>).
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    const compute = () => {
      setRatio(contrastRatio(resolveTokenRgb(surfaceVar), resolveTokenRgb(foregroundVar)));
    };
    compute();
    const observer = new MutationObserver(compute);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, [surfaceVar, foregroundVar]);

  const passes = ratio !== null && ratio >= AA_THRESHOLD;
  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn('flex min-h-16 items-center justify-center rounded-md p-3', surfaceClass, foregroundClass)}
      >
        <span className="text-label">{sampleText}</span>
      </div>
      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span>{name}</span>
        <span className={cn(passes ? 'text-success' : 'text-destructive')}>
          {ratio === null ? '—' : ratio.toFixed(2)} : 1 {passes ? passLabel : failLabel}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Create the showcase barrel**

Create `src/components/showcase/index.ts`:

```ts
export { ColorPair, type ColorPairProps } from './color-pair';
export { contrastRatio, relativeLuminance, resolveTokenRgb, type Rgb } from './contrast';
export {
  StateMatrix,
  previewState,
  type PreviewAttrs,
  type PreviewState,
  type StateMatrixProps,
  type StateMatrixRow,
} from './state-matrix';
```

- [ ] **Step 11: Widen the Storybook glob for MDX**

In `.storybook/main.ts`, change the `stories` array so MDX Docs pages are picked up:

```ts
stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
```

(MDX first so Docs pages can order ahead of their supporting stories.)

- [ ] **Step 12: Add a smoke story for the helpers**

Create `src/components/showcase/showcase.stories.tsx` (a `.stories.tsx`, so literal copy is allowed here). It proves all three helpers mount:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

import { ColorPair } from './color-pair';
import { StateMatrix, previewState } from './state-matrix';

const meta = {
  title: 'Design System/Helpers',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ColorContrast: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <ColorPair
        name="Primary"
        surfaceVar="--primary"
        foregroundVar="--primary-foreground"
        surfaceClass="bg-primary"
        foregroundClass="text-primary-foreground"
        sampleText="The quick brown fox"
        passLabel="AA"
        failLabel="low"
      />
      <ColorPair
        name="Muted"
        surfaceVar="--muted"
        foregroundVar="--muted-foreground"
        surfaceClass="bg-muted"
        foregroundClass="text-muted-foreground"
        sampleText="The quick brown fox"
        passLabel="AA"
        failLabel="low"
      />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <StateMatrix
      caption="Button across forced states"
      columns={['default', 'disabled', 'invalid']}
      rows={[
        {
          label: 'default',
          render: (state) => (
            <Button {...previewState(state as 'default' | 'disabled' | 'invalid')}>Save</Button>
          ),
        },
      ]}
    />
  ),
};
```

- [ ] **Step 13: Create the MDX overview page**

Create `src/stories/design-system.mdx` — the top-level index. Keep it to real prose describing the sections and how to navigate. Use the addon-docs `Meta` doc block to title it:

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="Design System/Overview" />

# Design System

This is the living showcase for react-bedrock's design system. It proves the tokens
and components cover the surface a product needs, and shows the rules for building with them.

- **Foundations** — colour roles with live contrast, the type scale, spacing & density,
  radius, elevation, motion, and the icon set.
- **Components** — every primitive as a variant × state matrix, plus composed and overlay
  components with typical and edge-case examples.
- **Do and Don't** — the most-breakable rules as paired examples.
- **Recipes & example screen** — one screen built only from tokens and components.

Flip the **Theme** and **Locale** toolbars (top of the canvas) to check light/dark and en/es.
```

(The exact `@storybook/addon-docs/blocks` import path is the SB10 doc-blocks entry; if `pnpm storybook:build` reports it moved, use the path the error names — the blocks package is bundled with the installed `@storybook/addon-docs`.)

- [ ] **Step 14: Build Storybook to verify MDX + helpers compile**

Run: `pnpm storybook:build`
Expected: build succeeds; `storybook-static/` is produced; no "failed to resolve" for the MDX import or the helper modules.

- [ ] **Step 15: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green. (If `import-x/order` complains, run `pnpm lint:fix`.)

- [ ] **Step 16: Commit**

```bash
git add src/components/showcase src/stories/design-system.mdx .storybook/main.ts
git commit -m "feat(storybook): add design-system showcase helpers and enable MDX"
```

---

## Task 3: Foundations showcase

Render every foundation token in real copy: colour roles (as surface+foreground pairs with live contrast), the extended palette (`chart-*`, `sidebar-*`), a type specimen, a spacing/density ladder, a radius ladder, an elevation ladder, a motion table, and an icon row. Supporting CSF stories do the rendering; an MDX page frames them.

**Files:**
- Create: `src/styles/foundations.stories.tsx`
- Create: `src/stories/foundations.mdx`

**Interfaces:**
- Consumes: `ColorPair` from `@/components/showcase`; `Icon` + `* as Icons` from `@/components/ui/icons`.
- Produces: named story exports embedded by `foundations.mdx` (`ColorRoles`, `ExtendedPalette`, `Typography`, `SpacingDensity`, `Radius`, `Elevation`, `Motion`, `IconRow`).

- [ ] **Step 1: Write the Foundations supporting stories**

Create `src/styles/foundations.stories.tsx` (title `Foundations/Tokens`). Enumerate the verified token names. Exact token inventory to cover (from `src/styles/tokens.css`):
- Colour roles (surface+foreground): `background/foreground`, `card/card-foreground`, `popover/popover-foreground`, `primary/primary-foreground`, `secondary/secondary-foreground`, `muted/muted-foreground`, `accent/accent-foreground`, `destructive/destructive-foreground`, `success/success-foreground`, `warning/warning-foreground`, `info/info-foreground`. Single roles (no pair): `border`, `input`, `ring`, `overlay`.
- Extended: `chart-1..5`; `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.
- Type scale: `text-display`, `text-title`, `text-heading`, `text-body`, `text-label`, `text-caption`.
- Density/control heights: `--control-h-sm/md/lg` (render boxes sized `h-(--control-h-sm)` etc.).
- Radius: `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`.
- Elevation: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`.
- Motion: durations `duration-fast/normal/slow`; easings `ease-standard/emphasized/entrance/exit`; moves `--move-sm/md/lg` — render a table (name → value → a live sample using the motion utilities `interactive`/`hover-lift`).

Representative skeleton (fill every token above):

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ColorPair } from '@/components/showcase';
import * as Icons from '@/components/ui/icons';

const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ROLE_PAIRS = [
  { name: 'Primary', surfaceVar: '--primary', foregroundVar: '--primary-foreground', surfaceClass: 'bg-primary', foregroundClass: 'text-primary-foreground' },
  { name: 'Secondary', surfaceVar: '--secondary', foregroundVar: '--secondary-foreground', surfaceClass: 'bg-secondary', foregroundClass: 'text-secondary-foreground' },
  { name: 'Muted', surfaceVar: '--muted', foregroundVar: '--muted-foreground', surfaceClass: 'bg-muted', foregroundClass: 'text-muted-foreground' },
  { name: 'Accent', surfaceVar: '--accent', foregroundVar: '--accent-foreground', surfaceClass: 'bg-accent', foregroundClass: 'text-accent-foreground' },
  { name: 'Destructive', surfaceVar: '--destructive', foregroundVar: '--destructive-foreground', surfaceClass: 'bg-destructive', foregroundClass: 'text-destructive-foreground' },
  { name: 'Success', surfaceVar: '--success', foregroundVar: '--success-foreground', surfaceClass: 'bg-success', foregroundClass: 'text-success-foreground' },
  { name: 'Warning', surfaceVar: '--warning', foregroundVar: '--warning-foreground', surfaceClass: 'bg-warning', foregroundClass: 'text-warning-foreground' },
  { name: 'Info', surfaceVar: '--info', foregroundVar: '--info-foreground', surfaceClass: 'bg-info', foregroundClass: 'text-info-foreground' },
  { name: 'Card', surfaceVar: '--card', foregroundVar: '--card-foreground', surfaceClass: 'bg-card', foregroundClass: 'text-card-foreground' },
  { name: 'Popover', surfaceVar: '--popover', foregroundVar: '--popover-foreground', surfaceClass: 'bg-popover', foregroundClass: 'text-popover-foreground' },
  { name: 'Background', surfaceVar: '--background', foregroundVar: '--foreground', surfaceClass: 'bg-background', foregroundClass: 'text-foreground' },
] as const;

export const ColorRoles: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {ROLE_PAIRS.map((p) => (
        <ColorPair key={p.name} {...p} sampleText="The quick brown fox" passLabel="AA" failLabel="low" />
      ))}
    </div>
  ),
};

const CHART = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'] as const;

export const ExtendedPalette: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {CHART.map((c) => (
          <div key={c} className={`size-12 rounded-md ${c}`} />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md bg-sidebar p-3 text-sidebar-foreground">
        <span className="rounded-md bg-sidebar-primary px-2 py-1 text-sidebar-primary-foreground text-label">Primary</span>
        <span className="rounded-md bg-sidebar-accent px-2 py-1 text-sidebar-accent-foreground text-label">Accent</span>
      </div>
    </div>
  ),
};

const TYPE = ['text-display', 'text-title', 'text-heading', 'text-body', 'text-label', 'text-caption'] as const;

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {TYPE.map((t) => (
        <p key={t} className={t}>
          Ship features, not surprises — {t}
        </p>
      ))}
    </div>
  ),
};

export const SpacingDensity: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <div className="h-(--control-h-sm) rounded-md bg-primary px-3" />
      <div className="h-(--control-h-md) rounded-md bg-primary px-3" />
      <div className="h-(--control-h-lg) rounded-md bg-primary px-3" />
    </div>
  ),
};

const RADII = ['rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'] as const;

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {RADII.map((r) => (
        <div key={r} className={`size-16 bg-accent ${r}`} />
      ))}
    </div>
  ),
};

const SHADOWS = ['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg'] as const;

export const Elevation: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 p-4">
      {SHADOWS.map((s) => (
        <div key={s} className={`size-20 rounded-md bg-card ${s}`} />
      ))}
    </div>
  ),
};

const MOTION = [
  { name: 'duration-fast', sample: 'transition-colors duration-fast' },
  { name: 'duration-normal', sample: 'transition-colors duration-normal' },
  { name: 'duration-slow', sample: 'transition-colors duration-slow' },
] as const;

export const Motion: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {MOTION.map((m) => (
        <div key={m.name} className={`hover-lift interactive rounded-md bg-card p-3 text-body ${m.sample}`}>
          {m.name} — hover me
        </div>
      ))}
      <p className="text-caption text-muted-foreground">
        Under reduced motion, durations and move distances drop to zero and these samples hold still.
      </p>
    </div>
  ),
};

const GLYPHS = Object.entries(Icons).filter(([name]) => name !== 'Icon');

export const IconRow: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4 md:grid-cols-10">
      {GLYPHS.map(([name, Glyph]) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <Icons.Icon icon={Glyph as Icons.IconComponent} size="lg" />
          <span className="text-caption text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  ),
};
```

Note the chart/radius/shadow template-literal classNames (`` `size-12 rounded-md ${c}` ``) use only token utilities — no palette/hex/px — so the design-token guard passes. Use `className={t}` (not a template literal) where a single dynamic class is enough.

- [ ] **Step 2: Build Storybook to verify the stories render**

Run: `pnpm storybook:build`
Expected: succeeds; `Foundations/Tokens` compiles.

- [ ] **Step 3: Create the Foundations MDX page**

Create `src/stories/foundations.mdx`, embedding the stories via the `Canvas`/`Story` doc blocks and framing each with real prose:

```mdx
import { Canvas, Meta } from '@storybook/addon-docs/blocks';

import * as Foundations from '../styles/foundations.stories';

<Meta title="Design System/Foundations" />

# Foundations

## Colour roles

Each role is a surface paired with its foreground. The ratio under each swatch is the live
WCAG contrast; anything below 4.5:1 is flagged.

<Canvas of={Foundations.ColorRoles} />

## Extended palette

Chart series and sidebar roles.

<Canvas of={Foundations.ExtendedPalette} />

## Type scale

<Canvas of={Foundations.Typography} />

## Spacing & density

Control heights derive from `--density`; change it once to tighten or loosen every control.

<Canvas of={Foundations.SpacingDensity} />

## Radius

<Canvas of={Foundations.Radius} />

## Elevation

<Canvas of={Foundations.Elevation} />

## Motion

<Canvas of={Foundations.Motion} />

## Icons

<Canvas of={Foundations.IconRow} />
```

- [ ] **Step 4: Build Storybook to verify the MDX page renders the embeds**

Run: `pnpm storybook:build`
Expected: succeeds; the Foundations Docs page embeds each story.

- [ ] **Step 5: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (watch the design-token guard for any stray raw value in the new story).

- [ ] **Step 6: Commit**

```bash
git add src/styles/foundations.stories.tsx src/stories/foundations.mdx
git commit -m "feat(storybook): add foundations showcase (colour, type, spacing, motion, icons)"
```

---

## Task 4: Components-by-tier showcase

Render every primitive as a variant × state matrix (using `StateMatrix` + `previewState`), plus composed and overlay components with typical and edge-case examples (long text, empty, error, loading). An MDX page frames the tiers.

**Files:**
- Create: `src/components/showcase/components-matrix.stories.tsx`
- Create: `src/stories/components.mdx`

**Interfaces:**
- Consumes: `StateMatrix`, `previewState` from `@/components/showcase`; primitives from `@/components/ui/*`; state components from `@/components/feedback`.
- Produces: story exports embedded by `components.mdx` (`Buttons`, `Inputs`, `Badges`, `Cards`, `Overlays`, `AsyncStates`).

- [ ] **Step 1: Write the primitives matrix stories**

Create `src/components/showcase/components-matrix.stories.tsx` (title `Design System/Components`). Use the verified cva axes:
- **Button**: `variant` = default|secondary|outline|ghost|destructive|link; `size` = sm|md|lg|icon; `shape` = default|rounded|pill|square; `tone` = solid|soft|outline. States columns: `default`, `disabled` (real `disabled`), plus a note that hover/focus/active are interactive. Build a `StateMatrix` with one row per `variant` and columns `['default', 'disabled']`, each cell a `<Button {...previewState(state)} variant={variant}>`.
- **Input**: `size` = sm|md|lg; `shape` = default|rounded|pill|square. States columns `['default', 'disabled', 'invalid']` using `previewState`. Give each input a real `aria-label` (short) since there is no visible label.
- **Badge**: `variant` = default|secondary|destructive|success|warning|info|outline; `shape`; `tone`. Render the variant row and a shapes/tones row.
- **Card**: `elevation` = default|flat|outline|raised — render the four side by side using `CardHeader/CardTitle/CardDescription/CardContent/CardFooter` with real copy.

Representative (Button + Input shown; add Badge, Card):

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StateMatrix, previewState, type PreviewState } from '@/components/showcase';

const meta = {
  title: 'Design System/Components',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const BUTTON_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
const STATES = ['default', 'disabled'] as const;

export const Buttons: Story = {
  render: () => (
    <StateMatrix
      caption="Button — variant × state (hover/focus/active are interactive; try them in the canvas)"
      columns={STATES}
      rows={BUTTON_VARIANTS.map((variant) => ({
        label: variant,
        render: (state) => (
          <Button variant={variant} {...previewState(state as PreviewState)}>
            Save
          </Button>
        ),
      }))}
    />
  ),
};

const INPUT_SIZES = ['sm', 'md', 'lg'] as const;
const INPUT_STATES = ['default', 'disabled', 'invalid'] as const;

export const Inputs: Story = {
  render: () => (
    <StateMatrix
      caption="Input — size × state"
      columns={INPUT_STATES}
      rows={INPUT_SIZES.map((size) => ({
        label: size,
        render: (state) => (
          <Input size={size} aria-label="Email" placeholder="you@example.com" {...previewState(state as PreviewState)} />
        ),
      }))}
    />
  ),
};

const BADGE_VARIANTS = ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline'] as const;

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {BADGE_VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

const ELEVATIONS = ['default', 'flat', 'outline', 'raised'] as const;

export const Cards: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {ELEVATIONS.map((elevation) => (
        <Card key={elevation} elevation={elevation}>
          <CardHeader>
            <CardTitle>Monthly report</CardTitle>
            <CardDescription>Revenue is up 12% over last month.</CardDescription>
          </CardHeader>
          <CardContent>Elevation: {elevation}</CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              View
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};
```

- [ ] **Step 2: Add composed/overlay and async-state examples**

In the same file, add `Overlays` (Dialog/AlertDialog/Sheet/Popover/Tooltip/DropdownMenu — each a trigger button that opens it, with a required title where the rule demands one) and `AsyncStates` (EmptyState, ErrorState, and a QueryState rendered in loading/empty/error/success via fixture `QueryLike` objects, mirroring `query-state.stories.tsx`). Include at least one edge case: a long-text label and an empty state.

```tsx
import { EmptyState, ErrorState, QueryState, type QueryLike } from '@/components/feedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const Overlays: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

const emptyQuery: QueryLike = { status: 'success', data: [], error: null, refetch: () => undefined };
const errorQuery: QueryLike = {
  status: 'error',
  data: undefined,
  error: new Error('Request failed'),
  refetch: () => undefined,
};

export const AsyncStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <EmptyState title="No results" description="Try a different search." />
      <ErrorState error={new Error('Boom')} onRetry={() => undefined} />
      <QueryState query={errorQuery}>{() => null}</QueryState>
    </div>
  ),
};
```

(Verify the exact `Dialog*` / state component prop names against the real files when implementing; the Explore notes list the feedback signatures. Follow the overlay-choice rule — Dialog/Sheet need a title.)

- [ ] **Step 3: Build Storybook**

Run: `pnpm storybook:build`
Expected: succeeds; `Design System/Components` compiles.

- [ ] **Step 4: Create the Components MDX page**

Create `src/stories/components.mdx` embedding the stories by tier (primitives → composed → overlays → async states), each with a one-line real-prose intro:

```mdx
import { Canvas, Meta } from '@storybook/addon-docs/blocks';

import * as Components from '../components/showcase/components-matrix.stories';

<Meta title="Design System/Components" />

# Components

## Primitives

<Canvas of={Components.Buttons} />
<Canvas of={Components.Inputs} />
<Canvas of={Components.Badges} />
<Canvas of={Components.Cards} />

## Overlays

<Canvas of={Components.Overlays} />

## Async states

<Canvas of={Components.AsyncStates} />
```

- [ ] **Step 5: Build Storybook to verify embeds**

Run: `pnpm storybook:build`
Expected: succeeds.

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/showcase/components-matrix.stories.tsx src/stories/components.mdx
git commit -m "feat(storybook): add components-by-tier showcase with state matrices"
```

---

## Task 5: Do/Don't pairs

Render the rulebook's most-breakable (enforced) rules as paired Incorrect/Correct examples, so the showcase and the rulebook stay in sync.

**Files:**
- Create: `src/components/showcase/do-dont.stories.tsx`
- Create: `src/stories/do-and-dont.mdx`

**Interfaces:**
- Consumes: primitives from `@/components/ui/*`.
- Produces: story exports embedded by `do-and-dont.mdx` (`ShapeVariant`, `BuiltInVariant`, `SemanticColour`, `IconBarrel`).

- [ ] **Step 1: Write the Do/Don't stories**

Create `src/components/showcase/do-dont.stories.tsx` (title `Design System/Do and Don't`). Pick the most-breakable rules from the rulebook (verified headings): "Shape via the `shape` variant", "Built-in variants before classNames", "Semantic colours", "Import icons from the barrel". For each, render a side-by-side pair. Since this is a `.stories.tsx`, literal copy is fine — but the "Incorrect" examples must NOT actually contain a raw palette/hex/px literal in code, or the design-token guard will fail the whole suite. So render the "don't" as **described** markup (the visual result), not by writing a banned literal. Represent each pair as a small `Pair` render helper taking `dont`/`do` nodes and labels.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

const meta = {
  title: 'Design System/Do and Don\'t',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Pair({ dont, do: doNode }: { dont: ReactNode; do: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2 rounded-md border border-destructive p-3">
        <span className="text-label text-destructive">Don't</span>
        {dont}
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-success p-3">
        <span className="text-label text-success">Do</span>
        {doNode}
      </div>
    </div>
  );
}

export const ShapeVariant: Story = {
  render: () => (
    <Pair
      dont={<Button>Retry (hard-coded radius className — avoid)</Button>}
      do={<Button shape="pill">Retry</Button>}
    />
  ),
};

export const BuiltInVariant: Story = {
  render: () => (
    <Pair
      dont={<Button>Confirm (className override — avoid)</Button>}
      do={
        <Button variant="destructive" shape="pill">
          Confirm
        </Button>
      }
    />
  ),
};
```

For `SemanticColour` and `IconBarrel`, show the Correct rendering and describe the Incorrect in copy (never write `bg-[#...]` or a direct `lucide-react` import in the file). Keep every className token-backed.

- [ ] **Step 2: Build + gate**

Run: `pnpm storybook:build && pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (critically, the design-token guard still passes — no banned literal slipped into the "Don't" cells).

- [ ] **Step 3: Create the Do/Don't MDX page**

Create `src/stories/do-and-dont.mdx` embedding the pairs with prose that names each rule and links the rulebook page:

```mdx
import { Canvas, Meta } from '@storybook/addon-docs/blocks';

import * as DoDont from '../components/showcase/do-dont.stories';

<Meta title="Design System/Do and Don't" />

# Do and Don't

The most-breakable rules, paired. The full rulebook lives in `docs/rules/`.

## Shape via the `shape` variant

<Canvas of={DoDont.ShapeVariant} />

## Built-in variants before classNames

<Canvas of={DoDont.BuiltInVariant} />
```

- [ ] **Step 4: Build Storybook**

Run: `pnpm storybook:build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/do-dont.stories.tsx src/stories/do-and-dont.mdx
git commit -m "feat(storybook): add do/don't showcase for the most-breakable rules"
```

---

## Task 6: Recipes + one example screen

The acceptance proof: one realistic screen built **only** from tokens and existing components, plus a couple of small recipes. No bespoke colours/pixels/markup.

**Files:**
- Create: `src/components/showcase/example-screen.stories.tsx`
- Create: `src/stories/recipes.mdx`

**Interfaces:**
- Consumes: `@/components/ui/*`, `@/components/feedback`, `@/components/ui/icons`.
- Produces: story exports embedded by `recipes.mdx` (`DashboardScreen`, plus any recipe exports).

- [ ] **Step 1: Build the example screen story**

Create `src/components/showcase/example-screen.stories.tsx` (title `Design System/Example Screen`, `parameters: { layout: 'fullscreen' }`). Compose a small dashboard: a `PageHeader` (if available) or a heading + description, a row of stat `Card`s (using `chart-*` accents only via token utilities), a `data-table` or a `table` of rows, a primary action `Button`, `Badge` status chips, and one `EmptyState`/`QueryState` region. Real copy throughout (no lorem ipsum). Every colour is a semantic/chart/sidebar token utility; every radius/spacing/shadow from the scale; icons from the barrel. This story is the "tokens + components only" proof.

Keep it to one screen; reuse the components already shown. Verify prop names against the real component files when implementing (e.g. `PageHeader` from `@/components/layout` if it exists; otherwise build the header from `CardTitle`/headings).

- [ ] **Step 2: Build + gate**

Run: `pnpm storybook:build && pnpm lint && pnpm typecheck && pnpm test`
Expected: all green. The design-token guard passing on this file is the mechanical proof the screen uses only tokens.

- [ ] **Step 3: Create the Recipes MDX page**

Create `src/stories/recipes.mdx` embedding the example screen + describing the recipes in prose:

```mdx
import { Canvas, Meta } from '@storybook/addon-docs/blocks';

import * as Example from '../components/showcase/example-screen.stories';

<Meta title="Design System/Recipes" />

# Recipes & example screen

This screen is built only from design tokens and existing components — the proof that the
token mapping is complete.

<Canvas of={Example.DashboardScreen} />
```

- [ ] **Step 4: Build Storybook**

Run: `pnpm storybook:build`
Expected: succeeds; the example screen renders.

- [ ] **Step 5: Commit**

```bash
git add src/components/showcase/example-screen.stories.tsx src/stories/recipes.mdx
git commit -m "feat(storybook): add recipes and the example screen (tokens + components only)"
```

---

## Task 7: Docs, changelog, and final verification

Wire the showcase into the docs, record it in the changelog, and run the complete gate set.

**Files:**
- Modify: `docs/design-system.md`
- Modify: `docs/starting-a-new-project.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes/produces: nothing code-level; documentation only.

- [ ] **Step 1: Document the showcase in `docs/design-system.md`**

Add a "Design System showcase (Storybook)" section: what it covers (Foundations, Components, Do/Don't, Recipes + example screen), how to run it (`pnpm storybook` for dev, `pnpm storybook:build` for the static build), and that the Theme/Locale toolbars exercise light/dark and en/es. Link it from the token tables section.

- [ ] **Step 2: Point to the showcase from `docs/starting-a-new-project.md`**

In the customize/brand step, add a line directing readers to the Storybook showcase to see every token and variant live, alongside `docs/customization.md`.

- [ ] **Step 3: Add the CHANGELOG entry**

Add a Phase 6 entry under the appropriate heading: the Storybook design-system showcase (MDX pages + supporting stories, `ColorPair`/`StateMatrix`/`previewState` helpers, example screen) and the deferred-minor rulebook/guard-test polish. **Migration notes:** none required downstream — the phase is purely additive (new stories/docs/helpers; the only config change is widening the Storybook `stories` glob to include `.mdx`).

- [ ] **Step 4: Run the complete gate set**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm storybook:build`
Expected: all green; `storybook-static/` produced. (No `pnpm build` or `pnpm test:e2e` needed — no app code or key-page markup changed; confirm no `src/components/ui`/`feedback` implementation or token file was touched.)

- [ ] **Step 5: Commit**

```bash
git add docs/design-system.md docs/starting-a-new-project.md CHANGELOG.md
git commit -m "docs: record the design-system showcase and link it from the docs"
```

---

## Self-review (run before dispatch)

**Spec coverage (§5 Phase 6 → task):**
- Foundations (colour pairs + live contrast, chart/sidebar palette, type specimen, spacing/density, radius, elevation, motion table, icon row) → Task 3. ✓
- Components by tier (primitives variant × state matrix, size ladder, composed + overlay with edge cases) → Task 4. ✓ (size ladder = Input sizes + Button sizes; covered in the matrices.)
- Do/Don't pairs → Task 5. ✓
- Recipes + one example screen (tokens/components only) → Task 6. ✓
- Helpers `StateMatrix`, `previewState`, `ColorPair` adapted to `@/lib/cn` + theme/locale toolbar → Task 2. ✓
- Acceptance: `pnpm storybook:build` (every task that adds stories), matrices render (Task 4), contrast noted (ColorPair, Task 2/3), no lorem ipsum (real copy throughout), example screen tokens/components only (Task 6, guard-enforced). ✓
- §6 downstream: CHANGELOG entry + `docs/starting-a-new-project.md` customize pointer + `docs/design-system.md` → Task 7. ✓
- Deferred minors from Phases 2-5 → Task 1. ✓

**Placeholder scan:** contrast util, `previewState`, `StateMatrix`, `ColorPair`, the smoke story, and the Foundations stories carry full code. The MDX pages and the larger component/example stories carry exact structure, exact token/variant inventories, exact embed syntax, and exact import paths; the executor fills story bodies from the enumerated axes (not a vague "add tests"). Edge-case prop names (Dialog*, PageHeader, feedback signatures) are flagged "verify against the real file," which is a real verification step, not a placeholder.

**Type consistency:** `Rgb`, `relativeLuminance`, `contrastRatio`, `resolveTokenRgb`, `PreviewState`, `PreviewAttrs`, `previewState`, `StateMatrixProps`/`StateMatrixRow`, `StateMatrix`, `ColorPairProps`, `ColorPair` are defined in Task 2 and consumed under the same names in Tasks 3-6 via the `@/components/showcase` barrel. `IconComponent` is imported from `@/components/ui/icons` (its real export). Story metas use `@storybook/react-vite`. ✓

**Risks / watch-items for executors:**
- The design-token guard scans stories — the single biggest trap. Never write a hex, raw palette class, arbitrary px, raw `z-`/`duration-` number, or literal `@keyframes` in any `.ts`/`.tsx` showcase file, including the "Don't" cells of Task 5. Describe banned patterns in prose, don't code them.
- The `@storybook/addon-docs/blocks` import path and the `Canvas of={...}` API are the SB10 forms; if `storybook:build` names a different path, use what it reports (doc-blocks ship inside the installed addon-docs).
- MDX imports of a `*.stories` module reference the compiled CSF; keep the `import * as X from '../path/to/x.stories'` relative path correct (MDX lives in `src/stories/`, stories live under `src/styles/` and `src/components/showcase/`).
