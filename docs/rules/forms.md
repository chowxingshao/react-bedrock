# Form rules

Forms are built with the React Hook Form parts in `src/components/ui/form.tsx` (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, plus `FormDescription`) and validated with Zod. [docs/forms.md](../forms.md) covers the whole pattern (schema, `zodResolver`, server errors, unsaved changes); `src/features/example/components/item-form.tsx` is the reference form. This page lists the rules, each with an Incorrect and a Correct form. Enforced rules name their check; the rest are conventions reviewers watch for.

## Build fields with the `Form` parts

The parts wire up the label (`htmlFor`), the control (`id`, `aria-invalid`, `aria-describedby`) and the error message for you. A raw `<input>` with hand-written error text loses that wiring and the error styling.

Incorrect:

```tsx
<>
  <label>{t('fields.name')}</label>
  <input {...form.register('name')} />
  {form.formState.errors.name ? <p>{form.formState.errors.name.message}</p> : null}
</>
```

Correct:

```tsx
<Form {...form}>
  <form noValidate onSubmit={submit}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('fields.name')}</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

Add `FormDescription` between `FormControl` and `FormMessage` for hint text. `Form` is the React Hook Form `FormProvider`, so spread the `useForm` result into it.

**Convention (not enforced).**

## Control choice

Use the controls this repo owns: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch` and `DatePicker`, all in `src/components/ui/`. They share the design tokens, focus ring and invalid styling. A native `<select>` or a custom toggle built from a `div` does not.

Incorrect:

```tsx
<FormControl>
  <select {...field}>
    <option value="draft">{t('status.draft')}</option>
  </select>
</FormControl>
```

Correct:

```tsx
<Select value={field.value} onValueChange={field.onChange}>
  <FormControl>
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
  </FormControl>
  <SelectContent>
    <SelectItem value="draft">{t('status.draft')}</SelectItem>
  </SelectContent>
</Select>
```

With `Select`, `FormControl` wraps the `SelectTrigger`, not the whole `Select`. For a number field, bind with `valueAsNumber` as `item-form.tsx` does.

**Convention (not enforced).**

## Validation at the boundary with Zod

A Zod schema in the feature's `schemas/` folder is the single source of validation. `zodResolver` feeds its issues to React Hook Form, and `FormMessage` renders them. Do not hand-roll error strings in the component or duplicate the rules in `register` options. The global Zod error map already translates the common issues; for a custom one, pass a function so it is translated when the field is validated (see [docs/forms.md](../forms.md)).

Incorrect:

```tsx
<Input
  {...form.register('email', {
    required: 'Email is required',
    pattern: { value: /^\S+@\S+$/, message: 'Invalid email' },
  })}
/>
```

Correct:

```tsx
const schema = z.object({ email: z.email() });

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { email: '' },
});
```

```tsx
<>
  <FormControl>
    <Input {...field} />
  </FormControl>
  <FormMessage />
</>
```

**Convention (not enforced).**

## Disabled and pending state

Disable the submit button while the form is submitting and show a `Spinner` beside the label. This blocks a double submit and tells the user something is happening. Read the state from `form.formState.isSubmitting`. The `Button` composition is explained in [composition.md](composition.md#button-has-no-isloading-compose-spinner).

Incorrect:

```tsx
<Button type="submit">{t('actions.save')}</Button>
```

Correct:

```tsx
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting ? <Spinner aria-hidden="true" /> : null}
  {t('actions.save')}
</Button>
```

**Convention (not enforced).**

## User-facing text goes through `t('…')`

Labels, descriptions, placeholders and messages are translated, with the key in every locale. A literal in JSX text breaks the second language.

Incorrect:

```tsx
<FormLabel>Email</FormLabel>
```

Correct:

```tsx
<FormLabel>{t('fields.email')}</FormLabel>
```

Attributes follow the same rule (`placeholder={t('form.namePlaceholder')}`), but only JSX text is linted.

**Enforced by:** `react/jsx-no-literals` (ESLint) for JSX text. A string in an attribute or a function call is a convention that nothing checks.
