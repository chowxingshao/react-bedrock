import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

const meta = {
  title: "Design System/Do and Don't",
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Pair({ dont, do: doNode }: { dont: ReactNode; do: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2 rounded-md border border-destructive p-3">
        <span className="text-label text-destructive">{"Don't"}</span>
        {dont}
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-success p-3">
        <span className="text-label text-success">Do</span>
        {doNode}
      </div>
    </div>
  );
}

export const ShapeVariant: Story = {
  render: () => (
    <Pair
      dont={<Button>Retry (hard-coded radius className — avoid)</Button>}
      do={<Button shape="pill">Retry</Button>}
    />
  ),
};

export const BuiltInVariant: Story = {
  render: () => (
    <Pair
      dont={<Button>Confirm (className override — avoid)</Button>}
      do={
        <Button variant="destructive" shape="pill">
          Confirm
        </Button>
      }
    />
  ),
};

export const SemanticColour: Story = {
  render: () => (
    <Pair
      dont={
        <div className="rounded-md bg-muted p-3 text-muted-foreground">
          Raw hex values or palette classes — avoid (described in words, never applied)
        </div>
      }
      do={
        <div className="rounded-md bg-card p-3 text-muted-foreground">
          Semantic tokens: the card background and muted foreground
        </div>
      }
    />
  ),
};

export const IconBarrel: Story = {
  render: () => (
    <Pair
      dont={
        <div className="rounded-md bg-muted p-3 text-muted-foreground">
          Import from the icon library directly — avoid (ESLint-banned outside the barrel file)
        </div>
      }
      do={
        <div className="rounded-md bg-card p-3 text-muted-foreground">
          Import a semantic name from the icons barrel in the UI components folder
        </div>
      }
    />
  ),
};
