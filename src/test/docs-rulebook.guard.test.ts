import { describe, expect, it } from 'vitest';

/**
 * Phase-5 rulebook (spec §5 Phase 5): the rulebook + customization page exist, and the
 * customization page is linked from the two entry docs. Keeps the "make it yours" path discoverable.
 */
const docs = import.meta.glob<string>(
  ['/docs/rules/*.md', '/docs/customization.md', '/CLAUDE.md', '/README.md'],
  { query: '?raw', import: 'default', eager: true },
);

const read = (path: string) => docs[path] ?? '';

describe('rulebook + customization docs', () => {
  it('ships the four rulebook pages', () => {
    for (const name of ['styling', 'composition', 'forms', 'icons']) {
      expect(docs[`/docs/rules/${name}.md`], `missing docs/rules/${name}.md`).toBeTypeOf('string');
    }
  });

  it('ships the customization page', () => {
    expect(docs['/docs/customization.md']).toBeTypeOf('string');
  });

  it('links customization.md from CLAUDE.md and README.md', () => {
    expect(read('/CLAUDE.md')).toContain('docs/customization.md');
    expect(read('/README.md')).toContain('docs/customization.md');
  });
});
