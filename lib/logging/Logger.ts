import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import process from 'process';
import { getConfig } from '@/config';
import { logFormats } from '@/logging/formats';
import { getSourcePath } from '@/logging/getSourcePath';
import LogFileRotationFrequencyUnit from '@/types/LogFileRotationFrequencyUnit';

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
  private readonly ttyLogger: WinstonLogger;
  private readonly errorFileLogger: WinstonLogger | null = null;
  private readonly errorLogFile: string;
  private readonly errorFileLoggingEnabled: boolean;
  private readonly rotationEnabled: boolean;
  private readonly rotationFrequencyUnit: LogFileRotationFrequencyUnit;
  private readonly rotationMaxFiles: string;
  private readonly logFileRotationCompressionEnabled: boolean;

  constructor() {
    const config = getConfig();
    const ttyLoggingFormat = config.logging?.ttyLoggingFormat ?? 'coloredHumanReadableLine';
    const fileLoggingFormat = config.logging?.fileLoggingFormat ?? 'json';
    const stdoutIsTTY = process.stdout.isTTY ?? false;
    const stderrIsTTY = process.stderr.isTTY ?? false;
    this.errorLogFile = config.logging?.errorLogFile ?? 'error.log';
    this.errorFileLoggingEnabled = config.logging?.enableErrorFileLogging ?? true;
    this.rotationEnabled = config.logging?.enableLogFileRotation ?? true;
    this.rotationFrequencyUnit = config.logging?.logFileRotationFrequencyUnit ?? 'd';
    this.rotationMaxFiles = config.logging?.logFileRotationMaxFiles ?? '14d';
    this.logFileRotationCompressionEnabled = config.logging?.logFileRotationEnableCompression ?? true;
    this.sourcePath = getSourcePath();
    this.ttyLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp(),
        printf(({ level, message, timestamp, sourcePath, error }) => {
          const outLoggingFormat = stdoutIsTTY ? ttyLoggingFormat : fileLoggingFormat;
          const errLoggingFormat = stderrIsTTY ? ttyLoggingFormat : fileLoggingFormat;
          const loggingFormat = level === 'error' ? errLoggingFormat : outLoggingFormat;
          return logFormats[loggingFormat]({ level, message, timestamp, sourcePath, error });
        })
      ),
      transports: [new transports.Console({ forceConsole: forceConsole, stderrLevels: ['error'] })]
    });
    const rotationTransportOptions = {
      datePattern: DATE_PATTERNS[this.rotationFrequencyUnit],
      zippedArchive: this.logFileRotationCompressionEnabled,
      maxFiles: this.rotationMaxFiles,
      createSymlink: true,
      filename: `${this.errorLogFile}.%DATE%`,
      symlinkName: this.errorLogFile
    };
    const noneRotationTransportOptions = { filename: this.errorLogFile };
    if (this.errorFileLoggingEnabled) {
      this.errorFileLogger = createLogger({
        exitOnError: false,
        level: 'error',
        format: combine(
          timestamp(),
          printf(({ level, message, timestamp, sourcePath, error }) => {
            return logFormats[fileLoggingFormat]({ level, message, timestamp, sourcePath, error });
          })
        ),
        transports: [this.rotationEnabled ? new DailyRotateFile(rotationTransportOptions) : new transports.File(noneRotationTransportOptions)]
      });
    }
  }

  public getErrorLogger(): WinstonLogger | null {
    return this.errorFileLogger;
  }

  public debug(message: string): void {
    this.ttyLogger.debug(message, { sourcePath: this.sourcePath });
  }

  public info(message: string): void {
    this.ttyLogger.info(message, { sourcePath: this.sourcePath });
  }

  public warn(message: string): void {
    this.ttyLogger.warn(message, { sourcePath: this.sourcePath });
  }

  public error(message: string, error?: Error): void {
    const meta = { sourcePath: this.sourcePath, error };
    this.ttyLogger.error(message, meta);
    this.errorFileLogger?.error(message, meta);
  }
}

const setConsoleTest = function () {
  forceConsole = true;
};

const unsetConsoleTest = function () {
  forceConsole = false;
};

export { Logger, setConsoleTest, unsetConsoleTest };
