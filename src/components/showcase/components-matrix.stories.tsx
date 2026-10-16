import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState, ErrorState, QueryState, type QueryLike } from '@/components/feedback';
import { StateMatrix, previewState, type PreviewState } from '@/components/showcase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const meta = {
  title: 'Design System/Components',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
] as const;
const STATES = ['default', 'disabled'] as const;

export const Buttons: Story = {
  render: () => (
    <StateMatrix
      caption="Button — variant × state (hover/focus/active are interactive; try them in the canvas)"
      columns={STATES}
      rows={BUTTON_VARIANTS.map((variant) => ({
        label: variant,
        render: (state) => (
          <Button variant={variant} {...previewState(state as PreviewState)}>
            Save
          </Button>
        ),
      }))}
    />
  ),
};

const INPUT_SIZES = ['sm', 'md', 'lg'] as const;
const INPUT_STATES = ['default', 'disabled', 'invalid'] as const;

export const Inputs: Story = {
  render: () => (
    <StateMatrix
      caption="Input — size × state"
      columns={INPUT_STATES}
      rows={INPUT_SIZES.map((size) => ({
        label: size,
        render: (state) => (
          <Input
            size={size}
            aria-label="Email"
            placeholder="you@example.com"
            {...previewState(state as PreviewState)}
          />
        ),
      }))}
    />
  ),
};

const BADGE_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'outline',
] as const;

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {BADGE_VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

const ELEVATIONS = ['default', 'flat', 'outline', 'raised'] as const;

export const Cards: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {ELEVATIONS.map((elevation) => (
        <Card key={elevation} elevation={elevation}>
          <CardHeader>
            <CardTitle>Monthly report</CardTitle>
            <CardDescription>Revenue is up 12% over last month.</CardDescription>
          </CardHeader>
          <CardContent>Elevation: {elevation}</CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              View
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};

export const Overlays: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

const errorQuery: QueryLike<string[], Error> = {
  status: 'error',
  data: undefined,
  error: new Error('Request failed'),
  refetch: () => Promise.resolve(),
};

export const AsyncStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <EmptyState title="No results" description="Try a different search." />
      <ErrorState error={new Error('Boom')} onRetry={() => undefined} />
      <QueryState query={errorQuery}>{() => null}</QueryState>
    </div>
  ),
};
