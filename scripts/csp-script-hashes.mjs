/**
 * Prints the CSP hash sources ('sha256-…') of every inline <script> in an HTML file, space-separated.
 * The Docker build stores them, so the container's Content-Security-Policy allows exactly those scripts.
 *
 *   node scripts/csp-script-hashes.mjs dist/index.html
 *   curl -s http://localhost:8080/ | node scripts/csp-script-hashes.mjs -
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const source = process.argv[2] ?? 'dist/index.html';
const html = readFileSync(source === '-' ? 0 : source, 'utf8');

// <script> elements without a src attribute. Browsers hash the text with line endings normalised to LF.
const INLINE_SCRIPT = /<script\b(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

const hashes = [...html.matchAll(INLINE_SCRIPT)].map(([, body = '']) => {
  const digest = createHash('sha256').update(body.replace(/\r\n?/g, '\n'), 'utf8').digest('base64');
  return `'sha256-${digest}'`;
});

process.stdout.write(hashes.join(' '));
