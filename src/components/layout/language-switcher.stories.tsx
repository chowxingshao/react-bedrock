import type { Meta, StoryObj } from '@storybook/react-vite';

import { LanguageSwitcher } from './language-switcher';

const meta = { title: 'Layout/LanguageSwitcher', component: LanguageSwitcher } satisfies Meta<
  typeof LanguageSwitcher
>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Changes the real app language and remembers it. The Locale toolbar value is applied again when
 * the next story renders (its StoryShell), so the toolbar wins after you switch stories.
 */
export const Default: Story = {};
