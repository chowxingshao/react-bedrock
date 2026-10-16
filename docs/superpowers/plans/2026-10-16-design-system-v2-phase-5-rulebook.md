# Design System v2 — Phase 5 (Rulebook + enforcement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a shadcn-style multi-file rulebook (`docs/rules/*`), a one-page `docs/customization.md` "make it yours" checklist, and the Phase-5 enforcement additions — a lint ban + guard on `gsap` imports and a guard on ad-hoc `@keyframes` — each enforced rule backed by its own test, each un-checkable rule marked "convention (not enforced)".

**Architecture:** Phase 5 is almost entirely **docs + enforcement**; it changes no component markup, no tokens, and adds no runtime dependency. The rulebook documents rules react-bedrock already owns, labelling each with how it is enforced (existing guard test / ESLint rule) or marking it a convention. Two new mechanical checks are added: (1) the deferred `gsap`-import ban (an ESLint `no-restricted-imports` entry confining `gsap`/`@gsap/react` to the `useGsap` hook and its sibling story/test, mirroring the Phase-3 `lucide-react` ban), and (2) a `@keyframes` rule in the existing design-token guard (ad-hoc keyframes belong in `globals.css`, authored via motion utilities). `docs/customization.md` collects the three "baked per project" edit points (tokens, icon barrel, component `defaultVariants`) and is linked from `CLAUDE.md` and `README.md`.

**Tech Stack:** Markdown docs; Vitest guard tests (`import.meta.glob(..., { query: '?raw' })` tree scans, mirroring `src/components/ui/icons.guard.test.ts` and `src/test/design-tokens.guard.test.ts`); ESLint flat config (`eslint.config.js`, the `WRAPPED` + `restrictedImports()` machinery).

**Spec:** `docs/superpowers/specs/2026-10-15-design-system-v2-design.md` — Phase 5 is §5 "Phase 5 — Rulebook + enforcement"; the edit-once model is §4; cross-cutting/downstream notes are §6.

## Global Constraints

- **Execution base is `origin/main` @ `6b23269`** (Phase 4 merged). The local `main` in this checkout is **behind at `391bd44`** (Phase 3) — it must be fast-forwarded to `origin/main` *before* any worktree/branch is cut, or `use-gsap.ts` and the `gsap` deps this phase references will be absent. Confirm `git rev-parse --short origin/main` → `6b23269` and that `src/hooks/use-gsap.ts` exists before Task 1.
- **Gates every task:** `pnpm lint && pnpm typecheck && pnpm test` green. No `pnpm build` (no deps/config that affect the build; ESLint config is not a build input). No `pnpm test:e2e` (zero markup change — defaults unchanged).
- **Commit convention:** Conventional Commits (commitlint-enforced).
- **Commit trailer (every commit):** end the message with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
  Each subagent tends to self-attribute its *own* model — the controller MUST verify and amend every commit's trailer to Opus 4.8.
- **Text rule:** these are docs, not UI — no i18n needed. But any *example* code inside the rulebook that shows JSX text must still show the correct `t('…')` form (the rulebook teaches the rules; it must not model violations outside an explicit `Incorrect` block).
- **No new raw design values, no component/token edits.** Phase 5 adds docs and two checks only.
- **Enforcement labelling:** in the rulebook, every rule that is mechanically checked ends with a bold `**Enforced by:** <test or ESLint rule>` line naming the real check; every rule that is not ends with `**Convention (not enforced).**`.
- **Deferred items that belong to Phase 6, NOT here** (do not pull in): the loose-guard-regex tightening, the test-depth gaps (tone compound combos, className-override/twMerge-win, `{axis}={null}`), the `interactive` transition-property/opacity note, the EnterExit story, the stale `use-gsap.ts` comment, and `docs/design-system.md` heading nits. Phase 5 touches only what this plan lists.

---

## File structure

**New files**

- `docs/rules/styling.md` — colour/geometry/spacing/motion styling rules.
- `docs/rules/composition.md` — which component to reach for; overlay choice; async states.
- `docs/rules/forms.md` — the classic RHF `Form` usage rules.
- `docs/rules/icons.md` — icon barrel + `<Icon>` rules.
- `docs/customization.md` — the one-page "make it yours" edit-once checklist.
- `src/hooks/use-gsap.guard.test.ts` — asserts `gsap`/`@gsap/react` stay confined to `use-gsap.ts` (excluding its story/test).
- `src/test/docs-rulebook.guard.test.ts` — asserts the rulebook + customization docs exist and are linked from `CLAUDE.md`/`README.md`.

