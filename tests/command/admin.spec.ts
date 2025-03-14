import { createAdmin, createInitialAdminIfNoAdminExists } from '@/command/admin';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import { Logger } from '@/logging/Logger';
import { loadLogger, resetLogger } from '@/logging';
import { loadDb } from '@/database';
import { User } from '@/types/user/User';

const usernameConstraint = 'required string, 3 to 64 chars long';
const passwordConstraint = 'required string, at least 8 chars long';

const RED_START = '\x1B[31m';
const END = '\x1B[39m';

const mock_error = new Error('test error');

let mocked_loggedMessages: string[] = [];
let mocked_loggedMeta: (Record<string, unknown> | undefined)[] = [];
let resetDbCalled = false;

jest.mock('@/user/passwordHashing/versions', () => {
  return {
    current: {
      version: 'testVersion',
      async hashPassword(password: string): Promise<[string, string]> {
        if (password === 'errorPassword') {
          throw mock_error;
        }
        return [`salt.${password}`, `hash.${password}`];
      }
    }
  };
});

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes(size: number): Buffer {
      return Buffer.from('a'.repeat(size), 'utf8');
    }
  };
});

jest.mock('@/database', () => {
  const actual = jest.requireActual('@/database');
  // noinspection JSUnusedGlobalSymbols
  return {
    ...actual,
    async resetDb() {
      resetDbCalled = true;
    }
  };
});

jest.mock('@/logging', () => {
  let loggerToGet: Logger | null = null;
  const logger: Logger = {
    info(message: string, meta?: Record<string, unknown>): Logger {
      mocked_loggedMessages.push(message);
      mocked_loggedMeta.push(meta);
      return this;
    }
  } as Logger;
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {
      loggerToGet = null;
    },
    loadLogger(): Logger {
      loggerToGet = logger;
      return logger;
    },
    getLogger(): Logger | null {
      return loggerToGet;
    }
  };
});

