import { tables } from '@/database/memdb/MemoryDatabase';
import { addUser, register, changeUsername, modifyMeta, setAdminState, deleteUser, userAlreadyExists } from '@/user/user';

const username = 'testUser';
const password = 'testPwd';
const hashVersion = 'v1';
const salt = 'YWFhYWFhYWFhYWFhYWFhYQ==';
// noinspection SpellCheckingInspection
const hash = 'O8fICNHvM2AlfcoaHUamNo5JQJamdZMz0YXMLrnoH/w=';
const ownerId = 'test-id';
const meta = { k: 'v' };

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4() {
      return 'test-id';
    }
  };
});

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes(size: number) {
      return Buffer.from('a'.repeat(size), 'utf8');
    }
  };
});

describe('user', (): void => {
  beforeEach(async (): Promise<void> => {
    tables.user = {};
  });

  test('addUser adds new user.', async (): Promise<void> => {
    const added = await addUser(username, password, false, meta);

    expect(tables.user.testUser?.username).toEqual(username);
    expect(tables.user.testUser?.admin).toEqual(false);
    expect(added).toBe(true);
  });

  test('addUser adds new admin.', async (): Promise<void> => {
    const added = await addUser(username, password, true, meta);

    expect(tables.user.testUser?.username).toEqual(username);
    expect(tables.user.testUser?.admin).toEqual(true);
    expect(added).toBe(true);
  });

  test('addUser rejects if user already exist.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const added = await addUser(username, password, false, meta);

    expect(tables.user.testUser?.admin).toEqual(true);
    expect(added).toBe(false);
  });

  test('register registers new user.', async (): Promise<void> => {
    const result = await register(username, password, meta);

    expect(tables.user.testUser).toEqual({ username, hashVersion, salt, hash, ownerId, admin: false, meta });
    expect(result).toBe('');
  });

  test('register rejects if user already exists.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await register(username, password, {});

    expect(result).toBe(userAlreadyExists);
    expect(tables.user.testUser?.admin).toBe(true);
  });

  test('changeUsername changes username.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await changeUsername(username, 'newUsername');

    expect(tables.user.testUser).toBeUndefined();
    expect(tables.user.newUsername?.username).toBe('newUsername');
    expect(result).toBe('');
  });

  test('changeUsername rejects if user with new username already exists.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash: 'a', ownerId, admin: true, meta: {} };
    tables.user.newUsername = { username: 'newUsername', hashVersion, salt, hash: 'b', ownerId, admin: true, meta: {} };

    const result = await changeUsername(username, 'newUsername');

    expect(tables.user.testUser?.username).toBe(username);
    expect(tables.user.testUser?.hash).toBe('a');
    expect(tables.user.newUsername?.hash).toBe('b');
    expect(result).toBe(userAlreadyExists);
  });

  test('setAdminState sets admin to true.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: false, meta };

    await setAdminState(username, true);

    expect(tables.user.testUser?.admin).toBe(true);
  });

  test('setAdminState sets admin to false.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta };

    await setAdminState(username, false);

    expect(tables.user.testUser?.admin).toBe(false);
  });

  test('modifyMeta modifies meta.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta: { old: 'old' } };

    await modifyMeta(username, meta);

    expect(tables.user.testUser?.meta?.k).toBe('v');
    expect(tables.user.testUser?.meta?.old).toBeUndefined();
  });

  test('removeUser removes user.', async (): Promise<void> => {
    tables.user.testUser = { username, hashVersion, salt, hash, ownerId, admin: true, meta };

    await deleteUser(username);

    expect(tables.user.testUser).toBeUndefined();
  });
});
