interface LogEntry {
  level: string;
  message: unknown;
  timestamp: unknown;
  sourcePath: unknown;
  meta?: unknown;
  error?: unknown;
}

export default LogEntry;
