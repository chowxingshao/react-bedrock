import { defineConfig } from 'orval';

/**
 * API codegen (spec §6.3, docs/api-codegen.md). Run `pnpm codegen:api` after the spec changes.
 * `input.target` may also be your backend's spec URL, e.g. 'https://api.example.com/openapi.json'.
 */
export default defineConfig({
  api: {
    input: { target: './openapi/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios', // Orval 8 defaults to fetch; the shared instance is Axios
      clean: true,
      urlEncodeParameters: true, // `/items/${encodeURIComponent(String(itemId))}`, like the hand-written client
      override: {
        mutator: { path: './src/core/api/mutator.ts', name: 'customInstance' },
        // No `useQuery: true`: it turns POST/PATCH/DELETE into query hooks that send the write on mount.
        query: { useSuspenseQuery: true, signal: true },
      },
    },
  },
  apiZod: {
    input: { target: './openapi/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/zod',
      client: 'zod',
      fileExtension: '.zod.ts',
      clean: true,
    },
  },
});
