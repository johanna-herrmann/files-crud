import paths from 'path';
import crypto from 'crypto';
import { loadStorage } from '@/storage';
import { loadConfig } from '@/config';
import { printer } from '@/printing/printer';

loadConfig();
const storage = loadStorage();

let valid = 0;
let invalid = 0;
let errors = 0;

const checkFileIntegrity = async function (file: string): Promise<void> {
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

const checkDirectoryIntegrity = async function (directory: string): Promise<void> {
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

const checkIntegrity = async function () {
  try {
    printer.printLine('Starting check...');
    await checkDirectoryIntegrity('');
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
