# Design system

## Tokens: change the look in one file

All colours, radii, fonts, shadows, z-index layers and animation durations are defined **once** in `src/styles/tokens.css`. Tailwind utilities read them through `@theme inline` in `src/styles/globals.css`, so changing a token restyles every button, input, card and badge.

| Group     | Tokens                                                                                                                                                                                                                                                      | Utilities                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colours   | `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--info` (each with a `-foreground`), `--border`, `--input`, `--ring`, `--overlay`                     | `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`, `bg-overlay`, …                                                                     |
| Shape     | `--radius`                                                                                                                                                                                                                                                  | `rounded-xs` … `rounded-2xl`, all derived from `--radius`                                                                                                  |
| Lines     | `--border-width`, `--border-width-strong`                                                                                                                                                                                                                   | `border`, `border-x`, `divide-x` … follow `--border-width` (set through `--default-border-width` in `@theme`); `--border-width-strong` is the thicker line |
| Density   | `--density` (unitless knob, default `1`) and the control heights `--control-h-sm`, `--control-h-md`, `--control-h-lg`, each scaled by `--density`. `--control-h-md` is today's default control height (`h-9`)                                               | None yet: components adopt these in Phase 2 (Input, Select and Button size variants)                                                                       |
| Type      | `--font-sans`, `--font-mono`, and the semantic type scale `--text-display` … `--text-caption` (each with a `--…--line-height` and, for some, a `--…--font-weight`)                                                                                          | `font-sans`, `font-mono`, `text-display` … `text-caption`                                                                                                  |
| Elevation | `--shadow-xs` … `--shadow-lg`                                                                                                                                                                                                                               | `shadow-xs` … `shadow-lg`                                                                                                                                  |
| Layers    | `--z-sticky`, `--z-dropdown`, `--z-modal`, `--z-toast`                                                                                                                                                                                                      | `z-sticky`, `z-dropdown`, `z-modal`, `z-toast`                                                                                                             |
| Motion    | `--duration-fast`, `--duration-normal`, `--duration-slow` (0 ms under reduced motion), `--ease-standard`, `--ease-emphasized`, `--ease-entrance`, `--ease-exit`, `--move-sm`, `--move-md`, `--move-lg` (distances: plain custom properties, no utility yet) | `duration-fast`, `duration-normal`, `duration-slow`, `ease-standard` … `ease-exit`                                                                         |

Colours use **OKLCH** (`oklch(lightness chroma hue)`), so shades with the same lightness look equally bright.

Durations reach a component through a `duration-fast`, `duration-normal` or `duration-slow` utility (Dialog, AlertDialog and Sheet use them), or through Tailwind's default transition duration, which `src/styles/globals.css` sets to `--duration-normal`: every plain `transition`, `transition-colors` or `transition-all` utility follows that token (buttons use `transition-all`; inputs use `transition-[color,box-shadow]`, which follows the same default duration). An enter/exit animation with no duration utility, such as the Popover, DropdownMenu, Select and Tooltip fades, uses tw-animate-css's own 150 ms default, which is not a token.

### Type scale

Six semantic sizes sit in the top `@theme` block of `tokens.css`. Each one names a role rather than a size, and Tailwind generates a utility for it (`text-display`, …). A utility sets the font size, the line height and, where a weight is listed, the font weight, so one class gives the whole style.

| Token            | Size / line height | Weight  | Utility        | Intended use                                                                            |
| ---------------- | ------------------ | ------- | -------------- | --------------------------------------------------------------------------------------- |
| `--text-display` | 2.25rem / 2.5rem   | 600     | `text-display` | Hero or landing headline; the largest text on a page, rarely used                       |
| `--text-title`   | 1.5rem / 2rem      | 600     | `text-title`   | Page title (the `h1` of a `PageHeader`) and dialog titles                               |
| `--text-heading` | 1.25rem / 1.75rem  | 600     | `text-heading` | Section and card headings (the `h2` of a section)                                       |
| `--text-body`    | 0.875rem / 1.25rem | inherit | `text-body`    | Default running text, the same size as today's `text-sm`                                |
| `--text-label`   | 0.8125rem / 1rem   | 500     | `text-label`   | Form labels, table column headers and other small control text                          |
| `--text-caption` | 0.75rem / 1rem     | inherit | `text-caption` | Helper text, descriptions, timestamps and footnotes; the same size as today's `text-xs` |

