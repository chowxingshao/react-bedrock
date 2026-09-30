import { describe, expect, it } from 'vitest';

import { toStoragePrefix } from './prefix';

describe('toStoragePrefix', () => {
  it.each([
    ['React Bedrock', 'react-bedrock:'],
    ['  My App 2.0 ', 'my-app-2-0:'],
    ['!!!', 'app:'],
  ])('turns %j into %j', (appName, prefix) => {
    expect(toStoragePrefix(appName)).toBe(prefix);
  });
});
