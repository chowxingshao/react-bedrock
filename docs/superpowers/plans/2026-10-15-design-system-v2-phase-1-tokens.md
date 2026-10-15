# Design System v2 — Phase 1 (Token Foundations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the new global design tokens — border width, motion (easing + distance), a type scale, a density knob, focus-ring + elevation knobs, and extended colour roles (`chart-*`, `sidebar-*`) — wired to Tailwind utilities, with no change to any component's rendered appearance at default values.

**Architecture:** All values live in `src/styles/tokens.css`; `src/styles/globals.css` only maps them to utilities (`@theme inline` for colours, `@theme` namespaces for `--text-*`/`--ease-*`, and one `@utility border` override for the tokenized border width). Tests assert token presence by parsing the raw CSS, matching the repo's existing `tokens.test.ts` pattern. No component markup changes in this phase.

**Tech Stack:** Tailwind CSS v4.3.3, CSS custom properties (OKLCH colours), Vitest (raw-CSS assertions), Storybook 10 (visual verification).

**Spec:** `docs/superpowers/specs/2026-10-15-design-system-v2-design.md` (Phase 1, §5).

## Global Constraints

- **Toolchain:** Node `>=24.15.0`, pnpm `12.8.1`, Tailwind `4.3.3`, React `19`, TypeScript `6` (strict). (`package.json`)
- **Design values via tokens only.** No hex, no Tailwind palette classes (`bg-red-500`), no arbitrary pixel values (`w-[13px]`), no raw `z-<n>`, no raw `duration-<n>`. Enforced by `src/test/design-tokens.guard.test.ts`.
- **Colours use OKLCH.** Every light colour token (value starting `oklch(`) MUST have a `.dark` value, and the `:root:not(.light):not(.dark)` fallback block MUST be identical to `.dark` (enforced by `src/styles/tokens.test.ts`).
- **Non-colour tokens** (widths, easings, sizes, density) are identical in light and dark unless a reason exists; they live in `:root` or the top `@theme` block, not `.dark`.
- **Back-compat:** default token values reproduce today's rendered look. No existing screen may change visually. Verify in Storybook.
- **Phase gate:** `pnpm lint && pnpm typecheck && pnpm test` must pass at the end of every task.
- **Commits:** Conventional Commits. Work on a branch (not `main`); this plan assumes the branch `feat/design-system-v2-phase-1`. End every commit message with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Docs:** update `docs/design-system.md` token tables in the task that adds the tokens; add one `CHANGELOG.md` entry at the end of the phase.

---

## File structure for this phase

| File | Responsibility | Action |
| --- | --- | --- |
| `src/styles/tokens.css` | The single source of token values | Modify — add all new tokens |
| `src/styles/globals.css` | Map tokens → Tailwind utilities | Modify — add colour mappings + `@utility border` |
| `src/styles/tokens.test.ts` | Assert tokens exist / dark+fallback parity | Modify — extend assertions |
| `docs/design-system.md` | Token reference tables | Modify — document new tokens |
| `CHANGELOG.md` | Template changelog | Modify — one `[Unreleased]` entry |

---

## Task 1: Tokenized border width

**Files:**
- Modify: `src/styles/tokens.css` (`:root` block)
- Modify: `src/styles/globals.css` (add `@utility border`)
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: tokens `--border-width` (default `1px`) and `--border-width-strong` (`2px`) in `:root`; the `border` utility now resolves to `border-width: var(--border-width)`. Later phases/components rely on `--border-width` existing.

- [ ] **Step 1: Write the failing test** — add `--border-width` and `--border-width-strong` to the required-token assertion in `src/styles/tokens.test.ts`.

```ts
// Inside the existing `it('defines the semantic tokens the spec requires', ...)`,
// add these two names to the `required` array:
      '--radius',
      '--border-width',
      '--border-width-strong',
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — the `required.filter(...)` assertion reports `['--border-width', '--border-width-strong']` missing from `:root`.

- [ ] **Step 3: Add the tokens** — in `src/styles/tokens.css`, inside `:root`, under the `/* Shape: … */` comment near `--radius`:

```css
  /* Shape: every radius (rounded-xs … rounded-2xl) is derived from this. */
  --radius: 0.625rem;

  /* Lines: the default border thickness; raise once to thicken every border. */
  --border-width: 1px;
  --border-width-strong: 2px;
```

- [ ] **Step 4: Add the `@utility border` override** — in `src/styles/globals.css`, after the `@utility duration-slow { … }` block, add:

```css
/* Make the default `border` utility read a token, so one edit restyles every border.
   border-0 / border-2 / border-x / border-color utilities are unaffected. */
