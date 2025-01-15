import { Logger, setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import mockFS from 'mock-fs';
import fs from 'fs';
import paths from 'path';
import { loadConfig } from '@/config/config';

const path = `${paths.dirname(paths.dirname(__dirname))}/node_modules/`;
const accessLogFile = paths.join('/logs', 'access.log');

const ip = '127.0.0.1';
const method = 'GET';
const uri = '/image.png';
const httpVersion = 'HTTP/2.0';
const statusCode = 200;
const contentLength = '815';
const referer = 'http://i.am.from/here';
const userAgent = 'testUserAgent';
const time = 23;

let logSpy: jest.Spied<typeof console.log>;

describe('Access logger', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { enableErrorFileLogging: false, accessLogFile, enableLogFileRotation: false } });
    mockFS({ [path]: mockFS.load(path, { recursive: true }), '/logs': {} });
    setConsoleTest();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    mockFS.restore();
    unsetConsoleTest();
    logSpy?.mockRestore();
  });

  test('with default format', (done): void => {
    const logger = new Logger();
    const accessLogger = logger.getAccessLogger();
    accessLogger?.on('finish', () => {
      setTimeout(() => {
        const message = fs.readFileSync(accessLogFile, 'utf8');
        const { timestamp, ...rest } = JSON.parse(message.trim());
        expect(rest).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent, time });
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/u);
        done();
      }, 300);
    });

    logger.access({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent, time });
    accessLogger?.end();
  });

  test('not, if access logging is not enabled', (done): void => {
    loadConfig({ logging: { accessLogFile, enableErrorFileLogging: false, enableAccessLogging: false } });
    const logger = new Logger();
    const accessLogger = logger.getAccessLogger();
    let end = false;
    accessLogger?.on('finish', () => {
      setTimeout(() => {
        end = true;
      }, 300);
    });
    setTimeout(() => {
      const message = fs.existsSync(accessLogFile) ? fs.readFileSync(accessLogFile, 'utf8') : '';
      expect(message.trim()).toBe('');
      expect(end).toBe(false);
      done();
    }, 2500);

    logger.access({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent, time });
    accessLogger?.end();
  });

  describe('with specified format', (): void => {
    test('classic', (done): void => {
      loadConfig({ logging: { enableErrorFileLogging: false, accessLogFile, accessLoggingFormat: 'classic', enableLogFileRotation: false } });
      const logger = new Logger();
      const accessLogger = logger.getAccessLogger();
      accessLogger?.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(accessLogFile, 'utf8').trim();
          expect(message).toMatch(
            /^127\.0\.0\.1 - \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\] "GET \/image\.png HTTP\/2\.0" 200 815 "http:\/\/i\.am\.from\/here" "testUserAgent" - 23$/u
          );
          done();
        }, 300);
      });

      logger.access({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent, time });
      accessLogger?.end();
    });

    test('json', (done): void => {
      loadConfig({ logging: { enableErrorFileLogging: false, accessLogFile, accessLoggingFormat: 'json', enableLogFileRotation: false } });
      const logger = new Logger();
      const accessLogger = logger.getAccessLogger();
      accessLogger?.on('finish', () => {
        setTimeout(() => {
          const message = fs.readFileSync(accessLogFile, 'utf8');
          const { timestamp, ...rest } = JSON.parse(message.trim());
          expect(rest).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent, time });
          expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/u);
          done();
        }, 300);
      });

      logger.access({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent, time });
      accessLogger?.end();
    });
  });
});
