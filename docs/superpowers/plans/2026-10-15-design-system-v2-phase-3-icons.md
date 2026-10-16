# Design System v2 — Phase 3 (Icon system) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every icon through one swap-in-one-file barrel (`src/components/ui/icons.ts`) of **semantically-aliased** lucide components, add an optional typed `<Icon>` wrapper, migrate all 39 files that import `lucide-react` to the barrel, and ban direct `lucide-react` imports everywhere except the barrel — with zero visual change (aliases point at the same glyphs).

**Architecture:** `icons.ts` re-exports the project's chosen lucide set under semantic names (`Trash2Icon as Delete`, `PencilIcon as Edit`, …); swapping the whole set = editing this one file. `icon.tsx` adds an optional `<Icon icon={Delete} />` wrapper that takes a **component object** (never a string key), applying a uniform `size-*` scale and a11y defaults, plus a set-agnostic `IconComponent` type for prop typing. Consumers import named glyphs from `@/components/ui/icons` (or `import * as Icons` for a catalogue feel). Enforcement is an ESLint `no-restricted-imports` entry (the repo's existing `WRAPPED` mechanism) that permits `lucide-react` only inside `icons.ts`, plus a guard test that scans the source tree. The migration is a pure import-source + identifier rename; no existing call site is wrapped in `<Icon>` and no rendered markup changes.

**Tech Stack:** React 19, TypeScript 6 (strict), lucide-react, ESLint (flat config, `eslint-plugin-import-x`), Vitest + Testing Library (`import.meta.glob` guard tests), Storybook 10, Plop.

**Spec:** `docs/superpowers/specs/2026-10-15-design-system-v2-design.md` (§5 "Phase 3 — Icon system", lines 179–200; decision D3 line 81; edit-points §4; cross-cutting back-compat §6).

## Global Constraints

Every task's requirements implicitly include this section.

