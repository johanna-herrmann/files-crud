import { Logger } from './Logger';

let logger: Logger | null;

const loadLogger = function (): Logger {
  if (!!logger) {
    return logger;
  }
  return (logger = new Logger());
};

const resetLogger = function () {
  logger = null;
};

const reloadLogger = function () {
  logger = new Logger();
};

const getLogger = function (): Logger | null {
  return logger;
};

export { loadLogger, resetLogger, reloadLogger, getLogger };
