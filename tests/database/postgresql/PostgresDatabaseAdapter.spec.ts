import { newDb } from 'pg-mem';
import { Client } from 'pg';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { testUser } from '#/testItems';
import { User } from '@/types/user/User';

jest.mock('pg', () => {
  const actualPg = jest.requireActual('pg');
  const db = newDb();
  const mock = db.adapters.createPg();
  return {
    ...actualPg,
    ...mock
  };
});

describe('PostgresDatabaseAdapter', (): void => {
  describe('open and close', (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dummyClient = new Client();
    let connectSpy: jest.Spied<typeof dummyClient.connect>;
    let endSpy: jest.Spied<typeof dummyClient.end>;

    afterEach(async (): Promise<void> => {
      connectSpy?.mockRestore();
      endSpy?.mockRestore();
    });

    test('open connects to db.', async (): Promise<void> => {
      const newDb = new PostgresDatabaseAdapter();
      const client = newDb.getClient();
      let connected = false;
      connectSpy = jest.spyOn(client, 'connect').mockImplementation(() => (connected = true));
      await newDb.close();

      await newDb.open();

      expect(newDb.isConnected()).toBe(true);
      expect(connected).toBe(true);
    });

    test('close disconnects from db.', async (): Promise<void> => {
      const newDb = new PostgresDatabaseAdapter();
      await newDb.open();
      const client = newDb.getClient();
      let connected = true;
      endSpy = jest.spyOn(client, 'end').mockImplementation(() => (connected = false));

      await newDb.close();

      expect(newDb.isConnected()).toBe(false);
      expect(connected).toBe(false);
    });
  });

  describe('implementations with queries', (): void => {
    let db: PostgresDatabaseAdapter | null;

    beforeEach(async (): Promise<void> => {
      const memDb = newDb();
      const pgMock = memDb.adapters.createPg();
      db = new PostgresDatabaseAdapter();
      db.setClient(new pgMock.Client());
      await db.open();
    });

    afterEach(async (): Promise<void> => {
      await db?.close();
      db = null;
    });

    test('PostgresDatabaseAdapter->init initializes user table.', async (): Promise<void> => {
      await db?.init('user_', testUser);

      try {
        const res = await db?.getClient().query('SELECT * FROM user_');
        expect(res?.rowCount).toEqual(0);
      } catch (ex: unknown) {
        expect(ex).toBeUndefined();
      }
    });

    test('PostgresDatabaseAdapter->init initializes failedLoginAttempts table.', async (): Promise<void> => {
      await db?.open();

      await db?.init('failedLoginAttempts', { username: '', attempts: 0, lastAttempt: 0 });

      try {
        const res = await db?.getClient().query('SELECT * FROM failedLoginAttempts');
        expect(res?.rowCount).toEqual(0);
      } catch (ex: unknown) {
        expect(ex).toBeUndefined();
      }
    });

    test('PostgresDatabaseAdapter->init initializes jwtKey table.', async (): Promise<void> => {
      await db?.open();

      await db?.init('jwtKey', { kid: '', key: '' });

      try {
        const res = await db?.getClient().query('SELECT * FROM jwtKey');
        expect(res?.rowCount).toEqual(0);
      } catch (ex: unknown) {
        expect(ex).toBeUndefined();
      }
    });

    test('PostgresDatabaseAdapter->add adds item.', async (): Promise<void> => {
      await db?.init('user_', testUser);

      await db?.add('user_', testUser);

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual(testUser);
    });

    test('PostgresDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
      await db?.init('user_', testUser);
      await db?.add('user_', testUser);
      const update = { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' };

      await db?.update('user_', 'username', testUser.username, update);

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual({ ...testUser, ...update });
    });

    test('PostgresDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
      await db?.init('user_', testUser);
      await db?.add('user_', testUser);

      await db?.update('user_', 'username', testUser.username, { username: 'newUsername' });

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual({ ...testUser, username: 'newUsername' });
    });

    test('PostgresDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
      await db?.init('user_', testUser);
      await db?.add('user_', testUser);

      const user = await db?.findOne<User>('user_', 'username', testUser.username);

      expect(user).toEqual(testUser);
    });

    test('PostgresDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
      const otherUser = { ...testUser, username: 'other' };
      await db?.init('user_', testUser);
      await db?.add('user_', testUser);
      await db?.add('user_', otherUser);

      const items = await db?.findAll<User>('user_');

      expect(items?.length).toBe(2);
      expect(items?.at(0)).toEqual(testUser);
      expect(items?.at(1)).toEqual(otherUser);
    });

    test('PostgresDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
      await db?.init('user_', testUser);
      await db?.add('user_', testUser);

      const exists = await db?.exists('user_', 'username', testUser.username);

      expect(exists).toBe(true);
    });

    test('PostgresDatabaseAdapter->exists returns true if item does not exist.', async (): Promise<void> => {
      await db?.init('user_', testUser);
      await db?.add('user_', { ...testUser, username: 'other' });

      const exists = await db?.exists('user_', 'username', testUser.username);

      expect(exists).toBe(false);
    });

    test('PostgresDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
      const otherUser = { ...testUser, username: 'other' };
      await db?.init('user_', testUser);
      await db?.add('user_', testUser);
      await db?.add('user_', otherUser);

      await db?.delete('user_', 'username', testUser.username);

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual({ ...testUser, username: 'other' });
    });
  });
});
