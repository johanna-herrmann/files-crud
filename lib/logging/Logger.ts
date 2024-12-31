import { createLogger, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import process from 'process';
import { getConfig } from '@/config';
import { formats } from '@/logging/formats';
import { getSourcePath } from '@/logging/getSourcePath';
import LogFileRotationFrequencyUnit from '@/types/LogFileRotationFrequencyUnit';

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
  private readonly fileLogger: WinstonLogger;
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
    this.errorLogFile = config.logging?.errorLogFile ?? 'error.log';
    this.errorFileLoggingEnabled = config.logging?.enableErrorFileLogging ?? true;
    this.rotationEnabled = config.logging?.enableLogFileRotation ?? true;
    this.rotationFrequencyUnit = config.logging?.logFileRotationFrequencyUnit ?? 'd';
    this.rotationMaxFiles = config.logging?.logFileRotationMaxFiles ?? '14d';
    this.logFileRotationCompressionEnabled = config.logging?.logFileRotationEnableCompression ?? true;
    this.sourcePath = getSourcePath();
    this.ttyLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: formats[ttyLoggingFormat],
      transports: [new transports.Console({ forceConsole: forceConsole })]
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
    this.fileLogger = createLogger({
      exitOnError: false,
      level: 'error',
      format: formats[fileLoggingFormat],
      transports: [this.rotationEnabled ? new DailyRotateFile(rotationTransportOptions) : new transports.File(noneRotationTransportOptions)]
    });
  }

  public getErrorLogger(): WinstonLogger {
    return this.fileLogger;
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
    this.ttyLogger.error(message, { sourcePath: this.sourcePath, error });
    if (this.errorFileLoggingEnabled) {
      this.fileLogger.error(message, { sourcePath: this.sourcePath, error });
    }
  }
}

const setConsoleTest = function () {
  forceConsole = true;
};

const unsetConsoleTest = function () {
  forceConsole = false;
};

export { Logger, setConsoleTest, unsetConsoleTest };
