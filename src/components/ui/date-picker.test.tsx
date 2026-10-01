import { zodResolver } from '@hookform/resolvers/zod';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { i18n } from '@/core/i18n';
import { render, screen, within } from '@/test/render';

import { DatePicker } from './date-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Label } from './label';

describe('DatePicker', () => {
  it('shows the placeholder, then the formatted value', () => {
    const { rerender } = render(<DatePicker value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pick a date/ })).toBeInTheDocument();

    rerender(<DatePicker value={new Date(2026, 0, 5)} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Jan 5, 2026/ })).toBeInTheDocument();
  });

  it('picks a day from the calendar and closes', async () => {
    const onChange = vi.fn<(date?: Date) => void>();
    const user = userEvent.setup();
    render(<DatePicker value={new Date(2026, 0, 5)} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Jan 5, 2026/ }));
    const grid = await screen.findByRole('grid');
    await user.click(within(grid).getByText('15'));

    expect(onChange.mock.calls[0]?.[0]?.getDate()).toBe(15);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('labels the month navigation in the current language', async () => {
    const user = userEvent.setup();
    render(<DatePicker value={new Date(2026, 0, 5)} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Jan 5, 2026/ }));

    expect(await screen.findByRole('button', { name: 'Go to next month' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Date picker' })).toBeInTheDocument();
  });

  it('names the selected day in the current language', async () => {
    await i18n.changeLanguage('es');
    const user = userEvent.setup();
    render(<DatePicker value={new Date(2026, 0, 5)} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /5 ene 2026/ }));

    expect(
      await screen.findByRole('button', { name: 'lunes, 5 de enero de 2026, seleccionado' }),
    ).toBeInTheDocument();
  });

  it('does not submit an enclosing form when opened', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <DatePicker value={undefined} onChange={vi.fn()} />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: /Pick a date/ }));

    expect(await screen.findByRole('grid')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('works inside a form field: labelled, reports the validation error and submits the date', async () => {
    const schema = z.object({ due: z.date() });
    const onValid = vi.fn();
    function DemoForm() {
      const form = useForm({ resolver: zodResolver(schema) });
      return (
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onValid)}>
            <FormField
              control={form.control}
              name="due"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>When it is due</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button type="submit">Save</button>
          </form>
        </Form>
      );
    }
    const user = userEvent.setup();
    render(<DemoForm />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const trigger = screen.getByRole('button', { name: /Due date/ });
    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    // The label names the button, so the value or placeholder reaches assistive technology as a description.
    expect(trigger).toHaveAccessibleDescription(/Pick a date/);
    expect(trigger).toHaveAccessibleDescription(/When it is due/);
    expect(trigger).toHaveAccessibleDescription(/This field is required/);

    await user.click(trigger);
    await user.click(within(await screen.findByRole('grid')).getByText('15'));
    expect(trigger).toHaveAccessibleDescription(/15, \d{4}/);
    expect(trigger).toHaveAccessibleDescription(/When it is due/);
    expect(trigger).not.toHaveAccessibleDescription(/Pick a date/);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onValid.mock.calls[0]?.[0]).toMatchObject({ due: expect.any(Date) as Date });
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
  });

  describe('value for assistive technology', () => {
    function Labelled({ value, hint }: { value: Date | undefined; hint?: string }) {
      return (
        <>
          <Label htmlFor="due">Due date</Label>
          {hint ? <p id="hint">{hint}</p> : null}
          <DatePicker
            id="due"
            value={value}
            onChange={vi.fn()}
            aria-describedby={hint ? 'hint' : undefined}
          />
        </>
      );
    }

    it('describes a labelled trigger with the placeholder when empty', () => {
      render(<Labelled value={undefined} />);

      const trigger = screen.getByRole('button', { name: /Due date/ });
      expect(trigger).toHaveAccessibleDescription('Pick a date');
    });

    it('describes a labelled trigger with the formatted value', () => {
      render(<Labelled value={new Date(2026, 0, 5)} />);

      expect(screen.getByRole('button', { name: /Due date/ })).toHaveAccessibleDescription(
        'Jan 5, 2026',
      );
    });

    it('keeps a description passed by the caller next to the value', () => {
      render(<Labelled value={new Date(2026, 0, 5)} hint="Pick a working day" />);

      const trigger = screen.getByRole('button', { name: /Due date/ });
      expect(trigger).toHaveAccessibleDescription(/Jan 5, 2026/);
      expect(trigger).toHaveAccessibleDescription(/Pick a working day/);
    });

    it('treats an invalid date as empty', () => {
      render(<Labelled value={new Date('not a date')} />);

      const trigger = screen.getByRole('button', { name: /Due date/ });
      expect(trigger).toHaveAccessibleDescription('Pick a date');
      expect(trigger).toHaveAttribute('data-empty', 'true');
    });

    it('names an unlabelled trigger with the placeholder for an invalid date', () => {
      render(<DatePicker value={new Date('not a date')} onChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Pick a date' })).toBeInTheDocument();
    });

    it('describes the value in the current language', async () => {
      await i18n.changeLanguage('es');
      render(<Labelled value={new Date(2026, 0, 5)} />);

      expect(screen.getByRole('button', { name: /Due date/ })).toHaveAccessibleDescription(
        '5 ene 2026',
      );
    });
  });
});
