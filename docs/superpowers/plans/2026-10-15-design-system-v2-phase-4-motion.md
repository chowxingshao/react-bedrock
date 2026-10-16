# Design System v2 — Phase 4 (Motion layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a token-driven motion layer — a small set of reduced-motion-safe CSS utilities (interaction micro-interactions, enter/exit presets, stagger, shimmer, scroll-fade) built on the Phase-1 motion tokens — plus an optional, tree-shakeable, reduced-motion-guarded `useGsap` hook for the rare orchestration case, with GSAP absent from the default bundle unless a project uses it.

**Architecture:** The CSS utilities live in `src/styles/globals.css` as Tailwind v4 `@utility` rules whose durations/easings/distances all reference the Phase-1 tokens (`--duration-*`, `--ease-*`, `--move-*`); reduced motion is handled by the existing global `prefers-reduced-motion` block plus zeroing `--move-*` (the Phase-1 watch-item), so distance- and time-based motion both collapse. The optional `useGsap` hook (`src/hooks/use-gsap.ts`) wraps `@gsap/react`'s `useGSAP` (which gives a `gsap.context` scoped to a ref and auto-reverts on unmount) and runs its factory only under `(prefers-reduced-motion: no-preference)` via `gsap.matchMedia`, so it no-ops when motion is reduced. `gsap`/`@gsap/react` are dependencies but are imported only by `use-gsap.ts`, which nothing in the app imports by default, so tree-shaking keeps them out of the baseline bundle.

**Tech Stack:** Tailwind CSS v4 (4.3.3) `@utility`/`@keyframes`, `tw-animate-css` (already present), the Phase-1 motion tokens, `gsap` + `@gsap/react` (new), React 19, TypeScript 6 (strict), Vitest + Testing Library, Storybook 10, `rollup-plugin-visualizer` (`pnpm analyze`).

**Spec:** `docs/superpowers/specs/2026-10-15-design-system-v2-design.md` (§5 "Phase 4 — Motion layer", lines 202–220; decision D2 line 80; cross-cutting reduced-motion/bundle in §6–§7; Phase-1 watch-item "zero `--move-*` under prefers-reduced-motion").

## Global Constraints

Every task's requirements implicitly include this section.

