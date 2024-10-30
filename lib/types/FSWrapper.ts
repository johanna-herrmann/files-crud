interface FSWrapper {
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
   * Checks if a file or S3 Object exists with the specified path or key.
   * @param name The filename
   * @returns Fulfils with boolean upon success, determining if the specified item exists
   */
  exists: (name: string) => Promise<boolean>;
}

export default FSWrapper;
