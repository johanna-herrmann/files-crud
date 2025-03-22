import {
  assertUnauthorized,
  assertPass,
  buildRequestForUserAction,
  buildResponse,
  resetLastMessage,
  assertValidationError
} from '#/server/expressTestUtils';
import { loadConfig } from '@/config/config';
import { registerMiddleware } from '@/server/middleware';
import { Logger } from '@/logging/Logger';

const usernameConstraint = 'required string, 3 to 64 chars long';
const passwordConstraint = 'required string, at least 8 chars long';
const metaConstraint = 'optional object';

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

describe('registerMiddleware', (): void => {
  afterEach(async () => {
    resetLastMessage();
  });

  test('passes without token', async (): Promise<void> => {
    loadConfig({ register: 'all' });
    const req = buildRequestForUserAction('', '-', undefined, { username: 'username', password: 'password' });
    const res = buildResponse();
    let next = false;

    await registerMiddleware(req, res, () => (next = true));

    assertPass(next, res);
  });

  test('passes with valid token', async (): Promise<void> => {
    loadConfig({ register: 'token', tokens: ['valid'] });
    const req = buildRequestForUserAction('', '-', undefined, { username: 'username', password: 'password', token: 'valid' });
    const res = buildResponse();
    let next = false;

    await registerMiddleware(req, res, () => (next = true));

    assertPass(next, res);
  });

  test('rejects with invalid token', async (): Promise<void> => {
    loadConfig({ register: 'token', tokens: ['valid'] });
    const req = buildRequestForUserAction('', '-', undefined, { username: 'username', password: 'password', token: 'invalid' });
    const res = buildResponse();
    let next = false;

    await registerMiddleware(req, res, () => (next = true));

    assertUnauthorized(next, res, 'Register is not allowed without valid register token');
  });

  test('rejects register completely', async (): Promise<void> => {
    loadConfig({ register: 'admin' });
    const req = buildRequestForUserAction('', '-', undefined, { username: 'username', password: 'password' });
    const res = buildResponse();
    let next = false;

    await registerMiddleware(req, res, () => (next = true));

    assertUnauthorized(next, res, 'Register is disabled. Ask an admin to add you as user');
  });

  test('sends error on invalid body', async (): Promise<void> => {
    let next = false;
    const schema = { username: usernameConstraint, password: passwordConstraint, meta: metaConstraint };
    const body = { username: 'username', meta: { some: 'value' }, password: 'pas' };
    const req = buildRequestForUserAction('', '-', undefined, body);
    const res = buildResponse();

    await registerMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertValidationError(res, 'body', schema, body);
  });
});
