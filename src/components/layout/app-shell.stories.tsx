import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboardIcon, PackageIcon } from 'lucide-react';

import { AuthProvider, type AuthStrategy } from '@/core/auth';
import type { SessionUser } from '@/stores/session-store';

import { AppShell } from './app-shell';
import { PageHeader } from './page-header';

const demoUser: SessionUser = {
  id: 'demo',
  name: 'Demo User',
  email: 'demo@example.com',
  permissions: ['items.read'],
};

/** A strategy that is always signed in, so the shell renders without an API. */
const storyStrategy: AuthStrategy = {
  login: () => Promise.resolve(demoUser),
  logout: () => Promise.resolve(),
  fetchCurrentUser: () => Promise.resolve(demoUser),
  refresh: () => Promise.resolve(),
  prepareRequest: (config) => config,
};

const queryClient = new QueryClient();

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider strategy={storyStrategy}>
          <Story />
        </AuthProvider>
      </QueryClientProvider>
    ),
  ],
  args: {
    navItems: [
      { labelKey: 'nav.dashboard', icon: LayoutDashboardIcon, to: '/', end: true },
      { labelKey: 'nav.items', icon: PackageIcon, to: '/items', permission: 'items.read' },
    ],
    children: <PageHeader title="Dashboard" description="Page content renders here." />,
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
