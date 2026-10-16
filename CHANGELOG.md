# Changelog

What changed in the template, newest first. If you started a project from it and kept the link (docs/starting-a-new-project.md, steps 1 and 11), read the entries between your version and the latest before you pull an update.

- Versions are git tags (`v0.1.0`) following [Semantic Versioning](https://semver.org). The `version` in `package.json` belongs to the app you build and is not bumped for the template.
- **Action needed** marks a change you must act on after the merge: a command to run, a variable to set, a file to adjust.
- Sections: Added, Changed, Fixed, Removed.
- Leave this file as it is in your project: it is the template's record, and editing it makes every update conflict.

## [Unreleased]

### Added

- Design tokens for border width (`--border-width`), motion (easing + distance), a
  semantic type scale (`text-display` … `text-caption`), a density knob
  (`--density`, `--control-h-*`), focus-ring width/offset, a `--shadow-color`
  elevation knob, and `chart-*` / `sidebar-*` colour roles. All default to the
  current appearance; components adopt them in later phases. See
  `docs/design-system.md`.
- Design System v2, Phase 2: component variant axes. Every axis defaults to the
  current appearance, so existing usages render unchanged. See "Variant axes" in
  `docs/design-system.md`.
  - **Button / Badge:** new `shape` (`default` | `rounded` | `pill` | `square`)
    and `tone` (`solid` | `soft` | `outline`) props. `tone` is defined for the
    `default` (primary) and `destructive` intents; on other variants it is a
    no-op.
  - **Input:** now `cva`-based with `shape` (same scale) and `size`
    (`sm` | `md` | `lg`) props; `size` consumes the `--control-h-*` density
    tokens (`md` is today's height).
  - **Card:** new `elevation` prop (`default` | `flat` | `outline` | `raised`);
    `default` is today's border plus `shadow-sm`.
- Design System v2, Phase 3: a swap-in-one-file icon system. All icons are
  re-exported under semantic names from `src/components/ui/icons.ts` (the one
  file allowed to import `lucide-react`); swapping the set means editing that
  file. A new optional `<Icon icon={…} size label>` wrapper
  (`src/components/ui/icon.tsx`) gives standalone icons a uniform size scale and
  a11y defaults, with a set-agnostic `IconComponent` type. See "Icons" in
  `docs/design-system.md` and the `UI/Icons` Storybook catalogue.
- Design System v2, Phase 4: a token-driven motion layer. New CSS utilities —
  `interactive`, `press`, `hover-lift`, `enter`/`exit`, `stagger`, `shimmer`, and
  `scroll-fade` — all built on the Phase-1 motion tokens and reduced-motion-safe
  (`--move-*` now collapses under `prefers-reduced-motion`; `scroll-fade` is a
  progressive enhancement). An optional, reduced-motion-guarded `useGsap` hook
  (`@/hooks/use-gsap`) for orchestration, backed by `gsap` + `@gsap/react`; it is
  tree-shaken out of the bundle unless a project uses it. `gsap` and
  `@gsap/react` are new dependencies, but no action is needed because nothing
  uses them by default. See "Motion" in `docs/design-system.md` and
  `docs/hooks.md`.
- Design System v2, Phase 5: the rulebook. New pages
  `docs/rules/{styling,composition,forms,icons}.md` and `docs/customization.md`
  (a checklist for giving a project its own look), linked from `CLAUDE.md`,
  `README.md`, `docs/design-system.md` and the new-project guide (step 3). A
  guard test (`src/test/docs-rulebook.guard.test.ts`) checks that the pages
  exist and are linked. This part is docs only: no action is needed.
- Design System v2, Phase 6: a Storybook design-system showcase. MDX pages
  (`src/stories/*.mdx`) and supporting stories in the `Design System/*` and
  `Foundations/Tokens` sections: Foundations (colour roles with live WCAG
  contrast, chart and sidebar palettes, type, spacing and density, radius,
  elevation, motion, icons), Components by tier (variant × state matrices,
  composed, overlay and async-state examples), Do/Don't pairs for the
  most-breakable rules, recipes and an example screen built only from tokens and
  components. New showcase helpers in `src/components/showcase/` (`ColorPair`,
  `StateMatrix`, `previewState`) and a dependency-free WCAG contrast utility.
  Also folds in the deferred rulebook and guard-test polish from Phases 2-5
  (border wording, multi-root Correct snippets, the `@keyframes` test reading
  from `RULES`, a reduced-motion note in the customization Motion section, a
  shorter aria-label). Purely additive: no action is needed, and there are no
  new dependencies. The one config change is that the `stories` glob in
  `.storybook/main.ts` now includes `.mdx`. See "Design System showcase
  (Storybook)" in `docs/design-system.md`.

### Changed

- `SelectTrigger`'s `size` scale is now `sm` | `md` | `lg` (default `md`),
  consuming the density tokens. **Action needed:** replace
  `SelectTrigger size="default"` with `size="md"` (identical height); `size="sm"`
  is unchanged.
- `Input` no longer accepts the native HTML `size` attribute (a character
  count); its `size` prop is now the sm/md/lg variant. **Action needed:** where
  you used the native attribute, use a width class instead.
- `lucide-react` may now be imported only in `src/components/ui/icons.ts`; an
  ESLint rule and a guard test enforce it. The feature generator
  (`pnpm gen feature`) and `pnpm ui:add` now expect new icons to go through the
  barrel.
  **Action needed:** move any direct `lucide-react` imports to
  `src/components/ui/icons.ts` (add a semantic alias) and import the alias from
  `@/components/ui/icons`; the lint error names the exact fix. Icon glyphs are
  unchanged, so nothing renders differently.
- `gsap`, `@gsap/react` and `gsap/<subpath>` may now be imported only in
  `src/hooks/use-gsap.ts` (and its story and test); an ESLint rule and
  `src/hooks/use-gsap.guard.test.ts` enforce it, which keeps GSAP out of the
  default bundle. **Action needed:** if you import GSAP elsewhere, route the
  animation through the `useGsap` hook (`@/hooks/use-gsap`); the lint error
  names the fix.
- An ad-hoc `@keyframes` in a `.ts` or `.tsx` file is now flagged by the
  design-token guard (`src/test/design-tokens.guard.test.ts`). **Action
  needed:** move any such keyframes to `src/styles/globals.css` and use them
  through the motion utilities.

## [0.1.0] - 2026-10-13

First version: the full template described in README.md. React 19, TypeScript 6 and Vite 8; design tokens and shadcn/ui components; TanStack Query with one Axios client, Zod and Orval; cookie-session auth with permissions; English and Spanish translations; MSW mocks; Vitest, Playwright and axe tests; code generators; Docker with nginx and runtime configuration; GitHub Actions (the image publish step can be switched off with the repository variable `DOCKER_PUBLISH=false`) and Dependabot.