- **GSAP approach (ruling, resolves spec's singular "add gsap").** Use `@gsap/react`'s `useGSAP` (GSAP's official React API: a ref-scoped `gsap.context` with automatic revert on unmount) and build `useGsap` as a thin reduced-motion-guarded wrapper over it. Add BOTH `gsap` and `@gsap/react` as dependencies. *Rationale:* `useGSAP` is exactly the SSR-safe, context-cleaning behaviour the spec asks `useGsap` to have; hand-rolling it with bare `useEffect` + `gsap.context` re-implements it less robustly. Both packages are tiny and tree-shakeable.
- **Tree-shakeable / not imported by default (hard rule).** Nothing in `src/` outside `use-gsap.ts` (and its test + Storybook demo) may import `gsap`, `@gsap/react`, or `use-gsap`. No app route, layout, feature, or shipped component imports the hook. The acceptance check is: after `pnpm build`, `gsap` appears nowhere in `dist/`.
- **Reduced-motion-safe (hard rule).** Every motion utility and the GSAP hook must produce no motion under `prefers-reduced-motion: reduce`. The existing global block (`globals.css`) already forces animation/transition durations to ~0; this phase additionally zeroes `--move-*` so translate-based motion collapses, gates the scroll-driven `scroll-fade` behind `(prefers-reduced-motion: no-preference)`, and makes `useGsap` no-op under reduce. Author animations so the **un-animated / resting DOM is the final (visible) state**, so "no motion" shows the end state, not a broken pre-animation state.
- **Tokens only.** All durations, easings, and distances in the new CSS come from the Phase-1 tokens (`var(--duration-*)`, `var(--ease-*)`, `var(--move-*)`), optionally via `calc()` multipliers — never raw `ms`/`cubic-bezier`/`px` motion literals in the utilities. (The `design-tokens.guard.test.ts` scans `*.{ts,tsx}`, not `.css`, so CSS literals are not auto-caught — this is a convention this phase adds a guard test for. In component/story `className`s, use the new named utilities, never raw values.)
- **Styling / imports:** new CSS lives in `src/styles/globals.css` (utilities) and `src/styles/tokens.css` (token values) only — `globals.css` references tokens, never hardcodes them. Hooks import across folders with the `@/` alias; `cn` from `@/lib/cn`.
- **Text:** no new user-facing runtime copy. Story/demo labels are developer-facing.
- **Gates (every task):** `pnpm lint && pnpm typecheck && pnpm test` green before the task's commit. `pnpm build` is additionally run in the GSAP-dependency task and the final task (spec: "`pnpm build` re-run here"). Focused test run: `pnpm exec vitest run <file>` (`pnpm test -- <file>` runs the whole suite in this repo).
- **Commits:** Conventional Commits; the message body ends with exactly:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/styles/globals.css` | Modify | Add token-driven motion `@keyframes` + `@utility` rules: `interactive`, `press`, `hover-lift`, `enter`, `exit`, `stagger` (Task 1); `shimmer`, `scroll-fade` (Task 2). |
| `src/styles/tokens.css` | Modify | Zero `--move-sm/md/lg` under `prefers-reduced-motion: reduce` (Task 3). |
| `src/styles/motion.stories.tsx` | Create | A `Motion` Storybook showcase of the CSS utilities (Tasks 1–2). |
| `src/styles/globals.test.ts` | Modify | Extend the Phase-2 guard to assert the motion utilities exist and are token-wired (Tasks 1–2). |
| `src/styles/tokens.test.ts` | Modify | Assert the reduced-motion block zeroes durations AND `--move-*` (Task 3). |
| `src/hooks/use-gsap.ts` | Create | Reduced-motion-guarded wrapper over `@gsap/react`'s `useGSAP` (Task 4). |
| `src/hooks/use-gsap.test.tsx` | Create | Gating (runs when allowed, no-op when reduced) + cleanup on unmount (Task 4). |
| `src/hooks/use-gsap.stories.tsx` | Create | A `Motion/useGsap` demo component + story (Task 5). |
| `package.json` | Modify | Add `gsap` + `@gsap/react` to `dependencies` (Task 4). |
| `docs/design-system.md` | Modify | A "Motion" section: the utilities, reduced-motion behaviour, when to reach for `useGsap` (Task 6). |
| `docs/hooks.md` | Modify | Add the `useGsap` row + a short section (Task 6). |
| `CHANGELOG.md` | Modify | One Phase-4 entry (Task 6). |

---

### Task 1: Interaction & enter/exit CSS utilities (+ stagger)

**Files:**
- Modify: `src/styles/globals.css`
- Create: `src/styles/motion.stories.tsx`
- Modify: `src/styles/globals.test.ts`

**Interfaces:**
- Consumes: Phase-1 tokens `--duration-fast|normal`, `--ease-standard|entrance|exit`, `--move-sm`.
- Produces: utilities `interactive` (token transition), `press` (`active:` scale), `hover-lift` (`hover:` translate by `--move-sm`), `enter`/`exit` (keyframed presets), `stagger` (bounded child `animation-delay`). Used as `className`s, e.g. `<button class="interactive press">`, `<div class="enter">`, `<ul class="stagger">…<li class="enter">`.

- [ ] **Step 1: Confirm the `@utility` + `@keyframes` mechanism compiles (quick spike)**

Before adding all of them, add just the `enter` keyframes + `@utility enter` (code below) to `globals.css`, then run `pnpm build` and confirm it compiles and `dist/assets/*.css` contains the `enter` animation. (If `@utility` + top-level `@keyframes` somehow fails in v4.3.3 — it should not; `tw-animate-css` ships keyframes the same way — report BLOCKED with the error.) Then proceed to add the rest.

- [ ] **Step 2: Write the failing guard assertions**

In `src/styles/globals.test.ts` (which already imports `globals.css?raw`), append a describe block:

```ts
describe('globals.css motion utilities (Phase 4)', () => {
  it('defines token-driven interaction + enter/exit + stagger utilities', () => {
    expect(globals).toMatch(/@utility interactive\b/);
    expect(globals).toMatch(/@utility press\b/);
    expect(globals).toMatch(/@utility hover-lift\b/);
    expect(globals).toMatch(/@utility enter\b/);
    expect(globals).toMatch(/@utility exit\b/);
    expect(globals).toMatch(/@utility stagger\b/);
  });

  it('wires enter/exit to duration + easing tokens', () => {
    expect(globals).toMatch(/animation:\s*enter var\(--duration-normal\) var\(--ease-entrance\)/);
    expect(globals).toMatch(/animation:\s*exit var\(--duration-fast\) var\(--ease-exit\)/);
  });

  it('wires hover-lift distance to the --move token', () => {
    expect(globals).toMatch(/hover-lift[\s\S]*var\(--move-sm\)/);
  });
});
```

- [ ] **Step 3: Run the guard to verify it fails**

Run: `pnpm exec vitest run src/styles/globals.test.ts`
Expected: FAIL — the utilities are not present yet.

- [ ] **Step 4: Add the utilities to `globals.css`**

In `src/styles/globals.css`, after the existing `@utility duration-slow { … }` block (around line 95) and before `@layer base`, add:

```css
/* ----------------------------------------------------------------------------
 * Motion layer (Phase 4). All timing/easing/distance comes from tokens.css.
 * Reduced motion: the global prefers-reduced-motion block below zeroes
 * animation/transition durations, and tokens.css zeroes --move-*, so these
 * collapse to no motion. Author so the un-animated state is the final state.
 * -------------------------------------------------------------------------- */
@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(var(--move-sm));
  }
}
@keyframes exit {
  to {
    opacity: 0;
    transform: translateY(var(--move-sm));
  }
}

