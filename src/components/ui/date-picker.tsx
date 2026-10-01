import { CalendarIcon } from 'lucide-react';
import { type ComponentProps, useId, useState } from 'react';
import { labelDayButton } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { formatDate, getDateFnsLocale } from '@/lib/format';

import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type DatePickerProps = Omit<ComponentProps<typeof Button>, 'onChange' | 'value'> & {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
};

/** Popover + Calendar composition (spec §5.3), localised through the UI language. */
export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  'aria-describedby': describedBy,
  ...buttonProps
}: DatePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const valueId = useId();
  // An invalid Date formats to '', so it reads as empty instead of leaving the button without text.
  const formatted = value ? formatDate(value) : '';
  const isEmpty = formatted === '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={isEmpty}
          className={cn(
            'w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
            className,
          )}
          {...buttonProps}
          // A <label> names the button ahead of its content, which would drop the value from the
          // accessible name; the description keeps it, next to whatever the caller already points at.
          aria-describedby={describedBy ? `${valueId} ${describedBy}` : valueId}
        >
          <CalendarIcon aria-hidden="true" />
          <span id={valueId}>
            {isEmpty ? (placeholder ?? t('datePicker.placeholder')) : formatted}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" aria-label={t('datePicker.dialog')}>
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          // DayPicker's own prop, not the HTML attribute: it focuses the selected day when the popover opens.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          locale={getDateFnsLocale()}
          labels={{
            labelNav: () => t('datePicker.navigation'),
            labelPrevious: () => t('datePicker.previousMonth'),
            labelNext: () => t('datePicker.nextMonth'),
            // The default label appends the English words "Today" and "selected".
            labelDayButton: (date, modifiers, options, dateLib) =>
              [
                modifiers.today ? t('datePicker.today') : undefined,
                labelDayButton(
                  date,
                  { ...modifiers, today: false, selected: false },
                  options,
                  dateLib,
                ),
                modifiers.selected ? t('datePicker.selected') : undefined,
              ]
                .filter(Boolean)
                .join(', '),
          }}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
