import { assert404, buildSimpleRequest, buildResponse } from '#/server/expressTestUtils';
import { notFoundMiddleware } from '@/server/middleware';
import { Logger } from '@/logging/Logger';

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
        error() {
          return this;
        }
      } as unknown as Logger;
    }
  };
});

describe('notFoundMiddleware', (): void => {
  test('response with 404', async (): Promise<void> => {
    const req = buildSimpleRequest();
    const res = buildResponse();

    notFoundMiddleware(req, res);

    assert404(res);
  });
});