- **Barrel naming = semantic aliases (user decision, 2026-10-15).** The barrel re-exports under semantic names, e.g. `export { Trash2Icon as Delete, PencilIcon as Edit } from 'lucide-react'`. Role-specific icons get domain names (`Delete`, `Edit`, `Export`, `Empty`, `Forbidden`, `Offline`, `Retry`, `Warning`, `Success`, `Error`, `Info`, `Add`, `Search`, `Close`, `Dashboard`, `Logo`, `SignOut`, `Language`, `Menu`, `SidebarCollapse`, `SidebarExpand`, `NoResults`, `Spinner`, theme `ThemeLight`/`ThemeDark`/`ThemeSystem`). Geometric/directional icons keep geometric names (`ChevronUp/Down/Left/Right`, `ChevronsLeft/Right/UpDown`, `ArrowUp/Down`, `More`, `Dot`). The authoritative alias map is Task 2.
- **Zero visual change (hard rule).** Each alias points at the exact lucide glyph the code uses today, so every rendered icon is byte-identical. The migration changes import sources and identifiers only; it does **not** wrap existing standalone icons in `<Icon>`, does not change sizes, and does not change `aria-hidden`/labels. (spec §6 "Back-compat".)
- **`<Icon>` wrapper is additive and optional.** It is added, tested, storied and documented as the tool for *new* standalone icons. Components that already auto-size SVGs (Button's `[&_svg]:size-4`) keep dropping glyphs in directly. (spec §5 Phase 3.)
- **Tokens only:** no hex, no raw Tailwind palette classes, no arbitrary pixel values (`[...px]`), no raw `z-<n>`/`duration-<n>`. Enforced by `src/test/design-tokens.guard.test.ts`, **which also scans `*.stories.tsx`** — so story classes must be token-backed (`size-6`, `rounded-md`, `text-xs`, `text-muted-foreground`, `gap-4`, `p-3` are all fine). The icon `size-*` scale uses Tailwind's spacing scale (allowed, like Button's `size-4`).
- **Imports:** use the `@/` alias across folders. Glyphs come from `@/components/ui/icons`; the wrapper from `@/components/ui/icon`; the `IconComponent` type from `@/components/ui/icons` (re-exported) or `@/components/ui/icon`. Respect `import-x/order` — after a swap the import moves from the external group to the internal `@/**` group, so **run `pnpm lint:fix` after every migration edit** to reorder and dedupe.
- **Text:** no new user-facing runtime copy. Story labels and the catalogue's glyph names are developer-facing and need not be translated.
- **Gates (every task):** `pnpm lint && pnpm typecheck && pnpm test` must be green before the task's commit. (The `lucide-react` ESLint ban lands only in Task 6; during Tasks 1–5 direct lucide imports still lint clean, so partially-migrated states stay green.)
- **Commits:** Conventional Commits; end every commit message body with exactly:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **`Error` alias shadow (documented, harmless).** `OctagonXIcon as Error` is the error-toast glyph. The only consumer, `src/core/notify/toaster.tsx`, never uses the global `Error` constructor, so a named `import { Error }` there is harmless; no lint rule forbids it. Keep the alias `Error`.
- **`Spinner` name clash (documented).** `src/components/ui/spinner.tsx` **exports** a `Spinner` component and also needs the `Spinner` glyph (`Loader2Icon`). Import the glyph aliased: `import { Spinner as SpinnerGlyph } from '@/components/ui/icons'` and render `<SpinnerGlyph … />`. Every other file may import `Spinner` directly.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/components/ui/icon.tsx` | Create | `IconComponent` type + `<Icon icon={…} size label>` wrapper (uniform `size-*` + a11y defaults). |
| `src/components/ui/icon.test.tsx` | Create | Cover default size, size scale, decorative vs labelled, className merge, custom-SVG acceptance. |
| `src/components/ui/icons.ts` | Create | The barrel: semantic-aliased re-exports of the lucide set + `IconComponent` type re-export. The one file allowed to import `lucide-react`. |
| `src/components/ui/icons.test.tsx` | Create | Assert the barrel renders svgs for representative aliases (smoke). |
| `src/components/ui/icon.stories.tsx` | Create | `UI/Icons` catalogue (every alias) + a `<Icon>` wrapper demo. |
| `src/components/ui/{breadcrumb,calendar,checkbox,data-table,date-picker,dialog,dropdown-menu,pagination,radio-group,select,sheet,spinner,theme-toggle}.tsx` | Modify | Swap lucide import → barrel; rename references to aliases. |
| `src/components/ui/button.stories.tsx` | Modify | `PlusIcon` → `Add`. |
| `src/components/feedback/{error-state,not-found-state,empty-state,forbidden-state,offline-banner,page-loader}.tsx` | Modify | Swap to barrel; `empty-state` also swaps the `LucideIcon` type → `IconComponent`. |
| `src/components/feedback/empty-state.stories.tsx` | Modify | `SearchXIcon` → `NoResults`. |
| `src/components/layout/{user-menu,sidebar,language-switcher,header,auth-layout}.tsx`, `nav-types.ts` | Modify | Swap to barrel; `nav-types` swaps the `LucideIcon` type → `IconComponent`. |
| `src/components/layout/{app-shell.test.tsx,app-shell.stories.tsx}` | Modify | `LayoutDashboardIcon,PackageIcon` → `Dashboard,Package`. |
| `src/features/example/components/{item-detail-page,export-items-button,item-details,delete-item-button,items-list-page,items-table,items-toolbar}.tsx` | Modify | Swap to barrel aliases. |
| `src/core/notify/toaster.tsx` | Modify | Swap to barrel aliases (`Success,Error,Warning,Info,Spinner`). |
| `src/app/navigation.ts`, `src/app/routes/dashboard.tsx` | Modify | Swap to barrel aliases. |
| `eslint.config.js` | Modify | Add a `WRAPPED` entry banning `lucide-react` outside `src/components/ui/icons.ts`. |
| `src/components/ui/icons.guard.test.ts` | Create | Scan `src/**` and assert `from 'lucide-react'` appears in exactly one file: `icons.ts`. |
| `plopfile.js` | Modify | Feature generator inserts a barrel import (`Package as …Icon`), not a `lucide-react` import. |
| `scripts/ui-add.mjs` | Modify | Final-note line telling the developer to route new `lucide-react` imports through the barrel. |
| `CHANGELOG.md` | Modify | One Phase-3 entry (Added + Changed/Action-needed). |
| `docs/design-system.md` | Modify | New "Icons" section: barrel, aliasing, `<Icon>`, the ban, generator/CLI note. |

---

### Task 1: `IconComponent` type + `<Icon>` wrapper

**Files:**
- Create: `src/components/ui/icon.tsx`
- Create: `src/components/ui/icon.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/cn`; `size-3|size-4|size-5|size-6` spacing utilities. No lucide, no other Phase-3 task.
- Produces: `export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>` and `export function Icon(props: IconProps)`. `IconProps` = `Omit<React.SVGProps<SVGSVGElement>, 'ref'>` plus `icon: IconComponent`, `size?: 'sm'|'md'|'lg'|'xl'` (default `'md'` = `size-4`), `label?: string`. With `label`: `role="img" aria-label={label}`; without: `aria-hidden="true"`. Lucide icons and plain SVG function components are both assignable to `IconComponent`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/icon.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { type SVGProps } from 'react';
import { describe, expect, it } from 'vitest';

import { Icon } from './icon';

// A minimal custom SVG component: proves the wrapper accepts any SVG component, not just lucide.
function Star(props: SVGProps<SVGSVGElement>) {
  return <svg data-testid="star" {...props} />;
}

describe('Icon', () => {
  it('defaults to md size (size-4) and is decorative', () => {
    render(<Icon icon={Star} />);
    const svg = screen.getByTestId('star');
    expect(svg).toHaveClass('size-4');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it.each([
    ['sm', 'size-3'],
    ['md', 'size-4'],
    ['lg', 'size-5'],
    ['xl', 'size-6'],
  ] as const)('applies the %s size', (size, cls) => {
    render(<Icon icon={Star} size={size} />);
    expect(screen.getByTestId('star')).toHaveClass(cls);
  });

  it('exposes a label to assistive tech when provided', () => {
    render(<Icon icon={Star} label="Favourite" />);
    const svg = screen.getByRole('img', { name: 'Favourite' });
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('merges a custom className with the size class', () => {
    render(<Icon icon={Star} className="text-primary" />);
    expect(screen.getByTestId('star')).toHaveClass('size-4', 'text-primary');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/ui/icon.test.tsx`
Expected: FAIL — `./icon` does not exist / `Icon` is not exported.

- [ ] **Step 3: Implement `icon.tsx`**

Create `src/components/ui/icon.tsx`:

```tsx
import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Any renderable icon component: a lucide glyph from `@/components/ui/icons`, or a custom
 * inline-SVG / image-backed component. Set-agnostic so the project can swap icon sets.
 */
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const ICON_SIZE = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
} as const;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  /** The icon to render — a component object (never a string key). */
  icon: IconComponent;
  /** Uniform size from the icon scale. Default `md` (size-4). */
  size?: keyof typeof ICON_SIZE;
  /**
   * Accessible label. When set, the icon is exposed to assistive tech (`role="img"`).
   * When omitted, the icon is decorative (`aria-hidden`).
   */
  label?: string;
}

