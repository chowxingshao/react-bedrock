# Design System v2 — Phase 2 (Component variants) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add additive, token-consuming variant axes — `shape` and `tone` (Button, Badge), `shape` + `size` (Input), `elevation` (Card), and an aligned `size` scale (Select trigger) — so a project can reshape and re-tone its controls without touching markup, with every axis defaulting to today's appearance.

**Architecture:** Each component expresses its axes through a `class-variance-authority` (`cva`) config (`Button`/`Badge` already have one; `Input`/`Card` gain one). New size axes consume the Phase-1 `--control-h-*` density tokens via Tailwind v4's `h-(--token)` arbitrary-property syntax (already used in `calendar.tsx`). `tone` is composed onto the existing intent `variant` with `compoundVariants`; `tailwind-merge` (via `cn`) resolves the colour overrides because cva appends compound classes after base/variant classes. Every new axis has a default value that reproduces the current rendered output, so existing usages are visually unchanged.

**Tech Stack:** React 19, TypeScript 6 (strict), Tailwind CSS v4 (4.3.3), class-variance-authority, tailwind-merge (through `@/lib/cn`), Vitest + Testing Library, Storybook 10.

**Spec:** `docs/superpowers/specs/2026-10-15-design-system-v2-design.md` (§5 "Phase 2 — Component variants", lines 155–177; cross-cutting a11y/back-compat in §6).

## Global Constraints

Every task's requirements implicitly include this section.

- **Back-compat (hard rule):** every new axis defaults to the current appearance; no existing screen changes visually at default values. New axes are additive, optional props. Keep all existing `variant`/`size` names working. (spec §6 "Back-compat".)
- **Tokens only:** no hex, no raw Tailwind palette classes, no arbitrary pixel values (`[...px]`), no raw `z-<n>` / `duration-<n>`. Enforced by `src/test/design-tokens.guard.test.ts`. The `h-(--control-h-*)` syntax is a token reference (parentheses, no `px` literal) and is allowed — it is already used in `src/components/ui/calendar.tsx`.
- **Styling:** design values come from `src/styles/tokens.css` through token-backed utilities. Conditional classes go through `cn` from `@/lib/cn`. (CLAUDE.md rules 1–2.)
- **Imports:** use the `@/` alias across folders; import `cn` from `@/lib/cn`, `cva`/`VariantProps` from `class-variance-authority`.
- **Text:** no new user-facing runtime copy is introduced. Storybook story labels are developer-facing and need not be translated (they are not shipped). Do not add untranslated user-facing strings to components.
- **Gates (every task):** `pnpm lint && pnpm typecheck && pnpm test` must be green before the task's commit.
- **Commits:** Conventional Commits; end every commit message body with exactly:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **`tone` scope decision (resolves spec §8 open item):** `tone` (`solid` | `soft` | `outline`) is defined only for the **primary** (`variant="default"`) and **destructive** intents, on both Button and Badge. For any other `variant`, `tone` is a no-op (the base variant renders unchanged). Rationale: `soft` renders `bg-<intent>/10 text-<intent>`; the lighter intents (`success`, `warning`, `info`) cannot hold 4.5:1 as text on a tint, which would break spec §6's a11y gate. Widening the subset is deferred to a Phase-6-showcase-driven follow-up with tuned soft colours.
- **`solid` is the default tone and adds nothing** — the existing filled variant classes are the `solid` look.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/components/ui/button.tsx` | Modify | Add `shape` + `tone` axes to `buttonVariants`; emit `data-shape`/`data-tone`. |
| `src/components/ui/button.test.tsx` | Modify | Cover `shape` classes + `tone` compound overrides + unchanged defaults. |
| `src/components/ui/button.stories.tsx` | Modify | Add a Shapes story and a Tones story. |
| `src/components/ui/badge.tsx` | Modify | Add `shape` + `tone` axes to `badgeVariants`; emit `data-shape`/`data-tone`. |
| `src/components/ui/badge.test.tsx` | Modify | Cover `shape` + `tone`. |
| `src/components/ui/badge.stories.tsx` | Modify | Add Shapes + Tones stories. |
| `src/components/ui/input.tsx` | Modify | Introduce `inputVariants` cva; add `shape` + `size` (control-h tokens); `Omit` native `size`. |
| `src/components/ui/input.test.tsx` | Create | Cover `shape` + `size` + default (`md`/`default` = today). |
| `src/components/ui/input.stories.tsx` | Modify | Add Shapes + Sizes stories. |
| `src/components/ui/card.tsx` | Modify | Introduce `cardVariants` cva; add `elevation`; emit `data-elevation`. |
| `src/components/ui/card.test.tsx` | Create | Cover `elevation` values + default = today (`border shadow-sm`). |
| `src/components/ui/card.stories.tsx` | Modify | Add an Elevations story. |
| `src/components/ui/select.tsx` | Modify | Align `SelectTrigger` size scale to `sm`\|`md`\|`lg` via control-h tokens. |
| `src/components/ui/select.test.tsx` | Create | Cover the three sizes + default (`md` = h-9). |
| `src/components/ui/data-table.tsx` | Modify | `SelectTrigger size="sm"` already valid — no change needed; verify only. |
| `src/styles/globals.test.ts` | Create | Regression guard: `globals.css` keeps `--default-border-width: var(--border-width)` wired (Phase-1 watch-item a). |
| `CHANGELOG.md` | Modify | One Phase-2 entry with migration notes. |
| `docs/design-system.md` | Modify | Document the new variant axes. |

---

### Task 1: Button — `shape` and `tone` axes

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/button.test.tsx`
- Modify: `src/components/ui/button.stories.tsx`