/* Smoothly transition transform/colour/shadow changes (hover, active, …). */
@utility interactive {
  transition-property: transform, box-shadow, background-color, border-color, color;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-standard);
}

/* Press feedback: pair with `interactive`. */
@utility press {
  &:active {
    transform: scale(0.97);
  }
}

/* Hover lift: pair with `interactive`. Travels one --move-sm. */
@utility hover-lift {
  &:hover {
    transform: translateY(calc(-1 * var(--move-sm)));
  }
}

/* One-shot entrance / exit presets. */
@utility enter {
  animation: enter var(--duration-normal) var(--ease-entrance) both;
}
@utility exit {
  animation: exit var(--duration-fast) var(--ease-exit) both;
}

/* Staggered children (bounded to 8). Put `enter` on the children; step via --stagger. */
@utility stagger {
  & > *:nth-child(1) {
    animation-delay: 0ms;
  }
  & > *:nth-child(2) {
    animation-delay: calc(1 * var(--stagger, 50ms));
  }
  & > *:nth-child(3) {
    animation-delay: calc(2 * var(--stagger, 50ms));
  }
  & > *:nth-child(4) {
    animation-delay: calc(3 * var(--stagger, 50ms));
  }
  & > *:nth-child(5) {
    animation-delay: calc(4 * var(--stagger, 50ms));
  }
  & > *:nth-child(6) {
    animation-delay: calc(5 * var(--stagger, 50ms));
  }
  & > *:nth-child(7) {
    animation-delay: calc(6 * var(--stagger, 50ms));
  }
  & > *:nth-child(8) {
    animation-delay: calc(7 * var(--stagger, 50ms));
  }
}
```

(The bare `50ms` is the default stagger STEP, a CSS literal in the stylesheet — not a component class and not a guard target. Projects override it per-use with `style={{ '--stagger': '80ms' }}`.)

- [ ] **Step 5: Run the guard to verify it passes**

Run: `pnpm exec vitest run src/styles/globals.test.ts`
Expected: PASS.

- [ ] **Step 6: Add the Motion story (interaction + enter/exit + stagger)**

Create `src/styles/motion.stories.tsx`. It has no component — use a `title`-only meta. Token-safe classes only.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = { title: 'Foundations/Motion' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Interactions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <button className="interactive press rounded-md bg-primary px-4 py-2 text-primary-foreground">
        press
      </button>
      <button className="interactive hover-lift rounded-md border bg-card px-4 py-2 text-card-foreground">
        hover-lift
      </button>
    </div>
  ),
};

export const EnterExit: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="enter rounded-md border bg-card p-4 text-card-foreground">enter</div>
      <div className="exit rounded-md border bg-card p-4 text-card-foreground">exit</div>
    </div>
  ),
};

export const Stagger: Story = {
  render: () => (
    <ul className="stagger grid gap-2">
      {['one', 'two', 'three', 'four'].map((n) => (
        <li key={n} className="enter rounded-md border bg-card p-3 text-card-foreground">
          {n}
        </li>
      ))}
    </ul>
  ),
};
```

