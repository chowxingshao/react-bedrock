# Styling rules

Each rule shows an Incorrect and a Correct form. Enforced rules name their check; the rest are conventions reviewers watch for. The token tables (colours, radii, borders, layers, durations) live in [docs/design-system.md](../design-system.md) and the values in `src/styles/tokens.css`; this page only shows how to use them.

## Semantic colours, never raw palette or hex

Colours come from the semantic tokens (`bg-card`, `text-muted-foreground`), so a rebrand or dark mode needs no component change.

Incorrect:

```tsx
<div className="bg-[#1e293b] text-slate-500">…</div>
```

Correct:

```tsx
<div className="bg-card text-muted-foreground">…</div>
```

**Enforced by:** the `hex colour` and `raw palette colour` cases of the design-token guard (`src/test/design-tokens.guard.test.ts`).

## No arbitrary pixel values

Spacing and radius come from the scale. A bracketed pixel value escapes it.

Incorrect:

```tsx
<div className="rounded-[10px] p-[13px]">…</div>
```

Correct:

```tsx
<div className="rounded-md p-3">…</div>
```

**Enforced by:** the `arbitrary pixel value` case of the design-token guard (`src/test/design-tokens.guard.test.ts`).

## Borders via the token, not a raw width

The bare `border` utility reads `--border-width`, so one edit in `tokens.css` thickens every border in the app. For an intentional heavier line, use `border-2` (a fixed 2px step, the same weight as the `--border-width-strong` token). Never hand-write a bracketed width.

Incorrect:

```tsx
<div className="border-[2px] border-border">…</div>
```

Correct:

```tsx
<div className="border border-border">…</div>
```

```tsx
<div className="border-2 border-border">…</div>
```

**Enforced by:** the `arbitrary pixel value` case of the design-token guard (`src/test/design-tokens.guard.test.ts`), plus the border-width wiring check in `src/styles/globals.test.ts`, which asserts `--default-border-width` stays mapped to `--border-width`.

## No manual z-index on overlays

Layers are named, so a dialog, a menu and a toast always stack in the right order.

Incorrect:

```tsx
<div className="z-50">…</div>
```

Correct:

```tsx
<div className="z-modal">…</div>
```

```tsx
<div className="z-dropdown">…</div>
```

```tsx
<div className="z-toast">…</div>
```

```tsx
<header className="z-sticky">…</header>
```

**Enforced by:** the `raw z-index` case of the design-token guard (`src/test/design-tokens.guard.test.ts`).

## Durations from the scale

Durations come from `--duration-fast`, `--duration-normal` and `--duration-slow`, which drop to zero under reduced motion. A literal duration ignores that.

Incorrect:

```tsx
<div className="transition-colors duration-200">…</div>
```

Correct:

```tsx
<div className="transition-colors duration-normal">…</div>
```

**Enforced by:** the `raw duration` case of the design-token guard (`src/test/design-tokens.guard.test.ts`).

## Motion via the utilities or `useGsap`, never ad-hoc `@keyframes`

Use the motion utilities in `src/styles/globals.css` (`interactive`, `press`, `hover-lift`, `enter`, `exit`, `stagger`, `shimmer`, `scroll-fade`). For sequencing the utilities cannot express, use the `useGsap` hook from `@/hooks/use-gsap`. Both honour reduced motion. Keyframes are authored once, in `globals.css`.

Incorrect:

```tsx
const css = `@keyframes spin-in { from { opacity: 0 } to { opacity: 1 } }`;

<style>{css}</style>;
```

```tsx
import gsap from 'gsap';
```

Correct:

```tsx
<Card className="hover-lift press interactive">…</Card>
```

```tsx
import { useGsap } from '@/hooks/use-gsap';
```

**Enforced by:** the `ad-hoc @keyframes` case of the design-token guard (`src/test/design-tokens.guard.test.ts`), the `gsap` import ban in `eslint.config.js` (`no-restricted-imports`; the hook's own files are the only exception) and `src/hooks/use-gsap.guard.test.ts`, which keeps GSAP confined to the `useGsap` hook.

## `cn()` for conditional classes

`cn()` merges Tailwind classes, so a later class overrides a conflicting earlier one. Template-literal concatenation does not.

Incorrect:

```tsx
<div className={`rounded-md p-4 ${isActive ? 'bg-accent' : ''}`}>…</div>
```

Correct:

```tsx
import { cn } from '@/lib/cn';

<div className={cn('rounded-md p-4', isActive && 'bg-accent')}>…</div>;
```

**Convention (not enforced).**

## Built-in variants before classNames

If a component already has the look as a variant, use the variant. A `className` override duplicates it and breaks when the variant changes.

Incorrect:

```tsx
<Button className="rounded-full bg-destructive">{t('actions.confirm')}</Button>
```

Correct:

```tsx
<Button variant="destructive" shape="pill">
  {t('actions.confirm')}
</Button>
```

**Convention (not enforced).**

## Shape via the `shape` variant, not a radius className

`Button`, `Badge` and `Input` take `shape` (`default`, `rounded`, `pill`, `square`), so the corner style stays one prop.

Incorrect:

```tsx
<Button className="rounded-full">{t('actions.retry')}</Button>
```

Correct:

```tsx
<Button shape="pill">{t('actions.retry')}</Button>
```

**Convention (not enforced).**

## `size-*` over separate `w-`/`h-`; `gap` over `space-*`

One utility for a square box, and `gap` for spacing between flex or grid children, which also survives wrapping and reordering.

Incorrect:

```tsx
<div className="flex space-x-2">
  <span className="h-4 w-4" />
</div>
```

Correct:

```tsx
<div className="flex gap-2">
  <span className="size-4" />
</div>
```

**Convention (not enforced).**
