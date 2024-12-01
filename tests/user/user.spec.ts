import { tables } from '@/database/memdb/MemoryDatabase';
import { modifyMeta, setAdminState } from '@/user';

const username = 'testUser';
const hashVersion = 'v1';
const salt = 'YWFhYWFhYWFhYWFhYWFhYQ==';
// noinspection SpellCheckingInspection
const hash = 'O8fICNHvM2AlfcoaHUamNo5JQJamdZMz0YXMLrnoH/w=';
const ownerId = 'test-id';
const meta = { k: 'v' };

describe('user', (): void => {
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
});
