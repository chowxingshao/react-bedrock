import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';

interface Values {
  email: string;
}

function EmailForm({ error }: { error?: string }) {
  const form = useForm<Values>({
    defaultValues: { email: '' },
    errors: error ? { email: { type: 'manual', message: error } } : undefined,
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

function LabelOutsideField() {
  const form = useForm<Values>({ defaultValues: { email: '' } });

  return (
    <Form {...form}>
      <FormLabel>Orphan</FormLabel>
    </Form>
  );
}

describe('Form', () => {
  it('links the label to its control and shows no message while the field is valid', () => {
    render(<EmailForm />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('shows the field error, links it to the control and marks the control invalid', () => {
    render(<EmailForm error="Required" />);

    const input = screen.getByLabelText('Email');
    const message = screen.getByText('Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(message.id);
  });

  it('refuses to render a field part outside <FormField>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<LabelOutsideField />)).toThrow('useFormField should be used within');
  });
});
