import { loadLogger, resetLogger } from '@/logging';
import { loadConfig } from '@/config/config';
import { setConsoleTest, unsetConsoleTest } from '@/logging/Logger';
import process from 'process';

let logSpy: jest.Spied<typeof console.log>;
let errorSpy: jest.Spied<typeof console.error>;
let loggedMessage = '';

describe('logging', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig({ logging: { enableErrorFileLogging: false, enableAccessLogging: false, ttyLoggingFormat: 'humanReadableLine' } });
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
    jest.setSystemTime(42 + new Date().getTimezoneOffset() * 60 * 1000);
  });

  afterEach(async (): Promise<void> => {
    loadConfig();
    unsetConsoleTest();
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    loggedMessage = '';
    jest.useRealTimers();
    resetLogger();
  });

  test('loadLogger loads logger correctly', async (): Promise<void> => {
    const logger = loadLogger();
    logger.info('test message');

    expect(loggedMessage).toBe(`1970-01-01T00:00:00.042 [${__filename}] INFO: test message`);
  });
});
