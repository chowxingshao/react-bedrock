import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const nodeRequire = createRequire(import.meta.url);

const FEATURE = 'src/features/{{kebabCase name}}';
const RESOURCES = 'src/core/i18n/resources.ts';
const TEMPLATES = 'plop/templates/feature';
/** A folder of src/locales is a locale when it is named like a language code (en, es, pt-BR). */
const LOCALE_CODE = /^[A-Za-z][A-Za-z0-9-]*$/;
const NO_LOCALES =
  'src/locales has no locale folder: add src/locales/<code>/ (docs/i18n.md, "Adding a language")';

/** Words may hold digits (s3, v2) but each starts with a letter: `top-10-items` would give `top_10Items`. */
const kebab = (value) =>
  /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/.test(value) ||
  'Use lower-case words separated by single dashes, each starting with a letter, e.g. purchase-orders (order-v2 is fine, top-10-items is not)';
const required = (label) => (value) => (value.trim() ? true : `${label} is required`);
/** `use-thing` -> `thing`. Only a `use-` prefix with its dash goes: `user-prefs` and `users` stay as typed. */
const stripUse = (value) => value.replace(/^use-/, '');

/** The script a package's `bin` field points at: Prettier and ESLint then run through `node`, with no shell. */
function binScript(pkg) {
  const manifest = nodeRequire.resolve(`${pkg}/package.json`);
  const { bin } = nodeRequire(manifest);
  return join(dirname(manifest), typeof bin === 'string' ? bin : bin[pkg]);
}

/** Whether the JSON text holds a nested key (`['nav', 'orders']` is `nav.orders`); throws if it is not JSON. */
function hasJsonKey(text, keys) {
  let node = JSON.parse(text);
  for (const key of keys) {
    if (typeof node !== 'object' || node === null || !Object.hasOwn(node, key)) return false;
    node = node[key];
  }
  return true;
}

/** Runs first: refuses, before anything is written, what would damage the tree (see the `guard` action). */
const guarded = (actions, checks = {}) => [{ type: 'guard', actions, ...checks }, ...actions];

/** What every locale-driven generator does when `src/locales` holds no locale: refuse, with a reason. */
const noLocales = [{ type: 'guard', actions: [], problems: [NO_LOCALES] }];

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);

/**
 * The `modify` pattern of an anchor: a whole line that holds only `text` (indent and trailing blanks
 * allowed), the same thing src/test/plop-anchors.guard.test.ts counts. A comment or a string that merely
 * quotes the anchor is not one. The match stops at the end of the line, so a CRLF checkout works too.
 * It also carries what the guard needs to explain a problem: the `anchor` text and an optional `hint`.
 * The first capture group is the line itself, so a replacement can insert text before it with `$1`.
 */
const anchored = (text, hint) => ({
  pattern: new RegExp(`^([^\\S\\r\\n]*${escapeRegExp(text)})[^\\S\\r\\n]*$`, 'm'),
  anchor: text,
  hint,
});

/**
 * Code generators (spec §9). `pnpm gen` opens a menu; `pnpm gen <generator> <answers…>` skips it.
 * Every generator ends by running ESLint --fix and then Prettier on what it touched, so output is lint-clean.
 * Languages are configuration (docs/i18n.md): `feature` and `page` write one file per folder of
 * `src/locales`, never a hard-coded list.
 * @param {import('plop').NodePlopAPI} plop
 */
