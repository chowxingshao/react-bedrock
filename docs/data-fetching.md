# Data fetching

## Rendering async state: `QueryState`

Every async view handles loading, empty, error and success (spec Principle 4). `QueryState` does it for you:

```tsx
<QueryState
  query={itemsQuery}
  loading={<TableSkeleton rows={10} />}
  empty={<EmptyState title={t('items:list.empty')} />}
  isEmpty={(data) => data.items.length === 0}
>
  {(data) => <ItemsTable data={data.items} />}
</QueryState>
```

- **Minimal usage:** `<QueryState query={q}>{(data) => …}</QueryState>`. Every slot has a default:

  | Slot    | Default                                             |
  | ------- | --------------------------------------------------- |
  | loading | `PageLoader`                                        |
  | empty   | `EmptyState` (used for `null` and `[]`)             |
  | error   | `ErrorState` with **Try again** → `query.refetch()` |

- **No skeleton flash:** loading UI appears only after 200 ms (`SKELETON_DELAY_MS`), so fast responses never flash a skeleton.
- **Cached data wins:** if a background refetch fails while data is cached, the cached data stays on screen; the global error handler reports the failure.
- **Custom error slot:** pass `error={(err, retry) => …}` to take over the error view.
