import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { addUser, register, changeUsername, modifyMeta, setAdminState, deleteUser, userAlreadyExists } from '@/user/user';
import User from '@/types/user/User';

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
    data.user_ = [];
  });

  test('addUser adds new user.', async (): Promise<void> => {
    const added = await addUser(username, password, false, meta);

    expect((data.user_[0] as User)?.username).toEqual(username);
    expect((data.user_[0] as User)?.admin).toEqual(false);
    expect(added).toBe(true);
  });

  test('addUser adds new admin.', async (): Promise<void> => {
    const added = await addUser(username, password, true, meta);

    expect((data.user_[0] as User)?.username).toEqual(username);
    expect((data.user_[0] as User)?.admin).toEqual(true);
    expect(added).toBe(true);
  });

  test('addUser rejects if user already exist.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const added = await addUser(username, password, false, meta);

    expect((data.user_[0] as User)?.admin).toEqual(true);
    expect(added).toBe(false);
  });

  test('register registers new user.', async (): Promise<void> => {
    const result = await register(username, password, meta);

    expect(data.user_[0]).toEqual({ username, hashVersion, salt, hash, ownerId, admin: false, meta });
    expect(result).toBe('');
  });

  test('register rejects if user already exists.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await register(username, password, {});

    expect(result).toBe(userAlreadyExists);
    expect((data.user_[0] as User)?.admin).toBe(true);
  });

  test('changeUsername changes username.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: true, meta: {} };

    const result = await changeUsername(username, 'newUsername');

    expect(data.user_.length).toBe(1);
    expect((data.user_[0] as User)?.username).toBe('newUsername');
    expect(result).toBe('');
  });

  test('changeUsername rejects if user with new username already exists.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash: 'a', ownerId, admin: true, meta: {} };
    data.user_[1] = { username: 'newUsername', hashVersion, salt, hash: 'b', ownerId, admin: true, meta: {} };

    const result = await changeUsername(username, 'newUsername');

    expect((data.user_[0] as User)?.username).toBe(username);
    expect((data.user_[0] as User)?.hash).toBe('a');
    expect((data.user_[1] as User)?.hash).toBe('b');
    expect(result).toBe(userAlreadyExists);
  });

  test('setAdminState sets admin to true.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: false, meta };

    await setAdminState(username, true);

    expect((data.user_[0] as User)?.admin).toBe(true);
  });

  test('setAdminState sets admin to false.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: true, meta };

    await setAdminState(username, false);

    expect((data.user_[0] as User)?.admin).toBe(false);
  });

  test('modifyMeta modifies meta.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: true, meta: { old: 'old' } };

    await modifyMeta(username, meta);

    expect((data.user_[0] as User)?.meta?.k).toBe('v');
    expect((data.user_[0] as User)?.meta?.old).toBeUndefined();
  });

  test('removeUser removes user.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, ownerId, admin: true, meta };

    await deleteUser(username);

    expect(data.user_[0]).toBeUndefined();
  });
});
