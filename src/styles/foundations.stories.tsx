import type { Meta, StoryObj } from '@storybook/react-vite';

import { ColorPair } from '@/components/showcase';
import * as Icons from '@/components/ui/icons';

const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ROLE_PAIRS = [
  {
    name: 'Primary',
    surfaceVar: '--primary',
    foregroundVar: '--primary-foreground',
    surfaceClass: 'bg-primary',
    foregroundClass: 'text-primary-foreground',
  },
  {
    name: 'Secondary',
    surfaceVar: '--secondary',
    foregroundVar: '--secondary-foreground',
    surfaceClass: 'bg-secondary',
    foregroundClass: 'text-secondary-foreground',
  },
  {
    name: 'Muted',
    surfaceVar: '--muted',
    foregroundVar: '--muted-foreground',
    surfaceClass: 'bg-muted',
    foregroundClass: 'text-muted-foreground',
  },
  {
    name: 'Accent',
    surfaceVar: '--accent',
    foregroundVar: '--accent-foreground',
    surfaceClass: 'bg-accent',
    foregroundClass: 'text-accent-foreground',
  },
  {
    name: 'Destructive',
    surfaceVar: '--destructive',
    foregroundVar: '--destructive-foreground',
    surfaceClass: 'bg-destructive',
    foregroundClass: 'text-destructive-foreground',
  },
  {
    name: 'Success',
    surfaceVar: '--success',
    foregroundVar: '--success-foreground',
    surfaceClass: 'bg-success',
    foregroundClass: 'text-success-foreground',
  },
  {
    name: 'Warning',
    surfaceVar: '--warning',
    foregroundVar: '--warning-foreground',
    surfaceClass: 'bg-warning',
    foregroundClass: 'text-warning-foreground',
  },
  {
    name: 'Info',
    surfaceVar: '--info',
    foregroundVar: '--info-foreground',
    surfaceClass: 'bg-info',
    foregroundClass: 'text-info-foreground',
  },
  {
    name: 'Card',
    surfaceVar: '--card',
    foregroundVar: '--card-foreground',
    surfaceClass: 'bg-card',
    foregroundClass: 'text-card-foreground',
  },
  {
    name: 'Popover',
    surfaceVar: '--popover',
    foregroundVar: '--popover-foreground',
    surfaceClass: 'bg-popover',
    foregroundClass: 'text-popover-foreground',
  },
  {
    name: 'Background',
    surfaceVar: '--background',
    foregroundVar: '--foreground',
    surfaceClass: 'bg-background',
    foregroundClass: 'text-foreground',
  },
] as const;

export const ColorRoles: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {ROLE_PAIRS.map((p) => (
        <ColorPair
          key={p.name}
          {...p}
          sampleText="The quick brown fox"
          passLabel="AA"
          failLabel="low"
        />
      ))}
    </div>
  ),
};

const CHART = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'] as const;

export const ExtendedPalette: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {CHART.map((c) => (
          <div key={c} className={`size-12 rounded-md ${c}`} />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md bg-sidebar p-3 text-sidebar-foreground">
        <span className="rounded-md bg-sidebar-primary px-2 py-1 text-label text-sidebar-primary-foreground">
          Primary
        </span>
        <span className="rounded-md bg-sidebar-accent px-2 py-1 text-label text-sidebar-accent-foreground">
          Accent
        </span>
      </div>
    </div>
  ),
};

const TYPE = [
  'text-display',
  'text-title',
  'text-heading',
  'text-body',
  'text-label',
  'text-caption',
] as const;

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {TYPE.map((t) => (
        <p key={t} className={t}>
          Ship features, not surprises — {t}
        </p>
      ))}
    </div>
  ),
};

export const SpacingDensity: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <div className="h-(--control-h-sm) rounded-md bg-primary px-3" />
      <div className="h-(--control-h-md) rounded-md bg-primary px-3" />
      <div className="h-(--control-h-lg) rounded-md bg-primary px-3" />
    </div>
  ),
};

const RADII = [
  'rounded-xs',
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-2xl',
  'rounded-full',
] as const;

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {RADII.map((r) => (
        <div key={r} className={`size-16 bg-accent ${r}`} />
      ))}
    </div>
  ),
};

const SHADOWS = ['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg'] as const;

export const Elevation: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 p-4">
      {SHADOWS.map((s) => (
        <div key={s} className={`size-20 rounded-md bg-card ${s}`} />
      ))}
    </div>
  ),
};

const MOTION = [
  { name: 'duration-fast', sample: 'transition-colors duration-fast' },
  { name: 'duration-normal', sample: 'transition-colors duration-normal' },
  { name: 'duration-slow', sample: 'transition-colors duration-slow' },
] as const;

export const Motion: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {MOTION.map((m) => (
        <div
          key={m.name}
          className={`hover-lift rounded-md bg-card p-3 text-body interactive ${m.sample}`}
        >
          {m.name} — hover me
        </div>
      ))}
      <p className="text-caption text-muted-foreground">
        Under reduced motion, durations and move distances drop to zero and these samples hold
        still.
      </p>
    </div>
  ),
};

const GLYPHS = Object.entries(Icons).filter(([name]) => name !== 'Icon');

export const IconRow: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4 md:grid-cols-10">
      {GLYPHS.map(([name, Glyph]) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <Icons.Icon icon={Glyph as Icons.IconComponent} size="lg" />
          <span className="text-caption text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  ),
};