**Interfaces:**
- Consumes: nothing from other Phase-2 tasks. Uses `cva`, `VariantProps` (already imported), `cn` from `@/lib/cn`, radius utilities `rounded-none|rounded-md|rounded-lg|rounded-full`, colour utilities `bg-primary/10`, `text-primary`, `border-primary`, `bg-background`, `bg-destructive/10`, `text-destructive`, `border-destructive`.
- Produces: `buttonVariants` gains axes `shape: 'default' | 'rounded' | 'pill' | 'square'` (default `'default'`) and `tone: 'solid' | 'soft' | 'outline'` (default `'solid'`). `Button` accepts optional `shape` and `tone` props and renders `data-shape` / `data-tone`. Existing `variant`/`size` unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ui/button.test.tsx` (inside the existing `describe('Button', …)` block):

```tsx
const SHAPE_CLASS = {
  default: 'rounded-md',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
  square: 'rounded-none',
} as const;

it.each(['default', 'rounded', 'pill', 'square'] as const)('applies the %s shape', (shape) => {
  const classes = buttonVariants({ shape }).split(/\s+/);
  expect(classes).toContain(SHAPE_CLASS[shape]);
});

it('defaults to the default shape and solid tone', () => {
  render(<Button>Save</Button>);
  const button = screen.getByRole('button', { name: 'Save' });
  expect(button).toHaveAttribute('data-shape', 'default');
  expect(button).toHaveAttribute('data-tone', 'solid');
  expect(button).toHaveClass('rounded-md');
});

it('soft tone tints the primary intent and drops the solid fill', () => {
  render(
    <Button tone="soft">Soft</Button>,
  );
  const button = screen.getByRole('button', { name: 'Soft' });
  // cn() + tailwind-merge keep the compound override and drop the solid bg/text.
  expect(button).toHaveClass('bg-primary/10', 'text-primary');
  expect(button).not.toHaveClass('bg-primary');
  expect(button).not.toHaveClass('text-primary-foreground');
});

