import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { addUser, register, changeUsername, saveMeta, setAdminState, deleteUser, userAlreadyExists, loadMeta, getUser, getUsers } from '@/user/user';
import { User } from '@/types/user/User';

const username = 'testUser';
const password = 'testPwd';
const hashVersion = 'v1';
const salt = 'YWFhYWFhYWFhYWFhYWFhYQ==';
// noinspection SpellCheckingInspection
const hash = 'O8fICNHvM2AlfcoaHUamNo5JQJamdZMz0YXMLrnoH/w=';
const id = 'test-id';
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
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };

    const added = await addUser(username, password, false, meta);

    expect((data.user_[0] as User)?.admin).toEqual(true);
    expect(added).toBe(false);
  });

  test('register registers new user.', async (): Promise<void> => {
    const result = await register(username, password, meta);

    expect(data.user_[0]).toEqual({ username, hashVersion, salt, hash, id, admin: false, meta });
    expect(result).toBe('');
  });

  test('register rejects if user already exists.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };

    const result = await register(username, password, {});

    expect(result).toBe(userAlreadyExists);
    expect((data.user_[0] as User)?.admin).toBe(true);
  });

  test('changeUsername changes username.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: {} };

    const result = await changeUsername(id, 'newUsername');

    expect(data.user_.length).toBe(1);
    expect((data.user_[0] as User)?.username).toBe('newUsername');
    expect(result).toBe('');
  });

  test('changeUsername rejects if user with new username already exists.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash: 'a', id, admin: true, meta: {} };
    data.user_[1] = { username: 'newUsername', hashVersion, salt, hash: 'b', id, admin: true, meta: {} };

    const result = await changeUsername(id, 'newUsername');

    expect((data.user_[0] as User)?.username).toBe(username);
    expect((data.user_[0] as User)?.hash).toBe('a');
    expect((data.user_[1] as User)?.hash).toBe('b');
    expect(result).toBe(userAlreadyExists);
  });

  test('setAdminState sets admin to true.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: false, meta };

    await setAdminState(id, true);

    expect((data.user_[0] as User)?.admin).toBe(true);
  });

  test('setAdminState sets admin to false.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta };

    await setAdminState(id, false);

    expect((data.user_[0] as User)?.admin).toBe(false);
  });

  test('saveMeta saves meta.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: { old: 'old' } };

    await saveMeta(id, meta);

    expect((data.user_[0] as User)?.meta?.k).toBe('v');
    expect((data.user_[0] as User)?.meta?.old).toBeUndefined();
  });

  test('loadMeta loads meta.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: { k: 'v' } };

    const meta = await loadMeta(id);

    expect(meta?.k).toBe('v');
  });

  test('loadMeta returns empty object if user does not exist.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true };

    const meta = await loadMeta(id);

    expect(meta).toEqual({});
  });

  test('loadMeta returns empty object if user does not exist.', async (): Promise<void> => {
    const meta = await loadMeta(id);

    expect(meta).toEqual({});
  });

  test('getUser gets UserDto.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: { k: 'v' } };

    const user = await getUser(id);

    expect(user).toEqual({ username, id, admin: true, meta: { k: 'v' } });
  });

  test('getUser gets null if user does not exist.', async (): Promise<void> => {
    const user = await getUser(id);

    expect(user).toBeNull();
  });

  test('getUsers gets UserList.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta: { k: 'v' } };
    data.user_[1] = { username: 'other', hashVersion, salt, hash, id: 'id2', admin: false, meta: { k: 'v' } };

    const users = await getUsers();

    expect(users.length).toBe(2);
    expect(users[0]).toEqual({ id, username, admin: true });
    expect(users[1]).toEqual({ id: 'id2', username: 'other', admin: false });
  });

  test('removeUser removes user.', async (): Promise<void> => {
    data.user_[0] = { username, hashVersion, salt, hash, id, admin: true, meta };

    await deleteUser(id);

    expect(data.user_[0]).toBeUndefined();
  });
});
