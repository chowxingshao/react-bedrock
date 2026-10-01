import { LayersIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { env } from '@/config/env';

import { LanguageSwitcher } from './language-switcher';

/** Centred card layout for login and similar pages (spec §5.5). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <LayersIcon aria-hidden="true" className="size-6" />
        {env.VITE_APP_NAME}
      </div>
      <main id="main-content" tabIndex={-1} className="w-full max-w-sm outline-none">
        <Card>{children}</Card>
      </main>
      <div className="flex gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
