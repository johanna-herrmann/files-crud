import { sanitizePath } from '@/server/util';

describe('server util', (): void => {
  test('sanitizePath removes traversal and null bytes.', async (): Promise<void> => {
    const sanitized = sanitizePath('../../file\0');

    expect(sanitized).toBe('file');
  });

  test('sanitizePath removes traversal beginning with /.', async (): Promise<void> => {
    const sanitized = sanitizePath('/../../file');

    expect(sanitized).toBe('file');
  });

  test('sanitizePath returns empty string.', async (): Promise<void> => {
    const sanitized = sanitizePath('');

    expect(sanitized).toBe('');
  });

  test('sanitizePath returns empty string, traversal removed.', async (): Promise<void> => {
    const sanitized = sanitizePath('../../');

    expect(sanitized).toBe('');
  });

  test('sanitizePath returns path relative.', async (): Promise<void> => {
    const sanitized = sanitizePath('/files/file');

    expect(sanitized).toBe('files/file');
  });
});
