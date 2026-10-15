import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = { title: 'Foundations/Motion' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Interactions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <button className="press rounded-md bg-primary px-4 py-2 text-primary-foreground interactive">
        press
      </button>
      <button className="hover-lift rounded-md border bg-card px-4 py-2 text-card-foreground interactive">
        hover-lift
      </button>
    </div>
  ),
};

export const EnterExit: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="enter rounded-md border bg-card p-4 text-card-foreground">enter</div>
      <div className="exit rounded-md border bg-card p-4 text-card-foreground">exit</div>
    </div>
  ),
};

export const Stagger: Story = {
  render: () => (
    <ul className="grid gap-2 stagger">
      {['one', 'two', 'three', 'four'].map((n) => (
        <li key={n} className="enter rounded-md border bg-card p-3 text-card-foreground">
          {n}
        </li>
      ))}
    </ul>
  ),
};
