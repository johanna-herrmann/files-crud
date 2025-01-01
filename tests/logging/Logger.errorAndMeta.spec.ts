import { Logger, setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import process from 'process';
import { loadConfig } from '@/config';

let logSpy: jest.Spied<typeof console.log>;
let errorSpy: jest.Spied<typeof console.error>;
let loggedMessage = '';

const error = new Error('test error message');
const meta = { k: 'v' };

describe('Logger, error and meta', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { enableErrorFileLogging: false, enableAccessLogging: false, ttyLoggingFormat: 'json' } });
    setConsoleTest();
    logSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
      loggedMessage = message;
    });
    errorSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
      loggedMessage = message;
    });
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;
    jest.useFakeTimers();
    jest.setSystemTime(42);
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    unsetConsoleTest();
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    loggedMessage = '';
    jest.useRealTimers();
  });

  test('logs on info, without meta', async (): Promise<void> => {
    new Logger().info('testMessage');

    expect(logSpy).toHaveBeenCalled();
    expect((JSON.parse(loggedMessage) as Record<string, string>).errorMessage).toBeUndefined();
    expect((JSON.parse(loggedMessage) as Record<string, string>).meta).toBeUndefined();
  });

  test('logs on info, with meta', async (): Promise<void> => {
    new Logger().info('testMessage', meta);

    expect(logSpy).toHaveBeenCalled();
    expect((JSON.parse(loggedMessage) as Record<string, string>).errorMessage).toBeUndefined();
    expect((JSON.parse(loggedMessage) as Record<string, string>).meta).toEqual(meta);
  });

  test('logs on error, without error, without meta', async (): Promise<void> => {
    new Logger().error('testMessage');

    expect(errorSpy).toHaveBeenCalled();
    expect((JSON.parse(loggedMessage) as Record<string, string>).errorMessage).toBeUndefined();
    expect((JSON.parse(loggedMessage) as Record<string, string>).meta).toBeUndefined();
  });

  test('logs on error, without error, with meta', async (): Promise<void> => {
    new Logger().error('testMessage', undefined, meta);

    expect(errorSpy).toHaveBeenCalled();
    expect((JSON.parse(loggedMessage) as Record<string, string>).errorMessage).toBeUndefined();
    expect((JSON.parse(loggedMessage) as Record<string, string>).meta).toEqual(meta);
  });

  test('logs on error, with error, without meta', async (): Promise<void> => {
    new Logger().error('testMessage', error);

    expect(errorSpy).toHaveBeenCalled();
    expect((JSON.parse(loggedMessage) as Record<string, string>).errorMessage).toBe(error.message);
    expect((JSON.parse(loggedMessage) as Record<string, string>).meta).toBeUndefined();
  });

  test('logs on error, with error, with meta', async (): Promise<void> => {
    new Logger().error('testMessage', error, meta);

    expect(errorSpy).toHaveBeenCalled();
    expect((JSON.parse(loggedMessage) as Record<string, string>).errorMessage).toBe(error.message);
    expect((JSON.parse(loggedMessage) as Record<string, string>).meta).toEqual(meta);
  });
});
