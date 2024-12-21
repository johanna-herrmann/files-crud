import fse from 'fs-extra';
import fs from 'fs/promises';
import paths from 'path';
import StorageAdapter from '@/types/StorageAdapter';

const sanitizePath = function (path: string): string {
  return path
    .replace(/(^\.+|\.+$)/gu, '')
    .replace(/\/\.+/gu, '/')
    .replace(/\.+\//gu, '/')
    .replace(/(^\/+|\/+$)/gu, '')
    .replace(/\/\/+/gu, '/');
};

/**
 * StorageAdapter for fs storage.
 * Stores files as native files in fs or virtual file system.
 * Automatically creates and removes directories as needed.
 */
class FsStorageAdapter implements StorageAdapter {
  private readonly directory: string;

  public constructor(path: string) {
    this.directory = `/${sanitizePath(path)}`;
  }

  private resolvePath(path: string): string {
    return `${this.directory}/${sanitizePath(path)}`;
  }

  private async removeParentDirectoryIfEmpty(path: string): Promise<void> {
    const parent = paths.dirname(path);
    if (paths.normalize(parent) === paths.normalize(this.directory)) {
      return;
    }

    const items = await fs.readdir(parent);
    if (items.length > 0) {
      return;
    }

    await fse.remove(parent);
    await this.removeParentDirectoryIfEmpty(parent);
  }

  public getDirectory(): string {
    return this.directory;
  }

  public async write(path: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await fse.ensureFile(resolvedPath);
    await fse.writeFile(resolvedPath, data, encoding);
  }

  public async read(path: string, encoding?: BufferEncoding): Promise<Buffer | string> {
    return await fs.readFile(this.resolvePath(path), encoding);
  }

  public async delete(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await fs.unlink(resolvedPath);
    await this.removeParentDirectoryIfEmpty(resolvedPath);
  }

  public async copy(path: string, copyPath: string): Promise<void> {
    const resolvedCopyPath = this.resolvePath(copyPath);
    await fse.ensureFile(resolvedCopyPath);
    await fs.copyFile(this.resolvePath(path), resolvedCopyPath);
  }
}

export { FsStorageAdapter };