export default function (plop) {
  /** The locale folders of `src/locales`, sorted. */
  const localeCodes = () => {
    const dir = resolve(plop.getDestBasePath(), 'src/locales');
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && LOCALE_CODE.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  };

  /** `locale.<code>.json.hbs` when the template folder has one (a pre-translated language), else `locale.json.hbs`. */
  const localeTemplate = (code) =>
    existsSync(resolve(plop.getPlopfilePath(), TEMPLATES, `locale.${code}.json.hbs`))
      ? `${TEMPLATES}/locale.${code}.json.hbs`
      : `${TEMPLATES}/locale.json.hbs`;

  plop.setActionType('format', (answers, config) => {
    const files = [...new Set(config.files.map((file) => plop.renderString(file, answers)))];
    // The paths are relative to the project, whatever folder plop was started from.
    const run = (script, args) =>
      execFileSync(process.execPath, [script, ...args], {
        stdio: 'inherit',
        cwd: plop.getDestBasePath(),
      });
    // ESLint first: its fixes (merged or reordered imports) can leave a file Prettier would still change.
    const code = files.filter((file) => /\.tsx?$/.test(file));
    if (code.length > 0) run(binScript('eslint'), ['--fix', '--no-warn-ignored', ...code]);
    run(binScript('prettier'), ['--write', ...files]);
    return `formatted ${files.length} file(s)`;
  });

  /**
   * Plop's `add` stops at an existing file but leaves the files it already wrote, and its `modify` silently
   * skips an anchor that is gone. This check runs before the first write and fails with the whole list:
   * a file to create must not exist, an anchor must occur exactly once, a `taken` pattern must not match
   * (or a `taken` JSON key must be absent), a `needs` folder must exist, and the `problems` an action
   * list already knows about are reported.
   */
  plop.setActionType('guard', (answers, config) => {
    const render = (text) => plop.renderString(text, answers);
    const locate = (file) => resolve(plop.getDestBasePath(), render(file));
    const problems = [...(config.problems ?? [])];

    for (const action of config.actions) {
      const file = render(action.path ?? '');
      if (action.type === 'add' && existsSync(locate(file)))
        problems.push(`${file} already exists`);
      if (action.type === 'modify') {
        if (!existsSync(locate(file))) {
          problems.push(`${file} does not exist`);
          continue;
        }
        const matches = readFileSync(locate(file), 'utf8').match(
          new RegExp(action.pattern.source, `${action.pattern.flags.replace('g', '')}g`),
        );
        if (matches?.length !== 1) {
          problems.push(
            `${file}: expected the anchor ${action.anchor ?? action.pattern} once, found ${matches?.length ?? 0} (${action.hint ?? 'do not delete or rename the plop anchors'})`,
          );
        }
      }
    }
    for (const { path, pattern, json, message } of config.taken ?? []) {
      // A missing file is already listed by the `modify` check of the same generator.
      if (!existsSync(locate(path))) continue;
      const text = readFileSync(locate(path), 'utf8');
      let found;
      if (json) {
        try {
          found = hasJsonKey(text, json.map(render));
        } catch {
          problems.push(`${render(path)} is not valid JSON`);
          continue;
        }
      } else {
        found = new RegExp(render(pattern), 'm').test(text);
      }
      if (found) problems.push(`${render(path)}: ${render(message)}`);
    }
    for (const folder of config.needs ?? []) {
      if (!existsSync(locate(folder))) problems.push(`${render(folder)} does not exist`);
    }

    // The same anchor is used by several actions (one per locale): list each problem once.
    const unique = [...new Set(problems)];
    if (unique.length > 0) throw new Error(`nothing was written:\n  ${unique.join('\n  ')}`);
    return 'nothing to overwrite, every anchor found once';
  });

  plop.setHelper(
    'storyGroup',
    (location) =>
      ({ ui: 'UI', feedback: 'Feedback', feature: 'Features' })[String(location).split(':')[0]] ??
      'Components',
  );
  // "purchase-orders" -> "Purchase Orders" (plop's titleCase keeps the dashes).
  plop.setHelper('label', (value) =>
    String(value)
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  );
  // A JSON string literal, `$`-safe because the result goes through String.replace in the modify actions below.
  plop.setHelper('json', (value) => JSON.stringify(String(value)).replaceAll('$', '$$$$'));

  plop.setGenerator('feature', {
    description:
      'Feature: types, schema, api, query keys, hook, list page + test, locales, mock API (+ route)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Feature name, plural (e.g. purchase-orders):',
        validate: kebab,
      },
      {
        type: 'input',
        name: 'entity',
        message: 'Entity name, singular (e.g. purchase-order):',
        validate: kebab,
      },
      {
        type: 'confirm',
        name: 'withRoute',
        message: 'Add a route and a sidebar link?',
        default: true,
      },
    ],
    actions: (answers) => {
      const locales = localeCodes();
      if (locales.length === 0) return noLocales;

      const files = {
        types: `${FEATURE}/types/{{kebabCase entity}}.ts`,
        schemas: `${FEATURE}/schemas/{{kebabCase entity}}.ts`,
        api: `${FEATURE}/api/{{kebabCase name}}-api.ts`,
        keys: `${FEATURE}/api/{{kebabCase entity}}-keys.ts`,
        hook: `${FEATURE}/hooks/use-{{kebabCase name}}.ts`,
        page: `${FEATURE}/components/{{kebabCase name}}-list-page.tsx`,
        pageTest: `${FEATURE}/components/{{kebabCase name}}-list-page.test.tsx`,
        index: `${FEATURE}/index.ts`,
        mocks: 'src/mocks/handlers/{{kebabCase name}}.ts',
      };
      const template = (file) => `${TEMPLATES}/${file}`;
      // One namespace file, one import and one `resources` entry per locale folder. The import name is
      // the camel-cased code plus the feature (enOrders, ptBrOrders), valid whatever the folder is called.
      const perLocale = locales.flatMap((code) => {
        const id = `{{camelCase "${code}"}}{{pascalCase name}}`;
        return [
          {
            type: 'add',
            path: `src/locales/${code}/{{kebabCase name}}.json`,
            templateFile: localeTemplate(code),
          },
          {
            type: 'modify',
            path: RESOURCES,
            ...anchored('// plop:resources-imports'),
            template: `import ${id} from '@/locales/${code}/{{kebabCase name}}.json';\n$1`,
          },
          {
            type: 'modify',
            path: RESOURCES,
            ...anchored(
              `// plop:resources-${code}`,
              `add // plop:resources-${code} inside the ${code} block of ${RESOURCES}`,
            ),
            template: `  {{camelCase name}}: ${id},\n$1`,
          },
        ];
      });
      const actions = [
        { type: 'add', path: files.types, templateFile: template('types.ts.hbs') },
        { type: 'add', path: files.schemas, templateFile: template('schemas.ts.hbs') },
        { type: 'add', path: files.api, templateFile: template('api.ts.hbs') },
        { type: 'add', path: files.keys, templateFile: template('keys.ts.hbs') },
        { type: 'add', path: files.hook, templateFile: template('hook.ts.hbs') },
        { type: 'add', path: files.page, templateFile: template('list-page.tsx.hbs') },
        { type: 'add', path: files.pageTest, templateFile: template('list-page.test.tsx.hbs') },
        { type: 'add', path: files.index, templateFile: template('index.ts.hbs') },
        { type: 'add', path: files.mocks, templateFile: template('mock-handlers.ts.hbs') },
        ...perLocale,
        {
          type: 'modify',
          path: 'src/mocks/handlers.ts',
          ...anchored('// plop:handlers-imports'),
          template:
            "import { {{camelCase name}}Handlers } from './handlers/{{kebabCase name}}';\n$1",
        },
        {
          type: 'modify',
          path: 'src/mocks/handlers.ts',
          ...anchored('// plop:handlers'),
          template: '  ...{{camelCase name}}Handlers,\n$1',
        },
      ];
      const touched = [
        ...Object.values(files),
        ...locales.map((code) => `src/locales/${code}/{{kebabCase name}}.json`),
        RESOURCES,
        'src/mocks/handlers.ts',
      ];
      const taken = [
        {
          path: RESOURCES,
          pattern: '^  {{camelCase name}}: ',
          message: 'the namespace {{camelCase name}} is already registered',
        },
        {
          path: 'src/mocks/handlers.ts',
          pattern: '\\b{{camelCase name}}Handlers\\b',
          message: '{{camelCase name}}Handlers is already used (another feature has this name)',
        },
      ];

      if (answers.withRoute) {
        const route = 'src/app/routes/{{kebabCase name}}/list.tsx';
        const navLabels = locales.map((code) => ({
          type: 'modify',
          path: `src/locales/${code}/common.json`,
          ...anchored('"nav": {'),
          template: '$1\n    "{{camelCase name}}": "{{label name}}",',
        }));
        actions.push(
          { type: 'add', path: route, templateFile: template('route.tsx.hbs') },
          {
            type: 'modify',
            path: 'src/config/paths.ts',
            ...anchored('// plop:paths'),
            template:
              "  {{camelCase name}}: {\n    list: route('/{{kebabCase name}}', () => '/{{kebabCase name}}'),\n  },\n$1",
          },
          {
            type: 'modify',
            path: 'src/app/router.tsx',
            ...anchored('// plop:routes'),
            template:
              "{\n  path: paths.{{camelCase name}}.list.pattern,\n  lazy: () => import('./routes/{{kebabCase name}}/list'),\n  handle: titled((i18n) => i18n.t('{{camelCase name}}:list.title')),\n},\n$1",
          },
          {
            type: 'modify',
            path: 'src/app/navigation.ts',
            ...anchored('// plop:nav-imports'),
            template: "import { FolderIcon as {{pascalCase name}}Icon } from 'lucide-react';\n$1",
          },
          {
            type: 'modify',
            path: 'src/app/navigation.ts',
            ...anchored('// plop:nav'),
            template:
              "  { labelKey: 'nav.{{camelCase name}}', icon: {{pascalCase name}}Icon, to: paths.{{camelCase name}}.list() },\n$1",
          },
          ...navLabels,
        );
        touched.push(
          route,
          'src/config/paths.ts',
          'src/app/router.tsx',
          'src/app/navigation.ts',
          ...locales.map((code) => `src/locales/${code}/common.json`),
        );
        taken.push(
          {
            path: 'src/config/paths.ts',
            pattern: '^  {{camelCase name}}:',
            message: 'paths.{{camelCase name}} already exists',
          },
          {
            path: 'src/app/navigation.ts',
            pattern: '\\b{{pascalCase name}}Icon\\b',
            message: '{{pascalCase name}}Icon is already used (an icon import or another feature)',
          },
          // Parsed, not matched: only the `nav` object counts (a key `description` elsewhere is fine).
          ...locales.map((code) => ({
            path: `src/locales/${code}/common.json`,
            json: ['nav', '{{camelCase name}}'],
            message: 'nav.{{camelCase name}} already exists',
          })),
        );
      }

      return [...guarded(actions, { taken }), { type: 'format', files: touched }];
    },
  });

  plop.setGenerator('component', {
    description: 'Component with a story and a test',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (e.g. status-pill):',
        validate: kebab,
      },
      {
        type: 'list',
        name: 'location',
        message: 'Where does it live?',
        choices: ['ui', 'feedback', 'feature'],
        // Plop cannot bypass a conditional prompt (the one below), so a non-interactive run names the
        // feature in this answer: `pnpm gen component order-badge feature:orders`.
        bypass: (value) => {
          const [location, feature, ...rest] = value.split(':');
          const valid =
            ['ui', 'feedback', 'feature'].includes(location) &&
            rest.length === 0 &&
            (feature === undefined ? true : location === 'feature' && kebab(feature) === true);
          if (!valid) throw new Error('use ui, feedback or feature:<feature-folder>');
          return value;
        },
      },
      {
        type: 'input',
        name: 'feature',
        message: 'Feature folder (e.g. example):',
        when: (answers) => answers.location === 'feature',
        validate: kebab,
      },
    ],
    actions: (answers) => {
      const [location, bypassedFeature] = answers.location.split(':');
      const feature = bypassedFeature ?? answers.feature;
      const dir =
        location === 'feature'
          ? `src/features/${feature}/components`
          : `src/components/${location}`;
      const files = [
        `${dir}/{{kebabCase name}}.tsx`,
        `${dir}/{{kebabCase name}}.stories.tsx`,
        `${dir}/{{kebabCase name}}.test.tsx`,
      ];
      const actions = [
        { type: 'add', path: files[0], templateFile: 'plop/templates/component/component.tsx.hbs' },
        {
          type: 'add',
          path: files[1],
          templateFile: 'plop/templates/component/component.stories.tsx.hbs',
        },
        {
          type: 'add',
          path: files[2],
          templateFile: 'plop/templates/component/component.test.tsx.hbs',
        },
      ];
      return [
        ...guarded(actions, { needs: location === 'feature' ? [`src/features/${feature}`] : [] }),
        { type: 'format', files },
      ];
    },
  });

  const pageActions = (locales) => [
    {
      type: 'add',
      path: 'src/app/routes/{{kebabCase name}}.tsx',
      templateFile: 'plop/templates/page/page.tsx.hbs',
    },
    {
      type: 'modify',
      path: 'src/config/paths.ts',
      ...anchored('// plop:paths'),
      template:
        "  {{camelCase name}}: route('/{{kebabCase name}}', () => '/{{kebabCase name}}'),\n$1",
    },
    {
      type: 'modify',
      path: 'src/app/router.tsx',
      ...anchored('// plop:routes'),
      template:
        "{\n  path: paths.{{camelCase name}}.pattern,\n  lazy: () => import('./routes/{{kebabCase name}}'),\n  handle: titled((i18n) => i18n.t('common:pages.{{camelCase name}}')),\n},\n$1",
    },
    // `json` writes the title as a JSON string: quotes, backslashes and apostrophes all survive.
    ...locales.map((code) => ({
      type: 'modify',
      path: `src/locales/${code}/common.json`,
      ...anchored('"pages": {'),
      template: '$1\n    "{{camelCase name}}": {{{json title}}},',
    })),
  ];

  plop.setGenerator('page', {
    description:
      'Route page, registered in paths.ts and router.tsx, with its title in every locale',
    prompts: [
      { type: 'input', name: 'name', message: 'Page name (e.g. reports):', validate: kebab },
      {
        type: 'input',
        name: 'title',
        message: 'Page title in English (e.g. Reports):',
        validate: required('Title'),
      },
    ],
    actions: () => {
      const locales = localeCodes();
      if (locales.length === 0) return noLocales;
      return [
        ...guarded(pageActions(locales), {
          taken: [
            {
              path: 'src/config/paths.ts',
              pattern: '^  {{camelCase name}}:',
              message: 'paths.{{camelCase name}} already exists',
            },
            ...locales.map((code) => ({
              path: `src/locales/${code}/common.json`,
              json: ['pages', '{{camelCase name}}'],
              message: 'pages.{{camelCase name}} already exists',
            })),
          ],
        }),
        {
          type: 'format',
          files: [
            'src/app/routes/{{kebabCase name}}.tsx',
            'src/config/paths.ts',
            'src/app/router.tsx',
            ...locales.map((code) => `src/locales/${code}/common.json`),
          ],
        },
      ];
    },
  });

  const hookActions = [
    {
      type: 'add',
      path: 'src/hooks/use-{{kebabCase name}}.ts',
      templateFile: 'plop/templates/hook/hook.ts.hbs',
    },
    {
      type: 'add',
      path: 'src/hooks/use-{{kebabCase name}}.test.ts',
      templateFile: 'plop/templates/hook/hook.test.ts.hbs',
    },
  ];

  plop.setGenerator('hook', {
    description: 'Shared hook with a test',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Hook name without "use" (e.g. window-size):',
        filter: stripUse,
        // Plop validates the raw answer and filters it afterwards, so validate the name the filter will produce.
        validate: (value) => {
          const name = stripUse(value);
          return name === 'use'
            ? 'Give the hook a name after "use-", e.g. window-size'
            : kebab(name);
        },
      },
    ],
    actions: [
      ...guarded(hookActions),
      {
        type: 'format',
        files: ['src/hooks/use-{{kebabCase name}}.ts', 'src/hooks/use-{{kebabCase name}}.test.ts'],
      },
    ],
  });

  const storeActions = [
    {
      type: 'add',
      path: 'src/stores/{{kebabCase name}}-store.ts',
      templateFile: 'plop/templates/store/store.ts.hbs',
    },
    {
      type: 'add',
      path: 'src/stores/{{kebabCase name}}-store.test.ts',
      templateFile: 'plop/templates/store/store.test.ts.hbs',
    },
  ];

  plop.setGenerator('store', {
    description: 'Zustand store with selector hooks and a test',
    prompts: [
      { type: 'input', name: 'name', message: 'Store name (e.g. filters):', validate: kebab },
    ],
    actions: [
      ...guarded(storeActions),
      {
        type: 'format',
        files: [
          'src/stores/{{kebabCase name}}-store.ts',
          'src/stores/{{kebabCase name}}-store.test.ts',
        ],
      },
    ],
  });
}
