import BufferEncoding from '@/types/BufferEncoding';
import fs from 'fs/promises';
import StorageHandler from '@/types/StorageHandler';
import { FileDoesNotExistError } from '@/errors/FileDoesNotExistError';
import { DirectoryDoesNotExistError } from '@/errors/DirectoryDoesNotExistError';
import { FileAlreadyExistsError } from '@/errors/FileAlreadyExistsError';
import { DirectoryIsNotEmptyError } from '@/errors/DirectoryIsNotEmptyError';
import { IsNotFileError } from '@/errors/IsNotFileError';
import { IsNotDirectoryError } from '@/errors/IsNotDirectoryError';
import { DoesNotExistError } from '@/errors/DoesNotExistError';
import { AlreadyExistsError } from '@/errors/AlreadyExistsError';
import {
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
} from './LocalStorageHandlerHelper';

class LocalStorageHandler implements StorageHandler {
  private readonly basePath: string;

  private buildPath(path: string): string {
    return `${this.basePath}/${path.replace(/^\/+/gu, '')}`;
  }

  public constructor(basePath: string) {
    this.basePath = `/${basePath.replace(/(^\/+|\/+$)/gu, '')}`;
  }

  public getBasePath(): string {
    return this.basePath;
  }

  public async writeFile(path: string, data: string | NodeJS.ArrayBufferView, encoding?: BufferEncoding): Promise<void> {
    const parent = path.substring(0, path.lastIndexOf('/'));
    const resolvedPath = this.buildPath(path);
    const resolvedParent = this.buildPath(parent);
    await ensureIsDirectory(parent, resolvedParent);
    await fs.writeFile(resolvedPath, data, encoding);
  }

  public async readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    if (!(await this.exists(path))) {
      throw new FileDoesNotExistError(path);
    }
    if (!(await isFile(this.buildPath(path)))) {
      throw new IsNotFileError(path);
    }

    return await fs.readFile(this.buildPath(path), encoding);
  }

  public async createDirectory(path: string, recursive?: boolean): Promise<void> {
    const parent = path.replace(/\/[^\/]+$/u, '');
    if (!(await this.exists(parent)) && !recursive) {
      throw new DirectoryDoesNotExistError(parent);
    }
    if ((await this.exists(parent)) && !(await isDirectory(this.buildPath(parent)))) {
      throw new IsNotDirectoryError(parent);
    }

    await fs.mkdir(this.buildPath(path), { recursive });
  }

  public async listDirectory(path: string, hidden?: boolean): Promise<string[]> {
    const resolvedPath = this.buildPath(path);

    if (!(await this.exists(path))) {
      throw new DirectoryDoesNotExistError(path);
    }
    if (!(await isDirectory(resolvedPath))) {
      throw new IsNotDirectoryError(path);
    }

    const items = await fs.readdir(resolvedPath);
    const filteredItems = hidden ? items : items.filter((item) => !item.startsWith('.'));
    const filteredItemsWithTrailingSlashOnDirectories = await padDirectoriesWithSlash(resolvedPath, filteredItems);

    return sortDirectoriesBeforeFiles(filteredItemsWithTrailingSlashOnDirectories);
  }

  public async copyFile(from: string, to: string, overwrite?: boolean): Promise<void> {
    const resolvedFrom = this.buildPath(from);
    const resolvedTo = this.buildPath(to);

    await ensureIsFile(from, resolvedFrom);
    await preventDisallowedOverwrite(to, resolvedTo, overwrite);

    const [target, parent, fullParent] = await resolveTargetAndParent(to, resolvedTo, from);

    await ensureIsDirectory(parent, fullParent);

    if (!(await exists(target))) {
      await fs.writeFile(target, '');
    }

    await fs.copyFile(resolvedFrom, target);
  }

  public async copyDirectory(from: string, to: string, recursive?: boolean, overwrite?: boolean): Promise<void> {
    const resolvedFrom = this.buildPath(from);
    const resolvedTo = this.buildPath(to);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, parent, fullParent] = await resolveTargetAndParent(to, resolvedTo, from);

    await ensureIsDirectory(from, resolvedFrom);
    await ensureIsDirectory(parent, fullParent);

    if (!(await exists(resolvedTo))) {
      await fs.mkdir(resolvedTo);
    }

    await this.copyDirectoryContents(from, to, recursive, overwrite);
  }

  public async deleteFile(path: string): Promise<void> {
    await ensureIsFile(path, this.buildPath(path));
    await fs.unlink(this.buildPath(path));
  }

  public async deleteDirectory(path: string, force?: boolean): Promise<void> {
    const resolvedPath = this.buildPath(path);

    await ensureIsDirectory(path, resolvedPath);

    if (force) {
      return await fs.rm(resolvedPath, { recursive: true, force: true });
    }

    if ((await fs.readdir(resolvedPath)).length > 0) {
      throw new DirectoryIsNotEmptyError(path);
    }

    await fs.rmdir(resolvedPath);
  }

  public async rename(oldPath: string, newPath: string): Promise<void> {
    const resolvedFrom = this.buildPath(oldPath);
    const resolvedTo = this.buildPath(newPath);

    if (!(await exists(resolvedFrom))) {
      throw new DoesNotExistError(oldPath);
    }

    if (await exists(resolvedTo)) {
      throw new AlreadyExistsError(newPath);
    }

    await fs.rename(resolvedFrom, resolvedTo);
  }

  public async exists(path: string): Promise<boolean> {
    return await exists(this.buildPath(path));
  }

  private async copyDirectoryContents(from: string, to: string, recursive?: boolean, overwrite?: boolean): Promise<void> {
    const resolvedFrom = this.buildPath(from);
    const resolvedTo = this.buildPath(to);

    const items = await fs.readdir(resolvedFrom);
    for (const item of items) {
      const [itemPath, itemPathTarget, itemPathRelative, itemPathTargetRelative] = resolveItemPaths(from, to, resolvedFrom, resolvedTo, item);
      if (await isFile(itemPath)) {
        await this.copyFile(itemPathRelative, itemPathTargetRelative, overwrite);
      }
      if (await isDirectory(itemPath)) {
        await this.createDirectoryAndCopyContents(itemPathTarget, itemPathRelative, itemPathTargetRelative, recursive, overwrite);
      }
    }
  }

  private async createDirectoryAndCopyContents(
    itemPathTarget: string,
    itemPathRelative: string,
    itemPathTargetRelative: string,
    recursive?: boolean,
    overwrite?: boolean
  ): Promise<void> {
    if (await isFile(itemPathTarget)) {
      throw new FileAlreadyExistsError(itemPathTargetRelative);
    }
    if (!(await exists(itemPathTarget))) {
      await fs.mkdir(itemPathTarget);
    }
    if (recursive) {
      await this.copyDirectoryContents(itemPathRelative, itemPathTargetRelative, true, overwrite);
    }
  }
}

export { LocalStorageHandler };
