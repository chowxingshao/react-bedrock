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

## [0.1.0] - 2026-10-13

First version: the full template described in README.md. React 19, TypeScript 6 and Vite 8; design tokens and shadcn/ui components; TanStack Query with one Axios client, Zod and Orval; cookie-session auth with permissions; English and Spanish translations; MSW mocks; Vitest, Playwright and axe tests; code generators; Docker with nginx and runtime configuration; GitHub Actions (the image publish step can be switched off with the repository variable `DOCKER_PUBLISH=false`) and Dependabot.
