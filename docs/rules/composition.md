# Composition rules

Build screens from the components this repo owns: the primitives in `src/components/ui/` and the async states in `src/components/feedback/`. Reach for custom markup only when no primitive fits. Each rule shows an Incorrect and a Correct form. These are conventions reviewers watch for: no lint rule or test checks them.

## Use the primitives, not custom markup

A hand-rolled divider, skeleton or status pill drifts from the design tokens and misses the primitive's accessibility defaults. Use `Separator`, `Skeleton` and `Badge`.

Incorrect:

```tsx
<>
  <hr className="my-4 border-border" />
  <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
  <span className="rounded-md bg-success px-2 py-0.5 text-xs text-success-foreground">
    {t('status.active')}
  </span>
</>
```

Correct:

```tsx
<>
  <Separator className="my-4" />
  <Skeleton className="h-4 w-32" />
  <Badge variant="success">{t('status.active')}</Badge>
</>
```

**Convention (not enforced).**

## `Button` has no `isLoading`: compose `Spinner`

`Button` has no loading prop. Disable it while the request is pending and render a `Spinner` beside the label. Disabling also blocks a second click.

Incorrect:

```tsx
<Button isLoading={mutation.isPending}>{t('actions.save')}</Button>
```

Correct:

```tsx
<Button disabled={mutation.isPending}>
  {mutation.isPending ? <Spinner aria-hidden="true" /> : null}
  {t('actions.save')}
</Button>
```

`src/features/example/components/delete-item-button.tsx` is the reference: its `button` variant swaps the icon for a `Spinner` while `deleteItem.isPending` and disables the button. The `Spinner` is decorative (`aria-hidden`) because the label already names the action.

**Convention (not enforced).**

## Overlay choice

Pick the overlay by what the user is doing, not by how it looks.

| Component      | Use it for                                                             |
| -------------- | ---------------------------------------------------------------------- |
| `Dialog`       | A focused task in a modal that traps focus (an edit form, a picker).   |
| `AlertDialog`  | A destructive or irreversible confirmation. See `useConfirm` below.    |
| `Sheet`        | A panel anchored to a screen edge (filters, a secondary detail view).  |
| `Popover`      | Transient UI anchored to a trigger (a date picker, a small form).      |
| `Tooltip`      | A short hint on hover or focus. Never the only home of essential text. |
| `DropdownMenu` | A list of actions or a selection menu opened from a trigger.           |

To confirm a destructive action from code, call `useConfirm` from `@/core/notify` instead of building an `AlertDialog` by hand. `DeleteItemButton` does this with `confirm({ …, destructive: true })`.

Incorrect:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('delete.title')}</DialogTitle>
    </DialogHeader>
    <Button variant="destructive" onClick={remove}>
      {t('delete.confirm')}
    </Button>
  </DialogContent>
</Dialog>
```

Correct:

```tsx
const confirm = useConfirm();

const handleClick = async () => {
  const confirmed = await confirm({
    title: t('delete.title'),
    description: t('delete.description'),
    confirmLabel: t('delete.confirm'),
    destructive: true,
  });
  if (confirmed) remove();
};
```

**Convention (not enforced).**

## `Dialog` and `Sheet` need a title

A modal overlay is announced by its title: without one, a screen reader reads an unnamed dialog. Always render `DialogTitle` (or `SheetTitle`), and add `DialogDescription` (or `SheetDescription`) when the purpose needs a sentence. If the design shows no visible heading, hide the title with `sr-only` rather than dropping it.

Incorrect:

```tsx
<Dialog>
  <DialogContent>
    <ItemForm submitLabel={t('actions.save')} onSubmit={save} />
  </DialogContent>
</Dialog>
```

Correct:

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('edit.title')}</DialogTitle>
      <DialogDescription>{t('edit.description')}</DialogDescription>
    </DialogHeader>
    <ItemForm submitLabel={t('actions.save')} onSubmit={save} />
  </DialogContent>
</Dialog>
```

The same applies to `Sheet`: `SheetContent` → `SheetHeader` → `SheetTitle` and `SheetDescription`.

**Convention (not enforced).**

## Card anatomy

Lay a card out with its parts, so spacing, the title style and the action slot come from the component. The parts are `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent` and `CardFooter`; `Card` takes an `elevation` variant (`default`, `flat`, `outline`, `raised`).

Incorrect:

```tsx
<Card>
  <div className="px-6">
    <div className="font-semibold">{t('billing.title')}</div>
    <div className="text-sm text-muted-foreground">{t('billing.description')}</div>
  </div>
  <div className="px-6">{children}</div>
</Card>
```

Correct:

```tsx
<Card>
  <CardHeader>
    <CardTitle>{t('billing.title')}</CardTitle>
    <CardDescription>{t('billing.description')}</CardDescription>
    <CardAction>
      <Button variant="outline">{t('actions.edit')}</Button>
    </CardAction>
  </CardHeader>
  <CardContent>{children}</CardContent>
  <CardFooter>
    <Button>{t('actions.save')}</Button>
  </CardFooter>
</Card>
```

`CardTitle` renders a `div`, not a heading. A page keeps exactly one `h1` (`PageHeader`); give a card its own heading element only when the outline needs one.

**Convention (not enforced).**

## Empty, error and loading go through our states

Do not write bespoke "no data" or "something went wrong" markup. `EmptyState` and `ErrorState` are the standard views; `QueryState` covers loading, empty, error and success for a TanStack Query result in one place (`AsyncBoundary` does the same around a suspending subtree). Use the skeleton presets (`ListSkeleton`, `TableSkeleton`, `CardSkeleton`, `DetailSkeleton`, `FormSkeleton`) for a loading shape that matches the content. All of them come from `@/components/feedback`.

Incorrect:

```tsx
if (query.isPending) return <p>{t('common:loading')}</p>;
if (query.isError) return <p className="text-destructive">{t('common:error')}</p>;
if (query.data.length === 0) return <div>{t('items:none')}</div>;
return <ItemList items={query.data} />;
```

Correct:

```tsx
<QueryState
  query={query}
  empty={<EmptyState title={t('items:empty.title')} action={<CreateItemButton />} />}
>
  {(items) => <ItemList items={items} />}
</QueryState>
```

`QueryState` shows its loading view after a short delay, keeps data it already has over a failed background refetch, and wires "Try again" to `query.refetch()`. See [docs/data-fetching.md](../data-fetching.md) for how queries are written and [docs/forms.md](../forms.md) for form pending states.

**Convention (not enforced).**
