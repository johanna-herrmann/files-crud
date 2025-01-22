import { assert404, buildSimpleRequest, buildResponse } from '#/server/expressTestUtils';
import { notFoundMiddleware } from '@/server/middleware';
import { Logger } from '@/logging/Logger';

let mocked_errorMessage = '';
let mocked_errorMeta: Record<string, unknown> | undefined = undefined;

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
        warn() {
          return this;
        },
        error(message: string, meta?: Record<string, unknown>) {
          mocked_errorMessage = message;
          mocked_errorMeta = meta;
          return this;
        }
      } as unknown as Logger;
    }
  };
});

describe('notFoundMiddleware', (): void => {
  beforeEach(async (): Promise<void> => {
    mocked_errorMessage = '';
    mocked_errorMeta = undefined;
  });

  test('response with 404', async (): Promise<void> => {
    const req = buildSimpleRequest();
    const res = buildResponse();

    notFoundMiddleware(req, res);

    assert404(res);
    expect(mocked_errorMessage).toBe('Not Found: /test');
    expect(mocked_errorMeta).toEqual({ statusCode: 404 });
  });
});