`--text-body` and `--text-caption` match `text-sm` and `text-xs` exactly, so a component can move to them later without any visual change. Phase 1 only defines the tokens: no component uses them yet.

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
- raw durations (`duration-300`)

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

These are shadcn/ui components (Radix primitives, `new-york` style) that **we own**: edit them freely. Button, Badge and Tabs define their variants with `cva`; the other options (the sizes of Avatar, Switch, SelectTrigger and AlertDialogContent, DropdownMenuItem's `variant`, Sheet's `side`) are data attributes or conditional classes. All of them merge classes with `cn()` (`src/lib/cn.ts`, clsx + tailwind-merge).

Included: Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Switch, Card, Badge, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Tabs, Table, Avatar, Separator, Skeleton, Spinner, Pagination, Breadcrumb, Calendar and Form (React Hook Form). DataTable and DatePicker are composites built on top of these.

### Adding another shadcn component

```bash
pnpm ui:add accordion            # or several at once
pnpm lint:fix && pnpm test       # repairs import order, then reports what is still left to fix
```

A component may depend on one you already have (`calendar` needs `button`). The CLI then asks `The file button.tsx already exists. Would you like to overwrite?`: answer **n**, because ours carries hand fixes (see below). Without a terminal, give the answer through the pipe: `printf 'n\n' | pnpm ui:add calendar`. If nobody answers, the CLI writes nothing and still exits 0.

**Do not run `--overwrite` on a component that already exists.** It re-fetches stock shadcn output and discards this repo's hand fixes (translated labels, token utilities instead of raw values, Button's `md` size, Badge's extra variants, Tooltip providing its own `TooltipProvider`, …); the script below only redoes the mechanical fixes. These files carry hand fixes: button, badge, dialog, alert-dialog, sheet, pagination, breadcrumb, spinner, form, table, tabs, avatar, tooltip and calendar (`z-10` became `z-sticky`). The invalid-field focus ring in button, input, textarea, checkbox, select and radio-group is reapplied by the script. If you must re-fetch one, review `git diff` afterwards and restore what was lost.

`scripts/ui-add.mjs` makes these fixes automatically:

| shadcn output                             | Rewritten to                                              |
| ----------------------------------------- | --------------------------------------------------------- |
| `import { cn } from "cn"`                 | `@/lib/cn` (the `cn` package is removed)                  |
| `import … from "@/components/ui/button"`  | `./button` (relative imports inside a folder)             |
| `ring-[3px]`                              | `ring-3`                                                  |
| `ring-ring/50`                            | `ring-ring` (full-strength focus rings, for 3:1 contrast) |
| `aria-invalid:ring-destructive/20`, `/40` | `aria-invalid:focus-visible:ring-destructive`             |
| `bg-black/50`                             | `bg-overlay`                                              |
| `text-white` on the destructive colour    | `text-destructive-foreground`                             |
| `z-50`                                    | `z-modal` (dialog/sheet) or `z-dropdown`                  |
| `duration-150`, `-200`, `-300`, `-500`    | `duration-fast`, `-normal`, `-slow`, `-slow`              |
| `rounded-[4px]`, `rounded-[2px]`          | `rounded-sm`, `rounded-xs`                                |

Things that are fixed by hand:

