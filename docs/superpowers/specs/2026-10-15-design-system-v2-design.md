# Design System v2 — a flexible, rules-driven design system

- **Date:** 2026-10-15
- **Status:** Design approved; spec under review (pre-plan)
- **Author:** chowxingshao (with Claude)
- **Supersedes:** nothing — extends the design system shipped in the v0.1.0 template build.

---

## 1. Context & problem

react-bedrock's foundations (CI/CD, OpenAPI codegen, Playwright, MSW, i18n, TanStack
Query) are solid. The **design system is not**: it is token-driven for colour but rigid
everywhere else, so a new project cannot easily be made to look distinct.

Concrete gaps, verified in the code:

| Want | Why it isn't a small change today |
| --- | --- |
| Button shape (circle/square/rounded) | `button.tsx:9,22-25` hardcodes `rounded-md`; `Card`/`Input` hardcode `rounded-xl`/`rounded-md`. No `shape` axis. |
| Swap the icon set / use SVG or image icons | `lucide-react` is imported **directly in ~45 files**. No single swap point. |
| Thicker/thinner borders globally | **No border-width token.** `border` is Tailwind's hardcoded `1px`. |
| A real motion system | Only CSS transitions + `tw-animate-css` fades keyed to duration tokens. No orchestration, no reusable motion primitives. |
| Reshape typography | **Type is untokenized** — components use raw Tailwind `text-sm`/`text-xs`. |
| Dense vs airy UI | No density knob; control heights are hardcoded (`h-9`). |
| "Each project looks different" | `tokens.css` is a single baked theme with a narrow set of knobs. |

The owner also admires shadcn/ui's **rules-driven** approach — flat rulebooks of named
rules with `Incorrect`/`Correct` pairs that a developer or AI follows mechanically
(`styling.md`, `composition.md`, `forms.md`, `icons.md`), and a **living design-system
page** that proves the tokens cover everything.

react-bedrock already *enforces* a subset of those rules at build time (the token guard
test, ESLint), which is **stronger** than shadcn's docs. The opportunity is to (a) make
the system genuinely flexible, and (b) present and enforce the rules the way shadcn
documents them.

---

## 2. Goals & non-goals

### Goals

1. A **"baked per project"** model: a new project's visual identity is set by editing a
   small, documented set of places; every component reads from them.
2. Expand the **token foundations**: border width, motion (easing + distance), a type
   scale, a density knob, focus-ring + elevation knobs, and extended colour roles
   (`chart-*`, `sidebar-*`).
3. Add **per-component variant axes**: `shape`, `tone`, Card `elevation`, and `size` on
   inputs — alongside the existing `variant`/`size`.
4. A **swap-in-one-file icon system** that honours shadcn's "component objects, not string
   keys" rule.
5. A **token-driven motion layer** with CSS utilities plus an optional, reduced-motion-safe
   GSAP hook.
6. A **multi-file rulebook** adapted to react-bedrock's own components, **enforced where
   mechanically checkable**.
7. A **living Design System showcase** in Storybook.
8. Delivered in **independent phases**, each green on `lint`/`typecheck`/`test`, each a
   `CHANGELOG` entry, so downstream projects pull updates in digestible steps.

### Non-goals

- **No runtime theme/preset switching** beyond the existing light/dark. Identity is baked
  at clone time.
- **No new component library.** We are *not* porting shadcn's newer primitives (`Field`,
  `FieldGroup`, `InputGroup`, `ToggleGroup`, `Alert`, `Empty`, `Drawer`, …). The rulebook
  targets the components we already own. (Revisit as a separate effort if wanted.)
- **No visual redesign** of the default theme. The defaults stay close to today's look;
  this is about flexibility and rules, not a new skin.
- **No breaking change to the public import surface** beyond the icon migration (which is
  mechanical and documented).

---

## 3. Decisions locked (with rationale)

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | **Baked per project**, one central style config; no runtime presets. | Matches the clone-and-customize template model; least complexity. |
| D2 | **Motion = token CSS + optional GSAP.** | Token layer is the reusable win; GSAP stays optional and reduced-motion-guarded for the rare orchestration case. |
| D3 | **Icons = barrel of component objects + typed `<Icon icon={…}>` wrapper**; migrate all ~45 usages. | Honours shadcn's `icons.md` ("component objects, not string keys") *and* gives a one-file set swap + SVG/image support. |
| D4 | **Geometry = global knobs + per-component shape variants.** | Covers both "all borders thicker" (global) and "make these buttons pills" (per-instance). |
| D5 | **Token foundations expanded**: type scale, density, focus + elevation, extended colours. | These are as identity-defining as colour/radius; required for "looks different each time". |
| D6 | **Variant axes added**: `tone` (solid·soft·outline), Card `elevation`, `size` on inputs. | Emphasis and density are core customization axes. |
| D7 | **Phased delivery; enforce rules like the rest** (guard test / ESLint where checkable). | Low downstream risk; matches react-bedrock's enforced-rules ethos. |
| D8 | **Docs = multi-file rulebook + `customization.md` + Storybook showcase.** | The rules-driven experience the owner wants, plus the living proof page. |
| D9 | **Showcase lives in Storybook**, not an in-app route. | Uses existing tooling; keeps it out of every downstream app's shipped bundle. |

