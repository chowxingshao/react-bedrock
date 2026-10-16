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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Add } from '@/components/ui/icons';
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
      caption="Button — variant × state (disabled shown; hover/focus/active are live in the canvas)"
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

const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;

export const ButtonSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {BUTTON_SIZES.map((size) => (
        <Button key={size} size={size}>
          Save
        </Button>
      ))}
      <Button size="icon" aria-label="Add project">
        <Add />
      </Button>
      <Button>
        <Add />
        New project
      </Button>
    </div>
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

const loadingQuery: QueryLike<string[], Error> = {
  status: 'pending',
  data: undefined,
  error: null,
  refetch: () => Promise.resolve(),
};
const successQuery: QueryLike<string[], Error> = {
  status: 'success',
  data: ['Apollo', 'Borealis', 'Cedar'],
  error: null,
  refetch: () => Promise.resolve(),
};

export const AsyncStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <QueryState query={loadingQuery}>{() => null}</QueryState>
      <QueryState query={successQuery}>
        {(names) => (
          <ul className="flex flex-col gap-1">
            {names.map((name) => (
              <li key={name} className="text-body">
                {name}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <EmptyState title="No projects yet" description="Create your first project to get started." />
      <ErrorState error={new Error('The server did not respond')} onRetry={() => undefined} />
    </div>
  ),
};

export const EdgeCases: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            A project with an unusually long name that should wrap gracefully across several lines
          </CardTitle>
          <CardDescription>
            This description is intentionally verbose to show how the card handles long-form copy
            without breaking its layout or overflowing its container.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="warning">needs review</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Short</CardTitle>
        </CardHeader>
        <CardContent>Minimal card.</CardContent>
      </Card>
    </div>
  ),
};
