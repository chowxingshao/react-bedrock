import type { Item, ItemStatus } from '@/features/example/types/item';

const NAMES = [
  'Desk lamp',
  'Notebook A5',
  'Wireless mouse',
  'Mechanical keyboard',
  'Monitor stand',
  'USB-C hub',
  'Office chair',
  'Standing desk',
  'Water bottle',
  'Backpack',
  'Headphones',
  'Webcam',
  'Desk mat',
  'Cable organiser',
  'Whiteboard',
  'Marker set',
  'Paper tray',
  'Stapler',
  'Plant pot',
  'Coffee mug',
  'Bookshelf',
  'Filing cabinet',
  'Laptop sleeve',
  'Phone stand',
];
const STATUS_CYCLE: readonly ItemStatus[] = ['active', 'active', 'draft', 'archived'];
const DAY_MS = 86_400_000;
const BASE = Date.UTC(2026, 0, 1);

/** Deterministic demo data: 24 regular items plus one whose delete always fails. */
export function createItemFixtures(): Item[] {
  const regular = NAMES.map<Item>((name, index) => ({
    id: `item-${String(index + 1).padStart(3, '0')}`,
    name,
    description: `${name} from the demo catalogue.`,
    status: STATUS_CYCLE[index % STATUS_CYCLE.length] ?? 'active',
    price: Math.round((9.5 + index * 7.25) * 100) / 100,
    quantity: (index * 13) % 120,
    createdAt: new Date(BASE + index * DAY_MS).toISOString(),
    updatedAt: new Date(BASE + index * 2 * DAY_MS).toISOString(),
  }));
  return [
    ...regular,
    {
      id: 'item-locked',
      name: 'Locked sample',
      description: 'Deleting this item fails on purpose, to show the optimistic rollback.',
      status: 'active',
      price: 1,
      quantity: 1,
      createdAt: new Date(BASE).toISOString(),
      updatedAt: new Date(BASE).toISOString(),
    },
  ];
}
