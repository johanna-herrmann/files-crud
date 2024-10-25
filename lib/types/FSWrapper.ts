interface FSWrapper {
  /**
   * Writes a file or creates an S3 object
   * @param path Path to the file or key of the S3 object to write/create
   * @param data File content / Object body
   * @param encoding Encoding if `data` is a string
   * @returns Fulfils with undefined upon success
   */
  writeFile: (path: string, data: string | Buffer, encoding?: BufferEncoding) => Promise<void>;

  /**
   * Reads a file or gets an S3 object's body
   * @param path Path to the file or key of the S3 object to read/get
   * @param encoding Encoding if file content / object body should be encoded to a string
   * @returns Fulfils with the result (Buffer or string) upon success
   */
  readFile: (path: string, encoding?: BufferEncoding) => Promise<Buffer | string>;

  /**
   * Creates a directory on path `path` or a S3 object with key `path`/.directory
   * @param path Path to the directory or S3 object
   * @returns Fulfils with undefined upon success
   */
  mkdir: (path: string) => Promise<void>;

  /**
   * Lists the contents of a directory (when S3 is used: first-level objects with keys beginning with `path`)
   * @param path Path to the directory
   * @returns Fulfils with an arrays of contents (strings; local: file/directory names; S3: last part of key) upon success
   */
  readdir: (path: string) => Promise<string[]>;

  /**
   * Copies a file or re-created a S3 object
   * @param from Path or object key of the file/object to copy from
   * @param to Path or object key of the file/object to copy to
   * @returns Fulfils with undefined upon success
   */
  copyFile: (from: string, to: string) => Promise<void>;

  /**
   * Deletes a file or removes a S3 Object
   * @param path Path to the file or object key of the object to delete
   * @returns Fulfils with undefined upon success
   */
  unlink: (path: string) => Promise<void>;

  /**
   * Deletes an empty directory
   * or removes a S3 Object with key `path`/.directory if no other objects with `path`/... keys exist.
   * @param path Path to the directory or object key path to delete
   * @returns Fulfils with undefined upon success
   */
  rmdir: (path: string) => Promise<void>;

  /**
   * Deletes an entire directory
   * or removes all S3 Object with keys beginning with `path`/.
   * @param path Path to the directory or object key path to delete entirely
   * @returns Fulfils with undefined upon success
   */
  rmRf: (path: string) => Promise<void>;

  /**
   * Renames a file/directory or changes a S3 Object key
   * @param from Path to the file/directory to rename or object key to change
   * @param to New path or new key
   * @returns Fulfils with undefined upon success
   */
  rename: (from: string, to: string) => Promise<void>;

  /**
   * Checks if a file or directory or a S3 Object exists with the specified path or key.
   * If S3 is used the existence is checked with `path` and `path`/.directory
   * @param path Path to the file/directory or S3 object key/path
   * @returns Fulfils with boolean upon success, determining if the specified item exists
   */
  exists: (path: string) => Promise<boolean>;

  /**
   * Checks if a file or a S3 Object exists with the specified path or key.
   * @param path Path to the file or S3 object key
   * @returns Fulfils with boolean upon success, determining if the specified item exists and is a file
   */
  isFile: (path: string) => Promise<boolean>;

  /**
   * Checks if a directory or a S3 Object path exists with the specified path or key.
   * On S3 the following key is checked: `path`/.directory
   * @param path Path to the directory or S3 object key path
   * @returns Fulfils with boolean upon success, determining if the specified item exists and is a directory
   */
  isDirectory: (path: string) => Promise<boolean>;
}

export default FSWrapper;
