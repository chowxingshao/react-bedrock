# API code generation (Orval)

`pnpm codegen:api` reads the OpenAPI spec and writes typed clients to `src/api/generated/`:

| Output                     | Contents                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `endpoints/<tag>/<tag>.ts` | request functions, query hooks (`useGetItem`, `useListItems`, `…Suspense` variants, `get…QueryKey` helpers) and mutation hooks (`useCreateItem`, `useUpdateItem`, `useDeleteItem`)         |
| `model/`                   | TypeScript types for every schema                                                                                                                                                          |
| `zod/`                     | Zod schemas for every request and response. They are not applied automatically: call `ListItemsResponse.parse(data)` yourself where you want the contract checked at runtime (Principle 6) |

- **Generated files are committed** and excluded from ESLint, Prettier, the design-token guard and test coverage. Never edit them by hand; change the spec and regenerate. The output is deterministic, so a clean `git status --porcelain -- src/api/generated` after `pnpm codegen:api` means the committed files are up to date. A CI check for that is planned.
- **The spec:** `orval.config.ts` points at `openapi/openapi.yaml`, a local fixture that mirrors the MSW mocks: their success shapes, status codes and limits. For a real backend, set `input.target` to its spec file or URL, and put the server's base path in `VITE_API_BASE_URL` (generated URLs start at the path, e.g. `/items`).
- **Two options in `orval.config.ts` matter:** `urlEncodeParameters: true` encodes path parameters like the hand-written client does, and `override.query.useQuery` stays unset. With `useQuery: true`, Orval turns every POST, PATCH and DELETE into a query hook that sends the write as soon as the component mounts.

## Why the generated hooks behave like the rest of the app

Orval's **custom mutator** (`src/core/api/mutator.ts`) sends every generated call through the shared `http` instance. So generated calls get:

- the auth refresh on 401
- `X-Request-Id` and `Accept-Language`
- `AppError` normalisation and the 403 / offline toasts
- logging

`src/api/generated-client.test.tsx` proves the headers, the `AppError` normalisation, the path encoding and that a mutation sends nothing until it is called.

```tsx
import { useCreateItem, useListItems } from '@/api/generated/endpoints/items/items';

const { data } = useListItems({ page: 1, pageSize: 20 });

// A failed mutation toasts through the global handler. Pass `meta: { silent: true }` to handle it yourself.
const create = useCreateItem({ mutation: { meta: { silent: true } } });
create.mutate({ data: { name: 'Desk', description: '', status: 'draft', price: 1, quantity: 1 } });
```

Generated mutations do not touch the cache. Invalidate in `onSuccess`, for example `queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() })`: the key is a prefix of every list key, like `itemKeys.lists()` in the hand-written client.

## No OpenAPI spec? Hand-write the service

The reference feature does exactly this (`src/features/example/api/`):

1. `items-api.ts`: functions that call `http` and validate responses with Zod.
2. `item-keys.ts`: a query key factory.
3. `item-queries.ts`: `queryOptions` with `signal`.
4. `hooks/`: `useQuery` / `useMutation` wrappers.

The patterns are the same, but the generated hooks are not drop-in replacements: they return the raw response (no Zod check, no `keepPreviousData`), take mutation variables as `{ data }` or `{ itemId }`, and use their own query keys (`['/items', params]`, not `itemKeys`). To move a feature to codegen, wrap the generated functions in the feature's `hooks/` and keep the hook names, so components do not change.
