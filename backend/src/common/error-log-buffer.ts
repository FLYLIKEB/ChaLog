const MAX_SIZE = 100;

export type LogLevel = 'error' | 'warn';

export interface LogEntry {
  timestamp: string;
  statusCode: number;
  message: string;
  path: string;
  method: string;
  level: LogLevel;
}

const buffer: LogEntry[] = [];

export function pushLog(entry: Omit<LogEntry, 'level'> & { level?: LogLevel }): void {
  const level: LogLevel = entry.statusCode >= 500 ? 'error' : 'warn';
  buffer.push({ ...entry, level });
  if (buffer.length > MAX_SIZE) {
    buffer.shift();
  }
}

export function getRecentLogs(
  limit = 50,
  level?: LogLevel,
): LogEntry[] {
  let items = buffer.slice(-limit).reverse();
  if (level) {
    items = items.filter((e) => e.level === level);
  }
  return items;
}

/** @deprecated Use getRecentLogs instead */
export function getRecentErrors(limit = 20): LogEntry[] {
  return getRecentLogs(limit, 'error');
}
