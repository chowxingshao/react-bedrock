import { useTranslation } from 'react-i18next';

import { ThemeDark, ThemeLight, ThemeSystem, type IconComponent } from '@/components/ui/icons';
import {
  isThemeMode,
  THEME_MODES,
  type ThemeMode,
  useSetThemeMode,
  useThemeMode,
} from '@/stores/theme-store';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

const ICONS = { light: ThemeLight, dark: ThemeDark, system: ThemeSystem } satisfies Record<
  ThemeMode,
  IconComponent
>;

/** Light / dark / system switcher (spec §5.2). The choice persists via the theme store. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const setMode = useSetThemeMode();
  const CurrentIcon = ICONS[mode];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('theme.change')}>
          <CurrentIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            if (isThemeMode(value)) setMode(value);
          }}
        >
          {THEME_MODES.map((option) => {
            const Icon = ICONS[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon aria-hidden="true" />
                {t(`theme.${option}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
