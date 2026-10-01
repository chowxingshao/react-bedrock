import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';

import { useDocumentTitle } from './use-document-title';

describe('useDocumentTitle', () => {
  it('sets "<title> · <app name>", or just the app name', () => {
    // The Props type is explicit so that `rerender` accepts `undefined` (initialProps would fix it to string).
    const { rerender } = renderHook<unknown, { title: string | undefined }>(
      ({ title }) => {
        useDocumentTitle(title);
      },
      { initialProps: { title: 'Items' } },
    );
    expect(document.title).toBe(`Items · ${env.VITE_APP_NAME}`);

    rerender({ title: undefined });
    expect(document.title).toBe(env.VITE_APP_NAME);
  });
});
