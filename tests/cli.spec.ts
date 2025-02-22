import mockFS from 'mock-fs';
import { getConfig } from '@/config/config';
import { program } from '@/cli';

let mocked_lastFunction = '';
let mocked_lastFunctionArgs: Record<string, unknown> = {};

jest.mock('@/command/start', () => {
  return {
    async start(start: number) {
      mocked_lastFunction = 'start';
      mocked_lastFunctionArgs = { start };
    }
  };
});

jest.mock('@/command/control', () => {
  return {
    async stop() {
      mocked_lastFunction = 'stop';
      mocked_lastFunctionArgs = {};
    },
    async reload() {
      mocked_lastFunction = 'reload';
      mocked_lastFunctionArgs = {};
    },
    async restart() {
      mocked_lastFunction = 'restart';
      mocked_lastFunctionArgs = {};
    }
  };
});

jest.mock('@/command/integrity', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    async checkIntegrity(path: number) {
      mocked_lastFunction = 'integrity';
      mocked_lastFunctionArgs = { path };
    }
  };
});

jest.mock('@/command/admin', () => {
  return {
    async createAdmin({ username, password }: { username?: string; password?: string }) {
      mocked_lastFunction = 'admin';
      mocked_lastFunctionArgs = { username, password };
    }
  };
});

jest.mock('@/command/config', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    showConfig(format: string, defaults: boolean) {
      mocked_lastFunction = 'config';
      mocked_lastFunctionArgs = { format, defaults };
    }
  };
});

