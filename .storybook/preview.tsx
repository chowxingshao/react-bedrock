import type { Preview } from '@storybook/react-vite';
import { type ReactNode, useEffect } from 'react';

import '@/styles/globals.css';
import { SUPPORTED_LOCALES, type Locale } from '@/config/constants';
import { i18n } from '@/core/i18n';
import { applyResolvedTheme, type ResolvedTheme } from '@/stores/theme-store';

function StoryShell({
  theme,
  locale,
  children,
}: {
  theme: ResolvedTheme;
  locale: Locale;
  children: ReactNode;
}) {
  useEffect(() => {
    applyResolvedTheme(theme);
  }, [theme]);
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);
  return children;
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Language',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [...SUPPORTED_LOCALES],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', locale: 'en' },
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story, context) => (
      <StoryShell
        theme={context.globals.theme as ResolvedTheme}
        locale={context.globals.locale as Locale}
      >
        <Story />
      </StoryShell>
    ),
  ],
};

export default preview;