- [ ] **Step 7: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (the story file lints under the stories override; `design-tokens.guard` scans the story and sees only token-backed utilities + the new named motion utilities).

- [ ] **Step 8: Commit**

```bash
git add src/styles/globals.css src/styles/motion.stories.tsx src/styles/globals.test.ts
git commit -m "feat: add token-driven interaction and enter/exit motion utilities"
```

---

### Task 2: `shimmer` and `scroll-fade` utilities

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/styles/motion.stories.tsx`
- Modify: `src/styles/globals.test.ts`

**Interfaces:**
- Consumes: `--duration-slow`, `--ease-entrance`, `--move-sm`, colour tokens `--muted`/`--accent`; the `enter` keyframes from Task 1.
- Produces: `shimmer` (infinite loading sheen) and `scroll-fade` (fade/translate in on scroll, progressive-enhancement + reduced-motion-gated).

- [ ] **Step 1: Spike — confirm scroll-driven CSS + nesting in `@utility`**

`scroll-fade` is the one genuine unknown (as the Phase-1 border mechanism was). In a scratch edit, add the `scroll-fade` utility below to `globals.css` and run `pnpm build`; confirm it compiles and the compiled CSS contains an `@supports (animation-timeline: view())` block wrapping the `scroll-fade` rule. If Tailwind v4.3.3 rejects nested `@supports`/`@media` inside `@utility`, fall back to a plain class in `@layer components` wrapped in the same `@supports`/`@media` (a `className="scroll-fade"` works either way) and note the deviation in the report. Decide the working form before writing the final code.

- [ ] **Step 2: Write the failing guard assertions**

Append to the Phase-4 describe in `src/styles/globals.test.ts`:

```ts
it('defines shimmer + scroll-fade utilities', () => {
  expect(globals).toMatch(/@utility shimmer\b|\.shimmer\b/);
  expect(globals).toMatch(/@utility scroll-fade\b|\.scroll-fade\b/);
});

it('gates scroll-fade behind feature support and allowed motion', () => {
  expect(globals).toMatch(/@supports \(animation-timeline: view\(\)\)/);
  expect(globals).toMatch(/prefers-reduced-motion: no-preference/);
});

it('wires shimmer duration to a token', () => {
  expect(globals).toMatch(/shimmer[\s\S]*var\(--duration-slow\)/);
});
```

- [ ] **Step 3: Run the guard to verify it fails**

Run: `pnpm exec vitest run src/styles/globals.test.ts`
Expected: FAIL.

- [ ] **Step 4: Add the utilities to `globals.css`**

Add after the Task-1 motion block (use the form the Step-1 spike confirmed; the `@utility` form is preferred):

```css
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* Loading sheen for skeleton surfaces. Token colours; token-derived duration. */
@utility shimmer {
  background-image: linear-gradient(90deg, var(--muted) 0%, var(--accent) 50%, var(--muted) 100%);
  background-size: 200% 100%;
  animation: shimmer calc(var(--duration-slow) * 4) linear infinite;
}

/* Fade + rise as the element scrolls into view. Progressive enhancement:
 * only where scroll-driven animations are supported AND motion is allowed;
 * everywhere else the element is simply visible (resting state). */
@utility scroll-fade {
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      opacity: 0;
      animation: enter linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 30%;
    }
  }
}
```

If the spike required the fallback form, instead add:

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    @layer components {
      .scroll-fade {
        opacity: 0;
        animation: enter linear both;
        animation-timeline: view();
        animation-range: entry 0% cover 30%;
      }
    }
  }
}
```

- [ ] **Step 5: Run the guard to verify it passes**

Run: `pnpm exec vitest run src/styles/globals.test.ts`
Expected: PASS.

