import BufferEncoding from './BufferEncoding';

/**
 * Interface for both StorageHandlers; LocalStorageHandler and S3StorageHandler
 */
interface StorageHandler {
  /**
   * Writes data to a file specified by path (creates file if necessary).
   * @param path Path to the file
   * @param data Data to write
   * @param encoding If data is a string, encoding defines, how to decode the string into a buffer.
   * @returns Promise of type void
   */
  writeFile: (path: string, data: string | NodeJS.ArrayBufferView, encoding?: BufferEncoding) => Promise<void>;

  /**
   * Reads the data of a file specified via path.
   * @param path Path to the file
   * @param encoding If specified, the data will be encoded to a string, using the specified encoding.
   * @returns Promise of type: string or Buffer
   * @throws FileDoesNotExistError if `path` does not exist or is not a file
   */
  readFile: (path: string, encoding?: BufferEncoding) => Promise<string | Buffer>;

  /**
   * Creates a directory with the specified path.
   * If S3Storage is used, a file `path`/.directory will be created,
   * since directories and files simply doesn't exist on S3 Buckets, but object IDs can have slashes, representing paths.
   * @param path New directory Path
   * @param recursive If true, parent directories will also be created if necessary
   * @returns Promise of type void
   * @throws DirectoryDoesNotExistError if parent of `path` does not exist (except: `recursive` is true) or is not directory
   */
  createDirectory: (path: string, recursive?: boolean) => Promise<void>;

  /**
   * Lists the files and directories of a directory, specified via path.
   * If S3Storage is used, the .directory file will be ommited in the listing, even if `hidden` is true.
   * The items will be sorted alphabetically, but directories before files.
   * Directories will be listed with a trailing slash
   * @param path Path to the directory
   * @param hidden If true, hidden files/directories (name starts with a dot) will be included in the listing.
   * @returns Promise fulfilling with the listing (string array with the file/directory names)
   * @throws DirectoryDoesNotExistError if `path` does not exist or is not a directory
   */
  listDirectory: (path: string, hidden?: boolean) => Promise<string[]>;

  /**
   * Copies a file.
   * @param from Path to the source file
   * @param to Path to the target file
   * @param overwrite If true, already existing target file will be overwritten, if false an exception is thrown instead.
   * @returns Promise of type void
   */
  copyFile: (from: string, to: string, overwrite?: boolean) => Promise<void>;

  /**
   * Copies a directory.
   * @param from Path to the source directory
   * @param to Path to the target directory
   * @param recursive If true, sub-directories will be copied, too, recursiveley.
   * @param overwrite If true, already existing files will be overwritten, if false an exception is thrown instead.
   * @returns Promise of type void
   */
  copyDirectory: (from: string, to: string, recursive?: boolean, overwrite?: boolean) => Promise<void>;

  /**
   * Deletes a file specified via path.
   * @param path Path to the file to delete
   * @returns Promise of type void
   */
  deleteFile: (path: string) => Promise<void>;

  /**
   * Deletes a directory specified via path.
   * @param path Path to the directory to delete
   * @param force If true, directories wil be deleted, empty or not; If false, error is thrown if directory is not empty
   * @returns Promise of type void
   */
  deleteDirectory: (path: string, force?: boolean) => Promise<void>;

  /**
   * Renames a file or directory, specified from oldPath to newPath.
   * @param oldPath Path to the file/directory to rename
   * @param newPath Path to the file/directory with new name
   * @returns Promise of type void
   */
  rename: (oldPath: string, newPath: string) => Promise<void>;

  /**
   * Checks if the file/directory with the specified path exists.
   * @param path Path to the file/directory to check
   * @returns true if and only if the file/directory with the specified `path` exists.
   */
  exists: (path: string) => Promise<boolean>;
}

export default StorageHandler;