**Modified files**

- `eslint.config.js` — add the `gsap` entry to `WRAPPED`.
- `src/test/design-tokens.guard.test.ts` — add the `ad-hoc @keyframes` rule.
- `CLAUDE.md` — link `docs/customization.md` and `docs/rules/` from the docs map.
- `README.md` — add a Documentation-table row for customization + rulebook.
- `docs/design-system.md` — cross-link the rulebook and customization page.
- `docs/starting-a-new-project.md` — add a "customize your design" step pointing at `docs/customization.md` (spec §6).
- `CHANGELOG.md` — the Phase 5 entry.

---

## Task 1: `gsap`-import ban (the deferred Phase-4 enforcement item)

Confine `gsap` and `@gsap/react` to the `useGsap` hook and its own story/test, mirroring the Phase-3 `lucide-react` ban. This keeps GSAP out of the shipped app bundle unless a project opts in through the hook.

**Files:**
- Modify: `eslint.config.js` (the `WRAPPED` array, ~`eslint.config.js:19-42`)
- Test: `src/hooks/use-gsap.guard.test.ts` (create)

**Interfaces:**
- Consumes: the existing `WRAPPED` entry shape `{ files, paths?, patterns?, message }` and `restrictedImports({ allow })` wiring in `eslint.config.js`.
- Produces: nothing other code imports. The ban's observable contract: `gsap` and `@gsap/react` may be imported **only** in `src/hooks/use-gsap.ts`, `src/hooks/use-gsap.stories.tsx`, and `src/hooks/use-gsap.test.tsx`.

**Context the implementer needs:**
- Current `gsap` importers on the base branch (verified): `src/hooks/use-gsap.ts` (`gsap` + `@gsap/react`), `src/hooks/use-gsap.stories.tsx` (`gsap`), `src/hooks/use-gsap.test.tsx` (`gsap`). The story and test legitimately need `gsap` to author/drive the demo animation, so all three are "home" files.
- The test/story ESLint override (`eslint.config.js:318-327`) does **not** disable `no-restricted-imports`. Because the `WRAPPED.map` block (`eslint.config.js:286-294`) runs after the `src/**` block and sets `no-restricted-imports` for exactly the `files` of each entry, listing the story and test among the entry's `files` is what grants them the allowance.
- The Phase-3 precedent is the `lucide-react` entry (`eslint.config.js:37-41`) and `src/components/ui/icons.guard.test.ts`.

- [ ] **Step 1: Write the failing guard test**

Create `src/hooks/use-gsap.guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

/**
 * Phase-5 motion enforcement: `gsap` / `@gsap/react` stay out of the shipped bundle.
 * The only non-test, non-story importer is the reduced-motion-safe hook (src/hooks/use-gsap.ts),
 * so projects that don't animate pay nothing. The ESLint `no-restricted-imports` rule enforces the
 * full ban (including story/test homes); this test is the fast, CI-visible bundle invariant.
 */
const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/*.stories.tsx'],
  { query: '?raw', import: 'default', eager: true },
);

const importers = Object.entries(sources)
  .filter(([, source]) => /from ['"](?:gsap|@gsap\/react)['"]/.test(source))
  .map(([file]) => file);

describe('gsap confinement (spec §5 Phase 5)', () => {
  it('actually scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it('imports gsap outside tests/stories in exactly one file: the useGsap hook', () => {
    expect(importers).toEqual(['/src/hooks/use-gsap.ts']);
  });
});
```

- [ ] **Step 2: Run the test to confirm it passes against the current tree**

Run: `pnpm test src/hooks/use-gsap.guard.test.ts`
Expected: PASS (the only non-test/story importer today is `use-gsap.ts`). This test encodes the invariant; Step 5 proves it catches a violation.

- [ ] **Step 3: Add the ESLint ban**

In `eslint.config.js`, append to the `WRAPPED` array (after the `lucide-react` entry):

```js
  {
    files: [
      'src/hooks/use-gsap.ts',
      'src/hooks/use-gsap.stories.tsx',
      'src/hooks/use-gsap.test.tsx',
    ],
    paths: ['gsap'],
    patterns: ['@gsap/*'],
    message: 'Use the `useGsap` hook from @/hooks/use-gsap (GSAP stays out of the default bundle).',
  },
```

