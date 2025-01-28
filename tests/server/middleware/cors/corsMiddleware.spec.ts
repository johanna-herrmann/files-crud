import { corsMiddleware } from '@/server/middleware/cors';
import { loadConfig } from '@/config/config';
import { buildResponse, buildSimpleRequest } from '#/server/expressTestUtils';

describe('corsMiddleware', (): void => {
  test(`sets cors origin to '*' and calls next.`, async (): Promise<void> => {
    loadConfig({ server: { cors: { origin: '*' } } });
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    corsMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.statusCode).toBe(-1);
    expect(res.getHeader('access-control-allow-origin')).toBe('*');
  });

  test(`just calls next.`, async (): Promise<void> => {
    loadConfig({});
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    corsMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.statusCode).toBe(-1);
    expect(res.getHeader('access-control-allow-origin')).toBeUndefined();
  });
});
