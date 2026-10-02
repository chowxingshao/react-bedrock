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

## Server errors, submitting, and leaving with unsaved changes

The reference form (`src/features/example/components/item-form.tsx`) shows the whole pattern:

```tsx
const submit = form.handleSubmit(async (values) => {
  try {
    await onSubmit(values); // e.g. createItem.mutateAsync(values)
    form.reset(values);
  } catch (error) {
    // field errors for fields this form has go under the inputs; anything else is a toast
    const unknownField = Object.keys(getFieldErrors(error)).some(
      (name) => !(name in ITEM_FORM_DEFAULTS),
    );
    if (!applyServerErrors(form, error) || unknownField) notify.error(getErrorMessage(error));
  }
});
useUnsavedChangesWarning(form.formState.isDirty && !form.formState.isSubmitting);
```

- **Server validation:** a 422 whose `details.fields` looks like `{ name: 'ALREADY_EXISTS' }` becomes a field error under the input, and the first bad field gets focus. Messages that match `validation:server.<CODE>` are translated; others are shown as the server sent them. Adapt the parsing in `getFieldErrors` (`src/core/api/errors.ts`) if your backend's shape differs.
- **Fields the form does not have:** `applyServerErrors` returns `true` for any field error, but an error for a field with no input would show nowhere, so the form also toasts when one of the fields is not its own.
- **The mutation opts out of the global toast** (`meta: { silent: true }`), because the form decides: field errors, or a toast.
- **Submitting:** the submit button disables itself and shows a spinner while `isSubmitting`.
- **Unsaved changes:** leaving the page (links, back button) asks for confirmation; closing the tab triggers the browser's own prompt. Signing out does not ask: it unmounts the page before any navigation, so unsaved changes are lost.
- **Number inputs:** bind with `valueAsNumber` so form state holds numbers. An empty field becomes `NaN`, which fails `z.number()` with a translated message.
