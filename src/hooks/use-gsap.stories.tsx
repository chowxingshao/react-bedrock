import type { Meta, StoryObj } from '@storybook/react-vite';
import gsap from 'gsap';
import { useRef } from 'react';

import { useGsap } from './use-gsap';

function StaggerBoxes() {
  const scope = useRef<HTMLDivElement>(null);
  useGsap(
    () => {
      gsap.from('.box', {
        opacity: 0,
        y: 16,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.08,
      });
    },
    { scope },
  );
  return (
    <div ref={scope} className="flex gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="box flex size-16 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

const meta = { title: 'Motion/useGsap', component: StaggerBoxes } satisfies Meta<
  typeof StaggerBoxes
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Stagger: Story = {};
