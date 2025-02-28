import paths from 'path';
import { getFullConfig } from '@/config/config';
import { getLogger } from '@/logging';
import { FsStorageAdapter } from '@/storage/fs/FsStorageAdapter';
import { S3StorageAdapter } from '@/storage/s3/S3StorageAdapter';
import DataAndStructureStorage from '@/storage/fs/DataAndStructureStorage';
import FileData from '@/types/storage/FileData';

class Storage {
  private readonly storageType: 'fs' | 's3';
  private readonly directory: string;
  private readonly dataStorage: DataAndStructureStorage;
  private readonly contentStorage: FsStorageAdapter | S3StorageAdapter;

  public constructor() {
    const config = getFullConfig();
    const logger = getLogger();
    logger?.info('Loading storage', { store: config.storage?.name as string });
    const directory = paths.resolve(config.storage?.path as string);
    this.directory = paths.resolve(paths.sep, directory);
    this.storageType = config.storage?.name as 'fs' | 's3';
    this.dataStorage = new DataAndStructureStorage(paths.join(this.directory, 'data'));
    this.contentStorage = this.storageType === 's3' ? new S3StorageAdapter() : new FsStorageAdapter(paths.join(this.directory, 'files'));
    logger?.info('Successfully loaded storage');
  }

  public getConf(): ['fs' | 's3', string, DataAndStructureStorage, FsStorageAdapter | S3StorageAdapter] {
    return [this.storageType, this.directory, this.dataStorage, this.contentStorage];
  }

  /**
   * Saves a file and it's data.
   * @param path The path of the file to save
   * @param content The content of the file
   * @param data The data of the file
   */
  public async save(path: string, content: Buffer, data: FileData): Promise<void> {
    const key = await this.dataStorage.save(path, data);
    return await this.contentStorage.write(key, content);
  }

  /**
   * Loads a file and it's data.
   * @param path The path of the file to load
   * @returns Promise fulfilling with an array, first item is the content, seconds item is the data.
   */
  public async load(path: string): Promise<[Buffer, FileData]> {
    const data = await this.dataStorage.load(path);
    const content = await this.contentStorage.read(data.key as string);
    return [(content as Buffer) ?? Buffer.from(''), data];
  }

  /**
   * Deletes a file and it's data.
   * @param path The path of the file to delete
   */
  public async delete(path: string): Promise<void> {
    const { key } = await this.loadData(path);
    await this.dataStorage.delete(path);
    await this.contentStorage.delete(key as string);
  }

  /**
   * Copies a file and it's data.
   * @param path The path of the file to copy
   * @param copyPath The path of the copy target
   * @param [owner] (Optional) The new owner. The target file gets the source file's owner if no new owner is given.
   */
  public async copy(path: string, copyPath: string, owner?: string): Promise<void> {
    const data = await this.loadData(path);
    const targetKey = await this.dataStorage.copy(path, copyPath);
    await this.contentStorage.copy(data.key as string, targetKey);

    if (!!owner) {
      await this.dataStorage.save(copyPath, { ...data, key: targetKey, owner });
    }
  }

  /**
   * Moves a file and it's data.
   * @param path The path of the file to move
   * @param movePath The path of the move target
   */
  public async move(path: string, movePath: string): Promise<void> {
    await this.dataStorage.move(path, movePath);
  }

  /**
   * Loads data of a file.
   * @param path The path of the file to load data from
   * @returns Promise fulfilling with the file data
   */
  public async loadData(path: string): Promise<FileData> {
    return await this.dataStorage.load(path);
  }

  /**
   * Saves data for a file.
   * @param path The path of the file to save the data for
   * @param data The data to save
   */
  public async saveData(path: string, data: FileData): Promise<void> {
    await this.dataStorage.save(path, data);
  }

  /**
   * Checks if a file exists.
   * @param path The actual path
   * @returns Fulfils with boolean upon success, true if it exists and is a file
   */
  public async fileExists(path: string): Promise<boolean> {
    return await this.dataStorage.fileExists(path);
  }

  /**
   * Checks if a directory exists.
   * @param path The actual path
   * @returns Fulfils with boolean upon success, true if it exists and is a directory
   */
  public async directoryExists(path: string): Promise<boolean> {
    return await this.dataStorage.directoryExists(path);
  }

  /**
   * Lists the contents of a directory
   * @param path The actual path to the directory
   * @returns Fulfils with an array of items upon success, sorted, directories first, directories suffixed by a slash
   */
  public async list(path: string): Promise<string[]> {
    return this.dataStorage.list(path);
  }
}

export { Storage };
