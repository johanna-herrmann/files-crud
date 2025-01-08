import crypto from 'crypto';
import { addUser } from '@/user';
import { loadConfig } from '@/config';
import { printer } from '@/printing/printer';

loadConfig();

const getRandomString = function (length: number): string {
  return crypto.randomBytes(length).toString('base64');
};

const createAdmin = async function ({ username, password }: { username?: string; password?: string }): Promise<void> {
  try {
    username = username ?? getRandomString(6);
    password = password ?? getRandomString(15);
    printer.printLine(`Creating user...`);
    await addUser(username, password, true, {});
    printer.printLine(`Successfully created user. username: ${username}; password: ${password}`);
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

export { createAdmin };
