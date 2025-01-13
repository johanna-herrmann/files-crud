import { Logger } from '@/logging/Logger';
import { start } from '@/command/start';

let mocked_startTime = 0;
let mocked_lastLoggedMessage = '';

jest.mock('@/server/server', () => {
  return {
    startServer(start: number) {
      mocked_startTime = start;
    }
  };
});

jest.mock('@/logging', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        info(message: string): Logger {
          mocked_lastLoggedMessage = message;
          return this;
        }
      } as Logger;
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
    mocked_lastLoggedMessage = '';
  });

  test('loads config, logs start line and calls startServer correctly.', async (): Promise<void> => {
    start(42);

    expect(mocked_startTime).toBe(42);
    expect(mocked_lastLoggedMessage).toBe('Starting application...');
  });
});
