import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import process from 'process';
import express from 'express';
import Request from '@/types/Request';
import { getConfig } from '@/config';

const { combine, timestamp, printf } = format;

const FORMAT_WITH_LEVEL = printf(({ level, message, timestamp }) => {
  return `${timestamp} - ${level.toUpperCase()} - ${message}`;
});

const FORMAT_WITHOUT_LEVEL = printf(({ message, timestamp }) => {
  return `[${timestamp}] - ${message}`;
});

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
  private readonly accessLogger: WinstonLogger;
  private readonly errorLogger: WinstonLogger;
  private readonly accessLogFile: string;
  private readonly errorLogFile: string;

  constructor() {
    const config = getConfig();
    this.accessLogFile = config.logging?.accessLogFile ?? 'access.log';
    this.errorLogFile = config.logging?.errorLogFile ?? 'error.log';
    this.sourcePath = getCaller().getFileName() || '-';
    this.ttyLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(timestamp(), FORMAT_WITH_LEVEL),
      transports: [new transports.Console({ forceConsole: forceConsole })]
    });
    this.accessLogger = createLogger({
      level: 'info',
      format: combine(timestamp(), FORMAT_WITHOUT_LEVEL),
      transports: [new transports.File({ filename: this.accessLogFile, lazy })]
    });
    this.errorLogger = createLogger({
      exitOnError: false,
      level: 'error',
      format: combine(timestamp(), FORMAT_WITH_LEVEL),
      transports: [new transports.File({ filename: this.errorLogFile, lazy })]
    });
  }

  public getAccessLogger(): WinstonLogger {
    return this.accessLogger;
  }

  public getErrorLogger(): WinstonLogger {
    return this.errorLogger;
  }

  public debug(message: string): void {
    this.ttyLogger.debug(`${this.sourcePath} - ${message}`);
  }

  public info(message: string): void {
    this.ttyLogger.info(`${this.sourcePath} - ${message}`);
  }

  public warn(message: string): void {
    this.ttyLogger.warn(`${this.sourcePath} - ${message}`);
  }

  public error(message: string): void {
    const fullMessage = `${this.sourcePath} - ${message}`;
    this.errorLogger.error(fullMessage);
    this.ttyLogger.error(fullMessage);
  }

  public access(req: Request, res: express.Response): void {
    const data = {
      method: req.method,
      path: req.path,
      http: req.httpVersion,
      status: res.statusCode,
      contentLength: res.getHeader('content-length') || '-'
    };
    const message = `"${data.method} ${data.path} ${data.http}" ${data.status} ${data.contentLength}`;
    this.accessLogger.info(message);
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
