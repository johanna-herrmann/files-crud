import { createAdmin } from '@/command/admin';
import { data } from '@/database/memdb/MemoryDatabaseAdapter';
import User from '@/types/user/User';

const RED_START = '\x1B[31m';
const END = '\x1B[39m';

const mock_error = new Error('test error');

jest.mock('@/user/passwordHashing/versions', () => {
  return {
    current: {
      version: 'testVersion',
      async hashPassword(password: string): Promise<[string, string]> {
        if (password === 'error') {
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

describe('createAdmin', (): void => {
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
  });

  afterEach(async (): Promise<void> => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    printings = [];
    channels = [];
    data.user_ = [];
  });

  test('creates admin, username and password given', async (): Promise<void> => {
    await createAdmin({ username: 'testUsername', password: 'testPassword123' });

    expect((data.user_?.at(0) as User).username).toBe('testUsername');
    expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
    expect((data.user_?.at(0) as User).salt).toBe('salt.testPassword123');
    expect((data.user_?.at(0) as User).hash).toBe('hash.testPassword123');
    expect(printings).toEqual(['Creating user...\n', 'Successfully created user. username: testUsername; password: testPassword123\n']);
    expect(channels).toEqual(['out', 'out']);
  });

  test('creates admin, username given', async (): Promise<void> => {
    const password = Buffer.from('a'.repeat(15), 'utf8').toString('base64');
    await createAdmin({ username: 'testUsername' });

    expect((data.user_?.at(0) as User).username).toBe('testUsername');
    expect((data.user_?.at(0) as User).hashVersion).toBe('testVersion');
    expect((data.user_?.at(0) as User).salt).toBe(`salt.${password}`);
    expect((data.user_?.at(0) as User).hash).toBe(`hash.${password}`);
    expect(printings).toEqual(['Creating user...\n', `Successfully created user. username: testUsername; password: ${password}\n`]);
    expect(channels).toEqual(['out', 'out']);
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

  test('fails successfully', async (): Promise<void> => {
    await createAdmin({ password: 'error' });

    expect(data.user_?.length).toBe(0);
    expect(printings).toEqual([
      'Creating user...\n',
      JSON.stringify(mock_error.stack)
        .replace(/"/g, '')
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((line) => `${RED_START}${line}${END}`)
        .join('\n') + '\n',
      '\x1B[31mFailed due to error\x1B[39m\n'
    ]);
    expect(channels).toEqual(['out', 'err', 'out']);
  });
});