- [ ] **Step 6: Extend the Motion story**

Append to `src/styles/motion.stories.tsx`:

```tsx
export const Shimmer: Story = {
  render: () => <div className="shimmer h-4 w-48 rounded-md" />,
};

export const ScrollFade: Story = {
  render: () => (
    <div className="grid h-64 gap-4 overflow-y-auto">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="scroll-fade rounded-md border bg-card p-6 text-card-foreground"
        >
          {/* eslint-disable-next-line */}
          Scroll me ({i + 1})
        </div>
      ))}
    </div>
  ),
};
```

(Story text literals are allowed — `jsx-no-literals` is off for stories.)

- [ ] **Step 7: Run the full gate + a build**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green; `pnpm build` compiles the scroll-driven CSS without error.

- [ ] **Step 8: Commit**

```bash
git add src/styles/globals.css src/styles/motion.stories.tsx src/styles/globals.test.ts
git commit -m "feat: add shimmer and scroll-fade motion utilities"
```

---

### Task 3: Reduced-motion hardening — zero `--move-*`

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: the existing `@media (prefers-reduced-motion: reduce)` block in `tokens.css` (currently zeroes only the duration tokens).
- Produces: under reduced motion, `--move-sm/md/lg` are `0px`, so every translate-based utility (`enter`, `exit`, `hover-lift`, and any component using `--move-*`) collapses to no positional motion. (The Phase-1 watch-item.)

- [ ] **Step 1: Write the failing test**

In `src/styles/tokens.test.ts`, add a test that reads the reduced-motion block and asserts all six tokens are zeroed. Match the file's existing raw-parse style; a self-contained assertion:

```ts
it('zeroes motion durations AND distances under reduced motion', () => {
  const block = tokens.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  for (const name of [
    '--duration-fast',
    '--duration-normal',
    '--duration-slow',
    '--move-sm',
    '--move-md',
    '--move-lg',
  ]) {
    expect(block, `${name} must be zeroed under reduced motion`).toMatch(
      new RegExp(`${name}:\\s*0(ms|px)?;`),
    );
  }
});
```

