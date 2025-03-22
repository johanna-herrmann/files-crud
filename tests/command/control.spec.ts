import fs from 'fs';
import { Printer, printer } from '@/printing/printer';
import { getControlProperties, reload, restart, stop } from '@/command/control';
import { loadConfig, NEW_CONFIG_FILE_PATH } from '@/config/config';
import { Config } from '@/types/config/Config';

let mocked_startTime = -1;
let mocked_fetchUrl = '';
let mocked_fetchOptions: Record<string, unknown> | undefined = undefined;

jest.mock('@/command/start', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    start(start: number) {
      mocked_startTime = start;
    }
  };
});

jest.mock('@/command/fetchWrapper', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    async doFetch(url: string, options: Record<string, unknown>) {
      mocked_fetchUrl = url;
      mocked_fetchOptions = options;
      if ((options.headers as { Authorization: string }).Authorization === 'token') {
        return { status: 200 };
      }
      if ((options.headers as { Authorization: string }).Authorization === 'fail') {
        throw new Error('');
      }
      return { status: 401 };
    }
  };
});

describe('control commands', (): void => {
  let fsReadSpy: jest.Spied<typeof fs.readFileSync>;
  let fsWriteSpy: jest.Spied<typeof fs.writeFileSync>;
  let printLineSpy: jest.Spied<typeof printer.printLine>;
  let printErrorSpy: jest.Spied<typeof printer.printError>;
  let printedMessages: string[] = [];
  let printedChannels: string[] = [];
  let lastFileWrite: { path?: string; data?: string | Buffer; encoding?: string } = {};

  beforeEach(async (): Promise<void> => {
    printLineSpy = jest.spyOn(printer, 'printLine').mockImplementation((line: string) => {
      printedMessages.push(line);
      printedChannels.push('out');
      return {} as Printer;
    });
    printErrorSpy = jest.spyOn(printer, 'printError').mockImplementation((message: string) => {
      printedMessages.push(message);
      printedChannels.push('err');
      return {} as Printer;
    });
    jest.useFakeTimers();
    jest.setSystemTime(42);
  });

  afterEach(async (): Promise<void> => {
    mocked_startTime = -1;
    mocked_fetchUrl = '';
    mocked_fetchOptions = undefined;
    printedMessages = [];
    printedChannels = [];
    lastFileWrite = {};
    fsReadSpy?.mockRestore();
    fsWriteSpy?.mockRestore();
    printLineSpy?.mockRestore();
    printErrorSpy?.mockRestore();
    jest.useRealTimers();
  });

  describe('getControlProperties gets control properties', (): void => {
    test('properties exist', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'token' });
        }
        return '{}';
      });

      const { port, protocol, token } = getControlProperties();

      expect(port).toBe(9000);
      expect(protocol).toBe('http');
      expect(token).toBe('token');
    });

    test('properties empty', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((_: string): string | Buffer => {
        return '{}';
      });

      const { port, protocol, token } = getControlProperties();

      expect(port).toBeUndefined();
      expect(protocol).toBeUndefined();
      expect(token).toBeUndefined();
    });

    test('file empty', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((_: string): string | Buffer => {
        return '';
      });

      const { port, protocol, token } = getControlProperties();

      expect(port).toBeUndefined();
      expect(protocol).toBeUndefined();
      expect(token).toBeUndefined();
    });

    test('file missing', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((_: string): string | Buffer => {
        throw new Error('');
      });

      const { port, protocol, token } = getControlProperties();

      expect(port).toBeUndefined();
      expect(protocol).toBeUndefined();
      expect(token).toBeUndefined();
    });
  });

  describe('stop', (): void => {
    test('stops if valid token', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'token' });
        }
        return '{}';
      });

      const stopped = await stop();

      expect(mocked_startTime).toBe(-1);
      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/stop');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'token' } });
      expect(printedMessages).toEqual(['Sending request to stop...', 'Stopped.']);
      expect(printedChannels).toEqual(['out', 'out']);
      expect(stopped).toBe(true);
    });

    test('fails if invalid token', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'invalid' });
        }
        return '{}';
      });

      const stopped = await stop();

      expect(mocked_startTime).toBe(-1);
      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/stop');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'invalid' } });
      expect(printedMessages).toEqual(['Sending request to stop...', 'Request failed with error. StatusCode: 401']);
      expect(printedChannels).toEqual(['out', 'err']);
      expect(stopped).toBe(false);
    });

    test('fails if not running', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'fail' });
        }
        return '{}';
      });

      const stopped = await stop();

      expect(mocked_startTime).toBe(-1);
      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/stop');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'fail' } });
      expect(printedMessages).toEqual(['Sending request to stop...', 'Request failed. Application not running?']);
      expect(printedChannels).toEqual(['out', 'err']);
      expect(stopped).toBe(false);
    });
  });

  describe('restart', (): void => {
    test('restarts if valid token', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'token' });
        }
        return '{}';
      });

      await restart();

      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/stop');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'token' } });
      expect(printedMessages).toEqual(['Sending request to stop...', 'Stopped.', 'Starting...']);
      expect(printedChannels).toEqual(['out', 'out', 'out']);
      expect(mocked_startTime).toBe(42);
    });

    test('fails if invalid token', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'invalid' });
        }
        return '{}';
      });

      await restart();

      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/stop');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'invalid' } });
      expect(printedMessages).toEqual(['Sending request to stop...', 'Request failed with error. StatusCode: 401']);
      expect(printedChannels).toEqual(['out', 'err']);
      expect(mocked_startTime).toBe(-1);
    });
  });

  describe('reload', (): void => {
    test('reloads if valid token', async (): Promise<void> => {
      const newConfig = { register: 'all', server: { port: 1234 } };
      loadConfig(newConfig as Config);
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'token' });
        }
        return '{}';
      });
      // @ts-expect-error // this is fine
      fsWriteSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation((path: string, data: string | Buffer, encoding?: string): void => {
        lastFileWrite = { path, data, encoding };
      });

      await reload();

      expect(mocked_startTime).toBe(-1);
      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/reload');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'token' } });
      expect(printedMessages).toEqual(['Preparing to reload...', 'Sending request to reload...', 'Reloaded.']);
      expect(printedChannels).toEqual(['out', 'out', 'out']);
      expect(lastFileWrite).toEqual({ path: NEW_CONFIG_FILE_PATH, data: JSON.stringify(newConfig), encoding: 'utf8' });
    });

    test('fails if invalid token', async (): Promise<void> => {
      // @ts-expect-error // this is fine
      fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
        if (path === './.control.json') {
          return JSON.stringify({ port: 9000, protocol: 'http', token: 'invalid' });
        }
        return '{}';
      });
      fsWriteSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation((): void => {});

      await reload();

      expect(mocked_startTime).toBe(-1);
      expect(mocked_fetchUrl).toBe('http://127.0.0.1:9000/control/reload');
      expect(mocked_fetchOptions).toEqual({ method: 'POST', headers: { Authorization: 'invalid' } });
      expect(printedMessages).toEqual(['Preparing to reload...', 'Sending request to reload...', 'Request failed with error. StatusCode: 401']);
      expect(printedChannels).toEqual(['out', 'out', 'err']);
    });
  });
});
