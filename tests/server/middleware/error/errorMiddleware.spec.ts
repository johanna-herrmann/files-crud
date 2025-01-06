import { buildSimpleRequest, buildResponse, assertError } from '#/server/expressTestUtils';
import { Logger } from '@/logging/Logger';
import { errorMiddleware } from '@/server/middleware/error';

let mock_loggedErrorMessage = '';
let mock_loggedErrorError: Error | undefined;
let mock_loggedErrorMeta: Record<string, unknown> | undefined;
let mock_loggedDebugMessage = '';
let mock_loggedDebugMeta: Record<string, unknown> | undefined;

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        debug(message: string, meta?: Record<string, unknown>) {
          mock_loggedDebugMessage = message;
          mock_loggedDebugMeta = meta;
          return this;
        },
        error(message: string, error?: Error, meta?: Record<string, unknown>) {
          mock_loggedErrorMessage = message;
          mock_loggedErrorError = error;
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
    mock_loggedErrorError = undefined;
    mock_loggedErrorMeta = undefined;
    mock_loggedDebugMessage = '';
    mock_loggedDebugMeta = undefined;
  });

  test('response with 500', async (): Promise<void> => {
    const error = new Error('test Error');
    const req = buildSimpleRequest();
    const res = buildResponse();

    errorMiddleware(error, req, res, () => {});

    assertError(res, 'Unexpected Error', true);
    expect(mock_loggedErrorMessage).toBe('Error. Unexpected Error.');
    expect(mock_loggedErrorError).toEqual(error);
    expect(mock_loggedErrorMeta).toEqual({ statusCode: 500 });
    expect(mock_loggedDebugMessage).toBe('Details about previous error.');
    expect(mock_loggedDebugMeta).toEqual({ stack: error.stack });
  });
});
