import { v1PasswordHashing } from '@/auth/passwordHashing/v1';
import crypto from 'crypto';

let mockRandom: boolean | undefined;
const mockedSalt = Buffer.from(new Uint8Array(16));

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes(length: number): Buffer {
      return mockRandom ? Buffer.from(new Uint8Array(length)) : actual.randomBytes(length);
    }
  };
});

describe('v1PasswordHashing', (): void => {
  test(`version returns 'v1'.`, async (): Promise<void> => {
    expect(v1PasswordHashing.version).toBe('v1');
  });

  test('hashPassword hashes Password correctly (mocked random).', async (): Promise<void> => {
    mockRandom = true;
    const password = 'password123';

    const [salt, hash] = await v1PasswordHashing.hashPassword(password);

    expect(salt).toBe(mockedSalt.toString('base64'));
    expect(hash).toBe(crypto.scryptSync(password, mockedSalt, 32, { N: 131_072, r: 8, p: 1, maxmem: 168 * 131_072 * 8 }).toString('base64'));
  });

  test('hashPassword hashes Password correctly (true random, hash and check).', async (): Promise<void> => {
    mockRandom = false;
    const password = 'password123';

    const [salt, hash] = await v1PasswordHashing.hashPassword(password);
    const valid = await v1PasswordHashing.checkPassword(password, salt, hash);

    expect(valid).toBe(true);
  });

  test('checkPassword returns true for valid password.', async (): Promise<void> => {
    const password = 'password123';
    const salt = 'AAAAAAAAAAAAAAAAAAAAAA==';
    const hash = 'SDdwY07PBISVQnAnHnkj8ZgVZYASnvjv27ZF6jivbT0=';

    const valid = await v1PasswordHashing.checkPassword(password, salt, hash);

    expect(valid).toBe(true);
  });

  test('checkPassword returns false for invalid password.', async (): Promise<void> => {
    const password = 'invalid';
    const salt = 'AAAAAAAAAAAAAAAAAAAAAA==';
    const hash = 'SDdwY07PBISVQnAnHnkj8ZgVZYASnvjv27ZF6jivbT0=';

    const valid = await v1PasswordHashing.checkPassword(password, salt, hash);

    expect(valid).toBe(false);
  });
});
