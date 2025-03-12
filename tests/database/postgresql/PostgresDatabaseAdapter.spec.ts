import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { loadConfig } from '@/config/config';
import { testUser } from '#/testItems';
import { User } from '@/types/user/User';

describe('PostgresDatabaseAdapter', (): void => {
  jest.setTimeout(60000);

  let postgresContainer: null | StartedPostgreSqlContainer = null;
  let db: null | PostgresDatabaseAdapter = null;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer().withDatabase('files-crud').start();
    const host = postgresContainer.getHost();
    const port = postgresContainer.getPort();
    const user = postgresContainer.getUsername();
    const pass = postgresContainer.getPassword();
    loadConfig({ database: { name: 'postgresql', host, port, user, pass } });
  });

  beforeEach(async () => {
    db = new PostgresDatabaseAdapter();
  });

  afterEach(async () => {
    await db?.close();
  });

  afterAll(async () => {
    await db?.close();
    await postgresContainer?.stop();
  });

  test('test', async (): Promise<void> => {
    //
  });

  describe('open and close', (): void => {
    test('open connects to db.', async (): Promise<void> => {
      await db?.open();

      expect(db?.isConnected()).toBe(true);
    });

    test('close disconnects from db.', async (): Promise<void> => {
      await db?.open();

      await db?.close();

      expect(db?.isConnected()).toBe(false);
    });
  });

  describe('initialization', (): void => {
    beforeEach(async (): Promise<void> => {
      await db?.open();
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
      await db?.init('failedLoginAttempts', { username: '', attempts: 0, lastAttempt: 0 });

      try {
        const res = await db?.getClient().query('SELECT * FROM failedLoginAttempts');
        expect(res?.rowCount).toEqual(0);
      } catch (ex: unknown) {
        expect(ex).toBeUndefined();
      }
    });

    test('PostgresDatabaseAdapter->init initializes jwtKey table.', async (): Promise<void> => {
      await db?.init('jwtKey', { kid: '', key: '' });

      try {
        const res = await db?.getClient().query('SELECT * FROM jwtKey');
        expect(res?.rowCount).toEqual(0);
      } catch (ex: unknown) {
        expect(ex).toBeUndefined();
      }
    });
  });

  describe('queries', () => {
    beforeEach(async (): Promise<void> => {
      await db?.open();
      await db?.getClient().query('DROP TABLE IF EXISTS user_').catch();
      await db?.init('user_', testUser);
    });

    test('PostgresDatabaseAdapter->add adds item.', async (): Promise<void> => {
      await db?.add('user_', testUser);

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual(testUser);
    });

    test('PostgresDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
      await db?.add('user_', testUser);
      const update = { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' };

      await db?.update('user_', 'id', testUser.id, update);

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual({ ...testUser, ...update });
    });

    test('PostgresDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
      await db?.add('user_', testUser);

      await db?.update('user_', 'username', testUser.username, { username: 'newUsername' });

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual({ ...testUser, username: 'newUsername' });
    });

    test('PostgresDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
      await db?.add('user_', testUser);

      const user = await db?.findOne<User>('user_', 'username', testUser.username);

      expect(user).toEqual(testUser);
    });

    test('PostgresDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
      const otherUser = { ...testUser, username: 'other' };
      await db?.add('user_', testUser);
      await db?.add('user_', otherUser);

      const items = await db?.findAll<User>('user_');

      expect(items?.length).toBe(2);
      expect(items?.at(0)).toEqual(testUser);
      expect(items?.at(1)).toEqual(otherUser);
    });

    test('PostgresDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
      await db?.add('user_', testUser);

      const exists = await db?.exists('user_', 'username', testUser.username);

      expect(exists).toBe(true);
    });

    test('PostgresDatabaseAdapter->exists returns true if item does not exist.', async (): Promise<void> => {
      await db?.add('user_', { ...testUser, username: 'other' });

      const exists = await db?.exists('user_', 'username', testUser.username);

      expect(exists).toBe(false);
    });

    test('PostgresDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
      const otherUser = { ...testUser, username: 'other' };
      await db?.add('user_', testUser);
      await db?.add('user_', otherUser);

      await db?.delete('user_', 'username', testUser.username);

      const res = await db?.getClient().query<User>('SELECT * FROM user_');
      expect(res?.rowCount).toBe(1);
      expect(res?.rows?.at(0)).toEqual({ ...testUser, username: 'other' });
    });
  });
});
