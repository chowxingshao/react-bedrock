import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from './avatar';

const SIZES = ['sm', 'default', 'lg'] as const;

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  argTypes: { size: { control: 'select', options: SIZES } },
} satisfies Meta<typeof Avatar>;

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

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      {SIZES.map((size) => (
        <Avatar key={size} {...args} size={size}>
          <AvatarFallback>{size.slice(0, 2).toUpperCase()}</AvatarFallback>
          <AvatarBadge />
        </Avatar>
      ))}
    </div>
  ),
};

export const Groups: Story = {
  render: (args) => (
    <div className="grid gap-4">
      {SIZES.map((size) => (
        <AvatarGroup key={size}>
          <Avatar {...args} size={size}>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar {...args} size={size}>
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
      ))}
    </div>
  ),
};
