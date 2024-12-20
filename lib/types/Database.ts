import User from './User';
import File from './File';
import FailedLoginAttempts from './FailedLoginAttempts';
import UserListItem from './UserListItem';
import JwtKey from './JwtKey';

interface Database {
  /**
   * Opens the database connection and does initialization steps if needed
   */
  open: () => Promise<void>;

  /**
   * Closes the database connection
   */
  close: () => Promise<void>;

  /**
   * Initializes all tables as needed.
   */
  init: () => Promise<void>;

  /**
   * Saves new user
   * @param user - the user to save
   */
  addUser: (user: User) => Promise<void>;

  /**
   * Changes the username
   * @param oldUsername The current username, used to identify the user
   * @param username The new username
   */
  changeUsername: (oldUsername: string, username: string) => Promise<void>;

  /**
   * Updates the hash properties
   * @param username - the username of the user to update the hash properties of
   * @param hashVersion - new hashVersion
   * @param salt - new salt
   * @param hash - the salt
   */
  updateHash: (username: string, hashVersion: string, salt: string, hash: string) => Promise<void>;

  /**
   * Makes the user to be an admin
   * @param username the username of the user to make to an admin
   */
  makeUserAdmin: (username: string) => Promise<void>;

  /**
   * Makes the user to be a normal user (non-admin-user)
   * @param username the username of the user to make to a normal user
   */
  makeUserNormalUser: (username: string) => Promise<void>;

  /**
   * Modifies the user's metadata
   * @param username the username of the user to modify the metadata of
   * @param meta - new metadata object
   */
  modifyUserMeta: (username: string, meta: Record<string, unknown>) => Promise<void>;

  /**
   * Removes the user - This is irreversible
   * @param username - the username of the user to remove
   */
  removeUser: (username: string) => Promise<void>;

  /**
   * Gets the user with the given username
   * @param username - username of the user to get
   * @returns Promise fulfilling with user object or null
   */
  getUser: (username: string) => Promise<User | null>;

  /**
   * Gets all users (simplified to username and admin state)
   * @returns Promise fulfilling with array of `userListItem`s
   */
  getUsers: (username: string) => Promise<UserListItem[]>;

  /**
   * Checks if a user exists with the given username
   * @param username - username of the user to check existence for
   * @returns Promise fulfilling with boolean, true if user exists
   */
  userExists: (username: string) => Promise<boolean>;

  /**
   * Adds new keys used for JWTs
   * @param keys array of keys (strings) to save
   */
  addJwtKeys: (...keys: string[]) => Promise<void>;

  /**
   * Gets all keys as string array
   * @returns Promise fulfilling with an array of all keys
   */
  getJwtKeys: () => Promise<JwtKey[]>;

  /**
   * Counts a failed login attempt.
   * Creates new dataset or updates an existing one.
   * @param username - the username to count the attempt for
   */
  countLoginAttempt: (username: string) => Promise<void>;

  /**
   * Updates the last attempt timestamp.
   * @param username - the username to update the timestamp for
   */
  updateLastLoginAttempt: (username: string) => Promise<void>;

  /**
   * Gets the attempts count for the username
   * @param username - username to get the count for
   * @returns Promise fulfilling with FailedLoginAttempts
   */
  getLoginAttempts: (username: string) => Promise<FailedLoginAttempts>;

  /**
   * Removes the login attempt counting dataset for the given username
   * @param username - username to delete the counting dataset for
   */
  removeLoginAttempts: (username: string) => Promise<void>;

  /**
   * Saves new file dataset
   * @param file - the file to save
   */
  addFile: (file: File) => Promise<void>;

  /**
   * Changes the path for a file. Optionally also changing the owner
   * @param oldPath - the current path (to find the file dataset)
   * @param path - the new path
   * @param owner - optional - if given, the value is used as new owner
   */
  moveFile: (oldPath: string, path: string, owner?: string) => Promise<void>;

  /**
   * modifies the metadata object of a file dataset
   * @param path - the path of the file
   * @param meta - the new metadata object
   */
  modifyFileMeta: (path: string, meta: Record<string, unknown>) => Promise<void>;

  /**
   * Removes the file dataset - This is irreversible
   * @param path - the path of the file dataset to remove
   */
  removeFile: (path: string) => Promise<void>;

  /**
   * Gets the file dataset with the given path
   * @param path - path of the file dataset to get
   * @returns Promise fulfilling with file or null
   */
  getFile: (path: string) => Promise<File | null>;

  /**
   * lists all files (paths) into the given folder
   * @param folder - the path of the folder to lists the files in
   * @returns Promise fulfilling with an array, one item for each file in folder
   */
  listFilesInFolder: (folder: string) => Promise<string[]>;

  /**
   * Checks if a file dataset exists with the given path
   * @param path - path of the file to check existence for
   * @returns Promise fulfilling with boolean, true if file exists
   */
  fileExists: (path: string) => Promise<boolean>;
}

export default Database;
