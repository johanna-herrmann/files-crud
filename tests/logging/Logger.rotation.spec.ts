import fs from 'fs';
import paths from 'path';
import winston from 'winston';
import mockFS from 'mock-fs';
import { Logger, setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import { loadConfig } from '@/config/config';
import { LoggingConfig } from '@/types/config/LoggingConfig';

const path = `${paths.dirname(paths.dirname(__dirname))}/node_modules/`;
const errorLogFile = paths.join('/logs', 'error.log');
let logSpy: jest.Spied<typeof console.log>;
let errorSpy: jest.Spied<typeof console.error>;

jest.mock('@/logging/getSourcePath', () => {
  return {
    getSourcePath(): string {
      return '/path/to/source.js';
    }
  };
});

describe('Logger rotation', (): void => {
  beforeEach(async (): Promise<void> => {
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

  describe('applies', (): void => {
    test('not if disabled', (done): void => {
      loadConfig({ logging: { errorLogFile, enableLogFileRotation: false, enableAccessLogging: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          expect(fs.readdirSync('/logs')).toEqual(['error.log']);
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger?.end();
    });

    test('if enabled per configuration', (done): void => {
      loadConfig({ logging: { errorLogFile, enableLogFileRotation: true, enableAccessLogging: false, logFileRotationFrequencyUnit: 's' } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items[0]).toMatch(/^error\.log\.\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger?.end();
    });

    test('if enabled per default', (done): void => {
      loadConfig({ logging: { errorLogFile, enableAccessLogging: false, logFileRotationFrequencyUnit: 's' } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items[0]).toMatch(/^error\.log\.\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger?.end();
    });

    describe('with symlink', (): void => {
      afterEach(async (): Promise<void> => {
        fs.readdirSync('./')
          .filter((item) => /^(error\.log.*|\..*-audit\.json)$/u.test(item))
          .forEach((item) => {
            fs.unlinkSync(`./${item}`);
          });
      });

      test('created', (done): void => {
        mockFS.restore();
        loadConfig({
          logging: {
            errorLogFile: './error.log',
            enableAccessLogging: false,
            logFileRotationFrequencyUnit: 's'
          }
        });
        const logger = new Logger();
        const errorLogger = logger.getErrorLogger();
        errorLogger?.on('finish', () => {
          setTimeout(() => {
            const items = fs.readdirSync('./').filter((item) => item.startsWith('error.log'));
            expect(items[0]).toBe('error.log');
            expect(items[1]).toMatch(/^error\.log\.\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
            done();
          }, 300);
        });

        logger.error('error message');
        errorLogger?.end();
      });
    });
  });

  describe('rotates', (): void => {
    const loggingConfig = {
      errorLogFile,
      enableAccessLogging: false,
      logFileRotationMaxFiles: '3',
      fileLoggingFormat: 'humanReadableLine',
      errorFileLoggingFormat: 'humanReadableLine',
      logFileRotationFrequencyUnit: 's'
    } as LoggingConfig;

    const doLogs = function (logger: Logger, errorLogger: winston.Logger | null) {
      logger.error('test message 1');
      setTimeout(() => {
        logger.error('test message 2');
        setTimeout(() => {
          logger.error('test message 3');
          setTimeout(() => {
            logger.error('test message 4');
            errorLogger?.end();
          }, 1200);
        }, 1200);
      }, 1200);
    };

    test('secondly, keeping 3 files, without compression', (done): void => {
      loadConfig({ logging: { ...loggingConfig, logFileRotationEnableCompression: false } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items.length).toBe(3);
          expect(fs.readFileSync(`/logs/${items[0]}`, 'utf8').endsWith(' [/path/to/source.js] ERROR: test message 2\n')).toBe(true);
          expect(fs.readFileSync(`/logs/${items[1]}`, 'utf8').endsWith(' [/path/to/source.js] ERROR: test message 3\n')).toBe(true);
          expect(fs.readFileSync(`/logs/${items[2]}`, 'utf8').endsWith(' [/path/to/source.js] ERROR: test message 4\n')).toBe(true);
          done();
        }, 300);
      });

      doLogs(logger, errorLogger);
    });

    test('secondly, keeping 3 files, with compression', (done): void => {
      loadConfig({ logging: { ...loggingConfig, logFileRotationEnableCompression: true } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items.length).toBe(3);
          expect(items[0].endsWith('.gz')).toBe(true);
          expect(items[1].endsWith('.gz')).toBe(true);
          expect(fs.readFileSync(`/logs/${items[2]}`, 'utf8').endsWith(' [/path/to/source.js] ERROR: test message 4\n')).toBe(true);
          expect(fs.existsSync('/logs/.error.log-audit.json')).toBe(true);
          done();
        }, 300);
      });

      doLogs(logger, errorLogger);
    });

    test('minutely', (done): void => {
      loadConfig({ logging: { ...loggingConfig, logFileRotationEnableCompression: false, logFileRotationFrequencyUnit: 'm' } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items.length).toBe(1);
          expect(items[0]).toMatch(/^error\.log\.\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/);
          done();
        }, 300);
      });

      logger.error('error message');
      errorLogger?.end();
    });

    test('hourly', (done): void => {
      loadConfig({ logging: { ...loggingConfig, logFileRotationEnableCompression: false, logFileRotationFrequencyUnit: 'h' } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items.length).toBe(1);
          expect(items[0]).toMatch(/^error\.log\.\d{4}-\d{2}-\d{2}_\d{2}$/);
          done();
        }, 300);
      });

      logger.error('error message');
      errorLogger?.end();
    });

    test('daily', (done): void => {
      loadConfig({ logging: { ...loggingConfig, logFileRotationEnableCompression: false, logFileRotationFrequencyUnit: 'd' } });
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger?.on('finish', () => {
        setTimeout(() => {
          const items = fs.readdirSync('/logs').filter((item) => item.startsWith('error.log'));
          expect(items.length).toBe(1);
          expect(items[0]).toMatch(/^error\.log\.\d{4}-\d{2}-\d{2}$/);
          done();
        }, 300);
      });

      logger.error('error message');
      errorLogger?.end();
    });
  });
});
