import paths from 'path';
import crypto from 'crypto';
import { loadStorage } from '@/storage';
import { Storage } from '@/storage/Storage';
import { printer } from '@/printing/printer';

let valid = 0;
let invalid = 0;
let errors = 0;

const checkFileIntegrity = async function (file: string): Promise<undefined> {
  const storage: Storage = loadStorage();
  printer.printStep(file);
  try {
    const [content, data] = await storage.load(file);
    const { md5 } = data;
    const md5Check = crypto.createHash('md5').update(content).digest().toString('hex');
    if (md5 === md5Check) {
      printer.printValid();
      valid++;
      return;
    }
    printer.printInvalid();
    invalid++;
  } catch (err: unknown) {
    errors++;
    printer.printCheckingError();
    printer.printError(`Checking Error: error message: ${(err as Error)?.message ?? '-none-'}`);
  }
};

const checkDirectoryIntegrity = async function (directory: string): Promise<undefined> {
  const storage: Storage = loadStorage();
  const items = await storage.list(directory);
  for (const item of items) {
    const path = paths.join(directory, item);
    if (item.endsWith('/')) {
      await checkDirectoryIntegrity(path);
      continue;
    }
    await checkFileIntegrity(path);
  }
};

const checkPathIntegrity = async function (path: string): Promise<undefined | 1> {
  const storage: Storage = loadStorage();
  if (await storage.isFile(path)) {
    return await checkFileIntegrity(path);
  }
  if (await storage.isDirectory(path)) {
    return await checkDirectoryIntegrity(path);
  }

  const message = path ? `${path} does not exist` : 'Storage not initialized or not found';
  printer.printError(`Error: ${message}.`);
  return 1;
};

const checkIntegrity = async function (path: string) {
  valid = 0;
  invalid = 0;
  errors = 0;
  try {
    printer.printLine('Starting check...');
    const doesNotExist = await checkPathIntegrity(path);
    if (doesNotExist) {
      return;
    }
    printer.printLine('Finished check');
    printer.printSummary(valid, invalid, errors);
  } catch (err: unknown) {
    const error = err as Error;
    printer.printError(
      JSON.stringify(error.stack ?? `Error: ${error.message ?? 'Unknown error'}`)
        .replace(/"/g, '')
        .replace(/\\n/g, '\n')
    );
    printer.printFailed();
  }
};

export { checkIntegrity };
