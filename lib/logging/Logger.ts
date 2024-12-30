import { createLogger, transports, Logger as WinstonLogger } from 'winston';
import process from 'process';
import { getConfig } from '@/config';
import { formats } from '@/logging/formats';

const getCaller = function (): NodeJS.CallSite {
  const stack = getStack();
  stack.shift();
  stack.shift();
  return stack[1];
};

const getStack = function (): NodeJS.CallSite[] {
  const origPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = function (_, stack) {
    return stack;
  };
  const err = new Error();
  const stack = err.stack as unknown as NodeJS.CallSite[];
  Error.prepareStackTrace = origPrepareStackTrace;
  stack.shift();
  return stack;
};

let forceConsole = false;
let lazy = true;

class Logger {
  private readonly sourcePath: string;
  private readonly ttyLogger: WinstonLogger;
  private readonly fileLogger: WinstonLogger;
  private readonly errorLogFile: string;
  private readonly errorFileLoggingEnabled: boolean;

  constructor() {
    const config = getConfig();
    const ttyLoggingFormat = config.logging?.ttyLoggingFormat ?? 'coloredHumanReadableLine';
    const fileLoggingFormat = config.logging?.fileLoggingFormat ?? 'json';
    this.errorLogFile = config.logging?.errorLogFile ?? 'error.log';
    this.errorFileLoggingEnabled = !config.logging?.disableErrorFileLogging;
    this.sourcePath = getCaller().getFileName() || '-';
    this.ttyLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: formats[ttyLoggingFormat],
      transports: [new transports.Console({ forceConsole: forceConsole })]
    });
    this.fileLogger = createLogger({
      exitOnError: false,
      level: 'error',
      format: formats[fileLoggingFormat],
      transports: [new transports.File({ filename: this.errorLogFile, lazy })]
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

  public error(message: string): void {
    this.ttyLogger.error(message, { sourcePath: this.sourcePath });
    if (this.errorFileLoggingEnabled) {
      this.fileLogger.error(message, { sourcePath: this.sourcePath });
    }
  }
}

const setTest = function () {
  forceConsole = true;
  lazy = false;
};

const unsetTest = function () {
  forceConsole = false;
  lazy = true;
};

export { Logger, setTest, unsetTest };
