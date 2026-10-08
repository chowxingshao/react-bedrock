import { Fragment, type ReactNode, type Ref } from 'react';
import { Link } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  /** Omit for the current page (the last crumb). */
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: readonly Crumb[];
  /** Page-level actions (buttons, menus), shown on the right. */
  actions?: ReactNode;
  /**
   * Makes the title focusable by code (not by Tab) and hands it out, so a page can put focus there when the
   * element that had it has gone, e.g. after its last row was deleted.
   */
  titleRef?: Ref<HTMLHeadingElement>;
}

/** Title, breadcrumbs and actions for a page; renders the page's single h1 (spec §5.5). */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  titleRef,
}: PageHeaderProps) {
  return (
    <div className="mb-6 grid gap-3">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${String(index)}-${crumb.label}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {crumb.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.to}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1
            ref={titleRef}
            tabIndex={titleRef ? -1 : undefined}
            className={cn(
              'text-2xl font-semibold tracking-tight',
              titleRef
                ? 'rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring'
                : undefined,
            )}
          >
            {title}
          </h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
