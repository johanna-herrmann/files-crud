import { Logger, setTest, unsetTest } from '@/logging/Logger';
import mockFS from 'mock-fs';
import fs from 'fs';
import process from 'process';
import paths from 'path';
import { loadConfig } from '@/config';
import Request from '@/types/Request';
import express from 'express';

const path = `${paths.dirname(paths.dirname(__dirname))}/node_modules/`;
const accessLogFile = paths.join('/logs', 'access.log');
const errorLogFile = paths.join('/logs', 'error.log');
let logSpy: jest.Spied<typeof console.log>;
let loggedMessage = '';

describe('Logger', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { accessLogFile, errorLogFile } });
    mockFS({ [path]: mockFS.load(path, { recursive: true }), '/logs': {} });
    setTest();
    logSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
      loggedMessage = message;
    });
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    mockFS.restore();
    unsetTest();
    logSpy?.mockRestore();
    loggedMessage = '';
  });

  describe('logs to console', (): void => {
    const assertMessage = function (loggedMessage: string, level: string): void {
      expect(loggedMessage.split(' - ')[0]).toBe('1970-01-01T00:00:00.042Z');
      expect(loggedMessage.split(' - ')[1]).toBe(level.toUpperCase());
      expect(loggedMessage.split(' - ')[2]).toMatch(/.*\/files-crud\/.*\/.*\.js/u);
      expect(loggedMessage.split(' - ')[3].trim()).toBe('test message');
    };

    beforeEach(async (): Promise<void> => {
      jest.useFakeTimers();
      jest.setSystemTime(42);
    });

    afterEach(async (): Promise<void> => {
      jest.useRealTimers();
    });

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

  describe('logs to file', (): void => {
    const assertMessage = function (loggedMessage: string, level: string): void {
      expect(loggedMessage.split(' - ')[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
      expect(loggedMessage.split(' - ')[1]).toBe(level.toUpperCase());
      expect(loggedMessage.split(' - ')[2]).toMatch(/.*\/files-crud\/.*\/.*\.js/u);
      expect(loggedMessage.split(' - ')[3].trim()).toBe('test message');
    };

    test('on error', (done): void => {
      const logger = new Logger();
      const errorLogger = logger.getErrorLogger();
      errorLogger.on('finish', () => {
        setTimeout(() => {
          assertMessage(fs.readFileSync(errorLogFile, 'utf8'), 'error');
          done();
        }, 300);
      });

      logger.error('test message');
      errorLogger.end();
    });

    test('on access', (done): void => {
      const req = {
        method: 'GET',
        path: '/text.txt',
        httpVersion: 'HTTP/2.0'
      } as unknown as Request;
      const res = {
        statusCode: 200,
        getHeader(key: string): string {
          return `${key === 'content-length' ? 42 : 0}`;
        }
      } as unknown as express.Response;
      const logger = new Logger();
      const accessLogger = logger.getAccessLogger();
      accessLogger.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(accessLogFile, 'utf8');
          expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] - "GET \/text\.txt HTTP\/2\.0" 200 42/u);
          done();
        }, 300);
      });

      logger.access(req, res);
      accessLogger.end();
    });
  });
});
