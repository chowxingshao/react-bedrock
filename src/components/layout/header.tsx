import { MenuIcon } from 'lucide-react';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSetMobileNavOpen } from '@/stores/ui-store';

import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';

interface HeaderProps {
  /** The "Open navigation" button, so the shell can return focus to it when the sheet closes. */
  menuButtonRef?: Ref<HTMLButtonElement>;
}

/** Sticky app header: mobile nav trigger, language, theme and user menu (spec §5.5). */
export function Header({ menuButtonRef }: HeaderProps) {
  const { t } = useTranslation();
  const setMobileNavOpen = useSetMobileNavOpen();

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center gap-1 border-b bg-background/95 px-4 backdrop-blur">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t('nav.open')}
        onClick={() => {
          setMobileNavOpen(true);
        }}
      >
        <MenuIcon aria-hidden="true" />
      </Button>
      <div className="flex-1" />
      <LanguageSwitcher />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
