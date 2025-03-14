import crypto from 'crypto';
import joi from 'joi';
import { addUser, getUsers } from '@/user';
import { printer } from '@/printing/printer';
import { getLogger } from '@/logging';
import { resetDb } from '@/database';
import { sendError } from '@/server/util';

const usernameConstraint = 'required string, 3 to 64 chars long';
const passwordConstraint = 'required string, at least 8 chars long';

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

const createAdmin = async function ({ username, password }: { username?: string; password?: string }, command?: boolean): Promise<void> {
  try {
    const credentialsSchema = joi.object({
      username: joi.string().min(3).max(64).required(),
      password: joi.string().min(8).required()
    });
    username = username ?? getRandomString(6);
    password = password ?? getRandomString(15);

    if (!!credentialsSchema.validate({ username, password }).error) {
      const validationErrorDetails = {
        source: 'arguments',
        schema: { username: usernameConstraint, password: passwordConstraint },
        value: { username, password }
      };
      printError(`Error. Validation Error.\n${JSON.stringify(validationErrorDetails, undefined, '  ')}`);
      return;
    }

    printLine(`Creating user...`);

    const added = await addUser(username, password, true, {});

    if (!added) {
      printError(`Error. User ${username} exists already.`);
      return;
    }

    printLine(`Successfully created user. username: ${username}; password: ${password}`, { username, password });
    if (command) {
      await resetDb();
    }
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
