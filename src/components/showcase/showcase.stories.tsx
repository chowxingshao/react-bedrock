import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

import { ColorPair } from './color-pair';
import { previewState } from './preview-state';
import { StateMatrix } from './state-matrix';

const meta = {
  title: 'Design System/Helpers',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ColorContrast: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <ColorPair
        name="Primary"
        surfaceVar="--primary"
        foregroundVar="--primary-foreground"
        surfaceClass="bg-primary"
        foregroundClass="text-primary-foreground"
        sampleText="The quick brown fox"
        passLabel="AA"
        failLabel="low"
      />
      <ColorPair
        name="Muted"
        surfaceVar="--muted"
        foregroundVar="--muted-foreground"
        surfaceClass="bg-muted"
        foregroundClass="text-muted-foreground"
        sampleText="The quick brown fox"
        passLabel="AA"
        failLabel="low"
      />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <StateMatrix
      caption="Button across forced states"
      columns={['default', 'disabled', 'invalid']}
      rows={[
        {
          label: 'default',
          render: (state) => (
            <Button {...previewState(state as 'default' | 'disabled' | 'invalid')}>Save</Button>
          ),
        },
      ]}
    />
  ),
};
