import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { DatePicker } from './date-picker';
import { Label } from './label';

function Demo({ initial }: { initial?: Date }) {
  const [date, setDate] = useState<Date | undefined>(initial);
  return (
    <div className="grid w-72 gap-2">
      <Label htmlFor="due-date">Due date</Label>
      <DatePicker id="due-date" value={date} onChange={setDate} />
    </div>
  );
}

const meta = { title: 'UI/DatePicker', component: Demo } satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { initial: new Date(2026, 0, 5) } };
