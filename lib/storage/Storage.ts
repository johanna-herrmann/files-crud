import { getConfig } from '@/config';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';
import { S3StorageAdapter } from '@/storage/s3/S3StorageAdapter';
import FileData from '@/types/FileData';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import StorageType from '@/types/StorageType';

const sanitizePath = function (path: string): string {
  return path
    .replace(/(^\.+|\.+$)/gu, '')
    .replace(/\/\.+/gu, '/')
    .replace(/\.+\//gu, '/')
    .replace(/(^\/+|\/+$)/gu, '')
    .replace(/\/\/+/gu, '/');
};

const removeTildeFromPath = function (path: string): string {
  return path.replace(/~/gu, '-');
};

class Storage implements StorageType {
  private readonly storageType: 'fs' | 's3';
  private readonly directory: string;
  private readonly dataStorage: FsStorageAdapter;
  private readonly contentStorage: FsStorageAdapter | S3StorageAdapter;

  public constructor() {
    const config = getConfig();
    const directory = config.storage?.path ?? config.path ?? 'opt/files-crud';
    this.directory = `/${sanitizePath(directory)}`;
    this.storageType = config.storage?.name ?? 'fs';
    this.dataStorage = new FsStorageAdapter(this.directory);
    this.contentStorage = this.storageType === 's3' ? new S3StorageAdapter() : new FsStorageAdapter(`${this.directory}/files`);
  }

  private getPathKey(path: string): string {
    return path.replace(/\//gu, '~');
  }

  private resolvePath(path: string, sub: string): string {
    return `${sub}/${sanitizePath(path)}`;
  }

  private resolveContentPath(path: string): string {
    return this.resolvePath(removeTildeFromPath(path), 'files');
  }

  private resolveDataPath(path: string): string {
    return this.resolvePath(this.getPathKey(removeTildeFromPath(path)), 'data');
  }

  public getConf(): ['fs' | 's3', string, FsStorageAdapter, FsStorageAdapter | S3StorageAdapter] {
    return [this.storageType, this.directory, this.dataStorage, this.contentStorage];
  }

  public async save(path: string, content: string | Buffer, data: FileData, encoding?: BufferEncoding): Promise<void> {
    await this.setData(path, data);
    await this.dataStorage.write(this.resolveContentPath(path), '', 'utf8');
    return await this.contentStorage.write(sanitizePath(path), content, encoding);
  }

  public async load(path: string, encoding?: BufferEncoding): Promise<[string | Buffer, FileData]> {
    const data = await this.loadData(path);
    const content = await this.contentStorage.read(sanitizePath(path), encoding);
    return [content ?? '', data];
  }

  public async delete(path: string): Promise<void> {
    await this.contentStorage.delete(sanitizePath(path));
    await this.dataStorage.delete(this.resolveDataPath(path));
    const resolvedContentPath = this.resolveContentPath(path);
    if (await this.exists(resolvedContentPath)) {
      await this.dataStorage.delete(resolvedContentPath);
    }
  }

  public async copy(path: string, copyPath: string, owner?: string): Promise<void> {
    await this.dataStorage.copy(this.resolveDataPath(path), this.resolveDataPath(copyPath));
    await this.dataStorage.copy(this.resolveContentPath(path), this.resolveContentPath(copyPath));
    await this.contentStorage.copy(sanitizePath(path), sanitizePath(copyPath));
    if (!!owner) {
      const data = await this.loadData(copyPath);
      data.owner = owner;
      await this.setData(copyPath, data);
    }
  }

  public async move(path: string, movePath: string, owner?: string): Promise<void> {
    await this.copy(path, movePath, owner);
    await this.delete(path);
  }

  public async loadData(path: string): Promise<FileData> {
    const data = await this.dataStorage.read(this.resolveDataPath(path), 'utf8');
    return JSON.parse(data as string) as FileData;
  }

  public async setData(path: string, data: FileData): Promise<void> {
    await this.dataStorage.write(this.resolveDataPath(path), JSON.stringify(data), 'utf8');
  }

  public async exists(path: string): Promise<boolean> {
    return existsSync(`${this.directory}/${this.resolveContentPath(path)}`);
  }

  public async list(path: string): Promise<string[]> {
    const resolvedPath = `${this.directory}/${this.resolveContentPath(path)}`;
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

export { Storage };
