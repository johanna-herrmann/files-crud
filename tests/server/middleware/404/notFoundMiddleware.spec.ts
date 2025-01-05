import { assert404, buildSimpleRequest, buildResponse } from '#/server/expressTestUtils';
import { notFoundMiddleware } from '@/server/middleware';

describe('notFoundMiddleware', (): void => {
  test('response with 404', async (): Promise<void> => {
    const req = buildSimpleRequest();
    const res = buildResponse();

    notFoundMiddleware(req, res);

    assert404(res);
  });
});
