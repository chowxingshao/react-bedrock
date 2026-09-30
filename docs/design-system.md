# Design system

## Tokens: change the look in one file

All colours, radii, fonts, shadows, z-index layers and animation durations are defined **once** in `src/styles/tokens.css`. Tailwind utilities read them through `@theme inline` in `src/styles/globals.css`, so changing a token restyles every button, input, card and badge.

| Group     | Tokens                                                                                                                                                                                                                                  | Utilities                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Colours   | `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--info` (each with a `-foreground`), `--border`, `--input`, `--ring`, `--overlay` | `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`, `bg-overlay`, … |
| Shape     | `--radius`                                                                                                                                                                                                                              | `rounded-xs` … `rounded-2xl`, all derived from `--radius`                              |
| Type      | `--font-sans`, `--font-mono`                                                                                                                                                                                                            | `font-sans`, `font-mono`                                                               |
| Elevation | `--shadow-xs` … `--shadow-lg`                                                                                                                                                                                                           | `shadow-xs` … `shadow-lg`                                                              |
| Layers    | `--z-sticky`, `--z-dropdown`, `--z-modal`, `--z-toast`                                                                                                                                                                                  | `z-sticky`, `z-dropdown`, `z-modal`, `z-toast`                                         |
| Motion    | `--duration-fast`, `--duration-normal`, `--duration-slow` (0 ms under reduced motion)                                                                                                                                                   | `duration-fast`, `duration-normal`, `duration-slow`                                    |

Colours use **OKLCH** (`oklch(lightness chroma hue)`), so shades with the same lightness look equally bright.

### How to rebrand

1. Edit `src/styles/tokens.css` only. Change `--primary` / `--primary-foreground` in the light (`:root`) and dark (`.dark`) blocks, and copy the dark values into the `prefers-color-scheme` fallback block (a test checks they match).
2. Change `--radius` to make everything rounder or sharper.
3. For a brand font: self-host the font files in `public/fonts/`, add an `@font-face` rule to `tokens.css`, and put the family first in `--font-sans`. The template makes no external font requests by default.
4. Check contrast: text on each `*-foreground` pair needs 4.5:1, and `--ring` needs 3:1 against the background.

## Rules (enforced)

`src/test/design-tokens.guard.test.ts` fails `pnpm test` when source files contain:

- hex colours
- Tailwind palette colours (`bg-white`, `text-red-500`)
- arbitrary pixel values (`w-[13px]`)
- raw z-index numbers (`z-50`)

Use the token utilities above. For a justified one-off, add the comment `design-tokens-guard-ignore` on that line and explain why.

## Dark mode

- Class-based: `<html class="dark">` or `<html class="light">`.
- The `dark:` variant is available. An inline script in `index.html` applies the saved theme **before first paint**, so there is no flash.
- The theme store (`src/stores/theme-store.ts`) keeps it in sync afterwards.

### Theme switching

- `ThemeToggle` (`src/components/ui/theme-toggle.tsx`) offers Light, Dark and System. The choice is stored under the `theme` storage key, e.g. `react-bedrock:theme`.
- Read or change the theme anywhere through the selector hooks:

  ```ts
  const mode = useThemeMode(); // 'light' | 'dark' | 'system'
  const setMode = useSetThemeMode();
  ```

- **No flash:** `<script id="theme-bootstrap">` in `index.html` reads the saved preference and sets the class on `<html>` before first paint. It duplicates a little logic: the storage prefix, the stored format and the default app name. `src/stores/theme-bootstrap.test.ts` runs the real script against the real store, so any drift fails the test suite.

## UI primitives (`src/components/ui/`)

These are shadcn/ui components (Radix primitives, `new-york` style) that **we own**: edit them freely. Each one uses `cva` for variants and `cn()` (`src/lib/cn.ts`, clsx + tailwind-merge) to merge classes.

Included: Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Switch, Card, Badge, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Tabs, Table, Avatar, Separator, Skeleton, Spinner, Pagination, Breadcrumb and Form (React Hook Form). DataTable and DatePicker are composites built on top of these.

### Adding another shadcn component

```bash
pnpm ui:add accordion            # or several at once; add --overwrite to re-fetch
pnpm lint:fix && pnpm test       # repairs import order, then reports what is still left to fix
```

`scripts/ui-add.mjs` makes these fixes automatically:

| shadcn output                            | Rewritten to                                              |
| ---------------------------------------- | --------------------------------------------------------- |
| `import { cn } from "cn"`                | `@/lib/cn` (the `cn` package is removed)                  |
| `import … from "@/components/ui/button"` | `./button` (relative imports inside a folder)             |
| `ring-[3px]`                             | `ring-3`                                                  |
| `ring-ring/50`                           | `ring-ring` (full-strength focus rings, for 3:1 contrast) |
| `bg-black/50`                            | `bg-overlay`                                              |
| `text-white` on the destructive colour   | `text-destructive-foreground`                             |
| `z-50`                                   | `z-modal` (dialog/sheet) or `z-dropdown`                  |
| `rounded-[4px]`, `rounded-[2px]`         | `rounded-sm`, `rounded-xs`                                |

Things that are fixed by hand:

- **English strings** (sr-only labels, `aria-label`): use `t('…')` from `react-i18next`, and add the keys to every locale.
- **Button sizes**: shadcn's `size="default"` is `size="md"` here (`sm | md | lg | icon`).
- **Pixel offsets**: use the spacing scale (`translate-y-0.5`, `p-0.75`) or `--spacing(n)` inside `calc()` (`h-[calc(100%_-_--spacing(0.25))]`), never `[2px]`.
- **Raw layers**: another `z-10` becomes a layer from `tokens.css` (`z-sticky`, `z-dropdown`, `z-modal`, `z-toast`).
- **Anything else the token guard or ESLint reports.**

The shadcn CLI does not install `lucide-react` (only its `init` command does), so it is a regular dependency of this template.

### Adding or changing a variant

Variants live in the component's `cva()` call, for example `buttonVariants` in `button.tsx`. Add an entry built only from token utilities, such as `success: 'bg-success text-success-foreground hover:bg-success/90'`. Every usage of the component can then pick it, and TypeScript autocompletes the new name. Add the variant to the component's story too.

Button sizes are `sm | md | lg | icon` (default `md`). Button variants are `default | secondary | outline | ghost | destructive | link`. Badge adds `success | warning | info`.

## Storybook: the visual catalogue

- `pnpm storybook` runs it at http://localhost:6006; `pnpm storybook:build` writes a static site to `storybook-static/`.
- Every primitive has a story in `src/components/ui/<name>.stories.tsx` that shows all its variants. Add or update the story whenever you add a component or variant.
- The toolbar switches **Theme** (light/dark) and **Locale** (en/es). The **Accessibility** panel runs axe on the current story.
- Stories are CSF3 (`satisfies Meta<typeof Component>`), titled `UI/<Name>`. Demo copy in stories may be plain English, because stories are not shipped to users.
