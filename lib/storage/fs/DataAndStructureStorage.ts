import fs from 'fs/promises';
import { existsSync } from 'fs';
import fse from 'fs-extra';
import paths from 'path';
import { v4 } from 'uuid';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';
import { FileData } from '@/types/storage/FileData';

const buildKey = function (): string {
  const uuid = v4();
  return uuid.replace(/^(.{2})/, '$1/$1');
};

/**
 * DataAndStructureStorage.
 * Stores file data, using actual file path
 * Creates uuid key if required.
 * Example key: 77/77016a73-cc90-4571-b62f-32d017c79bb3
 */
class DataAndStructureStorage {
  private readonly directory: string;
  private readonly storage: FsStorageAdapter;

  public constructor(path: string) {
    this.directory = path;
    this.storage = new FsStorageAdapter(path);
  }

  public getDirectory(): string {
    return this.directory;
  }

  public getStorageAdapter(): FsStorageAdapter {
    return this.storage;
  }

  /**
   * Saves file data file.
   * Creates new uuid key, if this for a new file
   * @param path actual file path
   * @param fileData given fileData
   * @returns Fulfils with key upon success
   */
  public async save(path: string, fileData: FileData): Promise<string> {
    const { key: givenKey } = await this.load(path);
    const key = givenKey ?? buildKey();
    await this.storage.write(path, JSON.stringify({ ...fileData, key }), 'utf8');
    return key;
  }

  /**
   * Loads file data.
   * @param path The actual file path
   * @returns Fulfils with the FileData upon success, null object if file does not exist
   */
  public async load(path: string): Promise<FileData> {
    if (!(await this.fileExists(path))) {
      return { size: -1, md5: '', contentType: '' };
    }
    const data = await this.storage.read(path, 'utf8');
    return JSON.parse(data as string) as FileData;
  }

  /**
   * Copies data file.
   * If target file is new, new uuid key will be generated, otherwise old key of target file is used.
   * @param path The actual source path
   * @param targetPath The actual target path
   * @returns Fulfils with key upon success
   */
  public async copy(path: string, targetPath: string): Promise<string> {
    const fileData = await this.load(path);
    const { key: givenTargetKey } = await this.load(targetPath);
    const targetKey = givenTargetKey ?? buildKey();
    await this.storage.write(targetPath, JSON.stringify({ ...fileData, key: targetKey }), 'utf8');
    return targetKey;
  }

  /**
   * Moves data file.
   * @param path The actual source path
   * @param targetPath The actual target path
   * @returns Fulfils with undefined upon success
   */
  public async move(path: string, targetPath: string): Promise<void> {
    const resolvedMovePath = paths.join(this.directory, targetPath);
    await fse.ensureFile(resolvedMovePath);
    await fs.rename(paths.join(this.directory, path), resolvedMovePath);
  }

  /**
   * Deletes data file.
   * @param path The actual path
   * @returns Fulfils with undefined upon success
   */
  public async delete(path: string): Promise<void> {
    await this.storage.delete(path);
  }

  /**
   * Checks if a file exists.
   * @param path The actual path
   * @returns Fulfils with boolean upon success, true if it exists and is a file
   */
  public async fileExists(path: string): Promise<boolean> {
    const resolvedPath = paths.join(this.directory, path);
    if (!existsSync(resolvedPath)) {
      return false;
    }
    const stats = await fs.stat(resolvedPath);
    return stats.isFile();
  }

  /**
   * Checks if a directory exists.
   * @param path The actual path
   * @returns Fulfils with boolean upon success, true if it exists and is a directory
   */
  public async directoryExists(path: string): Promise<boolean> {
    await fse.ensureDir(this.directory);
    const resolvedPath = paths.join(this.directory, path);
    if (!existsSync(resolvedPath)) {
      return false;
    }
    const stats = await fs.stat(resolvedPath);
    return stats.isDirectory();
  }

  /**
   * Lists the contents of a directory
   * @param path The actual path to the directory
   * @returns Fulfils with an array of items upon success, sorted, directories first, directories suffixed by a slash
   */
  public async list(path: string): Promise<string[]> {
    await fse.ensureDir(this.directory);
    const resolvedPath = paths.join(this.directory, path);
    const items = await fs.readdir(resolvedPath);
    const directories: string[] = [];
    const files: string[] = [];
    for (const item of items) {
      const stat = await fs.stat(`${resolvedPath}/${item}`);
      if (stat.isDirectory()) {
        directories.push(`${item}/`);
      }
      if (stat.isFile()) {
        files.push(item);
      }
    }
    return [...directories.sort(), ...files.sort()];
  }
}

export { DataAndStructureStorage };