(`tokens` is the `tokens.css?raw` import already used in this file; reuse the existing import name.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/styles/tokens.test.ts`
Expected: FAIL — only the duration tokens are zeroed today.

- [ ] **Step 3: Zero `--move-*` in the reduced-motion block**

In `src/styles/tokens.css`, extend the reduced-motion block (currently lines ~249–255):

```css
/* Respect reduced-motion preferences everywhere durations/distances are used. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
    --move-sm: 0px;
    --move-md: 0px;
    --move-lg: 0px;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/styles/tokens.test.ts`
Expected: PASS. (Also confirm `tokens.test.ts`'s existing dark/fallback-parity tests still pass — these tokens are theme-independent, so they are unaffected.)

- [ ] **Step 5: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts
git commit -m "feat: collapse motion distances under prefers-reduced-motion"
```

---

### Task 4: GSAP dependencies + the `useGsap` hook

**Files:**
- Modify: `package.json` (+ lockfile)
- Create: `src/hooks/use-gsap.ts`
- Create: `src/hooks/use-gsap.test.tsx`

**Interfaces:**
- Consumes: `gsap`, `@gsap/react` (`useGSAP`).
- Produces: `export function useGsap(factory, options?)`. `factory` is `useGSAP`'s callback `(context, contextSafe) => void | (() => void)`; `options` is `{ scope?, dependencies?, revertOnUpdate? }`. The factory runs only under `(prefers-reduced-motion: no-preference)`, inside the `useGSAP` context (reverted on unmount). Returns `useGSAP`'s `{ context, contextSafe }`.

- [ ] **Step 1: Add the dependencies**

Run: `pnpm add gsap @gsap/react`
Confirm they land in `dependencies` (not dev) in `package.json`, and the lockfile updates.

- [ ] **Step 2: Write the failing tests**

Create `src/hooks/use-gsap.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import gsap from 'gsap';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGsap } from './use-gsap';

// The setup stub returns matches:false for every query; override per case.
function stubMatchMedia(matchingQuery: string) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === matchingQuery,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  // Restore the setup default (matches:false for all).
  stubMatchMedia('__none__');
});

function Demo({ onRun, boxRef }: { onRun: () => void; boxRef: { current: HTMLDivElement | null } }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(
    () => {
      onRun();
      if (ref.current) gsap.to(ref.current, { x: 100, duration: 1 });
    },
    { scope: ref },
  );
  return (
    <div
      ref={(el) => {
        ref.current = el;
        boxRef.current = el;
      }}
    />
  );
}

describe('useGsap', () => {
  it('runs the factory when motion is allowed', () => {
    stubMatchMedia('(prefers-reduced-motion: no-preference)');
    const onRun = vi.fn();
    render(<Demo onRun={onRun} boxRef={{ current: null }} />);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('does not run the factory under reduced motion', () => {
    stubMatchMedia('(prefers-reduced-motion: reduce)');
    const onRun = vi.fn();
    render(<Demo onRun={onRun} boxRef={{ current: null }} />);
    expect(onRun).not.toHaveBeenCalled();
  });

  it('reverts its animations on unmount', () => {
    stubMatchMedia('(prefers-reduced-motion: no-preference)');
    const boxRef = { current: null as HTMLDivElement | null };
    const { unmount } = render(<Demo onRun={() => undefined} boxRef={boxRef} />);
    const box = boxRef.current;
    expect(box).not.toBeNull();
    expect(gsap.getTweensOf(box!).length).toBeGreaterThan(0);
    unmount();
    expect(gsap.getTweensOf(box!).length).toBe(0);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/hooks/use-gsap.test.tsx`
Expected: FAIL — `./use-gsap` does not exist.

- [ ] **Step 4: Implement `use-gsap.ts`**

Create `src/hooks/use-gsap.ts`:

```ts
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { RefObject } from 'react';

// Registering useGSAP lets GSAP track it; required before using the hook.
gsap.registerPlugin(useGSAP);

type GsapContextFn = Exclude<Parameters<typeof useGSAP>[0], undefined>;

export interface UseGsapOptions {
  /** Scope for selector text, so `.box` is limited to this root. Strongly recommended. */
  scope?: RefObject<Element | null> | Element | string;
  /** Re-run (reverting the previous run) when these change. */
  dependencies?: unknown[];
  /** Revert + re-run on every dependency change. */
  revertOnUpdate?: boolean;
}

/**
 * Reduced-motion-safe GSAP setup for React.
 *
 * Wraps `@gsap/react`'s `useGSAP` (a ref-scoped `gsap.context` that auto-reverts on unmount)
 * and runs `factory` only under `(prefers-reduced-motion: no-preference)` via `gsap.matchMedia`,
 * so it no-ops when the user prefers reduced motion. Author animations so the un-animated DOM is
 * the final state — under reduced motion the element simply stays in that state.
 *
 * Not imported anywhere by default, so GSAP stays out of the bundle unless a project uses it.
 */
export function useGsap(factory: GsapContextFn, options?: UseGsapOptions) {
  return useGSAP((context, contextSafe) => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => factory(context, contextSafe));
  }, options);
}
```

Note: the inner `gsap.matchMedia()` is created inside `useGSAP`'s context, so `useGSAP` reverts it (and everything the factory created) on unmount — that is what the cleanup test verifies.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/hooks/use-gsap.test.tsx`
Expected: PASS (all three).

- [ ] **Step 6: Run the full gate + build**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green; the build succeeds with the new dependency.

- [ ] **Step 7: Confirm GSAP is NOT in the baseline bundle**

Run (git-bash): `grep -rl "gsap" "$(pwd)/dist/assets" || echo "gsap not in bundle"`
Expected: `gsap not in bundle` — nothing in `src/` imports `use-gsap` yet, so tree-shaking drops it. (If any file is found, a non-test, non-story app module is importing the hook or GSAP — fix that before committing.)

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/hooks/use-gsap.ts src/hooks/use-gsap.test.tsx
git commit -m "feat: add reduced-motion-safe useGsap hook (optional GSAP)"
```

---

### Task 5: `useGsap` example + Storybook demo

**Files:**
- Create: `src/hooks/use-gsap.stories.tsx`

**Interfaces:**
- Consumes: `useGsap` from `./use-gsap`; `gsap`.
- Produces: a `Motion/useGsap` story with a small demo component — the documented example the spec asks for. This is the only place (besides the test) that imports `useGsap`, and it is Storybook-only, so it does not pull GSAP into the app bundle.

- [ ] **Step 1: Write the demo + story**

Create `src/hooks/use-gsap.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import gsap from 'gsap';
import { useRef } from 'react';

