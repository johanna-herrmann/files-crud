import { format } from 'winston';
import LoggingFormat from '@/types/LoggingFormat';
import AccessLoggingFormat from '@/types/AccessLoggingFormat';
import LogEntry from '@/types/LogEntry';
import AccessLogEntry from '@/types/AccessLogEntry';

const { colorize } = format;
const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const buildMetaPadAndErrorPad = function (meta?: unknown, error?: unknown, delimiter = ' - '): [string, string] {
  const metaPad = meta ? `${delimiter}${JSON.stringify(meta)}` : '';
  const errorPad = error ? `${delimiter}${(error as Error).message}` : '';
  return [metaPad, errorPad];
};

const humanReadableLine = function ({ level, message, timestamp, sourcePath, meta, error }: LogEntry): string {
  const [metaPad, errorPad] = buildMetaPadAndErrorPad(meta, error);
  return `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${errorPad}${metaPad}`;
};

const humanReadableBlock = function ({ level, message, timestamp, sourcePath, meta, error }: LogEntry): string {
  const [metaPad, errorPad] = buildMetaPadAndErrorPad(meta, error, '\n');
  return `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}${errorPad}${metaPad}\n${BOTTOM_LINE}\n`;
};

const coloredHumanReadableLine = function ({ level, message, timestamp, sourcePath, meta, error }: LogEntry): string {
  const [metaPad, errorPad] = buildMetaPadAndErrorPad(meta, error);
  return colorize().colorize(level, `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${errorPad}${metaPad}`);
};

const coloredHumanReadableBlock = function ({ level, message, timestamp, sourcePath, meta, error }: LogEntry): string {
  const [metaPad, errorPad] = buildMetaPadAndErrorPad(meta, error);
  const block = colorize()
    .colorize(level, `${timestamp} - [${sourcePath}] - ${level.toUpperCase()}: - ${message}${errorPad}${metaPad}`)
    .split(' - ')
    .join('\n');
  return `${block}\n${BOTTOM_LINE}\n`;
};

const json = function ({ level, message, timestamp, sourcePath, meta, error }: LogEntry): string {
  const logObject = { timestamp, level, source: sourcePath, message, meta, errorMessage: (error as Error)?.message ?? undefined };
  return JSON.stringify(logObject);
};

const accessClassic = function ({
  ip,
  timestamp,
  method,
  path,
  httpVersion,
  statusCode,
  contentLength,
  referer,
  userAgent,
  time
}: AccessLogEntry): string {
  return `${ip} - [${timestamp}] "${method} ${path} ${httpVersion}" ${statusCode} ${contentLength} "${referer}" "${userAgent}" - ${time}`;
};

const accessJson = function (accessLogEntry: AccessLogEntry): string {
  return JSON.stringify(accessLogEntry);
};

const logFormats: Record<LoggingFormat, (entry: LogEntry) => string> = {
  humanReadableLine,
  humanReadableBlock,
  coloredHumanReadableLine,
  coloredHumanReadableBlock,
  json
};

const accessLogFormats: Record<AccessLoggingFormat, (entry: AccessLogEntry) => string> = {
  classic: accessClassic,
  json: accessJson
};

export { logFormats, accessLogFormats, BOTTOM_LINE };
