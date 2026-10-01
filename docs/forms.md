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

The message is translated when the field is validated. An error already on screen therefore keeps its old language after the user switches language, until that field is validated again (on its next change or on the next submit).

### What the map does not cover

- The issues `custom` (a bare `refine`), `invalid_union` and `not_multiple_of` are not translated: they fall back to Zod's own English text, also in `es`. Give them a message of your own, as above.
- A count of one reads in the plural (`Select at least 1 items`, `Use at most 1 characters`; in `es`, `Selecciona al menos 1 elementos`). This is a known gap, left as it is.
- `z.string().length(5)` reads as a minimum ("Use at least 5 characters") when the input is too short, and `z.literal(true)` (the usual consent checkbox) gets the generic "Choose one of the available options". Give those schemas their own message.
- Bounds on numbers read "Must be at least 3", or "Must be greater than 0" for an exclusive bound such as `.positive()`. Date bounds are shown as medium dates in the current language.
