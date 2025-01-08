import { format } from 'winston';
import LoggingFormat from '@/types/config/LoggingFormat';
import AccessLoggingFormat from '@/types/config/AccessLoggingFormat';
import LogEntry from '@/types/logging/LogEntry';
import AccessLogEntry from '@/types/logging/AccessLogEntry';

const { colorize } = format;
const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const buildMetaPad = function (meta: unknown, delimiter: ' - ' | '\n'): string {
  return meta ? `${delimiter}${JSON.stringify(meta)}` : '';
};

const humanReadableLine = function ({ level, message, timestamp, sourcePath, meta }: LogEntry): string {
  const metaPad = buildMetaPad(meta, ' - ');
  return `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${metaPad}`;
};

const humanReadableBlock = function ({ level, message, timestamp, sourcePath, meta }: LogEntry): string {
  const metaPad = buildMetaPad(meta, '\n');
  return `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}${metaPad}\n${BOTTOM_LINE}\n`;
};

const coloredHumanReadableLine = function ({ level, message, timestamp, sourcePath, meta }: LogEntry): string {
  const metaPad = buildMetaPad(meta, ' - ');
  return colorize().colorize(level, `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${metaPad}`);
};

const coloredHumanReadableBlock = function ({ level, message, timestamp, sourcePath, meta }: LogEntry): string {
  const metaPad = buildMetaPad(meta, ' - ');
  const block = colorize().colorize(level, `${timestamp} - [${sourcePath}] - ${level.toUpperCase()}: - ${message}${metaPad}`).replace(/ - /g, '\n');
  return `${block}\n${BOTTOM_LINE}\n`;
};

const json = function ({ level, message, timestamp, sourcePath, meta }: LogEntry): string {
  const messageString = message as string;
  const messageProperty = messageString.includes('\n') ? messageString.split('\n') : messageString;
  const logObject = { timestamp, level, source: sourcePath, message: messageProperty, meta };
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
