# Forms

Pattern (spec §7.7): a Zod schema in the feature's `schemas/` folder → `useForm` with `zodResolver` → the shadcn `Form` components.

```tsx
const schema = z.object({ name: z.string().min(1).max(80), email: z.email() });
type Values = z.infer<typeof schema>;

const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' },
});
```

## Validation messages are translated automatically

A global Zod error map (`src/core/i18n/zod-error-map.ts`) translates the common issues (required, too short or long, too small or big, email, URL, enum, …) into the current language. So schemas usually need no messages at all.

When you do need a specific message, pass a function so it is translated at parse time:

```ts
z.string().refine(isSlug, { error: () => i18n.t('items:form.slugInvalid') });
```

A message written in the schema always wins over the global map. Field errors appear under each input via `<FormMessage />`.

### What the map does not cover

- The issues `custom` (a bare `refine`), `invalid_union` and `not_multiple_of` are not translated: they fall back to Zod's own English text, also in `es`. Give them a message of your own, as above.
- An array minimum reads "Select at least 1 items" (and "Selecciona al menos 1 elementos"): the wording does not change for a count of one. This is a known gap, left as it is.
- Bounds on numbers read "Must be at least 3", or "Must be greater than 0" for an exclusive bound such as `.positive()`. Date bounds are shown as medium dates in the current language.
