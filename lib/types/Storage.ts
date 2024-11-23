interface Storage {
  /**
   * Writes a file or creates an S3 object
   * @param name The filename
   * @param data File content / Object body
   * @param encoding Encoding if `data` is a string
   * @returns Fulfils with undefined upon success
   */
  writeFile: (name: string, data: string | Buffer, encoding?: BufferEncoding) => Promise<void>;

  /**
   * Reads a file or gets an S3 object's body
   * @param name The filename
   * @param encoding Encoding if file content / object body should be encoded to a string
   * @returns Fulfils with the result (Buffer or string) upon success
   */
  readFile: (name: string, encoding?: BufferEncoding) => Promise<Buffer | string>;

  /**
   * Deletes a file or removes a S3 Object
   * @param name The filename
   * @returns Fulfils with undefined upon success
   */
  unlink: (name: string) => Promise<void>;

  /**
   * Copies file or s3 objecz.
   * @param name The name of the file or the key of the object to copy
   * @param copyName The name or key of the copy
   * @returns Fulfils with undefined upon success
   */
  copyFile: (name: string, copyName: string) => Promise<void>;
}

export default Storage;
