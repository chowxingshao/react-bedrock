import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = { title: 'UI/Avatar', component: Avatar } satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImageAndFallback: Story = {
  render: (args) => (
    <div className="flex gap-4">
      <Avatar {...args}>
        <AvatarImage src="/favicon.svg" alt="App logo" />
        <AvatarFallback>RB</AvatarFallback>
      </Avatar>
      <Avatar {...args}>
        <AvatarImage src="/does-not-exist.png" alt="Missing image" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </div>
  ),
};