- **English strings** (sr-only labels, `aria-label`): use `t('…')` from `react-i18next`, and add the keys to every locale.
- **Tooltip**: stock shadcn's `Tooltip` needs a `TooltipProvider` higher up and Radix throws without one. Ours wraps itself, so a lone `<Tooltip>` works anywhere; keep that if the file is ever re-fetched.
- **Button sizes**: shadcn's `size="default"` is `size="md"` here (`sm | md | lg | icon`).
- **Pixel offsets**: use the spacing scale (`translate-y-0.5`, `p-0.75`) or `--spacing(n)` inside `calc()` (`h-[calc(100%_-_--spacing(0.25))]`), never `[2px]`.
- **Raw layers**: another `z-10` becomes a layer from `tokens.css` (`z-sticky`, `z-dropdown`, `z-modal`, `z-toast`).
- **Anything else the token guard or ESLint reports.**

The shadcn CLI does not install `lucide-react` (only its `init` command does), so it is a regular dependency of this template.

### Adding or changing a variant

Variants live in the component's `cva()` call, for example `buttonVariants` in `button.tsx`. Add an entry built only from token utilities, such as `success: 'bg-success text-success-foreground hover:bg-success/90'`. Every usage of the component can then pick it, and TypeScript autocompletes the new name. Add the variant to the component's story too.

Button sizes are `sm | md | lg | icon` (default `md`). Button variants are `default | secondary | outline | ghost | destructive | link`. Badge adds `success | warning | info`.

**DatePicker** (`@/components/ui/date-picker`) composes Popover and Calendar (react-day-picker).

