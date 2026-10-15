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

## [0.1.0] - 2026-10-13

First version: the full template described in README.md. React 19, TypeScript 6 and Vite 8; design tokens and shadcn/ui components; TanStack Query with one Axios client, Zod and Orval; cookie-session auth with permissions; English and Spanish translations; MSW mocks; Vitest, Playwright and axe tests; code generators; Docker with nginx and runtime configuration; GitHub Actions (the image publish step can be switched off with the repository variable `DOCKER_PUBLISH=false`) and Dependabot.
