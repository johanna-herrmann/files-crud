interface StorageAdapter {
  /**
   * Writes a file or creates an S3 object
   * @param path The file path or s3 object key
   * @param data File content / Object body
   * @param encoding Encoding if `data` is a string
   */
  write(path: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void>;

  /**
   * Reads a file or gets an S3 object's body
   * @param path The file path or s3 object key
   * @param encoding Encoding if file content / object body should be encoded to a string
   * @returns Promise fulfilling with Buffer or encoded string
   */
  read(path: string, encoding?: BufferEncoding): Promise<Buffer | string>;

  /**
   * Deletes a file or removes a S3 Object
   * @param path The file path or s3 object key
   */
  delete(path: string): Promise<void>;

  /**
   * Copies file or s3 object.
   * @param path The file path or s3 object key to copy
   * @param copyPath The file path or s3 object key of the target
   * @returns Fulfils with undefined upon success
   */
  copy(path: string, copyPath: string): Promise<void>;
}

export { StorageAdapter };