---

## 4. Architecture — the "baked per project" edit points

A new project's identity is set by editing this short, documented list (surfaced in
`docs/customization.md`):

1. **`src/styles/tokens.css`** — colours, radius scale, **border width**, **motion**,
   **type scale**, **density**, **focus/elevation**, **extended colours**. The single CSS
   source of truth; `globals.css` only maps tokens → utilities via `@theme inline` /
   `@utility`.
2. **`src/components/ui/icons.ts`** — the icon barrel (which set / assets back each name).
3. **Component `defaultVariants`** — the project's default `shape`/`tone`/`size`/`elevation`
   where a global default isn't enough.

Everything else (the rulebook, the showcase, the lint rules) exists to keep components
reading from these and to make the knobs discoverable.

---

## 5. Phase-by-phase design

Each phase is independently shippable and ends with: `pnpm lint && pnpm typecheck &&
pnpm test` green, stories updated, a `CHANGELOG.md` entry with migration notes, and the
relevant `docs/` file updated. `pnpm build` is re-run in the phase that adds GSAP.

### Phase 1 — Token foundations *(additive; lowest risk)*

New tokens in `tokens.css`, mapped to utilities in `globals.css`. **No component markup
changes in this phase** — it only makes the knobs exist and the utilities available.

- **Border width** — `--border-width` (default `1px`), `--border-width-strong`.
  - ⚠️ **Spike (must resolve before the plan):** the exact Tailwind v4 mechanism to make
    the default `border` utility read a token. Candidates, in preference order: (a) set
    Tailwind's default border-width theme variable in `@theme` if one exists in v4.3.3;
    (b) a `@utility border` / base-layer rule that applies `border-width: var(--border-width)`
    to the `border` utility; (c) a documented `border-DEFAULT`-style utility. The chosen
    mechanism must keep `border-0`, `border-2`, etc. working and must not add borders to
    unbordered elements. **This is the only genuine unknown in the design; the plan step
    begins by confirming it in a scratch build.**
- **Motion** — easing tokens `--ease-standard`, `--ease-emphasized`, `--ease-entrance`,
  `--ease-exit`; distance tokens (e.g. `--move-sm/md/lg`). Exposed as `ease-*` utilities.
  Durations stay as-is. Must remain `prefers-reduced-motion`-safe (globals.css:91 already
  zeroes transitions/animations under reduced motion).
- **Type scale** — tokens for display/title/body/label/caption, each with size +
  line-height (+ weight/tracking where it differs), exposed as `text-*` utilities through
  `@theme`. Default values chosen to match today's rendered sizes so nothing visually
  shifts. (Components adopt them in Phase 2 / incrementally; Phase 1 only defines them.)
- **Density** — a single baked knob. Mechanism: control-height/padding tokens
  (`--control-h-sm/md/lg`, `--control-px-*`) derived from a `--density` scale factor, so
  editing one value tightens or loosens all controls. Defaults reproduce today's `h-9`.
- **Focus & elevation** — `--ring-width` (default `3px`, matching `ring-3`) and
  `--ring-offset`; a shadow-intensity knob feeding the existing `--shadow-*` tokens.
- **Extended colours** — `--chart-1..5` (+ foregrounds as needed) and `--sidebar`,
  `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`,
  `--sidebar-ring` — defined in `:root`, `.dark`, **and** the `prefers-color-scheme`
  fallback block (the existing `tokens.test.ts` requires the fallback to match `.dark`).
  Mapped to `@theme inline` colour utilities.
- **Guard/docs:** extend `design-tokens.guard.test.ts` only where a new raw-value class of
  mistake becomes possible (e.g. raw `border-[Npx]` is already caught by the arbitrary-px
  rule). Update `docs/design-system.md` token tables.

**Acceptance:** all new tokens exist in the three colour blocks where colour-valued; new
utilities compile; `tokens.test.ts` passes; the showcase (Phase 6) can render every token.
No visual diff on existing screens (verify in Storybook).

### Phase 2 — Component variants

Introduce `cva` where missing and add axes consuming Phase-1 tokens. Stories updated to
render every axis (the showcase in Phase 6 reads these).

- **`shape`** on `Button`, `Input`, `Badge`: `default | rounded | pill | square` →
  radius-scale utilities (`rounded-none` / scale / `rounded-full`). Default = `default`
  (current look). `Button` already has `cva`; **`Input` and `Card` need a `cva` added**
  (both are plain functions today — `input.tsx:5-19`, `card.tsx:5-16`).