@utility border {
  border-style: var(--tw-border-style, solid);
  border-width: var(--border-width);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify the override works in a real build** (the one execution-time check; CSS cascade is not testable in jsdom)

Run: `pnpm storybook` and open the **Card** story. Temporarily set `--border-width: 3px` in `src/styles/tokens.css`, confirm the Card border visibly thickens, then revert to `1px`.
Expected: the border thickens with the token and returns to the hairline default after revert.
If the `@utility border` override does NOT take effect, fall back to applying it via `@layer base` on the `border` class — document which mechanism was used in `docs/design-system.md`.

- [ ] **Step 7: Document** — in `docs/design-system.md`, add a **Lines** row to the token table (group `Lines`, tokens `--border-width`, `--border-width-strong`, utility `border` / `border-strong`-style note that borders now follow the token).

- [ ] **Step 8: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/styles/tokens.css src/styles/globals.css src/styles/tokens.test.ts docs/design-system.md
git commit -m "feat: tokenize the global border width

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Motion tokens (easing + distance)

**Files:**
- Modify: `src/styles/tokens.css` (top `@theme` block for easings; `:root` for distances)
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: in `@theme` — `--ease-standard`, `--ease-emphasized`, `--ease-entrance`, `--ease-exit` (generating `ease-standard` … utilities). In `:root` — `--move-sm` (`0.25rem`), `--move-md` (`0.5rem`), `--move-lg` (`1rem`). Phase 4's motion layer consumes these.

- [ ] **Step 1: Write the failing test** — add a new `it` block to `src/styles/tokens.test.ts` that parses the top `@theme` block for the easing tokens, plus the distance tokens in `:root`.

```ts
  it('defines the motion tokens Phase 1 adds', () => {
    const theme = declarations(tokensCss, '@theme');
    const easings = ['--ease-standard', '--ease-emphasized', '--ease-entrance', '--ease-exit'];
    expect(easings.filter((name) => !theme.has(name))).toEqual([]);
    const distances = ['--move-sm', '--move-md', '--move-lg'];
    expect(distances.filter((name) => !light.has(name))).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — the easing and distance names are reported missing.

- [ ] **Step 3: Add the easing tokens** — in `src/styles/tokens.css`, inside the top `@theme { … }` block, after the `--shadow-lg` line:

```css
  /* Motion easings. Tailwind generates ease-standard … from these. */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --ease-entrance: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

- [ ] **Step 4: Add the distance tokens** — in `src/styles/tokens.css`, inside `:root`, under the `/* Motion */` comment (next to the durations):

```css
  /* Motion distances: how far entering/leaving elements travel. */
  --move-sm: 0.25rem;
  --move-md: 0.5rem;
  --move-lg: 1rem;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 6: Document** — in `docs/design-system.md`, extend the **Motion** row: add the easing tokens (utilities `ease-standard` … `ease-exit`) and the distance tokens.

- [ ] **Step 7: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts docs/design-system.md
git commit -m "feat: add motion easing and distance tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Type scale tokens

**Files:**
- Modify: `src/styles/tokens.css` (top `@theme` block)
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: semantic font-size tokens in `@theme`, each with a companion line-height, generating `text-display` … `text-caption` utilities: `--text-display`, `--text-title`, `--text-heading`, `--text-body`, `--text-label`, `--text-caption` (and their `--…--line-height` companions). `--text-body` equals the current `text-sm` size (`0.875rem`) and `--text-caption` equals `text-xs` (`0.75rem`), so adopting them later changes nothing visually.

- [ ] **Step 1: Write the failing test** — add an `it` block parsing the `@theme` block for the six size tokens and their line-height companions.

```ts
  it('defines the semantic type scale Phase 1 adds', () => {
    const theme = declarations(tokensCss, '@theme');
    const sizes = [
      '--text-display',
      '--text-title',
      '--text-heading',
      '--text-body',
      '--text-label',
      '--text-caption',
    ];
    expect(sizes.filter((name) => !theme.has(name))).toEqual([]);
    expect(sizes.filter((name) => !theme.has(`${name}--line-height`))).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — the size tokens (and their line-height companions) are missing.

- [ ] **Step 3: Add the tokens** — in `src/styles/tokens.css`, inside the top `@theme { … }` block, after the `--font-mono` definition:

```css
  /* Semantic type scale. Tailwind generates text-display … text-caption.
     --text-body matches today's text-sm and --text-caption matches text-xs,
     so adopting these later is visually identical. */
  --text-display: 2.25rem;
  --text-display--line-height: 2.5rem;
  --text-display--font-weight: 600;
  --text-title: 1.5rem;
  --text-title--line-height: 2rem;
  --text-title--font-weight: 600;
  --text-heading: 1.25rem;
  --text-heading--line-height: 1.75rem;
  --text-heading--font-weight: 600;
  --text-body: 0.875rem;
  --text-body--line-height: 1.25rem;
  --text-label: 0.8125rem;
  --text-label--line-height: 1rem;
  --text-label--font-weight: 500;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify utilities generate** — run `pnpm storybook`, and in any story temporarily add `<p className="text-display">Aa</p>`; confirm it renders at display size, then remove it.
Expected: `text-display` is a valid, large type utility.

- [ ] **Step 6: Document** — in `docs/design-system.md`, add a **Type scale** sub-section/table: token, size/line-height, utility (`text-display` …), and intended use.

- [ ] **Step 7: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts docs/design-system.md
git commit -m "feat: add a semantic type scale

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Density tokens

**Files:**
- Modify: `src/styles/tokens.css` (`:root`)
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces, in `:root`: `--density` (unitless factor, default `1`), and control heights derived from it — `--control-h-sm` (`calc(2rem * var(--density))`), `--control-h-md` (`calc(2.25rem * var(--density))`, = today's `h-9`), `--control-h-lg` (`calc(2.5rem * var(--density))`). Phase 2 wires these into `Input`/`Select`/`Button` size variants.

- [ ] **Step 1: Write the failing test** — add the density tokens to the `required` array in the existing semantic-tokens `it` block.

```ts
      '--border-width-strong',
      '--density',
      '--control-h-sm',
      '--control-h-md',
      '--control-h-lg',
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — the four density tokens are reported missing from `:root`.

- [ ] **Step 3: Add the tokens** — in `src/styles/tokens.css`, inside `:root`, after the border-width tokens from Task 1:

```css
  /* Density: raise/lower once to make every control taller or tighter. */
  --density: 1;
  --control-h-sm: calc(2rem * var(--density));
  --control-h-md: calc(2.25rem * var(--density));
  --control-h-lg: calc(2.5rem * var(--density));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Document** — in `docs/design-system.md`, add a **Density** row: the `--density` knob and the control-height tokens, noting `--control-h-md` is today's default control height and that components adopt these in Phase 2.

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts docs/design-system.md
git commit -m "feat: add a density knob and control-height tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Focus-ring and elevation knobs

**Files:**
- Modify: `src/styles/tokens.css` (`:root` for ring tokens; `@theme` for the shadow-colour knob)
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: in `:root` — `--ring-width` (`3px`, matching today's `ring-3`) and `--ring-offset` (`0px`). In `@theme` — `--shadow-color` (`0 0 0`, the OKLCH channel triple all `--shadow-*` tokens use), with the four `--shadow-*` tokens rewritten to reference it, so one edit retints/strengthens every shadow. Phase 2 wires `--ring-width`/`--ring-offset` into focus styles.

- [ ] **Step 1: Write the failing test** — add an `it` block for the ring tokens (`:root`) and the shadow-colour knob (`@theme`).

```ts
  it('defines the focus and elevation knobs Phase 1 adds', () => {
    const theme = declarations(tokensCss, '@theme');
    expect(light.has('--ring-width')).toBe(true);
    expect(light.has('--ring-offset')).toBe(true);
    expect(theme.has('--shadow-color')).toBe(true);
    // Every shadow token routes through the --shadow-color knob.
    for (const name of ['--shadow-xs', '--shadow-sm', '--shadow-md', '--shadow-lg']) {
      expect(theme.get(name)).toContain('var(--shadow-color');
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — ring tokens missing from `:root`; `--shadow-color` missing; shadow tokens don't yet reference it.

- [ ] **Step 3: Add the ring tokens** — in `src/styles/tokens.css`, inside `:root`, after the density tokens:

```css
  /* Focus ring: width and offset of the visible focus outline. */
  --ring-width: 3px;
  --ring-offset: 0px;
```

- [ ] **Step 4: Route the shadows through a colour knob** — in the top `@theme { … }` block, replace the four shadow definitions:

```css
  /* Elevation. Change --shadow-color once to retint/soften every shadow. */
  --shadow-color: 0 0 0;
  --shadow-xs: 0 1px 2px 0 oklch(var(--shadow-color) / 0.05);
  --shadow-sm:
    0 1px 3px 0 oklch(var(--shadow-color) / 0.1), 0 1px 2px -1px oklch(var(--shadow-color) / 0.1);
  --shadow-md:
    0 4px 6px -1px oklch(var(--shadow-color) / 0.1), 0 2px 4px -2px oklch(var(--shadow-color) / 0.1);
  --shadow-lg:
    0 10px 15px -3px oklch(var(--shadow-color) / 0.1), 0 4px 6px -4px oklch(var(--shadow-color) / 0.1);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify no visual shadow change** — `pnpm storybook`, open the **Card** story; the shadow must look identical to before (the channel `0 0 0` + same alphas reproduce the old black shadow).
Expected: no visible difference.

- [ ] **Step 7: Document** — in `docs/design-system.md`, note the `--ring-width`/`--ring-offset` tokens (adopted by focus styles in Phase 2) and the `--shadow-color` elevation knob in the Elevation row.

- [ ] **Step 8: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts docs/design-system.md
git commit -m "feat: add focus-ring tokens and a shadow-colour knob

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Extended colour roles (chart + sidebar)

**Files:**
- Modify: `src/styles/tokens.css` (`:root`, `.dark`, and the `prefers-color-scheme` fallback block)
- Modify: `src/styles/globals.css` (`@theme inline` colour mappings)
- Test: `src/styles/tokens.test.ts` (the existing dark-parity and fallback-parity tests cover these automatically)

**Interfaces:**
- Produces colour tokens `--chart-1` … `--chart-5`, `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` in all three blocks, plus `bg-chart-1` … / `bg-sidebar` … utilities via `globals.css`. Consumed by future charts and the app shell.

- [ ] **Step 1: Write the failing test** — add the chart/sidebar names to the required-token assertion (they must at least exist in `:root`); the existing dark-parity and fallback-parity `it` blocks will then force them into `.dark` and the fallback too.

```ts
      // append to the `required` array
      '--chart-1',
      '--chart-5',
      '--sidebar',
      '--sidebar-foreground',
      '--sidebar-border',
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — the chart/sidebar tokens are missing from `:root`.

- [ ] **Step 3: Add the light values** — in `src/styles/tokens.css`, inside `:root`, after `--overlay`:

```css
  /* Data-viz series. */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* App shell (sidebar). */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
```

- [ ] **Step 4: Run the test to verify it fails on dark/fallback parity**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: FAIL — "gives every light colour token a dark value" and "keeps the prefers-color-scheme fallback identical to .dark" now fail for the new colour tokens.

- [ ] **Step 5: Add the dark values** — inside `.dark`, after its `--overlay`:

```css
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);

  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 0.1);
  --sidebar-ring: oklch(0.556 0 0);
```

- [ ] **Step 6: Add the same values to the fallback block** — copy the exact block from Step 5 into `@media (prefers-color-scheme: dark) { :root:not(.light):not(.dark) { … } }`, after its `--overlay`. (The fallback MUST be byte-for-byte identical to `.dark`.)

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm test -- src/styles/tokens.test.ts`
Expected: PASS (existence, dark parity, and fallback parity all green).

- [ ] **Step 8: Map the utilities** — in `src/styles/globals.css`, inside `@theme inline`, after `--color-overlay`:

```css
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
```

- [ ] **Step 9: Verify utilities generate** — `pnpm storybook`; in a story temporarily add `<div className="bg-chart-1 size-8" />` and `<div className="bg-sidebar size-8" />`; confirm both render, then remove.
Expected: `bg-chart-1` and `bg-sidebar` are valid utilities.

- [ ] **Step 10: Document** — in `docs/design-system.md`, add the `chart-1..5` and `sidebar-*` roles to the Colours table.

- [ ] **Step 11: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/styles/tokens.css src/styles/globals.css src/styles/tokens.test.ts docs/design-system.md
git commit -m "feat: add chart and sidebar colour roles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Changelog + phase close

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the changelog entry** — under `## [Unreleased]` (create it below the header if absent), add:

```markdown
### Added

- Design tokens for border width (`--border-width`), motion (easing + distance), a
  semantic type scale (`text-display` … `text-caption`), a density knob
  (`--density`, `--control-h-*`), focus-ring width/offset, a `--shadow-color`
  elevation knob, and `chart-*` / `sidebar-*` colour roles. All default to the
  current appearance; components adopt them in later phases. See
  `docs/design-system.md` and `docs/customization.md`.
```

- [ ] **Step 2: Run the full gate one last time**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 3: Confirm no visual regression** — `pnpm storybook`, spot-check Button, Card, Input, Badge, and the app-shell story in both light and dark via the toolbar.
Expected: identical to the pre-phase appearance.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: record the Phase 1 token foundations in the changelog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review (against the spec, Phase 1)

- **Border width** → Task 1. **Motion tokens** → Task 2. **Type scale** → Task 3. **Density** → Task 4. **Focus + elevation** → Task 5. **Extended colours** → Task 6. **Guard/docs + changelog** → folded into each task + Task 7. All Phase-1 spec bullets map to a task.
- **Border-width spike** (spec §5/§8): resolved — Tailwind v4 has no border-width token namespace, so Task 1 uses the documented `@utility border` override with an execution-time build check and a stated fallback. Not a placeholder.
- **No placeholders:** every step has concrete CSS/TS and exact run commands.
- **Type consistency:** token names used in later-phase interfaces (`--border-width`, `--control-h-md`, `--ring-width`, `--ease-*`, `--text-*`, `--chart-*`, `--sidebar-*`) are the exact names defined here.
- **Deferred (correctly) to later phases:** components *consuming* these tokens (sizes, focus styles, shapes, tones) — that is Phase 2, planned once these token names exist.
```