- It formats with `formatDate` and localises the calendar through the current UI language.
- Inside a form: wrap it in `<FormControl>` and spread the field, `<DatePicker {...field} />`. `value` and `onChange` are its own props; `ref`, `onBlur`, `name` and `disabled` flow on to the trigger Button, so React Hook Form can focus the picker when validation fails and track whether it was touched. Passing only `field.value` and `field.onChange` loses both.
- A label names the trigger, so the chosen date (or the placeholder) is exposed as its accessible description, next to any `aria-describedby` the form passes (`FormDescription`, the error message).
- The value is a `Date` at local midnight. Send it to an API with `formatISODate` (docs/i18n.md), not `toISOString()`.
- The bare `Calendar` primitive has English labels unless you pass `labels` (see DatePicker). Its `captionLayout="dropdown"` is not localised either (shadcn formats the month in the browser language, and react-day-picker's dropdown labels are English), so it has no story: translate those labels before you use it.

## Storybook: the visual catalogue

- `pnpm storybook` runs it at http://localhost:6006; `pnpm storybook:build` writes a static site to `storybook-static/`.
- Every primitive has a story in `src/components/ui/<name>.stories.tsx` that shows all its variants. Add or update the story whenever you add a component or variant.
- Every story renders inside a `MemoryRouter`, so `Link`, `NavLink` and the layout components work. A component that reads the signed-in user (`AppShell`, through `UserMenu`) needs an `AuthProvider` in its story: `app-shell.stories.tsx` supplies one with a fake strategy that is always signed in.
- The toolbar switches **Theme** (light/dark) and **Locale** (en/es). The **Accessibility** panel runs axe on the current story.
- Stories are CSF3 (`satisfies Meta<typeof Component>`), titled `UI/<Name>` (or `Feedback/<Name>` for feedback components in `src/components/feedback/`, and `Layout/<Name>` for the app shell and other layout components in `src/components/layout/`). Demo copy in stories may be plain English, because stories are not shipped to users.

## Async state components (`@/components/feedback`)

| Component                                                                         | Use it for                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Spinner`                                                                         | Inline loading (buttons, small areas)                                                                                                            |
| `PageLoader`                                                                      | Full-page (`variant="page"`) or section loading; the lazy-route fallback                                                                         |
| `Skeleton`                                                                        | A base shimmer block                                                                                                                             |
| `Delayed`                                                                         | Renders its children only after `delayMs` (default 200 ms, `SKELETON_DELAY_MS`), so a loader never flashes; `PageLoader` and `QueryState` use it |
| `TableSkeleton`, `CardSkeleton`, `ListSkeleton`, `FormSkeleton`, `DetailSkeleton` | Ready-made skeletons                                                                                                                             |
| `EmptyState`                                                                      | Icon, title, description and an optional action. The title is an h2, or the page's h1 with `headingLevel={1}`                                    |
| `ErrorState`                                                                      | Friendly message and **Try again**. Technical details show in development only. `headingLevel={1}` when it replaces the whole page               |
| `QueryState`, `AsyncBoundary`                                                     | Pick the right state automatically (docs/data-fetching.md)                                                                                       |
| `ForbiddenState`, `NotFoundState`                                                 | The 403 and 404 views (guards, detail pages whose record is missing). Both take `headingLevel`                                                   |
| `OfflineBanner`                                                                   | A banner under the header while the browser is offline, inside a `role="status"` region that is always in the page                               |

A page has exactly one h1. `PageHeader` renders it, and the state components sit under it with an h2 title. A view that **replaces the whole page** has no `PageHeader`, so it takes the h1 itself: `<ForbiddenState headingLevel={1} />` (what `RequirePermission` renders), `<ErrorState headingLevel={1} />` (the page and root error boundaries and `RouteError`) and `<NotFoundState headingLevel={1} />` (a router-level 404). `headingLevel` defaults to 2, so a caller that does not pass it keeps its markup. `PageHeader` takes a `titleRef`: it makes the h1 focusable by code (`tabIndex={-1}`, not a Tab stop) and hands it out, for a page that must move focus there (the Items list does after its last row is deleted).

`PageLoader` and `QueryState` wait 200 ms (`SKELETON_DELAY_MS`) before showing a loading indicator, so fast responses never flash a skeleton. The `DataTable` skeleton (`isLoading`) shows immediately: render the table inside `QueryState`, or wrap your own loading view in `<Delayed>` (`@/components/feedback`), to keep that behaviour.

## DataTable

`DataTable` (`@/components/ui/data-table`) wraps TanStack Table v9 with sorting, pagination, and loading and empty states. It is **server-driven**: the caller owns `sorting` and `pagination` state (usually synced to the URL) and fetches the matching page.

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginationState, SortingState } from '@tanstack/react-table';

const column = createDataTableColumnHelper<Item>();
const columns = column.columns([
  column.accessor('name', { header: () => t('items:fields.name') }),
  column.accessor('price', {
    header: () => t('items:fields.price'),
    cell: (c) => formatCurrency(c.getValue()),
  }),
]); // define outside render or wrap in useMemo

function ItemsTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const query = useQuery({
    queryKey: ['items', sorting, pagination],
    queryFn: () => fetchItems({ sorting, pagination }),
    placeholderData: keepPreviousData,
  });

  return (
    <QueryState query={query} isEmpty={(data) => data.items.length === 0}>
      {(data) => (
        <DataTable
          columns={columns}
          data={data.items}
          sorting={{ state: sorting, onChange: setSorting }}
          pagination={{ state: pagination, onChange: setPagination, rowCount: data.total }}
        />
      )}
    </QueryState>
  );
}
```

`placeholderData: keepPreviousData` keeps the previous page on screen while the next one loads. That keeps the table and its pager mounted, so keyboard focus and scroll position survive page and sort changes. Without it, every page or sort change is a new query with no data yet, `QueryState` swaps the table for its loader, and focus falls back to the page.

`QueryState` supplies the loading, empty and error states (including **Try again**); a failed query must never fall through to the table's "Nothing here yet". Omit `sorting` to disable sorting, or `pagination` to hide the pager. The table keeps `pageIndex` when the sort changes, so reset it in your `onChange` if the sort should return to page 1. For small static tables, use the plain `Table` primitive.

Pager buttons that cannot be used are marked `aria-disabled` rather than disabled, so a keyboard user who reaches the last page keeps focus there. They stay in the tab order and do nothing, so a list with a single page has four inert tab stops: that is the trade-off of the `aria-disabled` pattern. Only their content is dimmed (not the button itself), so the border and the focus ring keep full strength.
