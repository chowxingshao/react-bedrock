import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from './button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';

const schema = z.object({
  name: z.string().min(2, { error: 'Use at least 2 characters' }),
  email: z.email({ error: 'Enter a valid email address' }),
});
type Values = z.infer<typeof schema>;

function DemoForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  return (
    <Form {...form}>
      <form noValidate className="grid w-80 gap-4" onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Shown on your profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

const meta = { title: 'UI/Form', component: DemoForm } satisfies Meta<typeof DemoForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press Submit with empty fields to see field-level errors under each input. */
export const Validation: Story = {};
