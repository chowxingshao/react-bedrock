/**
 * Adds shadcn/ui components and normalises them to this repo's rules (docs/design-system.md).
 *
 *   pnpm ui:add dialog button            # add
 *   pnpm ui:add button --overwrite       # re-fetch (discards hand fixes: docs/design-system.md)
 *
 * Afterwards run `pnpm lint:fix && pnpm test`, and fix what they still report by hand
 * (hard-coded English strings → t('…'), any remaining raw values the token guard flags).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm ui:add <component> [component…] [--overwrite]');
  process.exit(1);
}

/**
 * Runs pnpm through the binary that started this script (`npm_execpath`), so no shell is involved.
 * That behaves the same on Windows and avoids Node's DEP0190 warning about shell + args.
 * Falls back to a plain `pnpm` lookup when the script is started directly with `node`.
 */
const pnpmPath = process.env.npm_execpath;
const runPnpm = (pnpmArgs) => {
  const options = { stdio: 'inherit' };
  if (pnpmPath && /\.[cm]?js$/.test(pnpmPath)) {
    execFileSync(process.execPath, [pnpmPath, ...pnpmArgs], options);
  } else if (pnpmPath) {
    execFileSync(pnpmPath, pnpmArgs, options);
  } else {
    execFileSync('pnpm', pnpmArgs, { ...options, shell: process.platform === 'win32' });
  }
};

runPnpm(['dlx', 'shadcn@latest', 'add', ...args, '--yes']);

const UI_DIR = 'src/components/ui';
const MODAL_FILES = new Set(['alert-dialog.tsx', 'dialog.tsx', 'drawer.tsx', 'sheet.tsx']);

/** Mechanical fixes for shadcn output. Each one is idempotent. */
const REPLACEMENTS = [
  [/from ["']cn["']/g, "from '@/lib/cn'"],
  [/from ["']@\/lib\/utils["']/g, "from '@/lib/cn'"],
  [/from ["']@\/components\/ui\/([\w-]+)["']/g, "from './$1'"],
  [/ring-\[3px\]/g, 'ring-3'],
  [/ring-ring\/50/g, 'ring-ring'],
  [/bg-black\/50/g, 'bg-overlay'],
  [/bg-destructive text-white/g, 'bg-destructive text-destructive-foreground'],
  [/ dark:bg-destructive\/60/g, ''],
  // Invalid fields keep a full-strength focus ring (in the error colour). shadcn's translucent
  // /20 and /40 rings only show while focused, where they replace `ring-ring` at ~1.2:1 contrast.
  [/ dark:aria-invalid:ring-destructive\/40/g, ''],
  [/aria-invalid:ring-destructive\/20/g, 'aria-invalid:focus-visible:ring-destructive'],
  // Raw durations become the token utilities (tokens.css); other values are left for the guard.
  [/\bduration-150\b/g, 'duration-fast'],
  [/\bduration-200\b/g, 'duration-normal'],
  [/\bduration-300\b/g, 'duration-slow'],
  [/\bduration-500\b/g, 'duration-slow'],
  [/rounded-\[4px\]/g, 'rounded-sm'],
  [/rounded-\[2px\]/g, 'rounded-xs'],
];

let changed = 0;
const files = readdirSync(UI_DIR).filter(
  (name) => name.endsWith('.tsx') && !name.includes('.test.') && !name.includes('.stories.'),
);
for (const file of files) {
  const path = join(UI_DIR, file);
  const before = readFileSync(path, 'utf8');
  let after = before;
  for (const [pattern, replacement] of REPLACEMENTS) after = after.replace(pattern, replacement);
  after = after.replace(/\bz-50\b/g, MODAL_FILES.has(file) ? 'z-modal' : 'z-dropdown');
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
  }
}
console.log(`ui:add: normalised ${changed} file(s) in ${UI_DIR}`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg.dependencies?.cn || pkg.devDependencies?.cn) runPnpm(['remove', 'cn']);

runPnpm(['exec', 'prettier', '--write', UI_DIR]);
console.log('ui:add: done. Run `pnpm lint:fix && pnpm test` and fix anything still reported.');
