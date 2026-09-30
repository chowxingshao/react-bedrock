import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const meta = { title: 'UI/Sheet', component: Sheet } satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sides: Story = {
  render: () => (
    <div className="flex gap-2">
      {SIDES.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">{side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Sheet from the {side}</SheetTitle>
              <SheetDescription>
                Use sheets for secondary tasks and mobile navigation.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Done</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};
