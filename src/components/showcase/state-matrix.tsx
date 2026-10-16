import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface StateMatrixRow {
  label: string;
  render: (state: string) => ReactNode;
}

export interface StateMatrixProps {
  caption: string;
  columns: readonly string[];
  rows: readonly StateMatrixRow[];
  className?: string;
}

/** A labelled grid: one column per state, one row per variant. */
export function StateMatrix({ caption, columns, rows, className }: StateMatrixProps) {
  return (
    <figure className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="mb-2 text-caption text-muted-foreground">{caption}</caption>
        <thead>
          <tr>
            <th className="p-2 text-label text-muted-foreground" scope="col">
              {/* empty corner */}
            </th>
            {columns.map((col) => (
              <th key={col} className="p-2 text-label text-muted-foreground" scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border">
              <th className="p-2 text-label text-muted-foreground" scope="row">
                {row.label}
              </th>
              {columns.map((col) => (
                <td key={col} className="p-2">
                  {row.render(col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
