import { Logger, setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import mockFS from 'mock-fs';
import fs from 'fs';
import paths from 'path';
import { loadConfig } from '@/config';

const path = `${paths.dirname(paths.dirname(__dirname))}/node_modules/`;
const errorLogFile = paths.join('/logs', 'error.log');
let logSpy: jest.Spied<typeof console.log>;
let errorSpy: jest.Spied<typeof console.error>;

describe('Logger logs to error file', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { enableAccessLogging: false, errorLogFile, enableLogFileRotation: false } });
    mockFS({ [path]: mockFS.load(path, { recursive: true }), '/logs': {} });
    setConsoleTest();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    unsetConsoleTest();
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    mockFS.restore();
  });

  test('with default format, without error message', (done): void => {
    loadConfig({ logging: { enableAccessLogging: false, errorLogFile, enableLogFileRotation: false } });
    const logger = new Logger();
    const errorLogger = logger.getErrorLogger();
    errorLogger?.on('finish', () => {
      setTimeout(() => {
        const message = fs.readFileSync(errorLogFile, 'utf8');
        expect(message.trim()).toMatch(
          /^\{"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z","level":"error","source":".*\/Logger\.errorFile\.spec\.ts","message":"test message"\}$/u
        );
        done();
      }, 300);
    });

    logger.error('test message');
    errorLogger?.end();
  });

  test('with default format, with error message', (done): void => {
    loadConfig({ logging: { enableAccessLogging: false, errorLogFile, enableLogFileRotation: false } });
    const logger = new Logger();
    const errorLogger = logger.getErrorLogger();
    errorLogger?.on('finish', () => {
      setTimeout(() => {
        const message = fs.readFileSync(errorLogFile, 'utf8');
        expect(message.trim()).toMatch(
          /^\{"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z","level":"error","source":".*\/Logger\.errorFile\.spec\.ts","message":"test message","errorMessage":"error message"\}$/u
        );
        done();
      }, 300);
    });

    logger.error('test message', new Error('error message'));
    errorLogger?.end();
  });

  test('not, if error file logging is not enabled', (done): void => {
    loadConfig({ logging: { enableAccessLogging: false, errorLogFile, enableErrorFileLogging: false } });
    const logger = new Logger();
    const errorLogger = logger.getErrorLogger();
    let end = false;
    errorLogger?.on('finish', () => {
      setTimeout(() => {
        end = true;
      }, 300);
    });
    setTimeout(() => {
      const message = fs.existsSync(errorLogFile) ? fs.readFileSync(errorLogFile, 'utf8') : '';
      expect(message.trim()).toBe('');
      expect(end).toBe(false);
      done();
    }, 2500);

    logger.error('test message');
    errorLogger?.end();
  });

  describe('with specified format', (): void => {
    test('humanReadableLine', (done): void => {
      loadConfig({ logging: { enableAccessLogging: false, errorLogFile, fileLoggingFormat: 'humanReadableLine', enableLogFileRotation: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(errorLogFile, 'utf8').trim();
          expect(message.split('\n').length).toBe(1);
          expect(message.startsWith('\x1B')).toBe(false);
          expect(message.startsWith('{')).toBe(false);
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger?.end();
    });

    test('humanReadableBlock', (done): void => {
      loadConfig({ logging: { enableAccessLogging: false, errorLogFile, fileLoggingFormat: 'humanReadableBlock', enableLogFileRotation: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
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
      errorLogger?.end();
    });

    test('coloredHumanReadableLine', (done): void => {
      loadConfig({
        logging: { enableAccessLogging: false, errorLogFile, fileLoggingFormat: 'coloredHumanReadableLine', enableLogFileRotation: false }
      });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(errorLogFile, 'utf8').trim();
          expect(message.split('\n').length).toBe(1);
          expect(message.startsWith('\x1B')).toBe(true);
          expect(message.startsWith('{')).toBe(false);
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger?.end();
    });

    test('coloredHumanReadableBlock', (done): void => {
      loadConfig({
        logging: { enableAccessLogging: false, errorLogFile, fileLoggingFormat: 'coloredHumanReadableBlock', enableLogFileRotation: false }
      });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
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
      errorLogger?.end();
    });

    test('json', (done): void => {
      loadConfig({ logging: { enableAccessLogging: false, errorLogFile, fileLoggingFormat: 'json', enableLogFileRotation: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(errorLogFile, 'utf8').trim();
          expect(message.split('\n').length).toBe(1);
          expect(message.startsWith('\x1B')).toBe(false);
          expect(message.startsWith('{')).toBe(true);
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger?.end();
    });
  });
});
