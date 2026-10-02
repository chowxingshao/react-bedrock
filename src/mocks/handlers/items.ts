import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import type { Permission } from '@/config/permissions';
import { itemFormSchema } from '@/features/example/schemas/item';
import {
  ITEM_SORT_FIELDS,
  ITEM_STATUSES,
  type Item,
  type ItemList,
  type ItemListParams,
} from '@/features/example/types/item';
import { createRequestId } from '@/lib/id';

import { apiUrl } from '../api-url';
import { mockDb } from '../db';
import { findSessionUser } from './auth';

const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
  q: z.string().optional(),
  status: z.enum(ITEM_STATUSES).optional().catch(undefined),
  sort: z.enum(ITEM_SORT_FIELDS).optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
});

/** Filtering, sorting and paging exactly as a real backend would do them. */
export function queryItems(items: readonly Item[], params: ItemListParams): ItemList {
  const q = params.q?.trim().toLowerCase();
  let result = items.filter(
    (item) =>
      (!q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) &&
      (!params.status || item.status === params.status),
  );
  if (params.sort) {
    const { sort } = params;
    const direction = params.order === 'desc' ? -1 : 1;
    result = [...result].sort((a, b) => {
      const left = a[sort];
      const right = b[sort];
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));
      return order * direction;
    });
  }
  const start = (params.page - 1) * params.pageSize;
  return {
    items: result.slice(start, start + params.pageSize),
    total: result.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

function forbiddenUnless(cookies: Record<string, string>, permission: Permission) {
  const user = findSessionUser(cookies);
  if (!user) return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (!user.permissions.includes(permission))
    return HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
  return null;
}

function validationError(fields: Record<string, string>) {
  return HttpResponse.json({ code: 'VALIDATION_ERROR', details: { fields } }, { status: 422 });
}

const nameTaken = (name: string, exceptId?: string) =>
  mockDb.items.some(
    (item) => item.id !== exceptId && item.name.toLowerCase() === name.trim().toLowerCase(),
  );

async function readForm(request: Request) {
  return itemFormSchema.safeParse(await request.json());
}

export const itemHandlers = [
  http.get(apiUrl('/items'), async ({ request, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.read');
    if (denied) return denied;
    const params = listParamsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (params.q === 'error') return HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 });
    return HttpResponse.json(queryItems(mockDb.items, params));
  }),

  http.get<{ itemId: string }>(apiUrl('/items/:itemId'), async ({ params, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.read');
    if (denied) return denied;
    const item = mockDb.items.find((candidate) => candidate.id === params.itemId);
    return item
      ? HttpResponse.json(item)
      : HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  }),

  http.post(apiUrl('/items'), async ({ request, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.create');
    if (denied) return denied;
    const form = await readForm(request);
    if (!form.success) return validationError({ form: 'INVALID' });
    if (nameTaken(form.data.name)) return validationError({ name: 'ALREADY_EXISTS' });

    const now = new Date().toISOString();
    const item: Item = {
      ...form.data,
      id: `item-${createRequestId().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    mockDb.items = [item, ...mockDb.items];
    return HttpResponse.json(item, { status: 201 });
  }),

  http.patch<{ itemId: string }>(apiUrl('/items/:itemId'), async ({ request, params, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.update');
    if (denied) return denied;
    const existing = mockDb.items.find((candidate) => candidate.id === params.itemId);
    if (!existing) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const form = await readForm(request);
    if (!form.success) return validationError({ form: 'INVALID' });
    if (nameTaken(form.data.name, existing.id)) return validationError({ name: 'ALREADY_EXISTS' });

    const updated: Item = { ...existing, ...form.data, updatedAt: new Date().toISOString() };
    mockDb.items = mockDb.items.map((item) => (item.id === updated.id ? updated : item));
    return HttpResponse.json(updated);
  }),

  http.delete<{ itemId: string }>(apiUrl('/items/:itemId'), async ({ params, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.delete');
    if (denied) return denied;
    if (params.itemId === 'item-locked')
      return HttpResponse.json({ code: 'ITEM_LOCKED' }, { status: 409 });
    if (!mockDb.items.some((item) => item.id === params.itemId)) {
      return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }
    mockDb.items = mockDb.items.filter((item) => item.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),
];
