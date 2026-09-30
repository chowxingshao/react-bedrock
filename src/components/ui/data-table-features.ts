import {
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * Features every DataTable supports (TanStack Table v9 tree-shakes the rest).
 * Tables are server-driven, so no client-side row models are registered.
 * `columnVisibilityFeature` is required for `row.getVisibleCells()`.
 */
export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;