describe('cli', (): void => {
  beforeEach(async (): Promise<void> => {
    mockFS({});
    jest.useFakeTimers();
    jest.setSystemTime(42);
  });

  afterEach(async (): Promise<void> => {
    mockFS.restore();
    delete process.env.FC_SERVER__HOST;
    delete process.env.FC_DATABASE__NAME;
    jest.useRealTimers();
    mocked_lastFunction = '';
    mocked_lastFunctionArgs = {};
  });

  describe('start', (): void => {
    test('defaults', async (): Promise<void> => {
      await program.parseAsync(['start'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('start');
      expect(mocked_lastFunctionArgs).toEqual({ start: 42 });
      expect(config).toEqual({});
    });

    test('custom host', async (): Promise<void> => {
      mockFS({ './config.json': JSON.stringify({ server: { host: '127.0.0.1' } }) });

      await program.parseAsync(['start'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('start');
      expect(mocked_lastFunctionArgs).toEqual({ start: 42 });
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });

    test('custom env prefix', async (): Promise<void> => {
      process.env.FC_SERVER__HOST = '127.0.0.1';

      await program.parseAsync(['-e', 'FC', 'start'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('start');
      expect(mocked_lastFunctionArgs).toEqual({ start: 42 });
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });
  });

  describe('stop', (): void => {
    test('defaults', async (): Promise<void> => {
      await program.parseAsync(['stop'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('stop');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({});
    });
  });

  describe('reload', (): void => {
    test('defaults', async (): Promise<void> => {
      await program.parseAsync(['reload'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('reload');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({});
    });

    test('custom host', async (): Promise<void> => {
      mockFS({ './config.json': JSON.stringify({ server: { host: '127.0.0.1' } }) });

      await program.parseAsync(['reload'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('reload');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });

    test('custom env prefix', async (): Promise<void> => {
      process.env.FC_SERVER__HOST = '127.0.0.1';

      await program.parseAsync(['-e', 'FC', 'reload'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('reload');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });
  });

  describe('restart', (): void => {
    test('defaults', async (): Promise<void> => {
      await program.parseAsync(['restart'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('restart');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({});
    });

    test('custom host', async (): Promise<void> => {
      mockFS({ './config.json': JSON.stringify({ server: { host: '127.0.0.1' } }) });

      await program.parseAsync(['restart'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('restart');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });

    test('custom env prefix', async (): Promise<void> => {
      process.env.FC_SERVER__HOST = '127.0.0.1';

      await program.parseAsync(['-e', 'FC', 'restart'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('restart');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });

    test('custom env prefix long option', async (): Promise<void> => {
      process.env.FC_SERVER__HOST = '127.0.0.1';

      await program.parseAsync(['--env-prefix', 'FC', 'restart'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('restart');
      expect(mocked_lastFunctionArgs).toEqual({});
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });
  });

  describe('integrity', (): void => {
    test('defaults, whole storage', async (): Promise<void> => {
      await program.parseAsync(['integrity'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('integrity');
      expect(mocked_lastFunctionArgs).toEqual({ path: '' });
      expect(config).toEqual({});
    });

    test('defaults, sub directory', async (): Promise<void> => {
      await program.parseAsync(['integrity', 'dir/sub'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('integrity');
      expect(mocked_lastFunctionArgs).toEqual({ path: 'dir/sub' });
      expect(config).toEqual({});
    });
  });

  describe('admin', (): void => {
    test('defaults, no options', async (): Promise<void> => {
      await program.parseAsync(['admin'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: undefined, password: undefined });
      expect(config).toEqual({});
    });

    test('defaults, first option', async (): Promise<void> => {
      await program.parseAsync(['admin', '-u', 'tu'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: 'tu', password: undefined });
      expect(config).toEqual({});
    });

    test('defaults, second option', async (): Promise<void> => {
      await program.parseAsync(['admin', '-p', 'tp'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: undefined, password: 'tp' });
      expect(config).toEqual({});
    });

    test('defaults, both options', async (): Promise<void> => {
      await program.parseAsync(['admin', '-u', 'tu', '-p', 'tp'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: 'tu', password: 'tp' });
      expect(config).toEqual({});
    });

    test('defaults, both options long', async (): Promise<void> => {
      await program.parseAsync(['admin', '--username', 'tu', '--password', 'tp'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: 'tu', password: 'tp' });
      expect(config).toEqual({});
    });

    test('custom db', async (): Promise<void> => {
      mockFS({ './config.json': JSON.stringify({ database: { name: 'mongodb' } }) });

      await program.parseAsync(['admin'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: undefined, password: undefined });
      expect(config).toEqual({ database: { name: 'mongodb' } });
    });

    test('custom env prefix', async (): Promise<void> => {
      process.env.FC_DATABASE__NAME = 'mongodb';

      await program.parseAsync(['-e', 'FC', 'admin'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('admin');
      expect(mocked_lastFunctionArgs).toEqual({ username: undefined, password: undefined });
      expect(config).toEqual({ database: { name: 'mongodb' } });
    });
  });

  describe('config', (): void => {
    test('defaults', async (): Promise<void> => {
      await program.parseAsync(['config'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('config');
      expect(mocked_lastFunctionArgs).toEqual({ format: 'json', defaults: true });
      expect(config).toEqual({});
    });

    test('defaults, yaml', async (): Promise<void> => {
      await program.parseAsync(['config', 'yaml'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('config');
      expect(mocked_lastFunctionArgs).toEqual({ format: 'yaml', defaults: true });
      expect(config).toEqual({});
    });

    test('defaults, env, no defaults', async (): Promise<void> => {
      await program.parseAsync(['config', '-n', 'env'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('config');
      expect(mocked_lastFunctionArgs).toEqual({ format: 'env', defaults: false });
      expect(config).toEqual({});
    });

    test('defaults, env, no defaults long option', async (): Promise<void> => {
      await program.parseAsync(['config', '--no-defaults', 'env'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('config');
      expect(mocked_lastFunctionArgs).toEqual({ format: 'env', defaults: false });
      expect(config).toEqual({});
    });

    test('custom host', async (): Promise<void> => {
      mockFS({ './config.json': JSON.stringify({ server: { host: '127.0.0.1' } }) });

      await program.parseAsync(['config'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('config');
      expect(mocked_lastFunctionArgs).toEqual({ format: 'json', defaults: true });
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });

    test('custom env prefix', async (): Promise<void> => {
      process.env.FC_SERVER__HOST = '127.0.0.1';

      await program.parseAsync(['-e', 'FC', 'config'], { from: 'user' });

      const config = getConfig();
      expect(mocked_lastFunction).toBe('config');
      expect(mocked_lastFunctionArgs).toEqual({ format: 'json', defaults: true });
      expect(config).toEqual({ server: { host: '127.0.0.1' } });
    });
  });
});
