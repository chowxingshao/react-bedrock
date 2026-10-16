import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState } from '@/components/feedback';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Add, Icon, Package, Search } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const meta = {
  title: 'Design System/Example Screen',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const stats = [
  { label: 'Active projects', value: '12', dot: 'bg-chart-1' },
  { label: 'Open tasks', value: '148', dot: 'bg-chart-2' },
  { label: 'Due this week', value: '9', dot: 'bg-chart-3' },
  { label: 'Team members', value: '23', dot: 'bg-chart-4' },
] as const;

const projects = [
  {
    name: 'Website redesign',
    summary: 'New marketing site with a refreshed design system.',
    status: 'On track',
    variant: 'success',
    progress: '72% complete',
  },
  {
    name: 'Mobile app v2',
    summary: 'Offline mode and push notifications for iOS and Android.',
    status: 'At risk',
    variant: 'warning',
    progress: '41% complete',
  },
  {
    name: 'Billing migration',
    summary: 'Move invoices to the new payments provider.',
    status: 'Blocked',
    variant: 'destructive',
    progress: '18% complete',
  },
  {
    name: 'Customer research',
    summary: 'Twelve interviews synthesised into a findings report.',
    status: 'Planning',
    variant: 'info',
    progress: '5% complete',
  },
] as const;

export const DashboardScreen: Story = {
  render: () => (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <PageHeader
        title="Projects"
        description="Track progress across every project your team is working on."
        actions={
          <Button>
            <Add />
            New project
          </Button>
        }
      />

      <div className="relative">
        <Icon
          icon={Search}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input aria-label="Search projects" placeholder="Search projects" className="pl-9" />
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} elevation="outline">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', stat.dot)} />
                {stat.label}
              </CardDescription>
              <CardTitle className="text-title">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section aria-label="All projects" className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.name} elevation="raised">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.summary}</CardDescription>
              <CardAction>
                <Badge variant={project.variant} shape="pill">
                  {project.status}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-body text-muted-foreground">{project.progress}</p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" size="sm">
                View project
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section aria-label="Archived projects">
        <EmptyState
          icon={Package}
          title="No archived projects"
          description="Projects you archive will show up here so you can restore them later."
          action={<Button variant="outline">Browse active projects</Button>}
        />
      </section>
    </div>
  ),
};
