import mockFS from 'mock-fs';
import { checkIntegrity } from '@/command/integrity';
import { FileData } from '@/types/storage/FileData';

const RED_START = '\x1B[31m';
const GREEN_START = '\x1B[32m';
const END = '\x1B[39m';

jest.mock('@/storage', () => {
  const actual = jest.requireActual('@/storage');
  const actualStorage = actual.loadStorage();
  return {
    loadStorage: (): Storage => {
      return {
        ...actualStorage,
        async load(path: string): Promise<[Buffer, FileData]> {
          if (path.endsWith('/error')) {
            throw new Error('checking error');
          }
          return await actualStorage.load(path);
        },
        async fileExists(path: string): Promise<boolean> {
          return await actualStorage.fileExists(path);
        },
        async directoryExists(path: string): Promise<boolean> {
          return await actualStorage.directoryExists(path);
        },
        async list(path: string): Promise<string[]> {
          return await actualStorage.list(path);
        }
      } as unknown as Storage;
    }
  };
});

describe('command: integrity', (): void => {
  const stdout = process.stdout;
  const stderr = process.stderr;

  let outSpy: jest.Spied<typeof stdout.write>;
  let errSpy: jest.Spied<typeof stderr.write>;
  let printings: (string | Uint8Array)[] = [];
  let channels: ('out' | 'err')[] = [];

  beforeEach(async (): Promise<void> => {
    const dataFile: FileData = { md5: '098f6bcd4621d373cade4e832627b4f6', owner: '', contentType: '', size: 0, meta: {}, key: 'ke/key1' };
    const dataFile2: FileData = { md5: 'ad0234829205b9033196ba818f7a872b', owner: '', contentType: '', size: 0, meta: {}, key: 'ke/key2' };
    const dataFileSub: FileData = { md5: '0'.repeat(32), owner: '', contentType: '', size: 0, meta: {}, key: 'ke/key3' };
    mockFS({
      './files': { ke: { key1: 'test', key2: 'test2', key3: 'subTest' } },
      './data': {
        dir: { file: JSON.stringify(dataFile), file2: JSON.stringify(dataFile2), subDir: { subFile: JSON.stringify(dataFileSub), error: '' } }
      }
    });
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
    mockFS.restore();
    outSpy.mockRestore();
    errSpy.mockRestore();
    printings = [];
    channels = [];
  });

  test('checks files correctly, root', async (): Promise<void> => {
    await checkIntegrity('');

    expect(printings).toEqual([
      'Starting check...\n',
      'Checking dir/subDir/error ',
      `  ${RED_START}Error${END}\n`,
      `${RED_START}Checking Error: error message: checking error${END}\n`,
      'Checking dir/subDir/subFile ',
      `  ${RED_START}Invalid${END}\n`,
      'Checking dir/file ',
      `  ${GREEN_START}Valid${END}\n`,
      'Checking dir/file2 ',
      `  ${GREEN_START}Valid${END}\n`,
      'Finished check\n',
      `total: 4\nvalid: ${GREEN_START}2${END}\ninvalid: ${RED_START}1${END}\nerrors: ${RED_START}1${END}\n`
    ]);
    expect(channels).toEqual(['out', 'out', 'out', 'err', 'out', 'out', 'out', 'out', 'out', 'out', 'out', 'out']);
  });

  test('checks files correctly, sub directory', async (): Promise<void> => {
    await checkIntegrity('dir/subDir');

    expect(printings).toEqual([
      'Starting check...\n',
      'Checking dir/subDir/error ',
      `  ${RED_START}Error${END}\n`,
      `${RED_START}Checking Error: error message: checking error${END}\n`,
      'Checking dir/subDir/subFile ',
      `  ${RED_START}Invalid${END}\n`,
      'Finished check\n',
      `total: 2\nvalid: 0\ninvalid: ${RED_START}1${END}\nerrors: ${RED_START}1${END}\n`
    ]);
    expect(channels).toEqual(['out', 'out', 'out', 'err', 'out', 'out', 'out', 'out']);
  });

  test('checks files correctly, sub file', async (): Promise<void> => {
    await checkIntegrity('dir/file');

    expect(printings).toEqual([
      'Starting check...\n',
      'Checking dir/file ',
      `  ${GREEN_START}Valid${END}\n`,
      'Finished check\n',
      `total: 1\nvalid: ${GREEN_START}1${END}\ninvalid: 0\nerrors: 0\n`
    ]);
    expect(channels).toEqual(['out', 'out', 'out', 'out', 'out']);
  });

  test('gives error, if it does not exist, given path', async (): Promise<void> => {
    await checkIntegrity('nope');

    expect(printings).toEqual(['Starting check...\n', `${RED_START}Error: nope does not exist.${END}\n`]);
    expect(channels).toEqual(['out', 'err']);
  });

  test('gives empty result on empty storage', async (): Promise<void> => {
    mockFS({});

    await checkIntegrity('');

    expect(printings).toEqual(['Starting check...\n', 'Finished check\n', `total: 0\nvalid: 0\ninvalid: 0\nerrors: 0\n`]);
    expect(channels).toEqual(['out', 'out', 'out']);
  });

  test('fails correctly on errors', async (): Promise<void> => {
    const error = new Error('failed successfully');
    outSpy = jest.spyOn(stdout, 'write').mockImplementation((message: string | Uint8Array): boolean => {
      printings.push(message);
      channels.push('out');
      if (message === 'Starting check...\n') {
        throw error;
      }
      return true;
    });

    await checkIntegrity('');

    expect(printings).toEqual([
      'Starting check...\n',
      `${RED_START}${JSON.stringify(error.stack).replace(/"/g, '').replace(/\\n/g, '\n')}${END}\n`,
      `${RED_START}Failed due to error${END}\n`
    ]);
    expect(channels).toEqual(['out', 'err', 'out']);
  });
});
