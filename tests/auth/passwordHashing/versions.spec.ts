import { v1PasswordHashing } from '@/auth/passwordHashing/v1';
import { versions, current } from '@/auth/passwordHashing/versions';

describe('versions', (): void => {
  test('versions returns object with v1PasswordHashing.', async (): Promise<void> => {
    expect(Object.keys(versions)).toEqual(['v1']);
    expect(versions.v1).toBe(v1PasswordHashing);
  });

  test('current returns v1PasswordHashing.', async (): Promise<void> => {
    expect(current).toBe(v1PasswordHashing);
  });
});
