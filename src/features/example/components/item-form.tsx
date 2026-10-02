import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { env } from '@/config/env';
import { paths } from '@/config/paths';
import { applyServerErrors, getErrorMessage, getFieldErrors } from '@/core/api';
import { notify } from '@/core/notify';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

import { ITEM_FORM_DEFAULTS, itemFormSchema, type ItemFormValues } from '../schemas/item';
import { ITEM_STATUSES } from '../types/item';

interface ItemFormProps {
  defaultValues?: ItemFormValues;
  submitLabel: string;
  /** Persist the values. Throw (e.g. the AppError) to keep the form open; field errors are mapped automatically. */
  onSubmit: (values: ItemFormValues) => Promise<void>;
}

/** The standard form pattern (spec §7.7): Zod schema → RHF → shadcn Form, with server error mapping. */
export function ItemForm({
  defaultValues = ITEM_FORM_DEFAULTS,
  submitLabel,
  onSubmit,
}: ItemFormProps) {
  const { t } = useTranslation(['items', 'common']);
  const form = useForm<ItemFormValues>({ resolver: zodResolver(itemFormSchema), defaultValues });
  const { isDirty, isSubmitting } = form.formState;

  // Navigating away mid-submit is expected (to the saved item), so only warn while idle.
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      form.reset(values);
    } catch (error) {
      // A server error for a field this form does not have (or a form-level one) would show nowhere.
      const unknownField = Object.keys(getFieldErrors(error)).some(
        (name) => !(name in ITEM_FORM_DEFAULTS),
      );
      if (!applyServerErrors(form, error) || unknownField) notify.error(getErrorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form noValidate className="grid max-w-2xl gap-6" onSubmit={submit}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.description')}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormDescription>{t('form.descriptionHint')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-6 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.status')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ITEM_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.price')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) => {
                      field.onChange(event.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {t('form.priceHint', { currency: env.VITE_DEFAULT_CURRENCY })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.quantity')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) => {
                      field.onChange(event.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner aria-hidden="true" /> : null}
            {submitLabel}
          </Button>
          <Button asChild variant="outline">
            <Link to={paths.items.list()}>{t('common:actions.cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