describe('command: admin', (): void => {
  const stdout = process.stdout;
  const stderr = process.stderr;

  let outSpy: jest.Spied<typeof stdout.write>;
  let errSpy: jest.Spied<typeof stderr.write>;
  let printings: (string | Uint8Array)[] = [];
  let channels: ('out' | 'err')[] = [];

  beforeEach(async (): Promise<void> => {
    outSpy = jest.spyOn(stdout, 'write').mockImplementation((message: string | Uint8Array): boolean => {
      printings.push(message);
      channels.push('out');
      return true;
    });
    errSpy = jest.spyOn(stderr, 'write').mockImplementation((message: string | Uint8Array): boolean => {
      printings.push(message);
      channels.push('err');
      return true;
    });
    data.user_ = [];
  });

  afterEach(async (): Promise<void> => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    printings = [];
    channels = [];
    data.user_ = [];
    mocked_loggedMessages = [];
    mocked_loggedMeta = [];
    resetDbCalled = false;
    resetLogger();
  });

  describe('createAdmin', (): void => {
    test('creates admin, username and password given', async (): Promise<void> => {
      await createAdmin({ username: 'testUsername', password: 'testPassword123' }, true);

      expect((data.user_?.at(0) as User).username).toBe('testUsername');
      expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User).salt).toBe('salt.testPassword123');
      expect((data.user_?.at(0) as User).hash).toBe('hash.testPassword123');
      expect(printings).toEqual(['Creating user...\n', 'Successfully created user. username: testUsername; password: testPassword123\n']);
      expect(channels).toEqual(['out', 'out']);
      expect(resetDbCalled).toBe(true);
    });

    test('creates admin, username given', async (): Promise<void> => {
      const password = Buffer.from('a'.repeat(15), 'utf8').toString('base64');

      await createAdmin({ username: 'testUsername' }, false);

      expect((data.user_?.at(0) as User).username).toBe('testUsername');
      expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User).salt).toBe(`salt.${password}`);
      expect((data.user_?.at(0) as User).hash).toBe(`hash.${password}`);
      expect(printings).toEqual(['Creating user...\n', `Successfully created user. username: testUsername; password: ${password}\n`]);
      expect(channels).toEqual(['out', 'out']);
      expect(resetDbCalled).toBe(false);
    });

    test('creates admin, password given', async (): Promise<void> => {
      const username = Buffer.from('a'.repeat(6), 'utf8').toString('base64');

      await createAdmin({ password: 'testPassword123' });

      expect((data.user_?.at(0) as User).username).toBe(username);
      expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User).salt).toBe(`salt.testPassword123`);
      expect((data.user_?.at(0) as User).hash).toBe(`hash.testPassword123`);
      expect(printings).toEqual(['Creating user...\n', `Successfully created user. username: ${username}; password: testPassword123\n`]);
      expect(channels).toEqual(['out', 'out']);
      expect(resetDbCalled).toBe(false);
    });

    test('creates admin, nothing given', async (): Promise<void> => {
      const username = Buffer.from('a'.repeat(6), 'utf8').toString('base64');
      const password = Buffer.from('a'.repeat(15), 'utf8').toString('base64');

      await createAdmin({});

      expect((data.user_?.at(0) as User).username).toBe(username);
      expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User).salt).toBe(`salt.${password}`);
      expect((data.user_?.at(0) as User).hash).toBe(`hash.${password}`);
      expect(printings).toEqual(['Creating user...\n', `Successfully created user. username: ${username}; password: ${password}\n`]);
      expect(channels).toEqual(['out', 'out']);
    });

    test('creates admin, nothing given, using logger', async (): Promise<void> => {
      await loadDb();
      loadLogger();
      const username = Buffer.from('a'.repeat(6), 'utf8').toString('base64');
      const password = Buffer.from('a'.repeat(15), 'utf8').toString('base64');

      await createAdmin({});

      expect((data.user_?.at(0) as User).username).toBe(username);
      expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User).salt).toBe(`salt.${password}`);
      expect((data.user_?.at(0) as User).hash).toBe(`hash.${password}`);
      expect(mocked_loggedMessages).toEqual(['Creating user...', `Successfully created user. username: ${username}; password: ${password}`]);
      expect(mocked_loggedMeta).toEqual([undefined, { username, password }]);
    });

    test('cancels with error if user already exists', async (): Promise<void> => {
      data.user_[0] = { ...testUser };

      await createAdmin({ username: testUser.username, password: 'p123456789' });

      expect(data.user_?.length).toBe(1);
      expect(printings).toEqual(['Creating user...\n', `${RED_START}Error. User ${testUser.username} exists already.${END}\n`]);
      expect(channels).toEqual(['out', 'err']);
    });

    test('cancels with error on invalid schema', async (): Promise<void> => {
      const validationErrorDetails = {
        source: 'arguments',
        schema: { username: usernameConstraint, password: passwordConstraint },
        value: { username: 'u', password: 'p' }
      };

      await createAdmin({ username: 'u', password: 'p' });

      expect(data.user_?.length).toBe(0);
      expect(printings).toEqual([`${RED_START}Error. Validation Error.\n${JSON.stringify(validationErrorDetails, undefined, '  ')}${END}\n`]);
      expect(channels).toEqual(['err']);
    });

    test('fails successfully', async (): Promise<void> => {
      await createAdmin({ password: 'errorPassword' });

      expect(data.user_?.length).toBe(0);
      expect(printings).toEqual([
        'Creating user...\n',
        `${RED_START}${JSON.stringify(mock_error.stack).replace(/"/g, '').replace(/\\n/g, '\n')}${END}\n`,
        '\x1B[31mFailed due to error\x1B[39m\n'
      ]);
      expect(channels).toEqual(['out', 'err', 'out']);
    });
  });

  describe('createInitialAdminIfNoAdminExists', (): void => {
    test('creates admin, if no admin exists', async (): Promise<void> => {
      const username = Buffer.from('a'.repeat(6), 'utf8').toString('base64');
      const password = Buffer.from('a'.repeat(15), 'utf8').toString('base64');

      await createInitialAdminIfNoAdminExists();

      expect((data.user_?.at(0) as User).username).toBe(username);
      expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
      expect((data.user_?.at(0) as User).salt).toBe(`salt.${password}`);
      expect((data.user_?.at(0) as User).hash).toBe(`hash.${password}`);
      expect(printings).toEqual([
        'There is no admin user. Initial admin will be created.\n',
        'Creating user...\n',
        `Successfully created user. username: ${username}; password: ${password}\n`
      ]);
      expect(channels).toEqual(['out', 'out', 'out']);
    });

    test('does nothing if an admin user exists', async (): Promise<void> => {
      data.user_[0] = { ...testUser, admin: true };

      await createInitialAdminIfNoAdminExists();

      expect((data.user_?.at(0) as User).username).toBe(testUser.username);
      expect(printings).toEqual([]);
      expect(channels).toEqual([]);
    });
  });
});
