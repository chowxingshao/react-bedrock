# Icon rules

Every icon in the app comes from one file, `src/components/ui/icons.ts`. It re-exports lucide glyphs under semantic aliases (`Delete`, `Add`, `Warning`), so swapping the whole icon set means editing that one file. For an icon that stands on its own (outside a `Button` or other component that sizes its SVG), wrap it in `<Icon>` from the same barrel. Each rule shows an Incorrect and a Correct form. Enforced rules name their check; the rest are conventions reviewers watch for.

## Import icons from the barrel, never `lucide-react` directly

Incorrect:

```tsx
import { Trash2 } from 'lucide-react';
```

Correct:

```tsx
import { Delete } from '@/components/ui/icons';
```

To use a glyph the barrel does not have yet, add a semantic alias to `icons.ts` first.

**Enforced by:** the `lucide-react` ban in the `no-restricted-imports` rule of `eslint.config.js` (only `icons.ts` may import it) and `src/components/ui/icons.guard.test.ts`, which asserts `lucide-react` is imported in exactly one file.

## Pass component objects, not string keys

The `icon` prop of `<Icon>` takes a component, not a name.

Incorrect:

```tsx
<Icon icon="trash" />
```

Correct:

```tsx
import { Delete, Icon } from '@/components/ui/icons';

<Icon icon={Delete} />;
```

**Enforced by:** the `IconComponent` type of the `icon` prop in `src/components/ui/icon.tsx`: a string fails `pnpm typecheck`.

## No sizing classes inside components that auto-size SVGs

`Button` already sizes a child SVG to `size-4` (and `has-[>svg]` adjusts its padding). A size class on the icon is redundant and overrides that default.

Incorrect:

```tsx
<Button>
  <Retry className="size-4" />
  {t('actions.retry')}
</Button>
```

Correct:

```tsx
<Button>
  <Retry />
  {t('actions.retry')}
</Button>
```

Use `<Icon size="…">` (`sm`, `md`, `lg`, `xl`) only for a standalone icon.

**Convention (not enforced).**

## Use `<Icon>` for standalone icons

Outside a component that sizes its SVG, use `<Icon>`. It gives a uniform size from the icon scale and the right accessibility default: pass `label` when the icon carries meaning (it gets `role="img"` and an `aria-label`), and leave it off when the icon is purely decorative (it gets `aria-hidden`).

Incorrect:

```tsx
<Offline className="size-5 text-warning" />
```

Correct:

```tsx
<Icon icon={Offline} size="lg" label={t('status.offline')} className="text-warning" />
<Icon icon={Dot} size="sm" />
```

**Convention (not enforced).**