/** Optional wrapper for standalone icons: uniform sizing + a11y defaults (spec §5 Phase 3). */
function Icon({ icon: Component, size = 'md', label, className, ...props }: IconProps) {
  return (
    <Component
      className={cn(ICON_SIZE[size], className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    />
  );
}

export { Icon };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/ui/icon.test.tsx`
Expected: PASS (all four).

- [ ] **Step 5: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/icon.tsx src/components/ui/icon.test.tsx
git commit -m "feat: add Icon wrapper and IconComponent type"
```

---

### Task 2: The icon barrel (`icons.ts`) + smoke test + catalogue story

**Files:**
- Create: `src/components/ui/icons.ts`
- Create: `src/components/ui/icons.test.tsx`
- Create: `src/components/ui/icon.stories.tsx`

**Interfaces:**
- Consumes: `lucide-react` (this is the one file allowed to); `IconComponent` + `Icon` from `./icon`.
- Produces: the authoritative **alias map** below — the public icon API every later task imports. Also `export type { IconComponent } from './icon'` so prop-typing consumers can import the type from the barrel. The barrel is a **pure re-export** file (icon values + one type), which keeps `react-refresh/only-export-components` satisfied.

**Authoritative alias map** (lucide identifier → semantic alias). Every alias below is a current lucide export name:

| lucide | alias | | lucide | alias |
| --- | --- | --- | --- | --- |
| `LayoutDashboardIcon` | `Dashboard` | | `Trash2Icon` | `Delete` |
| `PackageIcon` | `Package` | | `PencilIcon` | `Edit` |
| `LogOutIcon` | `SignOut` | | `DownloadIcon` | `Export` |
| `LayersIcon` | `Logo` | | `CopyIcon` | `Copy` |
| `PanelLeftCloseIcon` | `SidebarCollapse` | | `CheckIcon` | `Check` |
| `PanelLeftOpenIcon` | `SidebarExpand` | | `XIcon` | `Close` |
| `LanguagesIcon` | `Language` | | `SearchIcon` | `Search` |
| `MenuIcon` | `Menu` | | `CalendarIcon` | `Calendar` |
| `RotateCwIcon` | `Retry` | | `PlusIcon` | `Add` |
| `TriangleAlertIcon` | `Warning` | | `SunIcon` | `ThemeLight` |
| `SearchXIcon` | `NoResults` | | `MoonIcon` | `ThemeDark` |
| `InboxIcon` | `Empty` | | `MonitorIcon` | `ThemeSystem` |
| `ShieldXIcon` | `Forbidden` | | `ChevronUpIcon` | `ChevronUp` |
| `WifiOffIcon` | `Offline` | | `ChevronDownIcon` | `ChevronDown` |
| `Loader2Icon` | `Spinner` | | `ChevronLeftIcon` | `ChevronLeft` |
| `CircleCheckIcon` | `Success` | | `ChevronRightIcon` | `ChevronRight` |
| `InfoIcon` | `Info` | | `ChevronsLeftIcon` | `ChevronsLeft` |
| `OctagonXIcon` | `Error` | | `ChevronsRightIcon` | `ChevronsRight` |
| `ArrowUpIcon` | `ArrowUp` | | `ChevronsUpDownIcon` | `ChevronsUpDown` |
| `ArrowDownIcon` | `ArrowDown` | | `MoreHorizontalIcon` | `More` |
| `CircleIcon` | `Dot` | | | |

- [ ] **Step 1: Write the failing smoke test**

Create `src/components/ui/icons.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Add, ChevronDown, Dashboard, Delete, Error, Spinner } from './icons';

describe('icons barrel', () => {
  it.each([Add, ChevronDown, Dashboard, Delete, Error, Spinner])(
    'renders an svg for a representative alias',
    (Glyph) => {
      const { container } = render(<Glyph />);
      expect(container.querySelector('svg')).not.toBeNull();
    },
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/ui/icons.test.tsx`
Expected: FAIL — `./icons` does not exist.

- [ ] **Step 3: Implement the barrel**

Create `src/components/ui/icons.ts`. Keep the groups and order below (matches the alias map); group comments aid the swap-the-set workflow:

```ts
/**
 * The project's icon set — the one place that imports `lucide-react` (enforced by ESLint).
 * Swap the whole set by editing the right-hand sides below; add custom inline-SVG or
 * image-backed icons as plain components here so they are first-class entries.
 * Names are semantic (what the icon means), except geometric/directional glyphs.
 */
export {
  // Navigation & layout
  LayoutDashboardIcon as Dashboard,
  PackageIcon as Package,
  LogOutIcon as SignOut,
  LayersIcon as Logo,
  PanelLeftCloseIcon as SidebarCollapse,
  PanelLeftOpenIcon as SidebarExpand,
  LanguagesIcon as Language,
  MenuIcon as Menu,
  // Status & feedback
  RotateCwIcon as Retry,
  TriangleAlertIcon as Warning,
  SearchXIcon as NoResults,
  InboxIcon as Empty,
  ShieldXIcon as Forbidden,
  WifiOffIcon as Offline,
  Loader2Icon as Spinner,
  CircleCheckIcon as Success,
  InfoIcon as Info,
  OctagonXIcon as Error,
  // Actions
  PlusIcon as Add,
  PencilIcon as Edit,
  DownloadIcon as Export,
  Trash2Icon as Delete,
  CopyIcon as Copy,
  CheckIcon as Check,
  XIcon as Close,
  SearchIcon as Search,
  CalendarIcon as Calendar,
  // Theme
  SunIcon as ThemeLight,
  MoonIcon as ThemeDark,
  MonitorIcon as ThemeSystem,
  // Directional / geometric (kept geometric on purpose)
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronsLeftIcon as ChevronsLeft,
  ChevronsRightIcon as ChevronsRight,
  ChevronsUpDownIcon as ChevronsUpDown,
  ArrowUpIcon as ArrowUp,
  ArrowDownIcon as ArrowDown,
  MoreHorizontalIcon as More,
  CircleIcon as Dot,
} from 'lucide-react';

export { Icon } from './icon';
export type { IconComponent } from './icon';
```

> Note: `Icon` is re-exported here too so `@/components/ui/icons` is a single entry point. All runtime exports are components, so `react-refresh/only-export-components` stays satisfied. If `pnpm lint` ever flags `icon.ts`/`icons.ts` for react-refresh, add `.ts` to the existing ui override glob in `eslint.config.js` (`files: ['src/components/ui/**/*.{ts,tsx}']`) — but it should not, since this is a pure re-export file.

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `pnpm test -- src/components/ui/icons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the catalogue story**

Create `src/components/ui/icon.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon, type IconComponent } from './icon';
import * as Icons from './icons';

// Every glyph alias in the barrel (the type + the Icon wrapper are erased / excluded).
const glyphs = Object.entries(Icons).filter(([name]) => name !== 'Icon') as [
  string,
  IconComponent,
][];

const meta = { title: 'UI/Icons', component: Icon } satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Catalogue: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
      {glyphs.map(([name, Glyph]) => (
        <div
          key={name}
          className="flex flex-col items-center gap-2 rounded-md border p-3 text-center"
        >
          <Glyph className="size-6" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const WithWrapper: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Icon icon={Icons.Add} size="sm" />
      <Icon icon={Icons.Edit} />
      <Icon icon={Icons.Delete} size="lg" label="Delete" />
    </div>
  ),
};
```

> `Object.entries(Icons)` includes the re-exported `Icon` wrapper (a value); filter it out so the catalogue shows only glyphs. The `IconComponent` type is erased and never appears.

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green. (lucide is now imported in two files — `icons.ts` and the not-yet-migrated 39 — which is fine; the ban lands in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/icons.ts src/components/ui/icons.test.tsx src/components/ui/icon.stories.tsx
git commit -m "feat: add the semantic icon barrel and catalogue story"
```

---

### Task 3: Migrate `src/components/ui/**` to the barrel

**Files (Modify):** `breadcrumb.tsx`, `calendar.tsx`, `checkbox.tsx`, `data-table.tsx`, `date-picker.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `pagination.tsx`, `radio-group.tsx`, `select.tsx`, `sheet.tsx`, `spinner.tsx`, `theme-toggle.tsx`, `button.stories.tsx`.

**Interfaces:**
- Consumes: the Task-2 alias map.
- Produces: no `lucide-react` import left in `src/components/ui/**` except `icons.ts`. Rendered output unchanged. This is a refactor guarded by the existing component tests (`*.test.tsx`), not new behaviour.

**Per-file import rewrite** (replace the whole `from 'lucide-react'` import with a barrel import, then rename every reference in the file, then `lint:fix`):

| File | Old import | New import |
| --- | --- | --- |
| `breadcrumb.tsx` | `{ ChevronRight, MoreHorizontal }` | `{ ChevronRight, More }` |
| `calendar.tsx` | `{ ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon }` | `{ ChevronDown, ChevronLeft, ChevronRight }` |
| `checkbox.tsx` | `{ CheckIcon }` | `{ Check }` |
| `data-table.tsx` | `{ ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, ChevronsUpDownIcon }` | `{ ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown }` |
| `date-picker.tsx` | `{ CalendarIcon }` | `{ Calendar }` |
| `dialog.tsx` | `{ XIcon }` | `{ Close }` |
| `dropdown-menu.tsx` | `{ CheckIcon, ChevronRightIcon, CircleIcon }` | `{ Check, ChevronRight, Dot }` |
| `pagination.tsx` | `{ ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon }` | `{ ChevronLeft, ChevronRight, More }` |
| `radio-group.tsx` | `{ CircleIcon }` | `{ Dot }` |
| `select.tsx` | `{ CheckIcon, ChevronDownIcon, ChevronUpIcon }` | `{ Check, ChevronDown, ChevronUp }` |
| `sheet.tsx` | `{ XIcon }` | `{ Close }` |
| `button.stories.tsx` | `{ PlusIcon }` | `{ Add }` |

**Special case — `spinner.tsx` (name clash):** the file exports a `Spinner` component. Import the glyph aliased and render it:

```tsx
import { Spinner as SpinnerGlyph } from '@/components/ui/icons';
// …
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const { t } = useTranslation();
  return (
    <SpinnerGlyph
      role="status"
      aria-label={t('status.loading')}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}
```

**Special case — `theme-toggle.tsx` (glyphs + type):** replace the import and the `ICONS` map's type. This proves lucide glyphs satisfy `IconComponent`:

```tsx
import { ThemeDark, ThemeLight, ThemeSystem, type IconComponent } from '@/components/ui/icons';
// …
const ICONS = { light: ThemeLight, dark: ThemeDark, system: ThemeSystem } satisfies Record<
  ThemeMode,
  IconComponent
>;
```

(Every other reference, e.g. `<CurrentIcon …>` / `<Icon …>` locals, is already aliased through the `ICONS` map — no JSX rename needed there beyond the map.)

- [ ] **Step 1: Rewrite the imports and references**

For each file above: replace the `from 'lucide-react'` line with the new barrel import (`from '@/components/ui/icons'`), then rename every JSX/value reference of the old identifier to the new alias (e.g. `<CheckIcon …>` → `<Check …>`; `<ChevronDownIcon …>` → `<ChevronDown …>`). Apply the two special cases verbatim.

- [ ] **Step 2: Fix import order and formatting**

Run: `pnpm lint:fix`
(This moves each icon import into the `@/**` internal group, alphabetizes, and dedupes.)

- [ ] **Step 3: Run the affected tests + typecheck**

Run: `pnpm test -- src/components/ui && pnpm typecheck`
Expected: PASS — these are refactors; the existing component tests (e.g. `data-table.test.tsx`, `select.test.tsx`, `button.test.tsx`) stay green, confirming identical behaviour.

- [ ] **Step 4: Confirm no lucide import remains in `ui/**` except the barrel**

Run: `git grep -n "from 'lucide-react'" -- src/components/ui`
Expected: exactly one match — `src/components/ui/icons.ts`.

- [ ] **Step 5: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui
git commit -m "refactor: route src/components/ui icons through the barrel"
```

---

### Task 4: Migrate `src/components/feedback/**` and `src/components/layout/**`

**Files (Modify):** feedback — `error-state.tsx`, `not-found-state.tsx`, `empty-state.tsx`, `forbidden-state.tsx`, `offline-banner.tsx`, `page-loader.tsx`, `empty-state.stories.tsx`; layout — `user-menu.tsx`, `sidebar.tsx`, `language-switcher.tsx`, `header.tsx`, `auth-layout.tsx`, `nav-types.ts`, `app-shell.test.tsx`, `app-shell.stories.tsx`.

**Interfaces:**
- Consumes: the Task-2 alias map; the `IconComponent` type.
- Produces: no `lucide-react` import left in `feedback/**` or `layout/**`. The `NavItem.icon` and `EmptyStateProps.icon` types become `IconComponent`; their callers (`navigation.ts`, `empty-state` default) still pass lucide-backed glyphs, which remain assignable.

**Per-file import rewrite:**

| File | Old import | New import |
| --- | --- | --- |
| `error-state.tsx` | `{ RotateCwIcon, TriangleAlertIcon }` | `{ Retry, Warning }` |
| `not-found-state.tsx` | `{ SearchXIcon }` | `{ NoResults }` |
| `forbidden-state.tsx` | `{ ShieldXIcon }` | `{ Forbidden }` |
| `offline-banner.tsx` | `{ WifiOffIcon }` | `{ Offline }` |
| `page-loader.tsx` | `{ Loader2Icon }` | `{ Spinner }` |
| `empty-state.stories.tsx` | `{ SearchXIcon }` | `{ NoResults }` |
| `user-menu.tsx` | `{ LogOutIcon }` | `{ SignOut }` |
| `sidebar.tsx` | `{ LayersIcon, PanelLeftCloseIcon, PanelLeftOpenIcon }` | `{ Logo, SidebarCollapse, SidebarExpand }` |
| `language-switcher.tsx` | `{ LanguagesIcon }` | `{ Language }` |
| `header.tsx` | `{ MenuIcon }` | `{ Menu }` |
| `auth-layout.tsx` | `{ LayersIcon }` | `{ Logo }` |
| `app-shell.test.tsx` | `{ LayoutDashboardIcon, PackageIcon }` | `{ Dashboard, Package }` |
| `app-shell.stories.tsx` | `{ LayoutDashboardIcon, PackageIcon }` | `{ Dashboard, Package }` |

**Special case — `empty-state.tsx` (glyph + type + default):**

```tsx
import { Empty, type IconComponent } from '@/components/ui/icons';
// …
export interface EmptyStateProps {
  // …
  icon?: IconComponent;
  // …
}
// …
export function EmptyState({
  title,
  description,
  icon: Icon = Empty,
  action,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
```

(The local `Icon` destructure name is unchanged; it still renders `<Icon aria-hidden="true" className="size-6" />`.)

**Special case — `nav-types.ts` (type only):**

```ts
import type { ParseKeys } from 'i18next';

import type { IconComponent } from '@/components/ui/icons';
import type { Permission } from '@/config/permissions';
// …
export interface NavItem {
  labelKey: ParseKeys;
  icon: IconComponent;
  to: string;
  permission?: Permission;
  end?: boolean;
}
```

- [ ] **Step 1: Rewrite the imports, references, and the two types**

Apply the table (swap import source + rename references) and the two special cases.

- [ ] **Step 2: Fix import order**

Run: `pnpm lint:fix`

- [ ] **Step 3: Run the affected tests + typecheck**

Run: `pnpm test -- src/components/feedback src/components/layout && pnpm typecheck`
Expected: PASS (incl. `app-shell.test.tsx`). Typecheck proves `IconComponent` accepts the lucide glyphs passed as `NavItem.icon` / `EmptyState` defaults.

- [ ] **Step 4: Confirm no lucide import remains here**

Run: `git grep -n "from 'lucide-react'" -- src/components/feedback src/components/layout`
Expected: no matches.

- [ ] **Step 5: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/feedback src/components/layout
git commit -m "refactor: route feedback and layout icons through the barrel"
```

---

### Task 5: Migrate `src/features/**`, `src/core/notify/toaster.tsx`, and `src/app/**`

**Files (Modify):** features — `item-detail-page.tsx`, `export-items-button.tsx`, `item-details.tsx`, `delete-item-button.tsx`, `items-list-page.tsx`, `items-table.tsx`, `items-toolbar.tsx`; core — `src/core/notify/toaster.tsx`; app — `src/app/navigation.ts`, `src/app/routes/dashboard.tsx`.

**Interfaces:**
- Consumes: the Task-2 alias map.
- Produces: the last `lucide-react` importers (outside the barrel) are gone, so after this task `lucide-react` is imported in exactly one source file. `toaster.tsx` (in `src/core/notify`) importing `@/components/ui/icons` is permitted by the layer rules (the `core` zone forbids only `src/features` and `src/components/layout` as import sources, not `src/components/ui`).

**Per-file import rewrite:**

| File | Old import | New import |
| --- | --- | --- |
| `item-detail-page.tsx` | `{ PencilIcon }` | `{ Edit }` |
| `export-items-button.tsx` | `{ DownloadIcon }` | `{ Export }` |
| `item-details.tsx` | `{ CheckIcon, CopyIcon }` | `{ Check, Copy }` |
| `delete-item-button.tsx` | `{ Trash2Icon }` | `{ Delete }` |
| `items-list-page.tsx` | `{ PlusIcon }` | `{ Add }` |
| `items-table.tsx` | `{ PencilIcon }` | `{ Edit }` |
| `items-toolbar.tsx` | `{ SearchIcon }` | `{ Search }` |
| `navigation.ts` | `{ LayoutDashboardIcon, PackageIcon }` | `{ Dashboard, Package }` |
| `routes/dashboard.tsx` | `{ LayoutDashboardIcon }` | `{ Dashboard }` |

For `delete-item-button.tsx`, rename the JSX too: `<Trash2Icon aria-hidden="true" />` (appears twice) → `<Delete aria-hidden="true" />`. For `navigation.ts`, the entries become `icon: Dashboard` and `icon: Package`.

**Special case — `toaster.tsx` (the `Error` alias):** the multi-line lucide import becomes a single barrel import. `Error` shadows the global but is unused as a constructor here (Global Constraints):

```tsx
import { Error, Info, Spinner, Success, Warning } from '@/components/ui/icons';
```

Then rename each reference: `CircleCheckIcon` → `Success`, `OctagonXIcon` → `Error`, `TriangleAlertIcon` → `Warning`, `InfoIcon` → `Info`, `Loader2Icon` → `Spinner` (wherever they appear in the Sonner `icons` config / JSX).

- [ ] **Step 1: Rewrite the imports and references**

Apply the table and the toaster special case.

- [ ] **Step 2: Fix import order**

Run: `pnpm lint:fix`

- [ ] **Step 3: Run the affected tests + typecheck**

Run: `pnpm test -- src/features src/core/notify src/app && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Confirm `lucide-react` is now imported in exactly one file**

Run: `git grep -n "from 'lucide-react'" -- src`
Expected: exactly one match — `src/components/ui/icons.ts`.

- [ ] **Step 5: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/features src/core/notify src/app
git commit -m "refactor: route feature, notify, and app icons through the barrel"
```

---

### Task 6: Enforce the ban — ESLint rule, guard test, generator, CLI note

**Files:**
- Modify: `eslint.config.js`
- Create: `src/components/ui/icons.guard.test.ts`
- Modify: `plopfile.js`
- Modify: `scripts/ui-add.mjs`

**Interfaces:**
- Consumes: the completed migration (Task 5 left lucide in exactly one file).
- Produces: `lucide-react` is importable only inside `src/components/ui/icons.ts`; a guard test proves it; the feature generator and the shadcn-add flow route new icons through the barrel.

- [ ] **Step 1: Add the ESLint ban via the `WRAPPED` mechanism**

In `eslint.config.js`, add a new entry to the `WRAPPED` array (after the `format.ts`/`date-fns` entry). The existing machinery then bans `lucide-react` everywhere and exempts only its home file:

```js
  {
    files: ['src/components/ui/icons.ts'],
    paths: ['lucide-react'],
    message: 'Import icons from @/components/ui/icons (add a semantic alias there).',
  },
```

No other change is needed: `restrictedImports()` (used by the `src/**` app block and the `src/core/**` block) already folds every `WRAPPED` path into the ban, and `...WRAPPED.map(...)` already emits the per-home exemption for `icons.ts`. The test/story override block does not reset `no-restricted-imports`, so stories and tests are covered too (already migrated in Tasks 2–5).

- [ ] **Step 2: Verify the rule bans a planted violation**

Temporarily add `import { FolderIcon } from 'lucide-react';` to the top of `src/components/ui/button.tsx`, then run:

Run: `pnpm lint`
Expected: FAIL on that line with the message "Import icons from @/components/ui/icons (add a semantic alias there)."
Then remove the planted line and re-run `pnpm lint` → clean. (Do not commit the planted line.)

- [ ] **Step 3: Write the guard test**

Create `src/components/ui/icons.guard.test.ts` (reuses the `import.meta.glob` idiom from `src/test/design-tokens.guard.test.ts`):

```ts
import { describe, expect, it } from 'vitest';

/**
 * Phase-3 icon system: `lucide-react` is imported in exactly one file — the barrel
 * (src/components/ui/icons.ts). The ESLint rule enforces this for new code; this test
 * is the fast, CI-visible invariant and documents the single swap point.
 */
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/api/generated/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const importers = Object.entries(sources)
  .filter(([, source]) => /from ['"]lucide-react['"]/.test(source))
  .map(([file]) => file);

describe('icon barrel (spec §5 Phase 3)', () => {
  it('actually scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it('imports lucide-react in exactly one file: the barrel', () => {
    expect(importers).toEqual(['/src/components/ui/icons.ts']);
  });
});
```

- [ ] **Step 4: Run the guard test**

Run: `pnpm test -- src/components/ui/icons.guard.test.ts`
Expected: PASS (`importers` is exactly `['/src/components/ui/icons.ts']`).

- [ ] **Step 5: Update the feature generator**

In `plopfile.js`, change the nav-imports template (the `// plop:nav-imports` modifier, ~line 318) from a `lucide-react` import to a barrel import:

```js
            template: "import { Package as {{pascalCase name}}Icon } from '@/components/ui/icons';\n$1",
```

(The nav-entry template and the `{{pascalCase name}}Icon` taken-name guard are unchanged. `pnpm lint:fix` after generation merges this with the existing barrel import in `navigation.ts`. The generated feature uses the `Package` glyph as a placeholder; the developer swaps it for a fitting barrel alias — noted in docs.)

- [ ] **Step 6: Update the shadcn-add note**

In `scripts/ui-add.mjs`, extend the final console note (the last `console.log`) so it reads:

```js
console.log(
  'ui:add: done. Run `pnpm lint:fix && pnpm test` and fix anything still reported.\n' +
    '        New components import icons from `lucide-react` directly — move those imports into\n' +
    '        src/components/ui/icons.ts (add a semantic alias) and import from @/components/ui/icons.',
);
```

- [ ] **Step 7: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (guard test included; lucide confined to the barrel).

- [ ] **Step 8: Commit**

```bash
git add eslint.config.js src/components/ui/icons.guard.test.ts plopfile.js scripts/ui-add.mjs
git commit -m "feat: ban direct lucide-react imports outside the icon barrel"
```

---

### Task 7: CHANGELOG, docs, and whole-phase verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/design-system.md`

**Interfaces:**
- Consumes: everything shipped in Tasks 1–6.
- Produces: one Phase-3 CHANGELOG entry (Added + Changed/Action-needed) and an "Icons" section in the design-system docs.

- [ ] **Step 1: Add the CHANGELOG entry**

In `CHANGELOG.md`, under `## [Unreleased]`, add to the existing `### Added` list:

```markdown
- Design System v2, Phase 3: a swap-in-one-file icon system. All icons are
  re-exported under semantic names from `src/components/ui/icons.ts` (the one
  file allowed to import `lucide-react`); swapping the set means editing that
  file. A new optional `<Icon icon={…} size label>` wrapper
  (`src/components/ui/icon.tsx`) gives standalone icons a uniform size scale and
  a11y defaults, with a set-agnostic `IconComponent` type. See "Icons" in
  `docs/design-system.md` and the `UI/Icons` Storybook catalogue.
```

and to the existing `### Changed` list (with an **Action needed** marker, matching the file's convention):

```markdown
- `lucide-react` may now be imported only in `src/components/ui/icons.ts`; an
  ESLint rule and a guard test enforce it. The feature generator (`pnpm gen
  feature`) and `pnpm ui:add` now expect new icons to go through the barrel.
  **Action needed:** move any direct `lucide-react` imports to
  `src/components/ui/icons.ts` (add a semantic alias) and import the alias from
  `@/components/ui/icons`; the lint error names the exact fix. Icon glyphs are
  unchanged, so nothing renders differently.
```

- [ ] **Step 2: Document the icon system in `docs/design-system.md`**

Add an `### Icons` subsection (match the file's heading style; place it near the existing variant/customization material). Cover:
- The barrel at `src/components/ui/icons.ts` is the single place importing `lucide-react`; swap the set by editing its right-hand sides; add custom inline-SVG / image-backed icons there as plain components.
- The semantic-alias convention (role-specific names; geometric glyphs keep geometric names), with one `Incorrect`/`Correct` pair (direct `import … from 'lucide-react'` → `import { Delete } from '@/components/ui/icons'`).
- The `<Icon>` wrapper: when to use it (standalone icons needing uniform size + a11y) vs. dropping a glyph directly into an auto-sizing component (Button); the `size` scale (`sm|md|lg|xl` → `size-3..6`, default `md`) and `label` → `role="img"`/decorative behaviour.
- `IconComponent` is the prop type for "an icon component" (accepts lucide glyphs and custom SVG components).
- The ESLint ban + guard test; the generator/`ui:add` note (new icons go through the barrel; the generated feature's placeholder `Package` icon should be replaced with a fitting alias).
- Update the standalone line at ~`docs/design-system.md:116` ("The shadcn CLI does not install `lucide-react` …") so it cross-references the barrel rule rather than implying free direct use.

- [ ] **Step 3: Whole-phase gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green, including `src/components/ui/icons.guard.test.ts`.

- [ ] **Step 4: Confirm no E2E/markup regression surface**

The migration renamed identifiers only; every glyph, size, `aria-hidden`/label is unchanged, so the axe E2E suite is unaffected. Verify the reasoning holds:

Run: `git grep -n "from 'lucide-react'" -- src e2e`
Expected: exactly one match (`src/components/ui/icons.ts`); `e2e/**` has none. `pnpm test:e2e` need not run for this phase (no key-page markup changed). If `e2e/**` unexpectedly imports `lucide-react`, migrate it to the barrel and re-run `pnpm test:e2e` (after `pnpm exec playwright install chromium`; port 4173 free).

- [ ] **Step 5: (Optional) Build the Storybook catalogue**

If verifying the catalogue renders end-to-end, run `pnpm storybook:build` and confirm it completes; otherwise the `UI/Icons` stories plus the barrel smoke test are sufficient evidence.

- [ ] **Step 6: Commit**

```bash
git add CHANGELOG.md docs/design-system.md
git commit -m "docs: record Phase 3 icon system in changelog and design-system docs"
```

---

## Self-Review

**1. Spec coverage (§5 Phase 3):**
- Barrel `src/components/ui/icons.ts` re-exporting named icon components; set swap = one file; custom SVG/image icons as plain components → Task 2 (barrel + group comments + doc note). ✅
- `src/components/ui/icon.tsx` optional `<Icon icon={…}>` taking a component object (never a string), uniform `size-*` default `size-4`, a11y defaults; auto-sizing components may drop glyphs directly → Task 1 + Global Constraints. ✅
- Migrate the ~45 (actual: 39) files importing `lucide-react` → Tasks 3–5 (ui, feedback+layout, features+core+app), covering all 39 by the Task-5 single-file check. ✅
- ESLint `no-restricted-imports` bans `lucide-react` except `icons.ts`; note so the shadcn CLI flow routes through the barrel → Task 6 (WRAPPED entry + `ui-add.mjs` note). ✅ Plus the plop feature generator (spec-implicit; found at `plopfile.js:318`) → Task 6. ✅
- `Icons` catalogue story → Task 2 (`icon.stories.tsx`, `UI/Icons`). ✅
- Acceptance "lucide in exactly one file / rule fails on a planted violation / all icons render / gates green" → guard test (Task 6 Step 3–4), planted-violation check (Task 6 Step 2), catalogue + smoke test (Task 2), gates every task. ✅

**2. Placeholder scan:** No `TBD`/"handle edge cases"/"similar to Task N". Migration tasks give exact per-file old→new import maps and full code for every special case (spinner clash, theme-toggle `satisfies`, empty-state/nav-types type swaps, toaster `Error`). Task 7 Step 2 describes doc content to write (a documentation task legitimately specifies sections, not code). ✅

**3. Type consistency:** `IconComponent` is defined once (`icon.tsx`), re-exported from the barrel, and consumed identically in `empty-state.tsx`, `nav-types.ts`, `theme-toggle.tsx`. The alias map in Task 2 is the single source; Tasks 3–5 reference the same aliases (`Delete`, `Edit`, `Spinner`, `Error`, `Dashboard`, `Package`, `ChevronDown`, …). `Icon`/`IconProps` names match between `icon.tsx`, `icon.test.tsx`, and the story. The guard-test path string `/src/components/ui/icons.ts` matches the created file. ✅

**Notes carried into later phases:** Phase 5's `icons.md` rulebook should formalize "import from the barrel; pass component objects not strings; no sizing classes inside auto-sizing components; use `<Icon>` for standalone icons" with `Incorrect`/`Correct` pairs, reusing Task 6's guard as the enforced check. Phase 6's showcase should include the icon catalogue (already a story) in the Foundations section.
