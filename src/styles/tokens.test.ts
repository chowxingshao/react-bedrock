import { describe, expect, it } from 'vitest';

import tokensCss from './tokens.css?raw';

/** Returns the custom-property declarations of the first `<selector> { … }` block. */
function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector "${selector}" not found in tokens.css`);
  const end = css.indexOf('}', start);
  const body = css.slice(start + selector.length + 2, end);
  return new Map(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );
}

describe('tokens.css', () => {
  const light = declarations(tokensCss, ':root');
  const dark = declarations(tokensCss, '.dark');
  const fallback = declarations(tokensCss, ':root:not(.light):not(.dark)');

  it('defines the semantic tokens the spec requires', () => {
    const required = [
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--accent',
      '--muted',
      '--destructive',
      '--success',
      '--warning',
      '--info',
      '--background',
      '--foreground',
      '--border',
      '--input',
      '--ring',
      '--card',
      '--popover',
      '--radius',
      '--z-dropdown',
      '--z-sticky',
      '--z-modal',
      '--z-toast',
      '--duration-fast',
      '--duration-normal',
      '--duration-slow',
    ];
    expect(required.filter((name) => !light.has(name))).toEqual([]);
  });

  it('gives every light colour token a dark value', () => {
    const colourTokens = [...light]
      .filter(([, value]) => value.startsWith('oklch('))
      .map(([name]) => name);
    expect(colourTokens.length).toBeGreaterThan(20);
    expect(colourTokens.filter((name) => !dark.has(name))).toEqual([]);
  });

  it('keeps the prefers-color-scheme fallback identical to .dark', () => {
    expect(Object.fromEntries(fallback)).toEqual(Object.fromEntries(dark));
  });
});
