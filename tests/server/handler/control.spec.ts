import { Logger } from '@/logging/Logger';
import { reloadHandler, stopHandler } from '@/server/handler/control';
import { assertOK, buildRequestForControlAction, buildResponse } from '#/server/expressTestUtils';

let mocked_InfoMessages: string[] = [];
let mocked_reloadedConfig = false;
let mocked_reloadedDb = false;
let mocked_reloadedStorage = false;
let mocked_reloadedLogger = false;

jest.mock('@/config/config', () => {
  const actual = jest.requireActual('@/config/config');
  // noinspection JSUnusedGlobalSymbols
  return {
    ...actual,
    reloadConfig() {
      mocked_reloadedConfig = true;
    }
  };
});

jest.mock('@/database/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    reloadDb() {
      mocked_reloadedDb = true;
    }
  };
});

jest.mock('@/storage/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    reloadStorage() {
      mocked_reloadedStorage = true;
    }
  };
});

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    reloadLogger() {
      mocked_reloadedLogger = true;
    },
    loadLogger(): Logger {
      return {
        debug() {
          return this;
        },
        info(message: string) {
          mocked_InfoMessages.push(message);
          return this;
        },
        warn() {
          return this;
        },
        error() {
          return this;
        }
      } as unknown as Logger;
    }
  };
});

describe('controlMiddleware', (): void => {
  let exitSpy: jest.Spied<typeof process.exit>;

  afterEach(async (): Promise<void> => {
    mocked_InfoMessages = [];
    mocked_reloadedConfig = false;
    mocked_reloadedDb = false;
    mocked_reloadedStorage = false;
    mocked_reloadedLogger = false;
    exitSpy?.mockRestore();
  });

  test('stopHandler stops.', async (): Promise<void> => {
    let exitCode = -1;
    // @ts-expect-error this is fine
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code: number) => {
      exitCode = code as number;
    });
    const req = buildRequestForControlAction('127.0.0.0', undefined, 'mocked_token');
    const res = buildResponse();

    stopHandler(req, res);

    expect(exitCode).toBe(0);
    expect(mocked_InfoMessages).toEqual(['Received stop request. Stopping...']);
  });

  test('reloadHandler reloads.', async (): Promise<void> => {
    const req = buildRequestForControlAction('127.0.0.0', undefined, 'mocked_token');
    const res = buildResponse();

    await reloadHandler(req, res);

    expect(mocked_InfoMessages).toEqual(['Received reload request. Reloading...', 'Reloaded.']);
    expect(mocked_reloadedConfig).toBe(true);
    expect(mocked_reloadedDb).toBe(true);
    expect(mocked_reloadedStorage).toBe(true);
    expect(mocked_reloadedLogger).toBe(true);
    assertOK(res);
  });
});
