import { buildSimpleRequest, buildResponse } from '#/server/expressTestUtils';
import { headerMiddleware } from '@/server/middleware/header';
import { loadConfig } from '@/config';

describe('headerMiddleware', (): void => {
  test('blinds server headers', async (): Promise<void> => {
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    headerMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.getHeader('server')).toBe('_');
    expect(res.getHeader('x-powered-by')).toBe('_');
  });

  test('sets hsts', async (): Promise<void> => {
    loadConfig({ server: { useHttps: true, hsts: true } });
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    headerMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.getHeader('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
    expect(res.getHeader('server')).toBe('_');
    expect(res.getHeader('x-powered-by')).toBe('_');
  });

  test('sets no-robots', async (): Promise<void> => {
    loadConfig({ server: { noRobots: true } });
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    headerMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.getHeader('x-robots-tag')).toBe('none');
    expect(res.getHeader('server')).toBe('_');
    expect(res.getHeader('x-powered-by')).toBe('_');
  });
});
