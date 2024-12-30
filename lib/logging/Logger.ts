import { createLogger, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import process from 'process';
import { getConfig } from '@/config';
import { formats } from '@/logging/formats';
import { getSourcePath } from '@/logging/getSourcePath';

let forceConsole = false;
let datePattern = 'YYYY-MM-DD_HH';

class Logger {
  private readonly sourcePath: string;
  private readonly ttyLogger: WinstonLogger;
  private readonly fileLogger: WinstonLogger;
  private readonly errorLogFile: string;
  private readonly errorFileLoggingEnabled: boolean;
  private readonly rotationEnabled: boolean;
  private readonly rotationMaxFiles: string;
  private readonly errorFileLoggingCompressionEnabled: boolean;

  constructor() {
    const config = getConfig();
    const ttyLoggingFormat = config.logging?.ttyLoggingFormat ?? 'coloredHumanReadableLine';
    const fileLoggingFormat = config.logging?.fileLoggingFormat ?? 'json';
    this.errorLogFile = config.logging?.errorLogFile ?? 'error.log';
    this.errorFileLoggingEnabled = config.logging?.enableErrorFileLogging ?? true;
    this.rotationEnabled = config.logging?.enableLogFileRotation ?? true;
    this.rotationMaxFiles = config.logging?.logFileRotationMaxFiles ?? '3d';
    this.errorFileLoggingCompressionEnabled = config.logging?.logFileRotationEnableCompression ?? true;
    this.sourcePath = getSourcePath();
    this.ttyLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: formats[ttyLoggingFormat],
      transports: [new transports.Console({ forceConsole: forceConsole })]
    });
    const rotationTransportOptions = {
      filename: this.errorLogFile,
      datePattern,
      zippedArchive: this.errorFileLoggingCompressionEnabled,
      maxFiles: this.rotationMaxFiles
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

const setPatternTest = function () {
  datePattern = 'YYYY-MM-DD_HH-mm-ss';
};

const unsetPatternTest = function () {
  datePattern = 'YYYY-MM-DD_HH';
};

export { Logger, setConsoleTest, unsetConsoleTest, setPatternTest, unsetPatternTest };
