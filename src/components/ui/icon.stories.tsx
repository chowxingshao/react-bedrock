import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon, type IconComponent } from './icon';
import * as Icons from './icons';

// Every glyph alias in the barrel (the type + the Icon wrapper are erased / excluded).
const glyphs = Object.entries(Icons).filter(([name]) => name !== 'Icon') as [
  string,
  IconComponent,
][];

const meta = {
  title: 'UI/Icons',
  component: Icon,
  args: { icon: Icons.Add },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Catalogue: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
      {glyphs.map(([name, Glyph]) => (
        <div
          key={name}
          className="flex flex-col items-center gap-2 rounded-md border p-3 text-center"
        >
          <Glyph className="size-6" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const WithWrapper: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Icon icon={Icons.Add} size="sm" />
      <Icon icon={Icons.Edit} />
      <Icon icon={Icons.Delete} size="lg" label="Delete" />
    </div>
  ),
};