- [ ] **Step 4: Run lint to confirm the current tree is clean**

Run: `pnpm lint`
Expected: PASS — the three home files are allowed; nothing else imports `gsap`.

- [ ] **Step 5: Verify both checks fail on a planted violation, then revert**

Create a scratch file `src/hooks/__gsap-ban-probe.tsx` containing `import gsap from 'gsap';\nexport const probe = gsap;`.
Run: `pnpm lint` → expected FAIL with the restricted-import message on that file.
Run: `pnpm test src/hooks/use-gsap.guard.test.ts` → expected FAIL (`importers` now also lists the probe).
Then delete `src/hooks/__gsap-ban-probe.tsx` and re-run both — expected PASS.

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js src/hooks/use-gsap.guard.test.ts
git commit -m "feat: ban direct gsap imports outside the useGsap hook"
```

---

## Task 2: Ad-hoc `@keyframes` guard (styling motion rule)

Motion belongs in `globals.css` via the token-driven motion utilities (and `useGsap` for orchestration). Ad-hoc `@keyframes` authored inside a component file (a style string / template literal) is the violation this rule catches. Verified: no `src/**/*.{ts,tsx}` contains `@keyframes` today, so the rule is clean to add.

**Files:**
- Modify/Test: `src/test/design-tokens.guard.test.ts` (the `RULES` array + a focused pattern test)

**Interfaces:**
- Consumes: the existing `RULES`-array shape `{ name, pattern, hint }` and the tree-scan in `design-tokens.guard.test.ts`.
- Produces: a new guard rule named `ad-hoc @keyframes`. Note: this guard scans `.ts`/`.tsx` only — it does not (and must not) flag `src/styles/globals.css`, which is where keyframes legitimately live.

- [ ] **Step 1: Write the failing pattern test**

In `src/test/design-tokens.guard.test.ts`, add a focused test (above or below the existing `describe`) that asserts the pattern's behaviour directly:

```ts
describe('ad-hoc @keyframes rule', () => {
  const pattern = /@keyframes\b/;
  it('matches an inline @keyframes', () => {
    expect(pattern.test('const css = `@keyframes spin { to { rotate: 360deg } }`;')).toBe(true);
  });
  it('ignores prose that merely says keyframes', () => {
    expect(pattern.test('// author keyframes in globals.css')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/test/design-tokens.guard.test.ts`
Expected: FAIL — `pattern` references a rule not yet in the file (or the test file does not yet compile with the new block). This confirms the test is wired before the rule exists.

> If you prefer, define the test's `pattern` by importing the rule you add in Step 3 rather than re-literalling it, so the test fails for "rule not exported" first. Either way, the test must fail before Step 3 and pass after.

- [ ] **Step 3: Add the guard rule**

Append to the `RULES` array in `src/test/design-tokens.guard.test.ts`:

```ts
  {
    name: 'ad-hoc @keyframes',
    pattern: /@keyframes\b/,
    hint: 'Author keyframes in src/styles/globals.css via the motion utilities; use useGsap for orchestration.',
  },
```

- [ ] **Step 4: Run the guard to confirm the tree is clean and the pattern test passes**

Run: `pnpm test src/test/design-tokens.guard.test.ts`
Expected: PASS — both the new pattern test and the tree-scan `finds no ad-hoc @keyframes in src/` case (no `.ts`/`.tsx` offends today).

- [ ] **Step 5: Verify the guard fails on a planted violation, then revert**

Create scratch `src/__keyframes-probe.ts` with `export const css = '@keyframes probe { to { opacity: 1 } }';`.
Run: `pnpm test src/test/design-tokens.guard.test.ts` → expected FAIL (the `ad-hoc @keyframes` case lists the probe).
Delete `src/__keyframes-probe.ts` and re-run — expected PASS.

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/test/design-tokens.guard.test.ts
git commit -m "feat: guard against ad-hoc @keyframes in component files"
```

---

## Task 3: `docs/rules/styling.md` + `docs/rules/icons.md`

The two enforcement-heavy rulebook files. Each rule is a short named section with an `Incorrect` block and a `Correct` block (shadcn style), followed by the enforcement label. Draw every example from this repo's real APIs and tokens — do not invent components or classes. Reference, don't duplicate, the token tables in `docs/design-system.md`.

**Files:**
- Create: `docs/rules/styling.md`
- Create: `docs/rules/icons.md`

**Interfaces:**
- Consumes: the real enforcement checks to name in `**Enforced by:**` lines — `src/test/design-tokens.guard.test.ts` (hex, raw palette, arbitrary px, raw z-index, raw duration, **ad-hoc @keyframes** from Task 2), the `no-restricted-imports` `WRAPPED` bans in `eslint.config.js` (incl. the **gsap** ban from Task 1 and the **lucide-react** ban), `src/components/ui/icons.guard.test.ts`, `src/styles/globals.test.ts` (border-width wiring), and `react/jsx-no-literals`.
- Produces: two markdown files the showcase (Phase 6) and `customization.md` (Task 5) link to.

- [ ] **Step 1: Write `docs/rules/styling.md`**

Start with a one-paragraph intro ("Each rule shows an Incorrect and a Correct form. Enforced rules name their check; the rest are conventions reviewers watch for.") Then one section per rule below. For each, write a minimal `Incorrect`/`Correct` pair in a fenced `tsx` block using real token utilities, and close with the enforcement label.

Rules (from spec §5 styling.md), with the enforcement label each must carry:
- **Semantic colours, never raw palette or hex** — e.g. Incorrect `className="bg-[#1e293b] text-slate-500"`, Correct `className="bg-card text-muted-foreground"`. **Enforced by:** `design-token guard` (`hex colour`, `raw palette colour`) in `src/test/design-tokens.guard.test.ts`.
- **No arbitrary pixel values** — Incorrect `className="p-[13px] rounded-[10px]"`, Correct `className="p-3 rounded-md"`. **Enforced by:** `design-token guard` (`arbitrary pixel value`).
- **Borders via the token, not a raw width** — Incorrect `className="border-[2px]"`, Correct `className="border"` (reads `--border-width`) / `className="border-2"` for an intentional step. Note the global knob lives in `tokens.css` (`--border-width` / `--border-width-strong`). **Enforced by:** `design-token guard` (`arbitrary pixel value`) + the border-width wiring guard in `src/styles/globals.test.ts`.
- **No manual z-index on overlays** — Incorrect `className="z-50"`, Correct `z-modal` / `z-dropdown` / `z-toast` / `z-sticky`. **Enforced by:** `design-token guard` (`raw z-index`).
- **Durations from the scale** — Incorrect `duration-200`, Correct `duration-fast` / `duration-normal` / `duration-slow`. **Enforced by:** `design-token guard` (`raw duration`).
- **Motion via utilities / `useGsap`, never ad-hoc `@keyframes`** — Incorrect: a component with an inline `@keyframes` string; Correct: the `globals.css` motion utilities (`interactive`, `press`, `hover-lift`, `enter`, `exit`, `stagger`, `shimmer`, `scroll-fade`) and `useGsap` for orchestration. **Enforced by:** `design-token guard` (`ad-hoc @keyframes`, Task 2) + the `gsap` import ban (Task 1).
- **`cn()` for conditional classes** — Incorrect template-string concatenation of classes; Correct `cn('base', condition && 'extra')` from `@/lib/cn`. **Convention (not enforced).**
- **Built-in variants before classNames** — Incorrect `<Button className="rounded-full bg-destructive">`, Correct `<Button variant="destructive" shape="pill">`. **Convention (not enforced).**
- **Shape via the `shape` variant, not a radius className** — Incorrect `<Button className="rounded-full">`, Correct `<Button shape="pill">`. **Convention (not enforced).**
- **`size-*` over separate `w-`/`h-`; `gap` over `space-*`** — Incorrect `className="w-4 h-4"` / `space-x-2`, Correct `className="size-4"` / `gap-2`. **Convention (not enforced).**

- [ ] **Step 2: Write `docs/rules/icons.md`**

Intro paragraph, then sections:
- **Import icons from the barrel, never `lucide-react` directly** — Incorrect `import { Trash2 } from 'lucide-react'`, Correct `import { Delete } from '@/components/ui/icons'` (semantic aliases; the barrel is `src/components/ui/icons.ts`). Note swapping the whole set = editing that one file. **Enforced by:** the `lucide-react` `no-restricted-imports` ban in `eslint.config.js` + `src/components/ui/icons.guard.test.ts`.
- **Pass component objects, not string keys** — Incorrect `<Icon icon="trash" />`, Correct `<Icon icon={Delete} />` (the `icon` prop type is `IconComponent`, so a string fails typecheck). **Enforced by:** the `IconComponent` type on `<Icon>` in `src/components/ui/icon.tsx` (typecheck).
- **No sizing classes inside components that auto-size SVGs** — Incorrect adding `className="size-4"` to an icon dropped into `Button` (Button's `[&_svg]:size-4` already sizes it), Correct let the component size it; use `<Icon size="…">` only for standalone icons. **Convention (not enforced).**
- **Use `<Icon>` for standalone icons** (a11y: labelled when meaningful, `aria-hidden` when decorative). **Convention (not enforced).**

- [ ] **Step 3: Review examples compile mentally against real APIs**

Confirm each example uses a real token utility / component prop (cross-check against `src/styles/tokens.css`, `src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `icon.tsx`, `icons.ts`). Fix any class or prop that does not exist.

- [ ] **Step 4: Commit**

```bash
git add docs/rules/styling.md docs/rules/icons.md
git commit -m "docs: add styling and icons rulebook pages"
```

---

## Task 4: `docs/rules/composition.md` + `docs/rules/forms.md`

The component-usage rulebook files — adapted strictly to the components react-bedrock owns (spec §5 non-goal: no shadcn primitives we don't have). These rules are mostly conventions; label them so.

**Files:**
- Create: `docs/rules/composition.md`
- Create: `docs/rules/forms.md`

**Interfaces:**
- Consumes: the real component names (verified present in `src/components/ui/` and `src/components/feedback/`): `Separator`, `Skeleton`, `Badge`, `Spinner`, `Dialog`, `AlertDialog`, `Sheet`, `Popover`, `Tooltip`, `DropdownMenu`, `Card`, and `EmptyState`/`ErrorState`/`QueryState` (feedback); `Form`/`FormField`/`FormItem`/`FormControl`/`FormMessage` (`src/components/ui/form.tsx`).
- Produces: two markdown files linked from `customization.md` and the showcase (Phase 6).

- [ ] **Step 1: Write `docs/rules/composition.md`**

Intro, then sections (each an Incorrect/Correct pair; all **Convention (not enforced)** unless noted):
- **Use the primitives, not custom markup** — Incorrect a hand-rolled `<hr>` / skeleton `<div>` / status pill; Correct `Separator` / `Skeleton` / `Badge`.
- **`Button` has no `isLoading` — compose `Spinner`** — Correct example mirrors `src/features/example/components/delete-item-button.tsx` (disable the button and render `<Spinner>` beside the label). Point at that file.
- **Overlay choice** — a short table limited to what we own: `Dialog` (focus-trapping modal task), `AlertDialog` (destructive confirm — see `useConfirm`), `Sheet` (edge panel), `Popover` (anchored transient UI), `Tooltip` (hover/focus hint), `DropdownMenu` (action/selection menu). Do **not** mention shadcn's `Drawer`/`Command` etc.
- **`Dialog`/`Sheet` require a title** (a labelled heading for the overlay). 
- **Card anatomy** — header/content/footer via the Card parts, not nested divs.
- **Empty / error / loading go through our states** — Incorrect bespoke "no data" markup; Correct `EmptyState` / `ErrorState`, or `QueryState` to cover loading+empty+error+success together. Reference `docs/data-fetching.md`.

- [ ] **Step 2: Write `docs/rules/forms.md`**

Intro, then sections (adapted to the classic RHF `Form` we ship — see `src/components/ui/form.tsx` and `docs/forms.md`):
- **Build fields with the `Form` parts** — Incorrect raw `<input>` + manual error text; Correct `FormField` → `FormItem` → `FormLabel` → `FormControl` → `FormMessage`. 
- **Control choice limited to our controls** — `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `DatePicker` (what exists in `src/components/ui/`). 
- **Validation at the boundary with Zod** — the resolver drives `FormMessage`; don't hand-roll error strings. Reference `docs/forms.md` + the spec rule "Zod at the boundaries".
- **Disabled/pending state** — disable submit while pending; compose `Spinner` (cross-link `composition.md`).
- Label any rule that a check covers; here the only mechanical overlap is **user-facing text through `t('…')`** (shown in examples) — **Enforced by:** `react/jsx-no-literals` (ESLint) for JSX text. Everything else is **Convention (not enforced).**

- [ ] **Step 3: Verify component names against the tree**

Cross-check every component named exists in `src/components/ui/` or `src/components/feedback/index.ts`. Remove any that does not.

- [ ] **Step 4: Commit**

```bash
git add docs/rules/composition.md docs/rules/forms.md
git commit -m "docs: add composition and forms rulebook pages"
```

---

## Task 5: `docs/customization.md` + links + rulebook structural guard

The one-page "make it yours" checklist (spec §4 edit points), linked from `CLAUDE.md` and `README.md`, with a guard test that keeps the rulebook present and linked.

**Files:**
- Create: `docs/customization.md`
- Modify: `CLAUDE.md` (docs map), `README.md` (Documentation table)
- Test: `src/test/docs-rulebook.guard.test.ts` (create)

**Interfaces:**
- Consumes: the three edit points from spec §4 — `src/styles/tokens.css` (all token knobs), `src/components/ui/icons.ts` (icon barrel), component `defaultVariants` (`shape`/`tone`/`size`/`elevation`). The guard consumes `import.meta.glob` raw reads of the doc + `CLAUDE.md` + `README.md`.
- Produces: `docs/customization.md` at a stable path that `CLAUDE.md`, `README.md`, `docs/design-system.md`, and `docs/starting-a-new-project.md` (Task 6) reference.

- [ ] **Step 1: Write the failing structural guard**

Create `src/test/docs-rulebook.guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

/**
 * Phase-5 rulebook (spec §5 Phase 5): the rulebook + customization page exist, and the
 * customization page is linked from the two entry docs. Keeps the "make it yours" path discoverable.
 */
const docs = import.meta.glob<string>(
  ['/docs/rules/*.md', '/docs/customization.md', '/CLAUDE.md', '/README.md'],
  { query: '?raw', import: 'default', eager: true },
);

const read = (path: string) => docs[path] ?? '';

describe('rulebook + customization docs', () => {
  it('ships the four rulebook pages', () => {
    for (const name of ['styling', 'composition', 'forms', 'icons']) {
      expect(docs[`/docs/rules/${name}.md`], `missing docs/rules/${name}.md`).toBeTypeOf('string');
    }
  });

  it('ships the customization page', () => {
    expect(docs['/docs/customization.md']).toBeTypeOf('string');
  });

  it('links customization.md from CLAUDE.md and README.md', () => {
    expect(read('/CLAUDE.md')).toContain('docs/customization.md');
    expect(read('/README.md')).toContain('docs/customization.md');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/test/docs-rulebook.guard.test.ts`
Expected: FAIL — `docs/customization.md` does not exist and the entry docs don't link it. (The four rule pages from Tasks 3–4 should already pass their case.)

- [ ] **Step 3: Write `docs/customization.md`**

A one-page checklist, "Make this template yours", with three sections matching spec §4, each with a concrete before/after:
1. **Tokens — `src/styles/tokens.css`.** Colours, radius scale, border width (`--border-width`/`-strong`), motion (`--ease-*`, `--move-*`), type scale (`--text-*`), density (`--density`/`--control-h-*`), focus/elevation (`--ring-width`/`-offset`, shadow knob), extended colours (`--chart-1..5`, `--sidebar-*`). State the rule: edit values here, in all three colour blocks (`:root`, `.dark`, and the `prefers-color-scheme` fallback) for colour tokens. Reference `docs/design-system.md` for the full token tables.
2. **Icon set — `src/components/ui/icons.ts`.** Swap the whole set by editing this one barrel's imports/aliases; add custom SVG/image icons here as components. Reference `docs/rules/icons.md`.
3. **Default variants — component `defaultVariants`.** Set the project's default `shape`/`tone`/`size`/`elevation` in the relevant `cva` (`button.tsx`, `badge.tsx`, `input.tsx`, `card.tsx`, `select.tsx`) when a global default isn't enough. Show a before/after of a `defaultVariants` block. Reference `docs/rules/styling.md`.
End with a "Rulebook" pointer listing the four `docs/rules/*` pages.

- [ ] **Step 4: Link from `CLAUDE.md`**

In the `## Map` table of `CLAUDE.md`, add rows (or a short note under the table) pointing to `docs/customization.md` ("the edit-once customization checklist") and `docs/rules/` ("the rulebook: styling, composition, forms, icons"). Ensure the literal string `docs/customization.md` appears.

- [ ] **Step 5: Link from `README.md`**

In the `## Documentation` table (`README.md:108-129`), add a row:
`| Customizing the look (tokens, icons, variants) + the rulebook | [customization.md](docs/customization.md) |`
Ensure the literal string `docs/customization.md` appears.

- [ ] **Step 6: Run the guard + full gate**

Run: `pnpm test src/test/docs-rulebook.guard.test.ts` → expected PASS.
Run: `pnpm lint && pnpm typecheck && pnpm test` → expected PASS.

- [ ] **Step 7: Commit**

```bash
git add docs/customization.md CLAUDE.md README.md src/test/docs-rulebook.guard.test.ts
git commit -m "docs: add customization checklist and link the rulebook"
```

---

## Task 6: CHANGELOG, doc cross-links, final gate

Record the phase and wire the remaining cross-links (spec §6: the new-project guide gets a "customize your design" step).

**Files:**
- Modify: `CHANGELOG.md`, `docs/design-system.md`, `docs/starting-a-new-project.md`

**Interfaces:**
- Consumes: the files created in Tasks 1–5.
- Produces: the shippable phase record and discoverability links.

- [ ] **Step 1: Add the CHANGELOG entry**

Follow the Phase 1–4 entry style in `CHANGELOG.md`. Cover, with migration notes:
- New rulebook `docs/rules/{styling,composition,forms,icons}.md` and `docs/customization.md` (additive — no code change required downstream).
- **New enforcement (may require a downstream edit):** `gsap`/`@gsap/react` may now be imported only in `src/hooks/use-gsap.ts` (and its story/test) — route animation through `useGsap`; and ad-hoc `@keyframes` in `.ts`/`.tsx` is now flagged — author keyframes in `globals.css`.

- [ ] **Step 2: Cross-link from `docs/design-system.md`**

Add a short "Rules & customization" pointer linking `docs/customization.md` and `docs/rules/`.

- [ ] **Step 3: Add the "customize your design" step to `docs/starting-a-new-project.md`**

Per spec §6, add a step pointing at `docs/customization.md` in the new-project flow.

- [ ] **Step 4: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS (expected counts: the three new tests from Tasks 1, 2, 5 added; everything green).

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md docs/design-system.md docs/starting-a-new-project.md
git commit -m "docs: record Phase 5 rulebook and enforcement in changelog and docs"
```

---

## Self-review (completed against the spec)

**Spec coverage (§5 Phase 5):**
- `docs/rules/styling.md` → Task 3. `icons.md` → Task 3. `composition.md` → Task 4. `forms.md` → Task 4. ✓
- Each rule = Incorrect/Correct pair → Tasks 3–4 structure. ✓
- "Enforcement: each mechanically checkable rule gets a guard-test regex or ESLint rule, each with its own test; un-checkable marked convention" → the **gsap ban** (Task 1, ESLint + guard test), the **ad-hoc @keyframes** guard (Task 2, guard rule + pattern test), and the enforcement labels throughout Tasks 3–4 naming the **existing** checks; convention labels on the rest. ✓
- The deferred Phase-4 item (lint ban on `gsap` outside `use-gsap.ts`) → Task 1. ✓
- `docs/customization.md` one-page edit-once checklist with before/after → Task 5. ✓
- Linked from `CLAUDE.md` and `README.md` → Task 5 (guarded). ✓
- Acceptance "each enforced rule has a passing test and fails on a planted violation" → Task 1 Step 5, Task 2 Step 5. "rulebook files render; CLAUDE/README link them" → Task 5 guard. ✓
- §6 downstream: CHANGELOG entry + `starting-a-new-project.md` "customize your design" step → Task 6. ✓

**Placeholder scan:** code steps carry real snippets; doc steps enumerate the exact rule set and enforcement label for each rule rather than "add rules". No TBD/TODO.

**Type/name consistency:** guard test paths use the real `import.meta.glob` leading-slash form (`/src/...`, `/docs/...`, `/CLAUDE.md`) matching `icons.guard.test.ts`; `WRAPPED` entry shape matches `eslint.config.js`; component/token names cross-checked against the tree (Task 3 Step 3, Task 4 Step 3).

**One open micro-decision for the executor** (does not block): in Task 1 the story/test are listed as `gsap` "home" files. If a reviewer prefers the ban to mirror lucide's single-home strictness, the alternative is to keep only `use-gsap.ts` as home and refactor the story/test to drive animation through the hook — but that loses the story's ability to demo arbitrary `gsap` calls. This plan keeps all three as homes (the guard still protects the bundle by excluding tests/stories). Flag if the reviewer disagrees.
