import express from 'express';
import { Logger } from '@/logging/Logger';
import { controlMiddleware, setControlToken } from '@/server/middleware/control';
import { assertUnauthorized, buildRequestForControlAction, buildResponse } from '#/server/expressTestUtils';

let mocked_WarnMessage = '';
let mocked_WarnMeta: Record<string, unknown> | undefined = undefined;
let mocked_ErrorMessage = '';
let mocked_ErrorMeta: Record<string, unknown> | undefined = undefined;

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        debug() {
          return this;
        },
        info() {
          return this;
        },
        warn(message: string, meta?: Record<string, unknown>) {
          mocked_WarnMessage = message;
          mocked_WarnMeta = meta;
          return this;
        },
        error(message: string, meta?: Record<string, unknown>) {
          mocked_ErrorMessage = message;
          mocked_ErrorMeta = meta;
          return this;
        }
      } as unknown as Logger;
    }
  };
});

describe('controlMiddleware', (): void => {
  beforeEach(async (): Promise<void> => {
    mocked_WarnMessage = '';
    mocked_WarnMeta = undefined;
    mocked_ErrorMessage = '';
    mocked_ErrorMeta = undefined;
  });

  test('passes if control token is valid.', async (): Promise<void> => {
    let next = false;
    setControlToken('mocked_token');
    const req = buildRequestForControlAction('127.0.0.0', undefined, 'mocked_token');
    const res = buildResponse();

    controlMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(mocked_WarnMessage).toBe('');
    expect(mocked_WarnMeta).toBeUndefined();
    expect(mocked_ErrorMessage).toBe('');
    expect(mocked_ErrorMeta).toBeUndefined();
  });

  describe('rejects if token is not valid', (): void => {
    const assertRejected = function (next: boolean, res: express.Response): void {
      assertUnauthorized(next, res, 'Forbidden control access');
      expect(mocked_WarnMessage).toBe('');
      expect(mocked_WarnMeta).toBeUndefined();
      expect(mocked_ErrorMessage).toBe('Unauthorized. Forbidden control access.');
      expect(mocked_ErrorMeta).toEqual({ statusCode: 401 });
    };

    test('invalid.', async (): Promise<void> => {
      let next = false;
      setControlToken('mocked_token');
      const req = buildRequestForControlAction('127.0.0.0', undefined, 'invalid');
      const res = buildResponse();

      controlMiddleware(req, res, () => (next = true));

      assertRejected(next, res);
    });

    test('empty.', async (): Promise<void> => {
      let next = false;
      setControlToken('mocked_token');
      const req = buildRequestForControlAction('127.0.0.0', undefined, '');
      const res = buildResponse();

      controlMiddleware(req, res, () => (next = true));

      assertRejected(next, res);
    });

    test('missing.', async (): Promise<void> => {
      let next = false;
      setControlToken('mocked_token');
      const req = buildRequestForControlAction('127.0.0.0');
      const res = buildResponse();

      controlMiddleware(req, res, () => (next = true));

      assertRejected(next, res);
    });
  });

  describe('warns on external access', (): void => {
    const assertWarned = function (ip: string) {
      expect(mocked_WarnMessage).toBe(`External control access. It's recommended to prevent this, using reverse proxy.`);
      expect(mocked_WarnMeta).toEqual({ ip });
    };

    test('detected via ip, ipv4.', async (): Promise<void> => {
      const ip = '60.70.80.90';
      const req = buildRequestForControlAction(ip);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertWarned(ip);
    });

    test('detected via ip, ipv6.', async (): Promise<void> => {
      const ip = '1:2:3:4::ff';
      const req = buildRequestForControlAction(ip);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertWarned(ip);
    });

    test('detected via xForwardedFor, ipv4.', async (): Promise<void> => {
      const xForwardedFor = '60.70.80.90';
      const req = buildRequestForControlAction('127.0.0.1', xForwardedFor);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertWarned(xForwardedFor);
    });

    test('detected via xForwardedFor, ipv6.', async (): Promise<void> => {
      const xForwardedFor = '1:2:3:4::ff';
      const req = buildRequestForControlAction('127.0.0.1', xForwardedFor);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertWarned(xForwardedFor);
    });
  });

  describe('does not warn on internal access', (): void => {
    const assertNotWarned = function () {
      expect(mocked_WarnMessage).toBe('');
      expect(mocked_WarnMeta).toBeUndefined();
    };

    test('detected via ip, ipv4.', async (): Promise<void> => {
      const ip = '127.0.0.1';
      const req = buildRequestForControlAction(ip);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertNotWarned();
    });

    test('detected via ip, ipv6.', async (): Promise<void> => {
      const ip = '::1';
      const req = buildRequestForControlAction(ip);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertNotWarned();
    });

    test('detected via xForwardedFor, ipv4.', async (): Promise<void> => {
      const xForwardedFor = '127.0.0.2';
      const req = buildRequestForControlAction('1.2.3.4', xForwardedFor);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertNotWarned();
    });

    test('detected via xForwardedFor, ipv6.', async (): Promise<void> => {
      const xForwardedFor = '0:0:0::1';
      const req = buildRequestForControlAction('1.2.3.4', xForwardedFor);
      const res = buildResponse();

      controlMiddleware(req, res, () => {});

      assertNotWarned();
    });
  });
});
