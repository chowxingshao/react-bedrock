import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';

const SIZES = ['sm', 'md', 'lg', 'icon'] as const;

const meta = { title: 'UI/Pagination', component: Pagination } satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Pagination {...args}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="/?page=1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/?page=1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/?page=2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/?page=3">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="/?page=3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/** `PaginationLink` takes the Button sizes; the default is `icon`. */
export const Sizes: Story = {
  render: (args) => (
    <Pagination {...args}>
      <PaginationContent>
        {SIZES.map((size) => (
          <PaginationItem key={size}>
            <PaginationLink href="/?page=1" size={size}>
              {size === 'icon' ? '1' : size}
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  ),
};
