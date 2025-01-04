import { assert404, buildRequestFor404, buildResponse } from '#/server/expressTestUtils';
import { notFoundMiddleware } from '@/server/middleware';

describe('notFoundMiddleware', (): void => {
  test('response with 404', async (): Promise<void> => {
    const req = buildRequestFor404();
    const res = buildResponse();

    notFoundMiddleware(req, res);

    assert404(res);
  });
});
