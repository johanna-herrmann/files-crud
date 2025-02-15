import { Logger } from '@/logging/Logger';
import { start } from '@/command/start';

let mocked_startTime = 0;
const mocked_loggedMessages: string[] = [];
let mocked_adminInitialized = false;
let mocked_keysInitialized = false;

jest.mock('@/server/server', () => {
  return {
    startServer(start: number) {
      mocked_startTime = start;
    }
  };
});

jest.mock('@/user/jwt', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    async initKeys() {
      mocked_keysInitialized = true;
    }
  };
});

jest.mock('@/command/admin', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    async createInitialAdminIfNoAdminExists() {
      mocked_adminInitialized = true;
    }
  };
});

jest.mock('@/logging', () => {
  const logger: Logger = {
    info(message: string): Logger {
      mocked_loggedMessages.push(message);
      return this;
    }
  } as Logger;
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return logger;
    },
    getLogger(): Logger {
      return logger;
    }
  };
});

describe('command: start', (): void => {
  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(42);
  });

  afterEach(async (): Promise<void> => {
    jest.useRealTimers();
    mocked_startTime = 0;
    mocked_loggedMessages.splice(0, mocked_loggedMessages.length);
    mocked_adminInitialized = false;
    mocked_keysInitialized = false;
  });

  test('loads config, logs start line and calls startServer correctly.', async (): Promise<void> => {
    await start(42);

    expect(mocked_startTime).toBe(42);
    expect(mocked_loggedMessages).toEqual(['Starting application...', 'Loading storage', 'Successfully loaded storage']);
    expect(mocked_adminInitialized).toBe(true);
    expect(mocked_keysInitialized).toBe(true);
  });
});
