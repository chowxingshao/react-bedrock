import type { LogEntry, LogLevel, LogTransport } from '../types';

const LABEL_STYLE: Record<LogLevel, string> = {
  debug: 'color: gray',
  info: 'color: dodgerblue',
  warn: 'color: darkorange',
  error: 'color: crimson; font-weight: bold',
};

/** Pretty console output (spec §7.4). In production it is registered for errors only. */
export function createConsoleTransport(options: { minLevel?: LogLevel } = {}): LogTransport {
  return {
    name: 'console',
    minLevel: options.minLevel,
    log(entry: LogEntry) {
      const args = [
        `%c[${entry.level}]%c ${entry.message}`,
        LABEL_STYLE[entry.level],
        'color: inherit',
        {
          ...entry.context,
          route: entry.meta.route,
          requestId: entry.meta.requestId,
          userId: entry.meta.userId,
        },
      ] as const;
      switch (entry.level) {
        case 'debug':
          console.debug(...args);
          break;
        case 'info':
          console.info(...args);
          break;
        case 'warn':
          console.warn(...args);
          break;
        case 'error':
          console.error(...args);
          break;
      }
    },
  };
}