- **`tone`** on `Button` and `Badge`: `solid | soft | outline`. `solid` = today's filled
  look; `soft` = tinted background (`bg-primary/10 text-primary` family); `outline` =
  bordered. Implemented as a `cva` axis composed with `variant` (intent colour). Keep the
  existing `variant` names working (back-compat).
- **Card `elevation`**: `flat | outline | raised` (`shadow-none` / border-only /
  `shadow-md`). Default reproduces today's `border + shadow-sm`.
- **`size` on inputs**: `sm | md | lg` on `Input` (and `Select` trigger) using the Phase-1
  density/control-height tokens, mirroring `Button`'s size axis. Default `md` = today's
  `h-9`.
- **Back-compat:** every new axis defaults to the current appearance, so existing usages
  render unchanged. New axes are additive props.

**Acceptance:** each axis is type-safe and autocompletes; stories show the matrix; no visual
diff at default values; token guard + a11y stories pass.

### Phase 3 — Icon system *(the one mechanical-migration phase)*

- **`src/components/ui/icons.ts`** — a barrel that re-exports the project's chosen set as
  **named icon components**, e.g. `export { Trash2 as Trash, Pencil as Edit } from
  'lucide-react'`. Swapping the whole set = editing this one file's imports. Custom inline
  SVGs and image-asset icons are added here as plain components, so they're first-class
  entries in the same map.
- **`src/components/ui/icon.tsx`** — an optional `<Icon icon={Icons.Trash} size="…" />`
  wrapper that takes a **component object** (never a string key), applying uniform size
  (`size-*` tokens, default `size-4`) and a11y defaults (`aria-hidden` when decorative,
  labelled when standalone). Components that already auto-size SVGs (Button's
  `[&_svg]:size-4`) may drop icons in directly; the wrapper is for standalone icons.
- **Migration:** convert the ~45 files importing from `lucide-react` to import named
  components from the barrel (and use `<Icon>` for standalone cases). Mechanical, large
  diff (example: `delete-item-button.tsx:1,82,98`).
- **Enforcement:** ESLint `no-restricted-imports` bans importing `lucide-react` anywhere
  **except `icons.ts`**. Add a short note so the shadcn CLI flow (`scripts/ui-add.mjs`),
  which emits direct lucide imports, routes new components through the barrel.
- **Story:** an `Icons` catalogue story.

**Acceptance:** `lucide-react` appears in exactly one source file; the ESLint rule fails on a
planted violation; all icons render in Storybook; `pnpm lint/typecheck/test` green.

### Phase 4 — Motion layer

