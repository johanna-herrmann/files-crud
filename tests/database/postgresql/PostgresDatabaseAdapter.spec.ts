import { Client } from 'pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { loadConfig } from '@/config/config';
import { testUser } from '#/testItems';
import User from '@/types/user/User';

const getHostAndPort = function (uri: string): [string, number] {
  const regex = /^postgres(?:ql)?:\/\/(?:.+@)?(.+):(\d+)\/[^/]+$/u;
  const host = uri.replace(regex, '$1');
  const port = parseInt(uri.replace(regex, '$2'), 10);
  return [host, port];
};

let postgresContainer: StartedPostgreSqlContainer | undefined;
let db: PostgresDatabaseAdapter | undefined;

describe('PostgresDatabaseAdapter', (): void => {
  jest.setTimeout(60_000);

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer().withDatabase('files-crud').withUsername('u').withPassword('p').start();
    const [host, port] = getHostAndPort(postgresContainer.getConnectionUri());
    loadConfig({ database: { name: 'postgresql', host, port, user: 'u', pass: 'p' } });
  });

  afterAll(async () => {
    await postgresContainer?.stop();
  });

  describe('open and close', (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dummyClient = new Client();
    let connectSpy: jest.Spied<typeof dummyClient.connect>;
    let endSpy: jest.Spied<typeof dummyClient.end>;

    beforeEach(async () => {
      db = new PostgresDatabaseAdapter();
    });

    afterEach(async () => {
      db?.close();
      db = undefined;
      connectSpy?.mockRestore();
      endSpy?.mockRestore();
    });

    test('open connects to db.', async (): Promise<void> => {
      const client = db?.getClient();
      let connected = false;
      connectSpy = jest.spyOn(client as Client, 'connect').mockImplementation(() => (connected = true));

      await db?.open();

      expect(db?.isConnected()).toBe(true);
      expect(connected).toBe(true);
    });

    test('close disconnects from db.', async (): Promise<void> => {
      await db?.open();
      const client = db?.getClient();
      let connected = true;
      endSpy = jest.spyOn(client as Client, 'end').mockImplementation(() => (connected = false));

      await db?.close();

      expect(db?.isConnected()).toBe(false);
      expect(connected).toBe(false);
    });
  });

  describe('implementations with queries', (): void => {
    beforeEach(async (): Promise<void> => {
      db = new PostgresDatabaseAdapter();
      await db?.open();
    });

    afterEach(async (): Promise<void> => {
      await db?.getClient().query('DROP TABLE IF EXISTS user_');
      await db?.close();
      db = undefined;
    });

    test('PostgresDatabaseAdapter->init initializes user table.', async (): Promise<void> => {
      await db?.init('user_', testUser);

      const res = await db?.getClient().query('SELECT * FROM user_');
      expect(res?.rowCount).toEqual(0);
    });

    test('PostgresDatabaseAdapter->init initializes failedLoginAttempts table.', async (): Promise<void> => {
      await db?.init('failedLoginAttempts', { username: '', attempts: 0, lastAttempt: 0 });

      const res = await db?.getClient().query('SELECT * FROM failedLoginAttempts');
      expect(res?.rowCount).toEqual(0);
    });

    test('PostgresDatabaseAdapter->init initializes jwtKey table.', async (): Promise<void> => {
      await db?.init('jwtKey', { kid: '', key: '' });

      const res = await db?.getClient().query('SELECT * FROM jwtKey');
      expect(res?.rowCount).toEqual(0);
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
