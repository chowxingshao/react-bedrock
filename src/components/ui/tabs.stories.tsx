import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const LIST_VARIANTS = ['default', 'line'] as const;

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  args: { defaultValue: 'account' },
  argTypes: { orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tabs className="w-96" {...args}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
};

/** `TabsList` variants, horizontal and vertical. */
export const AllVariants: Story = {
  render: (args) => (
    <div className="grid gap-8">
      {LIST_VARIANTS.map((variant) => (
        <Tabs key={variant} className="w-96" {...args} orientation="horizontal">
          <TabsList variant={variant}>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account">{variant} list: account settings go here.</TabsContent>
          <TabsContent value="password">{variant} list: password settings go here.</TabsContent>
        </Tabs>
      ))}
    </div>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <div className="grid gap-8">
      {LIST_VARIANTS.map((variant) => (
        <Tabs key={variant} className="w-96" {...args} orientation="vertical">
          <TabsList variant={variant}>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account">{variant} list: account settings go here.</TabsContent>
          <TabsContent value="password">{variant} list: password settings go here.</TabsContent>
        </Tabs>
      ))}
    </div>
  ),
};