import { useGsap } from './use-gsap';

function StaggerBoxes() {
  const scope = useRef<HTMLDivElement>(null);
  useGsap(
    () => {
      gsap.from('.box', {
        opacity: 0,
        y: 16,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.08,
      });
    },
    { scope },
  );
  return (
    <div ref={scope} className="flex gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="box flex size-16 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

const meta = { title: 'Motion/useGsap', component: StaggerBoxes } satisfies Meta<typeof StaggerBoxes>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Stagger: Story = {};
```

- [ ] **Step 2: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (the story lints under the stories override; `gsap`/`useGsap` imports in a story are allowed).

- [ ] **Step 3: Re-confirm GSAP stays out of the app bundle**

Run: `pnpm build && (grep -rl "gsap" "$(pwd)/dist/assets" || echo "gsap not in bundle")`
Expected: `gsap not in bundle` — the story is not part of the app entry, only `storybook build`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-gsap.stories.tsx
git commit -m "docs: add a useGsap Storybook demo"
```

---

### Task 6: Docs, CHANGELOG, and whole-phase verification

**Files:**
- Modify: `docs/design-system.md`
- Modify: `docs/hooks.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: everything shipped in Tasks 1–5.
- Produces: a "Motion" docs section, a `useGsap` hooks entry, one Phase-4 CHANGELOG entry, and the whole-phase gate + bundle verification.

- [ ] **Step 1: Document the motion layer in `docs/design-system.md`**

Add a `### Motion` subsection (match the file's heading/table style). Cover:
- The CSS utilities and when to use each: `interactive` (+ `press`/`hover-lift`), `enter`/`exit`, `stagger` (put `enter` on children; set `--stagger` to tune the step), `shimmer` (skeleton sheen), `scroll-fade` (scroll-into-view, progressive enhancement — supported browsers + allowed motion only; everywhere else the element is just visible).
- All timing/easing/distance comes from the Phase-1 tokens (`--duration-*`, `--ease-*`, `--move-*`); reduced motion collapses both (the global duration block + zeroed `--move-*`), so author so the resting state is the final state. Include one Incorrect/Correct pair (a raw `@keyframes`/`transition: … 200ms ease` in a component → use the token-driven utility or `useGsap`).
- When to reach for `useGsap`: only for orchestration the CSS utilities can't express; it's optional, tree-shakeable, and reduced-motion-guarded. Cross-link `docs/hooks.md`.

- [ ] **Step 2: Add `useGsap` to `docs/hooks.md`**

Add a row to the hooks table and a short paragraph: signature `useGsap(factory, options?)`; runs GSAP only when motion is allowed, inside a ref-scoped context that reverts on unmount; `gsap`/`@gsap/react` are dependencies but tree-shaken out unless this hook is used; pass a `scope` ref and target with selectors or refs (link GSAP's React guidance).

- [ ] **Step 3: Add the CHANGELOG entry**

Under `## [Unreleased]` `### Added`:

```markdown
- Design System v2, Phase 4: a token-driven motion layer. New CSS utilities —
  `interactive`, `press`, `hover-lift`, `enter`/`exit`, `stagger`, `shimmer`, and
  `scroll-fade` — all built on the Phase-1 motion tokens and reduced-motion-safe
  (`--move-*` now collapses under `prefers-reduced-motion`; `scroll-fade` is a
  progressive enhancement). An optional, reduced-motion-guarded `useGsap` hook
  (`@/hooks/use-gsap`) for orchestration, backed by `gsap` + `@gsap/react`; it is
  tree-shaken out of the bundle unless a project uses it. See "Motion" in
  `docs/design-system.md` and `docs/hooks.md`.
```

(Note in the entry that `gsap` and `@gsap/react` were added as dependencies — a new dependency is worth calling out, though no action is needed since they're unused by default.)

- [ ] **Step 4: Whole-phase gate + build**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green.

- [ ] **Step 5: Bundle verification (spec acceptance)**

Run: `grep -rl "gsap" "$(pwd)/dist/assets" || echo "gsap not in bundle"`
Expected: `gsap not in bundle`.
Optionally run `pnpm analyze` (writes `stats.html`; opens a treemap locally, not in CI) and confirm no `gsap` node in the main chunks.

- [ ] **Step 6: Confirm no E2E regression surface**

The motion utilities are opt-in (nothing applies them to key pages yet) and `useGsap` is unused by the app, so the axe E2E suite is unaffected. Verify:
Run: `git grep -nE "useGsap|\\b(enter|exit|shimmer|scroll-fade|hover-lift|stagger|press|interactive)\\b" -- src/features src/app src/components/layout`
Expected: no shipped key-page markup adopts the new utilities/hook. If any appears, run `pnpm test:e2e` (after `pnpm exec playwright install chromium`; port 4173 free) to confirm axe still passes.

- [ ] **Step 7: Commit**

```bash
git add docs/design-system.md docs/hooks.md CHANGELOG.md
git commit -m "docs: record Phase 4 motion layer in changelog and docs"
```

---

## Self-Review

**1. Spec coverage (§5 Phase 4):**
- CSS utilities — press/hover/focus micro-interactions (`interactive`/`press`/`hover-lift`) → Task 1; `stagger` → Task 1; enter/exit presets → Task 1; `shimmer` + `scroll-fade` → Task 2. All duration/easing via tokens; reduced-motion-safe → Tasks 1–3 + the global block. ✅
- Optional GSAP — `gsap` dependency + `useGsap` hook that is SSR-safe (useGSAP runs in effect), auto-cleans via `gsap.context` (useGSAP reverts on unmount), reduced-motion-guarded via `gsap.matchMedia` keyed to `(prefers-reduced-motion: reduce)` (we run only under `no-preference`), tree-shakeable (imported nowhere by default) → Task 4. One documented example + Storybook demo → Task 5. ✅
- `pnpm build` re-run (new dependency) + bundle check via `pnpm analyze`/grep that GSAP is not in the default chunk → Tasks 4, 5, 6. ✅
- Acceptance: utilities work + respect reduced motion (guard tests + the global block + zeroed `--move-*`); `useGsap` cleans up (Task 4 unmount test) + no-ops under reduce (Task 4 test); GSAP absent from baseline bundle (grep); gates green. ✅
- Phase-1 watch-item "zero `--move-*` under prefers-reduced-motion" → Task 3. ✅

**2. Placeholder scan:** No `TBD`/"handle edge cases"/"similar to Task N". Every CSS/TS/test step has full code. The two genuine unknowns (the `@utility`+`@keyframes` compile, and scroll-driven CSS nesting) are explicit spike steps with a decision and a documented fallback, not placeholders. Task 1/6 docs steps specify the content to write (a documentation task legitimately specifies sections).

**3. Type / name consistency:** The utility names (`interactive`, `press`, `hover-lift`, `enter`, `exit`, `stagger`, `shimmer`, `scroll-fade`) are identical across `globals.css`, the guard assertions, the Motion story, and the docs. `useGsap`'s signature (`factory`, `options: { scope, dependencies, revertOnUpdate }`) matches between `use-gsap.ts`, its test, and the demo. The guard-test raw-import names (`globals`, `tokens`) match the existing imports in `globals.test.ts` / `tokens.test.ts`. The bundle-check path (`dist/assets`) matches `vite build`'s output.

**Notes carried into later phases:** Phase 5's `styling.md` rulebook should add "motion via the token utilities / `useGsap`, not ad-hoc `@keyframes` or raw-duration transitions" with an Incorrect/Correct pair, enforced where checkable (e.g. a guard against raw `cubic-bezier(`/`@keyframes` in `src/**/*.{ts,tsx}`). Phase 6's showcase should include a motion table (durations, easings, distances) and render the utilities + a `useGsap` demo. Consider (Phase 5) whether to add a `gsap` import ban outside `use-gsap.ts` via the `WRAPPED` mechanism, mirroring the icon barrel.
