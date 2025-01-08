import mockFS from 'mock-fs';
import FileData from '@/types/storage/FileData';
import { checkIntegrity } from '@/command/integrity';

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
        async list(path: string): Promise<string[]> {
          return await actualStorage.list(path);
        }
      } as unknown as Storage;
    }
  };
});

describe('integrityCheck', (): void => {
  const stdout = process.stdout;
  const stderr = process.stderr;

  let outSpy: jest.Spied<typeof stdout.write>;
  let errSpy: jest.Spied<typeof stderr.write>;
  let printings: (string | Uint8Array)[] = [];
  let channels: ('out' | 'err')[] = [];

  beforeEach(async (): Promise<void> => {
    const dataFile: FileData = { md5: '098f6bcd4621d373cade4e832627b4f6', owner: '', contentType: '', size: 0, meta: {} };
    const dataFile2: FileData = { md5: 'ad0234829205b9033196ba818f7a872b', owner: '', contentType: '', size: 0, meta: {} };
    const dataFileSub: FileData = { md5: '0'.repeat(32), owner: '', contentType: '', size: 0, meta: {} };
    mockFS({
      './files': { dir: { file: 'test', file2: 'test2', subDir: { subFile: 'subTest', error: '' } } },
      './data': { 'dir~file': JSON.stringify(dataFile), 'dir~file2': JSON.stringify(dataFile2), 'dir~subDir~subFile': JSON.stringify(dataFileSub) }
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

  test('checks files correctly', async (): Promise<void> => {
    await checkIntegrity();

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

  test('fails correctly', async (): Promise<void> => {
    const error = new Error('failed successfully');
    outSpy = jest.spyOn(stdout, 'write').mockImplementation((message: string | Uint8Array): boolean => {
      printings.push(message);
      channels.push('out');
      if (message === 'Starting check...\n') {
        throw error;
      }
      return true;
    });

    await checkIntegrity();

    expect(printings).toEqual([
      'Starting check...\n',
      JSON.stringify(error.stack)
        .replace(/"/g, '')
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((line) => `${RED_START}${line}${END}`)
        .join('\n') + '\n',
      `${RED_START}Failed due to error${END}\n`
    ]);
    expect(channels).toEqual(['out', 'err', 'out']);
  });
});