- **CSS utilities** built on Phase-1 motion tokens, for the common cases: press/hover/focus
  micro-interactions, `stagger`, enter/exit presets (layered on `tw-animate-css`), plus
  **`shimmer`** and **`scroll-fade`** (from shadcn's `styling.md`). All duration/easing via
  tokens; all reduced-motion-safe.
- **Optional GSAP** — add `gsap` as a dependency and a `useGsap` hook that:
  - is SSR-safe and runs only in effect,
  - auto-cleans via `gsap.context(...)` on unmount,
  - is **reduced-motion-guarded** via `gsap.matchMedia()` keyed to
    `(prefers-reduced-motion: reduce)`, so it no-ops when motion is reduced,
  - is tree-shakeable — not imported anywhere by default, so projects that don't animate
    pay ~nothing in bundle size.
  - One documented example + a Storybook demo.
- `pnpm build` re-run here (new dependency); check the bundle via `pnpm analyze` to confirm
  GSAP is not in the default chunk.

**Acceptance:** utilities work and respect reduced motion; `useGsap` cleans up (test or
story); GSAP absent from the baseline bundle when unused; gates green.

### Phase 5 — Rulebook + enforcement

- **`docs/rules/` ** (multi-file, shadcn-style, each rule = `Incorrect`/`Correct`):
  - `styling.md` — semantic colours, no raw palette/hex, `cn()` for conditional classes, no
    manual z-index on overlays, built-in variants first, `size-*` over `w/h`, `gap` over
    `space-*`, **shape via the `shape` variant not className**, **borders via the token**,
    **motion via utilities/`useGsap`, not ad-hoc `@keyframes`**.
  - `composition.md` — adapted to **our** components: use `Separator`/`Skeleton`/`Badge`
    not custom markup; `Button` has no `isLoading` (compose `Spinner`, as
    `delete-item-button.tsx` already does); overlay-choice table limited to what we have
    (`Dialog`/`AlertDialog`/`Sheet`/`Popover`/`Tooltip`/`DropdownMenu`); Dialog/Sheet
    require a title; Card anatomy; empty/error/loading via `EmptyState`/`ErrorState`/
    `QueryState` (our components, not shadcn's `Empty`/`Alert`).
  - `forms.md` — adapted to the **classic RHF `Form`** we ship (`FormField`/`FormItem`/
    `FormControl`/`FormMessage`), control-choice guidance limited to our controls,
    validation/disabled patterns.
  - `icons.md` — import from the barrel; pass **component objects not strings**; no sizing
    classes inside components that auto-size; use `<Icon>` for standalone icons.
- **Enforcement:** each mechanically checkable rule gets a guard-test regex (extend
  `design-tokens.guard.test.ts` or a sibling) or an ESLint rule, **each with its own test**.
  Rules that can't be auto-checked are marked "convention (not enforced)".
- **`docs/customization.md`** — the one-page "make it yours" checklist: every edit-once knob
  (tokens, icon barrel, default variants), with before/after examples. Linked from
  `CLAUDE.md` and `README.md`.

**Acceptance:** each enforced rule has a passing test and fails on a planted violation; the
rulebook files render; `CLAUDE.md`/`README` link them.

### Phase 6 — Design System showcase (Storybook)

A living showcase (a `Docs`/MDX page + supporting stories) following shadcn's
`design-system-page.md`:

- **Foundations** — colour roles as surface+foreground pairs with live contrast; palette
  (incl. `chart-*`, `sidebar-*`); type specimen (every type token in real copy); spacing &
  density ladder; radius ladder; elevation ladder; motion table; icon row.
- **Components by tier** — primitives with a variant × state matrix (default/hover/focus/
  active/disabled, + loading/invalid where relevant), size ladder, icon row; composed and
  overlay components with typical examples + edge cases (long text, empty, error, loading).
- **Do/Don't** — the rulebook's most-breakable rules rendered as pairs.
- **Recipes + one example screen** built only from tokens and components — the acceptance
  test that the token mapping is complete.
- Helpers (`StateMatrix`, `previewState`, `ColorPair`) adapted to our `cn` alias
  (`@/lib/cn`) and Storybook's theme/locale toolbar.

**Acceptance:** showcase builds (`pnpm storybook:build`); every primitive renders with its
matrix; no pair below 4.5:1 goes unnoted; no lorem ipsum; the example screen uses only
tokens/components.

---

## 6. Cross-cutting concerns

- **Downstream / template.** Each phase is a `CHANGELOG.md` entry with migration notes. The
  **icon migration (Phase 3)** and **new lint/guard rules (Phases 3 & 5)** are the only
  changes that can require downstream edits; both are documented with a before/after. All
  other phases are additive. `docs/starting-a-new-project.md` gains a "customize your design"
  step pointing at `docs/customization.md`.
- **Testing gates (every phase).** `pnpm lint && pnpm typecheck && pnpm test`; `pnpm build`
  in Phase 4; stories updated; `pnpm test:e2e` (axe) re-run in any phase that changes a key
  page's markup (expected: none, since defaults are preserved — verify).
- **Accessibility.** New focus-ring tokens must keep `--ring` at ≥3:1; `tone="soft"` and
  `outline` variants must keep text at ≥4.5:1; reduced-motion must disable all motion
  (CSS and GSAP). The showcase surfaces contrast failures.
- **Back-compat.** Every new variant axis defaults to the current appearance; no existing
  screen changes visually at default values.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Tailwind v4 border-width hook unclear | Dedicated spike at the start of Phase 1's plan step, in a scratch build, before any token lands. |
| GSAP inflates the bundle | Keep it optional/tree-shakeable; verify with `pnpm analyze` in Phase 4; it is never imported by default. |
| Icon migration is a large diff | It's mechanical; land it as its own phase/PR; ESLint rule guarantees completeness. |
| Type-scale/density defaults shift the look | Defaults are chosen to reproduce today's rendered values; verify "no visual diff" in Storybook per phase. |
| Rulebook drifts from code | Enforce the checkable rules with tests; the showcase renders Do/Don't from the same rules. |

## 8. Open items (to settle during planning, not blocking approval)

- Exact Tailwind v4 border-width mechanism (the Phase 1 spike).
- Final type-scale steps and default values (match current rendering).
- Density knob mechanism (scale factor vs explicit per-size tokens) — decide in Phase 1.
- Whether `tone` applies to every intent colour or a curated subset (decide in Phase 2).

## 9. Phase summary

1. **Token foundations** — border, motion, type scale, density, focus/elevation, extended colours.
2. **Component variants** — `shape`, `tone`, Card `elevation`, input `size`.
3. **Icon system** — barrel + typed `<Icon>`, migrate ~45 files, lint ban.
4. **Motion layer** — CSS utilities + optional `useGsap` (reduced-motion-safe).
5. **Rulebook + enforcement** — `docs/rules/*` + `customization.md`, enforced where checkable.
6. **Design System showcase** — living Storybook page.
