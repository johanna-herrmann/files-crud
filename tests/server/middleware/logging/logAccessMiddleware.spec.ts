import { buildRequestForAccessLogging } from '#/server/expressTestUtils';
import { loadConfig } from '@/config';
import { logAccessMiddleware } from '@/server/middleware/access';
// @ts-expect-error we feel safe to be type-less here
import MockExpressResponse from 'mock-express-response';
import AccessLogEntry from '@/types/AccessLogEntry';

const ip = '127.0.0.1';
const method = 'GET';
const uri = '/image.png';
const httpVersion = 'HTTP/2.0';
const statusCode = 200;
const contentLength = 815;
const referer = 'http://i.am.from/here';
const userAgent = 'testUserAgent';

let mocked_entry: Omit<AccessLogEntry, 'timestamp'> | null = null;

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    loadLogger() {
      return {
        access(entry: Omit<AccessLogEntry, 'timestamp'>) {
          mocked_entry = entry;
        }
      };
    }
  };
});

describe('logAccessMiddleware', (): void => {
  afterEach(async (): Promise<void> => {
    mocked_entry = null;
  });

  const mockResponse = function (contentLength: string | string[] | number | undefined) {
    const res = new MockExpressResponse();
    res.headers = { 'content-length': contentLength };
    res.statusCode = 200;
    res.getHeader = (header: string) => {
      return res.headers[header];
    };
    return res;
  };

  describe('logs access with all properties given', (): void => {
    test('full ip', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, referer, userAgent);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('anonymized ipv4', (done): void => {
      loadConfig({ logging: { ipLogging: 'anonymous' } });
      const req = buildRequestForAccessLogging('127.0.0.1', referer, userAgent);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip: '127.0.0._', method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('anonymized ipv6', (done): void => {
      loadConfig({ logging: { ipLogging: 'anonymous' } });
      const req = buildRequestForAccessLogging('123::abc:12ef', referer, userAgent);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip: '123::abc:_', method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('no ip', (done): void => {
      loadConfig({ logging: { ipLogging: 'none' } });
      const req = buildRequestForAccessLogging('127.0.0.1', referer, userAgent);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip: '_', method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });
  });

  describe('logs access with missing properties', (): void => {
    test('userAgent', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, referer);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent: '_' });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('referer', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, undefined, userAgent);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer: '_', userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('contentLength', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, referer, userAgent);
      const res = mockResponse(undefined);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength: undefined, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });
  });

  describe('logs access with different types of contentLength', (): void => {
    test('number', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, referer, userAgent);
      const res = mockResponse(contentLength);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('string', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, referer, userAgent);
      const res = mockResponse(`${contentLength}`);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });

    test('string array', (done): void => {
      loadConfig({ logging: { ipLogging: 'full' } });
      const req = buildRequestForAccessLogging(ip, referer, userAgent);
      const res = mockResponse([`${contentLength}`, 'other']);
      let next = false;
      setTimeout(() => {
        expect(next).toBe(true);
        expect(mocked_entry).toEqual({ ip, method, path: uri, httpVersion, statusCode, contentLength, referer, userAgent });
        done();
      }, 1000);

      logAccessMiddleware(req, res, () => (next = true));
      res.send();
    });
  });
});
