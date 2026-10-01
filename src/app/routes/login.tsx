import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/config/env';
import { getErrorMessage } from '@/core/api';
import { useAuth } from '@/core/auth';
import { DEMO_EMAILS, DEMO_PASSWORD } from '@/mocks/fixtures/users';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
type LoginValues = z.infer<typeof loginSchema>;

/**
 * Sign-in page (spec §7.1). It does not navigate itself: once the session is set, the <RequireGuest>
 * in the guest layout sends the user to `returnTo`, after `safeReturnTo` has checked it.
 */
export function Component() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <>
      <CardHeader>
        <CardTitle>
          <h1>{t('auth.title')}</h1>
        </CardTitle>
        <CardDescription>{t('auth.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form noValidate className="grid gap-4" onSubmit={onSubmit}>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Spinner aria-hidden="true" /> : null}
              {t('auth.signIn')}
            </Button>
          </form>
        </Form>
        {env.VITE_ENABLE_MOCKS ? (
          <p className="text-xs text-muted-foreground">
            {t('auth.demoHint', {
              admin: DEMO_EMAILS.admin,
              viewer: DEMO_EMAILS.viewer,
              password: DEMO_PASSWORD,
            })}
          </p>
        ) : null}
      </CardContent>
    </>
  );
}
