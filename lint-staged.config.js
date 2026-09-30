export default {
  '*.{ts,tsx,js,mjs,cjs}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write --ignore-unknown',
  ],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write --ignore-unknown'],
};
