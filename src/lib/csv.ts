import { safeString } from './safe-string';

const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  let text = value === null || value === undefined ? '' : safeString(value);
  // A leading =, +, -, @, TAB or CR makes spreadsheets evaluate the cell (CSV injection); prefix a quote.
  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV (CRLF line endings), safe to open in spreadsheet apps. */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
