import { buildSimpleRequest, buildResponse, assertError } from '#/server/expressTestUtils';
import { Logger } from '@/logging/Logger';
import { errorMiddleware } from '@/server/middleware/error';

let mock_loggedErrorMessage = '';
let mock_loggedErrorMeta: Record<string, unknown> | undefined;

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        error(message: string, meta?: Record<string, unknown>) {
          mock_loggedErrorMessage = message;
          mock_loggedErrorMeta = meta;
          return this;
        }
      } as unknown as Logger;
    }
  };
});

describe('errorMiddleware', (): void => {
  afterEach(async (): Promise<void> => {
    mock_loggedErrorMessage = '';
    mock_loggedErrorMeta = undefined;
  });

  test('response with 500', async (): Promise<void> => {
    const error = new Error('test Error');
    const req = buildSimpleRequest();
    const res = buildResponse();

    errorMiddleware(error, req, res, () => {});

    assertError(res, 'Unexpected Error', true);
    expect(mock_loggedErrorMessage).toBe(`Unexpected Error: ${JSON.stringify(error.stack).replace(/"/g, '').replace(/\\n/g, '\n')}`);
    expect(mock_loggedErrorMeta).toEqual({ statusCode: 500 });
  });
});
