# Make this template yours

Three files carry the look of the whole app. Edit them once, when you start a project; no component needs to change. Everything else (spacing, layout, copy) follows from them.

| What you change         | Where                                    | Scope                   |
| ----------------------- | ---------------------------------------- | ----------------------- |
| Colours, shape, motion… | `src/styles/tokens.css`                  | Every component         |
| The icon set            | `src/components/ui/icons.ts`             | Every icon              |
| Per-component defaults  | `defaultVariants` in `src/components/ui` | One component, app-wide |

Work top to bottom: reach for a token first, then the icon barrel, then a default variant only when no global knob does the job.

## 1. Tokens: `src/styles/tokens.css`

This file is the single source of truth for the look. Edit the values; never add a hex colour or a pixel value to a component (see [styling rules](rules/styling.md)). The full token tables live in [docs/design-system.md](design-system.md); these are the knobs most projects turn.

| Knob       | Tokens                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour     | `--primary`, `--background`, `--foreground`, `--destructive`, `--border`, `--ring`, … (OKLCH)                                                                                                                       |
| Shape      | `--radius` (every `rounded-*` derives from it)                                                                                                                                                                      |
| Lines      | `--border-width`, `--border-width-strong`                                                                                                                                                                           |
| Density    | `--density`, `--control-h-sm`, `--control-h-md`, `--control-h-lg`                                                                                                                                                   |
| Focus ring | `--ring-width`, `--ring-offset`                                                                                                                                                                                     |
| Elevation  | `--shadow-color`, `--shadow-xs` … `--shadow-lg`                                                                                                                                                                     |
| Motion     | `--duration-fast`/`-normal`/`-slow`, `--ease-standard`/`-emphasized`/`-entrance`/`-exit`, `--move-sm`/`-md`/`-lg` — under `prefers-reduced-motion`, the duration and move tokens drop to zero, so all motion stops. |
| Type scale | `--text-display`, `--text-title`, `--text-heading`, `--text-body`, `--text-label`, `--text-caption`                                                                                                                 |
| Extended   | `--chart-1` … `--chart-5`, `--sidebar`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, …                                                                                                              |

**Colour tokens live in three blocks.** Edit a colour in `:root` (light), in `.dark`, and in the `@media (prefers-color-scheme: dark)` fallback, and keep the fallback identical to `.dark` (`src/styles/tokens.test.ts` checks this). Non-colour knobs (radius, border width, density, motion) live once, in `:root` or `@theme`.

Before and after, rebranding to a blue primary with rounder corners and a denser layout:

```css
/* before */
:root {
  --radius: 0.625rem;
  --density: 1;
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
}

/* after */
:root {
  --radius: 1rem; /* rounded-lg is now 1rem, rounded-md 0.8rem, … */
  --density: 0.9; /* every control is 10% shorter */
  --primary: oklch(0.55 0.2 260);
  --primary-foreground: oklch(0.985 0 0); /* keep AA contrast (4.5:1) on --primary */
}
/* …and repeat the --primary change in .dark and the prefers-color-scheme block. */
```

## 2. Icon set: `src/components/ui/icons.ts`

`icons.ts` is the one file that imports `lucide-react` (ESLint enforces it). Every other file imports a semantic name such as `Add`, `Delete` or `Warning` from the barrel, so swapping the set is a one-file change. See [icons rules](rules/icons.md).

To swap an icon, change the right-hand side of one alias:

```ts
// before
PlusIcon as Add,
Trash2Icon as Delete,

// after: the same semantic names, a different glyph
CirclePlusIcon as Add,
TrashIcon as Delete,
```

To move to another library, replace the import source and keep the exported names, so no caller changes. To add a custom SVG or image-backed icon, write it as a plain component in this file and export it under a semantic name; it then works with `<Icon>` and the auto-sizing rules like any other entry.

## 3. Default variants: component `defaultVariants`

Primitives expose `shape`, `tone`, `size` and `elevation` variants. When the project wants a different default everywhere (for example, pill buttons), set it once in the component's `cva` block rather than passing a prop at every call site. See [styling rules](rules/styling.md).

| Component | File                           | Variants with a default                                       |
| --------- | ------------------------------ | ------------------------------------------------------------- |
| Button    | `src/components/ui/button.tsx` | `variant`, `size`, `shape`, `tone`                            |
| Badge     | `src/components/ui/badge.tsx`  | `variant`, `shape`, `tone`                                    |
| Input     | `src/components/ui/input.tsx`  | `size`, `shape`                                               |
| Card      | `src/components/ui/card.tsx`   | `elevation`                                                   |
| Select    | `src/components/ui/select.tsx` | `size` (a prop default on `SelectTrigger`, not a `cva` block) |

Before and after, pill buttons that are lightly tinted by default:

```ts
// button.tsx: before
defaultVariants: { variant: 'default', size: 'md', shape: 'default', tone: 'solid' },

// after
defaultVariants: { variant: 'default', size: 'md', shape: 'pill', tone: 'soft' },
```

`Button` and `Badge` also repeat their defaults in the function signature (`shape = 'default'`, `tone = 'solid'`), so change both places and keep them equal. Callers can still override with `<Button shape="square">{t('actions.confirm')}</Button>`.

## Rulebook

Once the look is set, the rulebook shows how to build with it. Each page pairs an Incorrect and a Correct example and names the check that enforces the rule.

- [Styling](rules/styling.md): tokens, borders, z-index, motion, `cn()`, variants before classNames.
- [Icons](rules/icons.md): the barrel, component objects, auto-sizing, `<Icon>`.
- [Composition](rules/composition.md): primitives, overlays, card anatomy, async states.
- [Forms](rules/forms.md): `Form` parts, control choice, Zod, pending state, translated text.
