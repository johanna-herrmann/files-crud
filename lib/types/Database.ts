import User from './User';
import File from './File';

interface Database {
  /**
   * Opens the database connection and does initialization steps if needed
   * @returns Fulfils with undefined upon success
   */
  open: () => Promise<void>;

  /**
   * Closes the database connection
   * @returns Fulfils with undefined upon success
   */
  close: () => Promise<void>;

  /**
   * Saves new user
   * @param user - the user to save
   * @returns Fulfils with undefined upon success
   */
  addUser: (user: User) => Promise<void>;

  /**
   * Changes the username
   * @param oldUsername - the current username
   * @param newUsername - the new username
   * @returns Fulfils with undefined upon success
   */
  changeUsername: (oldUsername: string, newUsername: string) => Promise<void>;

  /**
   * Updates the hash properties
   * @param username - the username of the user to update the hash properties of
   * @param hashVersion - new hashVersion
   * @param salt - new salt
   * @param hash - the salt
   * @returns Fulfils with undefined upon success
   */
  updateHash: (username: string, hashVersion: string, salt: string, hash: string) => Promise<void>;

  /**
   * Makes the user to be an admin
   * @param username the username of the user to make to an admin
   * @returns Fulfils with undefined upon success
   */
  makeUserAdmin: (username: string) => Promise<void>;

  /**
   * Makes the user to be a normal user (non-admin-user)
   * @param username the username of the user to make to a normal user
   * @returns Fulfils with undefined upon success
   */
  makeUserNormalUser: (username: string) => Promise<void>;

  /**
   * Modifies the user's meta data
   * @param username the username of the user to modify the meta data of
   * @param meta - new meta data object
   * @returns Fulfils with undefined upon success
   */
  modifyUserMeta: (username: string, meta?: Record<string, unknown>) => Promise<void>;

  /**
   * Removes the user - This is irreversible
   * @param username - the username of the user to remove
   * @returns Fulfils with undefined upon success
   */
  removeUser: (username: string) => Promise<void>;

  /**
   * Gets the user with the given username
   * @param username - username of the user to get
   * @returns Fulfils with User or null upon success, null if the user does not exist
   */
  getUser: (username: string) => Promise<User | null>;

  /**
   * Checks if an user exists with the given username
   * @param username - username of the user to check existence for
   * @returns Fulfils with boolean upon success, true if user exists
   */
  userExists: (username: string) => Promise<boolean>;

  /**
   * Adds new keys used for JWTs
   * @param keys array of keys (strings) to save
   * @returns Fulfils with undefined upon success
   */
  addJwtKeys: (...keys: string[]) => Promise<void>;

  /**
   * Gets all keys as string array
   * @returns Fulfils with string array upon success, one string item per key
   */
  getJwtKeys: () => Promise<string[]>;

  /**
   * Counts a failes login attempt.
   * Creates new dataset or updates an existing one.
   * @param username - the username to count the attempt for
   * @returns Fulfils with undefined upon success
   */
  countLoginAttempt: (username: string) => Promise<void>;

  /**
   * Gets the attempts count for the username
   * @param username - username to get the count for
   * @returns Fulfils with number upon success, amount of attempts since last reset (removeLoginAttempts)
   */
  getLoginAttempts: (username: string) => Promise<number>;

  /**
   * Removes the login attempt counting dataset for the given username
   * @param username - username to delete the counting dataset for
   * @returns Fulfils with undefined upon success
   */
  removeLoginAttempts: (username: string) => Promise<void>;

  /**
   * Saves new file dataset
   * @param file - the file to save
   * @returns Fulfils with undefined upon success
   */
  addFile: (file: File) => Promise<void>;

  /**
   * Changes the path for a file. Optionally also changing the owner
   * @param oldPath - the current path (to find the file dataset)
   * @param newPath - the new path
   * @param owner - optional - if given, the value is used as new owner
   * @returns Fulfils with undefined upon success
   */
  moveFile: (oldPath: string, newPath: string, owner?: string) => Promise<void>;

  /**
   * modifies the meta data object of a file dataset
   * @param path - the path of the file
   * @param meta - the new meta data object
   * @returns Fulfils with undefined upon success
   */
  modifyFileMeta: (path: string, meta?: Record<string, unknown>) => Promise<void>;

  /**
   * Removes the file dataset - This is irreversible
   * @param path - the path of the file dataset to remove
   * @returns Fulfils with undefined upon success
   */
  removeFile: (path: string) => Promise<void>;

  /**
   * Gets the file dataset with the given path
   * @param path - path of the file dataset to get
   * @returns Fulfils with File or null upon success, null if the file dataset does not exist
   */
  getFile: (path: string) => Promise<File | null>;

  /**
   * lists all files (paths) into the given folder
   * @param folder - the path of the folder to lists the files in
   * @returns Fulfils with string array upon success, one string item per filename
   */
  listFilesInFolder: (folder: string) => Promise<string[]>;

  /**
   * Checks if a file dataset exists with the given path
   * @param path - path of the file to check existence for
   * @returns Fulfils with boolean upon success, true if file exists
   */
  fileExists: (path: string) => Promise<boolean>;
}

export default Database;
