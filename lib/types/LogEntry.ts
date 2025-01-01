interface LogEntry {
  level: string;
  message: unknown;
  timestamp: unknown;
  sourcePath: unknown;
  error?: unknown;
}

export default LogEntry;
