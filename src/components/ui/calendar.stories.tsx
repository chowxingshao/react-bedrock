import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from './calendar';

const MONTH = new Date(2026, 0, 1);

function SingleDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 0, 5));
  return <Calendar mode="single" selected={date} onSelect={setDate} defaultMonth={MONTH} />;
}

function RangeDemo() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 5),
    to: new Date(2026, 0, 9),
  });
  return <Calendar mode="range" selected={range} onSelect={setRange} defaultMonth={MONTH} />;
}

const meta = { title: 'UI/Calendar', component: Calendar } satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The primitive the DatePicker is built on: labels are English unless you pass `labels` (see DatePicker). */
export const Single: Story = { render: () => <SingleDemo /> };

export const Range: Story = { render: () => <RangeDemo /> };

export const WeekNumbers: Story = {
  args: { showWeekNumber: true, defaultMonth: MONTH },
};

export const WithoutOutsideDays: Story = {
  args: { showOutsideDays: false, defaultMonth: MONTH },
};

export const DisabledDays: Story = {
  args: { disabled: { before: new Date(2026, 0, 5) }, defaultMonth: MONTH },
};