it('outline tone borders the destructive intent', () => {
  render(
    <Button variant="destructive" tone="outline">
      Delete
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Delete' });
  expect(button).toHaveClass('border-destructive', 'text-destructive');
  expect(button).not.toHaveClass('bg-destructive');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/ui/button.test.tsx`
Expected: FAIL — `data-shape`/`data-tone` attributes absent; `shape`/`tone` not valid cva keys; soft/outline overrides not present.

- [ ] **Step 3: Implement the axes in `button.tsx`**

In `src/components/ui/button.tsx`, (a) remove the hardcoded `rounded-md` from the base class string (line 9) and from the `sm` and `lg` size entries (lines 22, 24), (b) add the `shape` and `tone` variants plus `compoundVariants`, and (c) thread the props. The `buttonVariants` call becomes:

```tsx
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        md: 'h-9 px-4 py-2 has-[>svg]:px-3',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
      shape: {
        default: 'rounded-md',
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
      // Empty by design: the solid look is the base variant; soft/outline are
      // supplied per-intent in compoundVariants (see the Global Constraints
      // "tone scope" note — primary + destructive only).
      tone: {
        solid: '',
        soft: '',
        outline: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        tone: 'soft',
        class: 'bg-primary/10 text-primary shadow-none hover:bg-primary/20',
      },
      {
        variant: 'default',
        tone: 'outline',
        class: 'border border-primary bg-background text-primary shadow-xs hover:bg-primary/10',
      },
      {
        variant: 'destructive',
        tone: 'soft',
        class: 'bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20',
      },
      {
        variant: 'destructive',
        tone: 'outline',
        class:
          'border border-destructive bg-background text-destructive shadow-xs hover:bg-destructive/10',
      },
    ],
    defaultVariants: { variant: 'default', size: 'md', shape: 'default', tone: 'solid' },
  },
);
```

Then update the component to accept and reflect the new axes:

```tsx
function Button({
  className,
  variant = 'default',
  size = 'md',
  shape = 'default',
  tone = 'solid',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      data-tone={tone}
      className={cn(buttonVariants({ variant, size, shape, tone, className }))}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/ui/button.test.tsx`
Expected: PASS (all existing Button tests plus the four new ones).

- [ ] **Step 5: Add stories for the new axes**

In `src/components/ui/button.stories.tsx`, add `shape`/`tone` to `argTypes` and two matrix stories. Append:

```tsx
const SHAPES = ['default', 'rounded', 'pill', 'square'] as const;
const TONES = ['solid', 'soft', 'outline'] as const;

export const Shapes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {SHAPES.map((shape) => (
        <Button key={shape} {...args} shape={shape}>
          {shape}
        </Button>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {(['default', 'destructive'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          {TONES.map((tone) => (
            <Button key={tone} {...args} variant={variant} tone={tone}>
              {variant} · {tone}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
```

Also extend the `argTypes` object:

```tsx
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: [...TEXT_SIZES, 'icon'] },
    shape: { control: 'select', options: SHAPES },
    tone: { control: 'select', options: TONES },
  },
```

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/button.test.tsx src/components/ui/button.stories.tsx
git commit -m "feat: add shape and tone axes to Button"
```

---

### Task 2: Badge — `shape` and `tone` axes

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/badge.test.tsx`
- Modify: `src/components/ui/badge.stories.tsx`

**Interfaces:**
- Consumes: same utilities as Task 1. Independent of Task 1's code.
- Produces: `badgeVariants` gains `shape: 'default' | 'rounded' | 'pill' | 'square'` (default `'default'`) and `tone: 'solid' | 'soft' | 'outline'` (default `'solid'`, defined for `default` and `destructive` intents only). `Badge` accepts optional `shape`/`tone` and renders `data-shape`/`data-tone`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ui/badge.test.tsx` (inside `describe('Badge', …)`):

```tsx
const SHAPE_CLASS = {
  default: 'rounded-md',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
  square: 'rounded-none',
} as const;

it.each(['default', 'rounded', 'pill', 'square'] as const)('applies the %s shape', (shape) => {
  render(
    <Badge shape={shape}>Shape</Badge>,
  );
  expect(screen.getByText('Shape')).toHaveClass(SHAPE_CLASS[shape]);
});

it('defaults to the default shape and solid tone', () => {
  render(<Badge>Badge</Badge>);
  const badge = screen.getByText('Badge');
  expect(badge).toHaveAttribute('data-shape', 'default');
  expect(badge).toHaveAttribute('data-tone', 'solid');
  expect(badge).toHaveClass('rounded-md');
});

it('soft tone tints the primary intent', () => {
  render(
    <Badge tone="soft">Soft</Badge>,
  );
  const badge = screen.getByText('Soft');
  expect(badge).toHaveClass('bg-primary/10', 'text-primary');
  expect(badge).not.toHaveClass('bg-primary');
});

it('outline tone borders the destructive intent', () => {
  render(
    <Badge variant="destructive" tone="outline">
      Out
    </Badge>,
  );
  const badge = screen.getByText('Out');
  expect(badge).toHaveClass('border-destructive', 'text-destructive');
  expect(badge).not.toHaveClass('bg-destructive');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/ui/badge.test.tsx`
Expected: FAIL — `shape`/`tone` unknown; attributes absent.

- [ ] **Step 3: Implement the axes in `badge.tsx`**

Remove the hardcoded `rounded-md` from the base string (line 8; keep the base `border`), then add the axes and compounds. `badgeVariants` becomes:

```tsx
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        success: 'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
        warning: 'border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90',
        info: 'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
      shape: {
        default: 'rounded-md',
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
      tone: {
        solid: '',
        soft: '',
        outline: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        tone: 'soft',
        class: 'border-transparent bg-primary/10 text-primary [a&]:hover:bg-primary/20',
      },
      {
        variant: 'default',
        tone: 'outline',
        class: 'border-primary bg-transparent text-primary [a&]:hover:bg-primary/10',
      },
      {
        variant: 'destructive',
        tone: 'soft',
        class: 'border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20',
      },
      {
        variant: 'destructive',
        tone: 'outline',
        class: 'border-destructive bg-transparent text-destructive [a&]:hover:bg-destructive/10',
      },
    ],
    defaultVariants: { variant: 'default', shape: 'default', tone: 'solid' },
  },
);
```

Update the component:

```tsx
function Badge({
  className,
  variant = 'default',
  shape = 'default',
  tone = 'solid',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-shape={shape}
      data-tone={tone}
      className={cn(badgeVariants({ variant, shape, tone }), className)}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/ui/badge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add stories**

In `src/components/ui/badge.stories.tsx`, append:

```tsx
const SHAPES = ['default', 'rounded', 'pill', 'square'] as const;
const TONES = ['solid', 'soft', 'outline'] as const;

export const Shapes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {SHAPES.map((shape) => (
        <Badge key={shape} {...args} shape={shape}>
          {shape}
        </Badge>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {(['default', 'destructive'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          {TONES.map((tone) => (
            <Badge key={tone} {...args} variant={variant} tone={tone}>
              {variant} · {tone}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};
```

And extend `argTypes`:

```tsx
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    shape: { control: 'select', options: SHAPES },
    tone: { control: 'select', options: TONES },
  },
```

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/badge.test.tsx src/components/ui/badge.stories.tsx
git commit -m "feat: add shape and tone axes to Badge"
```

---

### Task 3: Input — `cva`, `shape`, and `size` (control-h tokens)

**Files:**
- Modify: `src/components/ui/input.tsx`
- Create: `src/components/ui/input.test.tsx`
- Modify: `src/components/ui/input.stories.tsx`

**Interfaces:**
- Consumes: Phase-1 tokens `--control-h-sm` (`2rem`), `--control-h-md` (`2.25rem` = today's `h-9`), `--control-h-lg` (`2.5rem`), referenced as `h-(--control-h-sm|md|lg)`.
- Produces: `inputVariants` cva with `size: 'sm' | 'md' | 'lg'` (default `'md'`) and `shape: 'default' | 'rounded' | 'pill' | 'square'` (default `'default'`). `Input`'s props type **omits** the native HTML `size` attribute (a `number`) to avoid a type collision, then adds the variant props. `Input` renders `data-size`/`data-shape`. `inputVariants` is exported for reuse (e.g. Select could consume it later; not required here).

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/input.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './input';

describe('Input', () => {
  it('defaults to md size and default shape (today’s look)', () => {
    render(<Input aria-label="field" />);
    const input = screen.getByLabelText('field');
    expect(input).toHaveAttribute('data-size', 'md');
    expect(input).toHaveAttribute('data-shape', 'default');
    expect(input).toHaveClass('h-(--control-h-md)', 'rounded-md');
  });

  it.each([
    ['sm', 'h-(--control-h-sm)'],
    ['md', 'h-(--control-h-md)'],
    ['lg', 'h-(--control-h-lg)'],
  ] as const)('applies the %s size height', (size, heightClass) => {
    render(<Input aria-label="field" size={size} />);
    expect(screen.getByLabelText('field')).toHaveClass(heightClass);
  });

  it.each([
    ['default', 'rounded-md'],
    ['rounded', 'rounded-lg'],
    ['pill', 'rounded-full'],
    ['square', 'rounded-none'],
  ] as const)('applies the %s shape', (shape, radiusClass) => {
    render(<Input aria-label="field" shape={shape} />);
    expect(screen.getByLabelText('field')).toHaveClass(radiusClass);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/ui/input.test.tsx`
Expected: FAIL — `data-size`/`data-shape` absent; `size`/`shape` props not recognised.

- [ ] **Step 3: Implement the cva in `input.tsx`**

Replace the whole file with:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/cn';

/** Size consumes the Phase-1 density tokens: md = today's h-9. */
const inputVariants = cva(
  'w-full min-w-0 border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive dark:bg-input/30',
  {
    variants: {
      size: {
        sm: 'h-(--control-h-sm)',
        md: 'h-(--control-h-md)',
        lg: 'h-(--control-h-lg)',
      },
      shape: {
        default: 'rounded-md',
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
    },
    defaultVariants: { size: 'md', shape: 'default' },
  },
);

function Input({
  className,
  type,
  size = 'md',
  shape = 'default',
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      data-shape={shape}
      className={cn(inputVariants({ size, shape }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
```

Note: the base string drops the old `h-9` and `rounded-md` (now owned by the axes). The default `size="md"` → `h-(--control-h-md)` = `2.25rem` = `h-9`; `shape="default"` → `rounded-md`. Visually identical to today.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/ui/input.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify no in-repo caller relied on the native `size` attribute**

Run: `git grep -nE "<Input[^>]*\\bsize=\\{?[0-9]" -- src`
Expected: no matches (nobody passes a numeric `size`). If a match appears, convert that usage to a CSS width class (e.g. `className="w-…"`) in the same commit and note it in the Task 7 CHANGELOG entry.

- [ ] **Step 6: Add stories**

In `src/components/ui/input.stories.tsx`, append:

```tsx
const SIZES = ['sm', 'md', 'lg'] as const;
const SHAPES = ['default', 'rounded', 'pill', 'square'] as const;

export const Sizes: Story = {
  render: (args) => (
    <div className="grid w-72 gap-3">
      {SIZES.map((size) => (
        <Input key={size} {...args} size={size} placeholder={size} />
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: (args) => (
    <div className="grid w-72 gap-3">
      {SHAPES.map((shape) => (
        <Input key={shape} {...args} shape={shape} placeholder={shape} />
      ))}
    </div>
  ),
};
```

And extend the `meta` with `argTypes`:

```tsx
  argTypes: {
    size: { control: 'select', options: SIZES },
    shape: { control: 'select', options: SHAPES },
  },
```

(Declare `SIZES`/`SHAPES` above `meta`, or inline the options.)

- [ ] **Step 7: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/input.test.tsx src/components/ui/input.stories.tsx
git commit -m "feat: add cva with shape and size axes to Input"
```

---

### Task 4: Card — `cva` and `elevation` axis

**Files:**
- Modify: `src/components/ui/card.tsx`
- Create: `src/components/ui/card.test.tsx`
- Modify: `src/components/ui/card.stories.tsx`

**Interfaces:**
- Consumes: shadow utilities `shadow-none|shadow-sm|shadow-md`; `border`. Independent of other tasks.
- Produces: `cardVariants` cva with `elevation: 'default' | 'flat' | 'outline' | 'raised'` (default `'default'` = today's `border shadow-sm`). `Card` accepts optional `elevation`, renders `data-elevation`. `cardVariants` exported. Sub-components (`CardHeader` …) unchanged.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, cardVariants } from './card';

describe('Card', () => {
  it('defaults to the default elevation (today’s border + shadow-sm)', () => {
    render(<Card>Body</Card>);
    const card = screen.getByText('Body');
    expect(card).toHaveAttribute('data-elevation', 'default');
    expect(card).toHaveClass('border', 'shadow-sm');
  });

  it.each([
    ['default', ['border', 'shadow-sm']],
    ['flat', ['shadow-none']],
    ['outline', ['border', 'shadow-none']],
    ['raised', ['border', 'shadow-md']],
  ] as const)('applies the %s elevation', (elevation, expectedClasses) => {
    const classes = cardVariants({ elevation }).split(/\s+/);
    for (const expected of expectedClasses) {
      expect(classes).toContain(expected);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/ui/card.test.tsx`
Expected: FAIL — `cardVariants` not exported; `elevation`/`data-elevation` absent.

- [ ] **Step 3: Implement the cva in `card.tsx`**

Replace the `Card` function (lines 5–16) and add imports/exports; leave `CardHeader`…`CardFooter` untouched. The top of the file becomes:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/cn';

/** Elevation owns the border + shadow; default = today's border + shadow-sm. */
const cardVariants = cva('flex flex-col gap-6 rounded-xl bg-card py-6 text-card-foreground', {
  variants: {
    elevation: {
      default: 'border shadow-sm',
      flat: 'shadow-none',
      outline: 'border shadow-none',
      raised: 'border shadow-md',
    },
  },
  defaultVariants: { elevation: 'default' },
});

function Card({
  className,
  elevation = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-elevation={elevation}
      className={cn(cardVariants({ elevation }), className)}
      {...props}
    />
  );
}
```

Update the final export line (line 75) to include `cardVariants`:

```tsx
export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
```

Note: the base string drops the old `border shadow-sm` (now owned by `elevation`); default `elevation="default"` restores exactly `border shadow-sm`. Visually identical to today.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/ui/card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add an Elevations story**

In `src/components/ui/card.stories.tsx`, append:

```tsx
export const Elevations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(['default', 'flat', 'outline', 'raised'] as const).map((elevation) => (
        <Card key={elevation} elevation={elevation} className="w-56">
          <CardHeader>
            <CardTitle>{elevation}</CardTitle>
            <CardDescription>elevation={elevation}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
};
```

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/card.test.tsx src/components/ui/card.stories.tsx
git commit -m "feat: add cva with elevation axis to Card"
```

---

### Task 5: Select trigger — align `size` to `sm | md | lg` (control-h tokens)

**Files:**
- Modify: `src/components/ui/select.tsx`
- Create: `src/components/ui/select.test.tsx`
- Modify: `src/components/ui/select.stories.tsx`

**Interfaces:**
- Consumes: Phase-1 `--control-h-*` tokens via `data-[size=…]:h-(--control-h-…)`.
- Produces: `SelectTrigger`'s `size` prop type changes from `'sm' | 'default'` to `'sm' | 'md' | 'lg'`, default `'md'` (previously `'default'`). `md` reproduces the old `default` height (`h-9`). The `data-size` attribute now reads `sm`/`md`/`lg`. **Back-compat note:** `size="default"` is no longer valid; callers used `size="sm"` only (verified: `data-table.tsx:225`, `select.stories.tsx:51`), so no in-repo call breaks. This is a documented migration note for downstream.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/select.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Select, SelectTrigger, SelectValue } from './select';

function renderTrigger(props?: { size?: 'sm' | 'md' | 'lg' }) {
  render(
    <Select>
      <SelectTrigger aria-label="picker" {...props}>
        <SelectValue placeholder="Pick" />
      </SelectTrigger>
    </Select>,
  );
  return screen.getByLabelText('picker');
}

describe('SelectTrigger', () => {
  it('defaults to md size', () => {
    expect(renderTrigger()).toHaveAttribute('data-size', 'md');
  });

  it.each(['sm', 'md', 'lg'] as const)('reflects the %s size', (size) => {
    expect(renderTrigger({ size })).toHaveAttribute('data-size', size);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/ui/select.test.tsx`
Expected: FAIL — default `data-size` is currently `default`, and `size="md"`/`"lg"` are not accepted types.

- [ ] **Step 3: Update `SelectTrigger` in `select.tsx`**

Change the `SelectTrigger` signature and the height classes (lines 21–45). The size prop and class fragment become:

```tsx
function SelectTrigger({
  className,
  size = 'md',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive data-[placeholder]:text-muted-foreground data-[size=sm]:h-(--control-h-sm) data-[size=md]:h-(--control-h-md) data-[size=lg]:h-(--control-h-lg) *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
```

The only functional changes versus today: `data-[size=default]:h-9` → `data-[size=md]:h-(--control-h-md)` (identical height), `data-[size=sm]:h-8` → `data-[size=sm]:h-(--control-h-sm)` (identical height), the new `data-[size=lg]:h-(--control-h-lg)`, and the default/type `default` → `md`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/ui/select.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add an lg example to the Select story**

In `src/components/ui/select.stories.tsx`, add a story exercising `size="lg"` (and keep the existing `size="sm"` usage). Minimal addition:

```tsx
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Select key={size}>
          <SelectTrigger size={size} aria-label={`size ${size}`}>
            <SelectValue placeholder={size} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
            <SelectItem value="b">Option B</SelectItem>
          </SelectContent>
        </Select>
      ))}
    </div>
  ),
};
```

(Ensure `SelectContent`/`SelectItem` are imported in the story — add them to the existing import if absent.)

- [ ] **Step 6: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green (including `data-table.test.tsx`, which uses `SelectTrigger size="sm"`).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/select.tsx src/components/ui/select.test.tsx src/components/ui/select.stories.tsx
git commit -m "feat: align SelectTrigger size scale to sm/md/lg via control-h tokens"
```

---

### Task 6: Border-width wiring regression guard (Phase-1 watch-item a)

**Files:**
- Create: `src/styles/globals.test.ts`

**Interfaces:**
- Consumes: nothing. Reads `globals.css` as raw text (same `?raw` import pattern as `src/styles/tokens.test.ts`).
- Produces: a test that fails if the load-bearing Phase-1 border mechanism (`--default-border-width: var(--border-width)` in `@theme inline`) is ever removed — now justified because Phase-2's `tone="outline"` and Card `elevation` consume the tokenised `border`.

- [ ] **Step 1: Write the failing test**

Create `src/styles/globals.test.ts`:

```ts
import globals from './globals.css?raw';
import { describe, expect, it } from 'vitest';

/**
 * Phase-1 border mechanism (see docs/design-system.md): the bare `border`
 * utility reads --border-width only because globals.css wires Tailwind's
 * --default-border-width to it. Phase-2 variants (tone="outline", Card
 * elevation) depend on this, so guard it against silent removal.
 */
describe('globals.css border-width wiring', () => {
  it('maps the default border width to the --border-width token', () => {
    expect(globals).toMatch(/--default-border-width:\s*var\(--border-width\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes now, then that it can fail**

Run: `pnpm test -- src/styles/globals.test.ts`
Expected: PASS (the wiring is present from Phase 1).

To confirm the guard actually bites: temporarily delete the `--default-border-width: var(--border-width);` line from `src/styles/globals.css`, re-run the test, confirm it FAILS, then restore the line and re-run to PASS. (Do not commit the deletion.)

- [ ] **Step 3: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.test.ts
git commit -m "test: guard the tokenised default border-width wiring"
```

---

### Task 7: CHANGELOG, docs, and whole-phase verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/design-system.md`

**Interfaces:**
- Consumes: the axes shipped in Tasks 1–6.
- Produces: one Phase-2 CHANGELOG entry with migration notes; a documented "Variant axes" section in `docs/design-system.md`.

- [ ] **Step 1: Add the CHANGELOG entry**

Open `CHANGELOG.md` and add a new entry under the current unreleased/working section, matching the format of the existing Phase-1 entry. Content:

```markdown
### Design System v2 — Phase 2: Component variants

Additive variant axes; every axis defaults to the current appearance, so existing usages render unchanged.

- **Button / Badge:** new `shape` (`default` | `rounded` | `pill` | `square`) and `tone` (`solid` | `soft` | `outline`) props. `tone` is defined for the `default` (primary) and `destructive` intents; on other variants it is a no-op.
- **Input:** now `cva`-based with `shape` (same scale) and `size` (`sm` | `md` | `lg`) props; `size` consumes the Phase-1 `--control-h-*` density tokens (`md` = today's height).
- **Card:** new `elevation` prop (`default` | `flat` | `outline` | `raised`); `default` = today's border + `shadow-sm`.
- **Select:** `SelectTrigger`'s `size` scale is now `sm` | `md` | `lg` (default `md`), consuming the density tokens.

**Migration notes (downstream):**
- `Input` no longer accepts the native HTML `size` attribute (a character count); use a width class instead. The `size` prop is now the sm/md/lg variant.
- `SelectTrigger size="default"` is renamed to `size="md"` (identical height). Existing `size="sm"` is unchanged.
```

- [ ] **Step 2: Document the axes in `docs/design-system.md`**

Add a "Variant axes" subsection (follow the file's existing heading style and table conventions) listing, per component, each axis, its values, the default, and that defaults reproduce today's look. Include the note that `tone` soft/outline is scoped to primary + destructive for contrast reasons, and that adopting more intents requires a contrast check.

- [ ] **Step 3: Whole-phase gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 4: Confirm no visual regression surface for E2E**

The defaults preserve markup and default classes, so the axe E2E suite should be unaffected. Verify the reasoning holds (no key page passes a non-default `shape`/`tone`/`elevation`/`size`):

Run: `git grep -nE "(shape|tone|elevation)=" -- src/features src/app src/components/layout`
Expected: no non-default axis usage on shipped pages. If any appears, run `pnpm test:e2e` (after `pnpm exec playwright install chromium`, port 4173 free) to confirm axe still passes; otherwise E2E need not run for this phase.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md docs/design-system.md
git commit -m "docs: record Phase 2 component variants in changelog and design-system docs"
```

---

## Self-Review

**1. Spec coverage (§5 Phase 2):**
- `shape` on Button, Input, Badge → Tasks 1, 2, 3. ✅
- `tone` on Button and Badge (solid/soft/outline, composed with variant, back-compat) → Tasks 1, 2. ✅ (scope resolved: primary + destructive, per Global Constraints.)
- Card `elevation` (flat/outline/raised, default = border + shadow-sm) → Task 4. ✅ (default value added as the 4th enum member so cva has a valid default.)
- `size` on inputs (sm/md/lg via density/control-height tokens) on Input and Select trigger → Tasks 3, 5. ✅
- Back-compat: every axis defaults to current appearance → enforced per task via default-value tests and the Global Constraints. ✅
- Stories render the matrix → each component task adds stories. ✅
- Acceptance "token guard + a11y stories pass" → guard runs in every gate; a11y is covered by Storybook's a11y addon on the new stories; `tone` scope keeps contrast safe. ✅
- Phase-1 watch-item (a) border guard → Task 6. ✅

**2. Placeholder scan:** No `TBD`/`handle edge cases`/"similar to Task N"; every code step contains full code. ✅

**3. Type consistency:** `shape` enum (`default|rounded|pill|square`) and `tone` enum (`solid|soft|outline`) are identical across Button, Badge, Input (shape). `size` enum (`sm|md|lg`) identical across Input and Select. `cardVariants`/`inputVariants` export names match their test imports. `data-*` attribute names (`data-shape`, `data-tone`, `data-size`, `data-elevation`) are consistent. ✅

**Note carried into later phases:** Phase 5's `styling.md` rulebook should add "shape via the `shape` variant, not a `rounded-*` className" and "tone via the `tone` prop" rules, and document the primary/destructive `tone` scope. Phase 6's showcase should render the full variant × state matrices and surface any contrast gaps if `tone` is later widened.
