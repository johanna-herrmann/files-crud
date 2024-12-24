import { assertError, assertPass, buildRequestForUserAction, buildResponse, resetLastMessage } from '#/server/expressTestUtils';
import { loadConfig } from '@/config';
import { registerMiddleware } from '@/server/middleware';

describe('registerMiddleware', (): void => {
  afterEach(async () => {
    resetLastMessage();
  });

  test('passes without token', async (): Promise<void> => {
    loadConfig();
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

    assertError(next, res, 'Register is not allowed without valid register token');
  });

  test('rejects register completely', async (): Promise<void> => {
    loadConfig({ register: 'admin' });
    const req = buildRequestForUserAction('', '-', undefined, { username: 'username', password: 'password' });
    const res = buildResponse();
    let next = false;

    await registerMiddleware(req, res, () => (next = true));

    assertError(next, res, 'Register is disabled. Ask an admin to add you as user');
  });
});
