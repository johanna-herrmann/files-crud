import { buildSimpleRequest, buildResponse } from '#/server/expressTestUtils';
import { bodyFallbackMiddleware } from '@/server/middleware/bodyFallback';

describe('bodyFallbackMiddleware', (): void => {
  test('req gets empty body if it is undefined.', async (): Promise<void> => {
    let next = false;
    const req = buildSimpleRequest();
    // @ts-expect-error type disallows body to be undefined since the middleware tested here will make it fallback to {}, so it's easier to use the body
    req.body = undefined;
    const res = buildResponse();

    bodyFallbackMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(req.body).toEqual({});
  });
});
