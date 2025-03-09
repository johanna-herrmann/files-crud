import crypto from 'crypto';
import { addUser, getUsers } from '@/user';
import { printer } from '@/printing/printer';
import { getLogger } from '@/logging';

const printLine = function (line: string, meta?: Record<string, unknown>): void {
  const logger = getLogger();
  if (!logger) {
    printer.printLine(line);
    return;
  }
  logger.info(line, meta);
};

const printError = function (message: string): void {
  const logger = getLogger();
  if (!logger) {
    printer.printError(message);
    return;
  }
  logger.error(message);
};

const printFailed = function (): void {
  if (!getLogger()) {
    printer.printFailed();
  }
};

const getRandomString = function (length: number): string {
  return crypto.randomBytes(length).toString('base64url');
};

const createAdmin = async function ({ username, password }: { username?: string; password?: string }): Promise<void> {
  try {
    username = username ?? getRandomString(6);
    password = password ?? getRandomString(15);
    printLine(`Creating user...`);
    await addUser(username, password, true, {});
    printLine(`Successfully created user. username: ${username}; password: ${password}`, { username, password });
  } catch (err: unknown) {
    const error = err as Error;
    printError(
      JSON.stringify(error.stack ?? `Error: ${error.message ?? 'Unknown error'}`)
        .replace(/"/g, '')
        .replace(/\\n/g, '\n')
    );
    printFailed();
  }
};

const createInitialAdminIfNoAdminExists = async function (): Promise<void> {
  const users = await getUsers();
  const admin = users.find((user) => user.admin);
  if (!admin) {
    printLine('There is no admin user. Initial admin will be created.');
    await createAdmin({});
  }
};

export { createAdmin, createInitialAdminIfNoAdminExists };
