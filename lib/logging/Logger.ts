import process from 'process';
import paths from 'path';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getFullConfig } from '@/config/config';
import { accessLogFormats, logFormats } from '@/logging/formats';
import { getSourcePath } from '@/logging/getSourcePath';
import LogFileRotationFrequencyUnit from '@/types/config/LogFileRotationFrequencyUnit';
import LoggingFormat from '@/types/config/LoggingFormat';
import AccessLoggingFormat from '@/types/config/AccessLoggingFormat';
import AccessLogEntry from '@/types/logging/AccessLogEntry';

const { combine, timestamp, printf } = format;

let forceConsole = false;

const DATE_PATTERNS: Record<LogFileRotationFrequencyUnit, string> = {
  d: 'YYYY-MM-DD',
  h: 'YYYY-MM-DD_HH',
  m: 'YYYY-MM-DD_HH-mm',
  s: 'YYYY-MM-DD_HH-mm-ss'
};

const formatNumber = function (value: number, digits: number): string {
  return (value + '').padStart(digits, '0');
};

const dateFormatter = function (): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = formatNumber(date.getMonth() + 1, 2);
  const day = formatNumber(date.getDate(), 2);
  const hour = formatNumber(date.getHours(), 2);
  const minute = formatNumber(date.getMinutes(), 2);
  const second = formatNumber(date.getSeconds(), 2);
  const milli = formatNumber(date.getMilliseconds(), 3);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${milli}`;
};

/**
 * Used to log access, errors and other events.
 *
 * It logs all events except for access to tty.
 * It optionally also logs errors log file and webserver access to access log file.
 *
 * TTY logging and file logging use different formats, specified via config, defaulting to `humanReadableLine` and `json`.
 * When stdout or stderr is redirected to file, file logging format is used.
 */
class Logger {
  private readonly level: 'debug' | 'info' | 'warn' | 'error';
  private readonly ttyLoggingFormat: LoggingFormat;
  private readonly fileLoggingFormat: LoggingFormat;
  private readonly errorFileLoggingFormat: LoggingFormat;
  private readonly accessLoggingFormat: AccessLoggingFormat;
  private ttyLogger: WinstonLogger | null = null;
  private errorFileLogger: WinstonLogger | null = null;
  private accessFileLogger: WinstonLogger | null = null;
  private readonly errorLogFile: string;
  private readonly accessLogFile: string;
  private readonly accessLoggingEnabled: boolean;
  private readonly errorFileLoggingEnabled: boolean;
  private readonly rotationEnabled: boolean;
  private readonly rotationFrequencyUnit: LogFileRotationFrequencyUnit;
  private readonly rotationMaxFiles: string;
  private readonly logFileRotationCompressionEnabled: boolean;

  private createRotationTransportOptions(path: string) {
    return {
      datePattern: DATE_PATTERNS[this.rotationFrequencyUnit],
      zippedArchive: this.logFileRotationCompressionEnabled,
      maxFiles: this.rotationMaxFiles,
      createSymlink: true,
      filename: `${path}.%DATE%`,
      symlinkName: path,
      auditFile: paths.join(paths.dirname(path), `.${paths.basename(path)}-audit.json`)
    };
  }

  private createConsoleLogger() {
    const stdoutIsTTY = process.stdout.isTTY ?? false;
    const stderrIsTTY = process.stderr.isTTY ?? false;
    this.ttyLogger = createLogger({
      level: this.level,
      format: combine(
        timestamp({ format: dateFormatter }),
        printf(({ level, message, timestamp, sourcePath, meta }) => {
          const outLoggingFormat = stdoutIsTTY ? this.ttyLoggingFormat : this.fileLoggingFormat;
          const errLoggingFormat = stderrIsTTY ? this.ttyLoggingFormat : this.fileLoggingFormat;
          const loggingFormat = level === 'error' ? errLoggingFormat : outLoggingFormat;
          return logFormats[loggingFormat]({ level, message, timestamp, sourcePath, meta });
        })
      ),
      transports: [new transports.Console({ forceConsole: forceConsole, stderrLevels: ['error'] })]
    });
  }

  private createErrorFileLogger() {
    if (this.errorFileLoggingEnabled) {
      this.errorFileLogger = createLogger({
        exitOnError: false,
        level: 'error',
        format: combine(
          timestamp({ format: dateFormatter }),
          printf(({ level, message, timestamp, sourcePath, meta }) => {
            return logFormats[this.errorFileLoggingFormat]({ level, message, timestamp, sourcePath, meta });
          })
        ),
        transports: [
          this.rotationEnabled
            ? new DailyRotateFile(this.createRotationTransportOptions(this.errorLogFile))
            : new transports.File({ filename: this.errorLogFile })
        ]
      });
    }
  }

  private createAccessFileLogger() {
    if (this.accessLoggingEnabled) {
      this.accessFileLogger = createLogger({
        exitOnError: false,
        level: 'info',
        format: combine(
          timestamp({ format: dateFormatter }),
          printf(({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent, time }) => {
            return accessLogFormats[this.accessLoggingFormat]({
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
            });
          })
        ),
        transports: [
          this.rotationEnabled
            ? new DailyRotateFile(this.createRotationTransportOptions(this.accessLogFile))
            : new transports.File({ filename: this.accessLogFile })
        ]
      });
    }
  }

  constructor() {
    const config = getFullConfig();
    this.level = config.logging?.level as 'debug' | 'info' | 'warn' | 'error';
    this.ttyLoggingFormat = config.logging?.ttyLoggingFormat as LoggingFormat;
    this.fileLoggingFormat = config.logging?.fileLoggingFormat as LoggingFormat;
    this.accessLoggingFormat = config.logging?.accessLoggingFormat as AccessLoggingFormat;
    this.errorFileLoggingFormat = config.logging?.errorFileLoggingFormat as LoggingFormat;
    this.errorLogFile = config.logging?.errorLogFile as string;
    this.accessLogFile = config.logging?.accessLogFile as string;
    this.errorFileLoggingEnabled = config.logging?.enableErrorFileLogging as boolean;
    this.accessLoggingEnabled = config.logging?.enableAccessLogging as boolean;
    this.rotationEnabled = config.logging?.enableLogFileRotation as boolean;
    this.rotationFrequencyUnit = config.logging?.logFileRotationFrequencyUnit as LogFileRotationFrequencyUnit;
    this.rotationMaxFiles = config.logging?.logFileRotationMaxFiles as string;
    this.logFileRotationCompressionEnabled = config.logging?.logFileRotationEnableCompression as boolean;

    this.createConsoleLogger();
    this.createErrorFileLogger();
    this.createAccessFileLogger();
  }

  public getErrorLogger(): WinstonLogger | null {
    return this.errorFileLogger;
  }

  public getAccessLogger(): WinstonLogger | null {
    return this.accessFileLogger;
  }

  /**
   * logs in debug level
   * @param message The message to log
   * @param meta The optional metadata to append to the `message`
   *
   * @returns This logger instance
   */
  public debug(message: string, meta?: Record<string, unknown>): Logger {
    this.ttyLogger?.debug(message, { sourcePath: getSourcePath(), meta });
    return this;
  }

  /**
   * logs in info level
   * @param message The message to log
   * @param meta The optional metadata to append to the `message`
   *
   * @returns This logger instance
   */
  public info(message: string, meta?: Record<string, unknown>): Logger {
    this.ttyLogger?.info(message, { sourcePath: getSourcePath(), meta });
    return this;
  }

  /**
   * logs in warn level
   * @param message The message to log
   * @param meta The optional metadata to append to the `message`
   *
   * @returns This logger instance
   */
  public warn(message: string, meta?: Record<string, unknown>): Logger {
    this.ttyLogger?.warn(message, { sourcePath: getSourcePath(), meta });
    return this;
  }

  /**
   * logs in error level
   * @param message The message to log
   * @param meta The optional metadata to append to the `message`
   *
   * @returns This logger instance
   */
  public error(message: string, meta?: Record<string, unknown>): Logger {
    const metaObject = { sourcePath: getSourcePath(), meta };
    this.ttyLogger?.error(message, metaObject);
    this.errorFileLogger?.error(message, metaObject);
    return this;
  }

  /**
   * Logs access event.
   *
   * LogEntry contains common properties like in nginx, plus time the request took.
   *
   * @param entry The Entry containing the access properties (ip, method, path, etc.)
   *
   * @returns This logger instance
   */
  public access({ method, path, statusCode, contentLength, ...rest }: Omit<AccessLogEntry, 'timestamp'>): Logger {
    this.accessFileLogger?.info('', { method, path, statusCode, contentLength, ...rest });
    const isApiRequest = /^\/api\//.test(path as string);
    if (!isApiRequest && (statusCode as number) < 399) {
      this.ttyLogger?.info(`Access: statusCode ${statusCode} on ${method} ${path}`, {
        sourcePath: getSourcePath(),
        meta: { method, path, statusCode, contentLength }
      });
    }
    return this;
  }
}

const setConsoleTest = function () {
  forceConsole = true;
};

const unsetConsoleTest = function () {
  forceConsole = false;
};

export { Logger, setConsoleTest, unsetConsoleTest };
