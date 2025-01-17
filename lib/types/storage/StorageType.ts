import FileData from '@/types/storage/FileData';

/**
 * Handles all actions to save, load and manage files and their data.
 */
interface StorageType {
  /**
   * Saves a file and it's data.
   * @param path The path of the file to save
   * @param content The content of the file
   * @param data The data of the file
   */
  save(path: string, content: Buffer, data: FileData): Promise<void>;

  /**
   * Loads a file and it's data.
   * @param path The path of the file to load
   * @returns Promise fulfilling with an array, first item is the content, seconds item is the data.
   */
  load(path: string): Promise<[Buffer, FileData]>;

  /**
   * Deletes a file and it's data.
   * @param path The path of the file to delete
   */
  delete(path: string): Promise<void>;

  /**
   * Copies a file and it's data.
   * @param path The path of the file to copy
   * @param copyPath The path of the copy target
   * @param [owner] (Optional) The new owner. The file keeps it's owner if no new owner is given.
   */
  copy(path: string, copyPath: string, owner?: string): Promise<void>;

  /**
   * Moves a file and it's data.
   * @param path The path of the file to move
   * @param movePath The path of the move target
   * @param [owner] (Optional) The new owner. The file keeps it's owner if no new owner is given.
   */
  move(path: string, movePath: string, owner?: string): Promise<void>;

  /**
   * Loads data of a file.
   * @param path The path of the file to load data from
   * @returns Promise fulfilling with the file data
   */
  loadData(path: string): Promise<FileData>;

  /**
   * Sets data of a file.
   * @param path The path of the file to set data to
   * @param data The data to set
   */
  setData(path: string, data: FileData): Promise<void>;

  /**
   * Checks if a file exists.
   * @param path The path of the file to check
   * @returns Promise fulfilling with a boolean, true if the file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Checks if path resolves to a file.
   * @param path The path to check for
   * @returns Promise fulfilling with a boolean, true if it is a file
   */
  isFile(path: string): Promise<boolean>;

  /**
   * Checks if path resolves to a directory.
   * @param path The path to check for
   * @returns Promise fulfilling with a boolean, true if it is a directory
   */
  isDirectory(path: string): Promise<boolean>;

  /**
   * Lists the names of directories and files in a directory.
   * The names will be sorted alphabetically, directories first.
   * Directory names will be suffixed with a trailing slash.
   * @param path The path of the directory
   * @returns Promise fulfilling with an array, one item for each file or directory name
   */
  list(path: string): Promise<string[]>;
}

export default StorageType;
