import { Logger, setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import process from 'process';
import { loadConfig } from '@/config/config';

let logSpy: jest.Spied<typeof console.log>;
let errorSpy: jest.Spied<typeof console.error>;
let loggedMessage = '';

describe('Logger logs to console', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { enableErrorFileLogging: false, enableAccessLogging: false } });
    setConsoleTest();
    logSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
      loggedMessage = message;
    });
    errorSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
      loggedMessage = message;
    });
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;
    jest.useFakeTimers();
    jest.setSystemTime(42);
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    unsetConsoleTest();
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    loggedMessage = '';
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
      expect(loggedMessage.split(' ')[0]).toBe(`\x1B[${colorSequenceNumbers[level]}m1970-01-01T01:00:00.042`);
      expect(loggedMessage.split(' ')[1]).toMatch(/^\[.*\/Logger\.console\.spec\.ts\]/u);
      expect(loggedMessage.split(' ')[2]).toMatch(`${level.toUpperCase()}:`);
      expect(loggedMessage.split(' ')[3]).toBe('test');
      expect(loggedMessage.split(' ')[4].trim()).toBe('message\x1B[39m');
    };

    test('on level debug, if log level is debug', async (): Promise<void> => {
      loadConfig({ logging: { enableErrorFileLogging: false, enableAccessLogging: false, level: 'debug' } });

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

      expect(errorSpy).toHaveBeenCalled();
      assertMessage(loggedMessage, 'error');
    });

    test('on none-api access', async (): Promise<void> => {
      new Logger().access({
        method: 'GET',
        path: '/index.html',
        statusCode: '200',
        contentLength: 123,
        time: 0,
        ip: '',
        httpVersion: '',
        referer: '',
        userAgent: ''
      });

      expect(logSpy).toHaveBeenCalled();
      expect(loggedMessage).toBe(
        `\x1B[32m1970-01-01T01:00:00.042 [${__filename}] INFO: Access: statusCode 200 on GET /index.html - {"method":"GET","path":"/index.html","statusCode":"200","contentLength":123}\x1B[39m`
      );
    });

    test('not on api access', async (): Promise<void> => {
      new Logger().access({
        method: 'POST',
        path: '/api/register',
        statusCode: '200',
        contentLength: 123,
        time: 0,
        ip: '',
        httpVersion: '',
        referer: '',
        userAgent: ''
      });

      expect(logSpy).not.toHaveBeenCalled();
      expect(loggedMessage).toBe('');
    });

    test('not if statusCode is greater than 399', async (): Promise<void> => {
      new Logger().access({
        method: 'GET',
        path: '/image.png',
        statusCode: '400',
        contentLength: 12,
        time: 0,
        ip: '',
        httpVersion: '',
        referer: '',
        userAgent: ''
      });

      expect(logSpy).not.toHaveBeenCalled();
      expect(loggedMessage).toBe('');
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
      loadConfig({ logging: { ttyLoggingFormat: 'humanReadableLine', enableErrorFileLogging: false, enableAccessLogging: false } });

      new Logger().info('test message');

      expect(logSpy).toHaveBeenCalled();
      expect(loggedMessage.split('\n').length).toBe(1);
      expect(loggedMessage.startsWith('1970-01-01T01:00:00.042')).toBe(true);
    });

    test('humanReadableBlock', async (): Promise<void> => {
      loadConfig({ logging: { ttyLoggingFormat: 'humanReadableBlock', enableErrorFileLogging: false, enableAccessLogging: false } });

      new Logger().info('test message');

      expect(logSpy).toHaveBeenCalled();
      expect(loggedMessage.split('\n').length).toBe(6);
      expect(loggedMessage.startsWith('1970-01-01T01:00:00.042')).toBe(true);
    });

    test('coloredHumanReadableLine', async (): Promise<void> => {
      loadConfig({ logging: { ttyLoggingFormat: 'coloredHumanReadableLine', enableErrorFileLogging: false, enableAccessLogging: false } });

      new Logger().info('test message');

      expect(logSpy).toHaveBeenCalled();
      expect(loggedMessage.split('\n').length).toBe(1);
      expect(loggedMessage.startsWith('\x1B[32m1970-01-01T01:00:00.042')).toBe(true);
    });

    test('coloredHumanReadableBlock', async (): Promise<void> => {
      loadConfig({ logging: { ttyLoggingFormat: 'coloredHumanReadableBlock', enableErrorFileLogging: false, enableAccessLogging: false } });

      new Logger().info('test message');

      expect(logSpy).toHaveBeenCalled();
      expect(loggedMessage.split('\n').length).toBe(6);
      expect(loggedMessage.startsWith('\x1B[32m1970-01-01T01:00:00.042')).toBe(true);
    });

    test('json', async (): Promise<void> => {
      loadConfig({ logging: { ttyLoggingFormat: 'json', enableErrorFileLogging: false, enableAccessLogging: false } });

      new Logger().info('test message');

      expect(logSpy).toHaveBeenCalled();
      expect(loggedMessage.split('\n').length).toBe(1);
      expect(loggedMessage.startsWith('{"timestamp":"1970-01-01T01:00:00.042')).toBe(true);
    });
  });

  describe('with format, chosen by tty detection', (): void => {
    beforeEach(async (): Promise<void> => {
      loadConfig({
        logging: { ttyLoggingFormat: 'humanReadableLine', fileLoggingFormat: 'json', enableErrorFileLogging: false, enableAccessLogging: false }
      });
    });

    describe('tty', (): void => {
      test('on info', async (): Promise<void> => {
        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.startsWith('1970-01-01T01:00:00.042')).toBe(true);
      });

      test('on error', async (): Promise<void> => {
        new Logger().error('error message');

        expect(errorSpy).toHaveBeenCalled();
        expect(loggedMessage.startsWith('1970-01-01T01:00:00.042')).toBe(true);
      });
    });

    describe('not tty', (): void => {
      test('on info', async (): Promise<void> => {
        process.stdout.isTTY = false;

        new Logger().info('test message');

        expect(logSpy).toHaveBeenCalled();
        expect(loggedMessage.startsWith('{"timestamp":"1970-01-01T01:00:00.042')).toBe(true);
      });

      test('on error', async (): Promise<void> => {
        process.stderr.isTTY = false;

        new Logger().error('error message');

        expect(errorSpy).toHaveBeenCalled();
        expect(loggedMessage.startsWith('{"timestamp":"1970-01-01T01:00:00.042')).toBe(true);
      });
    });
  });
});
