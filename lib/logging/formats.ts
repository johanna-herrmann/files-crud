import { format } from 'winston';
import LoggingFormat from '@/types/LoggingFormat';
import AccessLoggingFormat from '@/types/AccessLoggingFormat';
import LogEntry from '@/types/LogEntry';
import AccessLogEntry from '@/types/AccessLogEntry';

const { colorize } = format;
const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const humanReadableLine = function ({ level, message, timestamp, sourcePath, error }: LogEntry): string {
  const errorPad = error ? ` - ${(error as Error).message}` : '';
  return `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${errorPad}`;
};

const humanReadableBlock = function ({ level, message, timestamp, sourcePath, error }: LogEntry): string {
  const errorPad = error ? `\n${(error as Error).message}` : '';
  return `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}${errorPad}\n${BOTTOM_LINE}\n`;
};

const coloredHumanReadableLine = function ({ level, message, timestamp, sourcePath, error }: LogEntry): string {
  const errorPad = error ? ` - ${(error as Error).message}` : '';
  return colorize().colorize(level, `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${errorPad}`);
};

const coloredHumanReadableBlock = function ({ level, message, timestamp, sourcePath, error }: LogEntry): string {
  const errorPad = error ? ` - ${(error as Error).message}` : '';
  const block = colorize()
    .colorize(level, `${timestamp} - [${sourcePath}] - ${level.toUpperCase()}: - ${message}${errorPad}`)
    .split(' - ')
    .join('\n');
  return `${block}\n${BOTTOM_LINE}\n`;
};

const json = function ({ level, message, timestamp, sourcePath, error }: LogEntry): string {
  const logObject = { timestamp, level, source: sourcePath, message, errorMessage: (error as Error)?.message ?? undefined };
  return JSON.stringify(logObject);
};

const accessClassic = function ({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent }: AccessLogEntry): string {
  return `${ip} - [${timestamp}] "${method} ${path} ${httpVersion}" ${statusCode} ${contentLength} "${referer}" "${userAgent}"`;
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
