import { sanitizePath } from '@/server/util';

describe('server util', (): void => {
  test('sanitizePath removes traversal and null bytes.', async (): Promise<void> => {
    const sanitized = sanitizePath('../../file\0');

    expect(sanitized).toBe('file');
  });
});
