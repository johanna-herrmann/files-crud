import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import process from 'process';
import { getConfig } from '@/config';
import { accessLogFormats, logFormats } from '@/logging/formats';
import { getSourcePath } from '@/logging/getSourcePath';
import LogFileRotationFrequencyUnit from '@/types/LogFileRotationFrequencyUnit';
import LoggingFormat from '@/types/LoggingFormat';
import AccessLoggingFormat from '@/types/AccessLoggingFormat';
import AccessLogEntry from '@/types/AccessLogEntry';

const { combine, timestamp, printf } = format;

let forceConsole = false;

const DATE_PATTERNS: Record<LogFileRotationFrequencyUnit, string> = {
  d: 'YYYY-MM-DD',
  h: 'YYYY-MM-DD_HH',
  m: 'YYYY-MM-DD_HH-mm',
  s: 'YYYY-MM-DD_HH-mm-ss'
};

class Logger {
  private readonly sourcePath: string;
  private readonly ttyLoggingFormat: LoggingFormat;
  private readonly fileLoggingFormat: LoggingFormat;
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
      symlinkName: path
    };
  }

  private createConsoleLogger() {
    const stdoutIsTTY = process.stdout.isTTY ?? false;
    const stderrIsTTY = process.stderr.isTTY ?? false;
    this.ttyLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp(),
        printf(({ level, message, timestamp, sourcePath, error }) => {
          const outLoggingFormat = stdoutIsTTY ? this.ttyLoggingFormat : this.fileLoggingFormat;
          const errLoggingFormat = stderrIsTTY ? this.ttyLoggingFormat : this.fileLoggingFormat;
          const loggingFormat = level === 'error' ? errLoggingFormat : outLoggingFormat;
          return logFormats[loggingFormat]({ level, message, timestamp, sourcePath, error });
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
          timestamp(),
          printf(({ level, message, timestamp, sourcePath, error }) => {
            return logFormats[this.fileLoggingFormat]({ level, message, timestamp, sourcePath, error });
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
          timestamp(),
          printf(({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent }) => {
            return accessLogFormats[this.accessLoggingFormat]({
              ip,
              timestamp,
              method,
              path,
              httpVersion,
              statusCode,
              contentLength,
              referer,
              userAgent
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
    const config = getConfig();
    this.ttyLoggingFormat = config.logging?.ttyLoggingFormat ?? 'coloredHumanReadableLine';
    this.fileLoggingFormat = config.logging?.fileLoggingFormat ?? 'json';
    this.accessLoggingFormat = config.logging?.accessLoggingFormat ?? 'json';
    this.errorLogFile = config.logging?.errorLogFile ?? 'error.log';
    this.accessLogFile = config.logging?.accessLogFile ?? 'access.log';
    this.errorFileLoggingEnabled = config.logging?.enableErrorFileLogging ?? true;
    this.accessLoggingEnabled = config.logging?.enableAccessLogging ?? true;
    this.rotationEnabled = config.logging?.enableLogFileRotation ?? true;
    this.rotationFrequencyUnit = config.logging?.logFileRotationFrequencyUnit ?? 'd';
    this.rotationMaxFiles = config.logging?.logFileRotationMaxFiles ?? '14d';
    this.logFileRotationCompressionEnabled = config.logging?.logFileRotationEnableCompression ?? true;
    this.sourcePath = getSourcePath();

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

  public debug(message: string): void {
    this.ttyLogger?.debug(message, { sourcePath: this.sourcePath });
  }

  public info(message: string): void {
    this.ttyLogger?.info(message, { sourcePath: this.sourcePath });
  }

  public warn(message: string): void {
    this.ttyLogger?.warn(message, { sourcePath: this.sourcePath });
  }

  public error(message: string, error?: Error): void {
    const meta = { sourcePath: this.sourcePath, error };
    this.ttyLogger?.error(message, meta);
    this.errorFileLogger?.error(message, meta);
  }

  public access(entry: Omit<AccessLogEntry, 'timestamp'>): void {
    this.accessFileLogger?.info('', entry);
  }
}

const setConsoleTest = function () {
  forceConsole = true;
};

const unsetConsoleTest = function () {
  forceConsole = false;
};

export { Logger, setConsoleTest, unsetConsoleTest };
