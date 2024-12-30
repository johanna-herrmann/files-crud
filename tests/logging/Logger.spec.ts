import { Logger, setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import mockFS from 'mock-fs';
import fs from 'fs';
import process from 'process';
import paths from 'path';
import { loadConfig } from '@/config';

const path = `${paths.dirname(paths.dirname(__dirname))}/node_modules/`;
const accessLogFile = paths.join('/logs', 'access.log');
const errorLogFile = paths.join('/logs', 'error.log');
let logSpy: jest.Spied<typeof console.log>;
let loggedMessage = '';

describe('Logger', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { accessLogFile, errorLogFile, enableLogFileRotation: false } });
    mockFS({ [path]: mockFS.load(path, { recursive: true }), '/logs': {} });
    setConsoleTest();
    logSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
      loggedMessage = message;
    });
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    unsetConsoleTest();
    logSpy?.mockRestore();
    mockFS.restore();
    loggedMessage = '';
  });

  describe('logs to console', (): void => {
    beforeEach(async (): Promise<void> => {
      jest.useFakeTimers();
      jest.setSystemTime(42);
    });

    afterEach(async (): Promise<void> => {
      jest.useRealTimers();
    });

    describe('with default format', (): void => {
      const assertMessage = function (loggedMessage: string, level: string): void {
        const colorSequenceNumbers: Record<string, number> = {
          debug: 34,
          info: 32,
          warn: 33,
          error: 31
        };
        expect(loggedMessage.split(' ')[0]).toBe(`\x1B[${colorSequenceNumbers[level]}m1970-01-01T00:00:00.042Z`);
        expect(loggedMessage.split(' ')[1]).toMatch(/^\[.*\/Logger\.spec\.ts\]/u);
        expect(loggedMessage.split(' ')[2]).toMatch(`${level.toUpperCase()}:`);
        expect(loggedMessage.split(' ')[3]).toBe('test');
        expect(loggedMessage.split(' ')[4].trim()).toBe('message\x1B[39m');
      };

      test('on level debug, if log level is debug', async (): Promise<void> => {
        process.env.LOG_LEVEL = 'debug';

        new Logger().debug('test message');

        expect(logSpy).toHaveBeenCalled();
        assertMessage(loggedMessage, 'debug');
      });

      test('on level info', async (): Promise<void> => {
        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        assertMessage(loggedMessage, 'info');
      });

      test('on level warn', async (): Promise<void> => {
        new Logger().warn('test message');

        expect(logSpy).toHaveBeenCalled();
        assertMessage(loggedMessage, 'warn');
      });

      test('on level error', async (): Promise<void> => {
        new Logger().error('test message');

        expect(logSpy).toHaveBeenCalled();
        assertMessage(loggedMessage, 'error');
      });

      test('not on level debug, if log level is info', async (): Promise<void> => {
        process.env.LOG_LEVEL = 'info';

        new Logger().debug('test message');

        expect(logSpy).not.toHaveBeenCalled();
        expect(loggedMessage).toBe('');
      });
    });

    describe('with specified format', (): void => {
      test('humanReadableLine', async (): Promise<void> => {
        loadConfig({ logging: { accessLogFile, errorLogFile, ttyLoggingFormat: 'humanReadableLine', enableLogFileRotation: false } });

        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.split('\n').length).toBe(1);
        expect(loggedMessage.startsWith('1970-01-01T00:00:00.042Z')).toBe(true);
      });

      test('humanReadableBlock', async (): Promise<void> => {
        loadConfig({ logging: { accessLogFile, errorLogFile, ttyLoggingFormat: 'humanReadableBlock', enableLogFileRotation: false } });

        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.split('\n').length).toBe(6);
        expect(loggedMessage.startsWith('1970-01-01T00:00:00.042Z')).toBe(true);
      });

      test('coloredHumanReadableLine', async (): Promise<void> => {
        loadConfig({ logging: { accessLogFile, errorLogFile, ttyLoggingFormat: 'coloredHumanReadableLine', enableLogFileRotation: false } });

        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.split('\n').length).toBe(1);
        expect(loggedMessage.startsWith('\x1B[32m1970-01-01T00:00:00.042Z')).toBe(true);
      });

      test('coloredHumanReadableBlock', async (): Promise<void> => {
        loadConfig({ logging: { accessLogFile, errorLogFile, ttyLoggingFormat: 'coloredHumanReadableBlock', enableLogFileRotation: false } });

        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.split('\n').length).toBe(6);
        expect(loggedMessage.startsWith('\x1B[32m1970-01-01T00:00:00.042Z')).toBe(true);
      });

      test('json', async (): Promise<void> => {
        loadConfig({ logging: { accessLogFile, errorLogFile, ttyLoggingFormat: 'json', enableLogFileRotation: false } });

        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.split('\n').length).toBe(1);
        expect(loggedMessage.startsWith('{"timestamp":"1970-01-01T00:00:00.042Z')).toBe(true);
      });
    });
  });

  describe('logs to error file', (): void => {
    test('with default format, without error message', (done): void => {
      loadConfig({ logging: { accessLogFile, errorLogFile, enableLogFileRotation: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(errorLogFile, 'utf8');
          expect(message.trim()).toMatch(
            /^\{"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z","level":"error","source":".*\/Logger\.spec\.ts","message":"test message"\}$/u
          );
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger.end();
    });

    test('with default format, with error message', (done): void => {
      logSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
        loggedMessage = message;
      });
      loadConfig({ logging: { accessLogFile, errorLogFile, enableLogFileRotation: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(errorLogFile, 'utf8');
          expect(message.trim()).toMatch(
            /^\{"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z","level":"error","source":".*\/Logger\.spec\.ts","message":"test message","errorMessage":"error message"\}$/u
          );
          done();
        }, 300);
      });

      logger.error('test message', new Error('error message'));
      errorLogger.end();
    });

    test('not, if error file logging is not enabled', (done): void => {
      loadConfig({ logging: { accessLogFile, errorLogFile, enableErrorFileLogging: false, enableLogFileRotation: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(errorLogFile, 'utf8');
          expect(message.trim()).toBe('');
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger.end();
    });

    describe('with specified format', (): void => {
      test('humanReadableLine', (done): void => {
        loadConfig({ logging: { accessLogFile, errorLogFile, fileLoggingFormat: 'humanReadableLine', enableLogFileRotation: false } });
        const logger = new Logger();
        const errorLogger = logger.getErrorLogger();
        errorLogger.on('finish', () => {
          setTimeout(() => {
            const message = fs.readFileSync(errorLogFile, 'utf8').trim();
            expect(message.split('\n').length).toBe(1);
            expect(message.startsWith('\x1B')).toBe(false);
            expect(message.startsWith('{')).toBe(false);
            done();
          }, 300);
        });

        logger.error('test message');
        errorLogger.end();
      });

      test('humanReadableBlock', (done): void => {
        loadConfig({ logging: { accessLogFile, errorLogFile, fileLoggingFormat: 'humanReadableBlock', enableLogFileRotation: false } });
        const logger = new Logger();
        const errorLogger = logger.getErrorLogger();
        errorLogger.on('finish', () => {
          setTimeout(() => {
            const message = fs.readFileSync(errorLogFile, 'utf8');
            expect(message.split('\n').length).toBe(7);
            expect(message.startsWith('\x1B')).toBe(false);
            expect(message.startsWith('{')).toBe(false);
            expect(message.lastIndexOf('\n')).toBe(message.length - 1);
            done();
          }, 4000);
        });

        logger.error('test message');
        errorLogger.end();
      });

      test('coloredHumanReadableLine', (done): void => {
        loadConfig({ logging: { accessLogFile, errorLogFile, fileLoggingFormat: 'coloredHumanReadableLine', enableLogFileRotation: false } });
        const logger = new Logger();
        const errorLogger = logger.getErrorLogger();
        errorLogger.on('finish', () => {
          setTimeout(() => {
            const message = fs.readFileSync(errorLogFile, 'utf8').trim();
            expect(message.split('\n').length).toBe(1);
            expect(message.startsWith('\x1B')).toBe(true);
            expect(message.startsWith('{')).toBe(false);
            done();
          }, 300);
        });

        logger.error('test message');
        errorLogger.end();
      });

      test('coloredHumanReadableBlock', (done): void => {
        loadConfig({ logging: { accessLogFile, errorLogFile, fileLoggingFormat: 'coloredHumanReadableBlock', enableLogFileRotation: false } });
        const logger = new Logger();
        const errorLogger = logger.getErrorLogger();
        errorLogger.on('finish', () => {
          setTimeout(() => {
            const message = fs.readFileSync(errorLogFile, 'utf8');
            expect(message.split('\n').length).toBe(7);
            expect(message.startsWith('\x1B')).toBe(true);
            expect(message.startsWith('{')).toBe(false);
            expect(message.lastIndexOf('\n')).toBe(message.length - 1);
            done();
          }, 300);
        });

        logger.error('test message');
        errorLogger.end();
      });

      test('json', (done): void => {
        loadConfig({ logging: { accessLogFile, errorLogFile, fileLoggingFormat: 'json', enableLogFileRotation: false } });
        const logger = new Logger();
        const errorLogger = logger.getErrorLogger();
        errorLogger.on('finish', () => {
          setTimeout(() => {
            const message = fs.readFileSync(errorLogFile, 'utf8').trim();
            expect(message.split('\n').length).toBe(1);
            expect(message.startsWith('\x1B')).toBe(false);
            expect(message.startsWith('{')).toBe(true);
            done();
          }, 300);
        });

        logger.error('test message');
        errorLogger.end();
      });
    });
  });
});
