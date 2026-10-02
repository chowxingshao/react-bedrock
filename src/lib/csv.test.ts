import { describe, expect, it } from 'vitest';

import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins rows with CRLF and quotes values that need it', () => {
    expect(
      toCsv([
        ['Name', 'Note'],
        ['Lamp', 'plain'],
        ['Desk, large', 'says "hi"'],
        ['Multi\nline', 42],
      ]),
    ).toBe('Name,Note\r\nLamp,plain\r\n"Desk, large","says ""hi"""\r\n"Multi\nline",42');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(toCsv([['=SUM(A1:A9)', '+1', '-2', '@x']])).toBe("'=SUM(A1:A9),'+1,'-2,'@x");
  });

  it('neutralises a cell that starts with a tab or a carriage return', () => {
    expect(toCsv([['\tcmd', '\rcmd']])).toBe('\'\tcmd,"\'\rcmd"');
  });

  it('quotes a neutralised cell that also needs quoting', () => {
    expect(toCsv([['-a,b', '=x"y']])).toBe('"\'-a,b","\'=x""y"');
  });

  it('writes null and undefined as empty cells', () => {
    expect(toCsv([[null, undefined, 'x', 0]])).toBe(',,x,0');
  });
});
