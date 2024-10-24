import fs from 'fs/promises';
import { FileDoesNotExistError } from '@/errors/FileDoesNotExistError';
import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { FileAlreadyExistsError } from '@/errors/FileAlreadyExistsError';
import { IsNotFileError } from '@/errors/IsNotFileError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

const isFile = async function (path: string): Promise<boolean> {
  if (!(await exists(path))) {
    return false;
  }

  const stats = await fs.stat(path);
  return stats.isFile();
};

const isDirectory = async function (path: string): Promise<boolean> {
  if (!(await exists(path))) {
    return false;
  }

  const stats = await fs.stat(path);
  return stats.isDirectory();
};

const padDirectoriesWithSlash = async function (path: string, items: string[]): Promise<string[]> {
  return await Promise.all(
    items.map(async (item): Promise<string> => {
      const itemPath = `${path}/${item}`;
      const directory = await isDirectory(itemPath);
      return directory ? `${item}/` : item;
    })
  );
};

const sortDirectoriesBeforeFiles = function (items: string[]): string[] {
  const directories = items.filter((item) => item.endsWith('/'));
  const files = items.filter((item) => !item.endsWith('/'));

  return [...directories, ...files];
};

const ensureIsFile = async function (path: string, resolvedPath: string): Promise<void> {
  if (!(await exists(resolvedPath))) {
    throw new FileDoesNotExistError(path);
  }

  if (!(await isFile(resolvedPath))) {
    throw new IsNotFileError(path);
  }
};

const ensureIsDirectory = async function (path: string, resolvedPath: string): Promise<void> {
  if (!(await exists(resolvedPath))) {
    throw new DirectoryDoesNotExistError(path);
  }

  if (!(await isDirectory(resolvedPath))) {
    throw new IsNotDirectoryError(path);
  }
};

const preventDisallowedOverwrite = async function (to: string, resolvedTo: string, overwrite?: boolean): Promise<void> {
  const fileExists = await isFile(resolvedTo);
  if (fileExists && !overwrite) {
    throw new FileAlreadyExistsError(to);
  }
};

const resolveTargetAndParent = async function (to: string, resolvedTo: string, from: string): Promise<string[]> {
  if ((await isDirectory(resolvedTo)) || resolvedTo.endsWith('/')) {
    const fromName = from.substring(from.lastIndexOf('/') + 1);
    to = `${to.replace(/\/$/u, '')}/${fromName}`;
    resolvedTo = `${resolvedTo.replace(/\/$/u, '')}/${fromName}`;
  }

  const toParent = to.substring(0, to.lastIndexOf('/')).replace('//', '');
  const resolvedToParent = resolvedTo.substring(0, resolvedTo.lastIndexOf('/')).replace('//', '');

  return [resolvedTo, toParent, resolvedToParent];
};

const resolveItemPaths = function (from: string, to: string, resolvedFrom: string, resolvedTo: string, item: string): string[] {
  const itemPath = `${resolvedFrom}/${item}`;
  const itemPathTarget = `${resolvedTo}/${item}`;
  const itemPathRelative = `${from}/${item}`;
  const itemPathTargetRelative = `${to}/${item}`;

  return [itemPath, itemPathTarget, itemPathRelative, itemPathTargetRelative];
};

export {
  exists,
  isFile,
  isDirectory,
  padDirectoriesWithSlash,
  sortDirectoriesBeforeFiles,
  ensureIsFile,
  ensureIsDirectory,
  preventDisallowedOverwrite,
  resolveTargetAndParent,
  resolveItemPaths
};
