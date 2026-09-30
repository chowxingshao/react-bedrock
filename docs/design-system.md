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
