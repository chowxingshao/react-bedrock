import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';
import { Button } from './button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

const meta = { title: 'UI/Card', component: Card } satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card className="w-80" {...args}>
      <CardHeader>
        <CardTitle>Project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
        <CardAction>
          <Badge variant="secondary">New</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Cards group related content and actions.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const Elevations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(['default', 'flat', 'outline', 'raised'] as const).map((elevation) => (
        <Card key={elevation} elevation={elevation} className="w-56">
          <CardHeader>
            <CardTitle>{elevation}</CardTitle>
            <CardDescription>elevation={elevation}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
};
