import { User } from '../user/User';
import { FailedLoginAttempts } from '../user/FailedLoginAttempts';
import { UserListItem } from '../user/UserListItem';
import { JwtKey } from '../user/JwtKey';

interface DatabaseType {
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
   * @param id The id of the user to rename
   * @param username The new username
   */
  changeUsername: (id: string, username: string) => Promise<void>;

  /**
   * Updates the hash properties
   * @param id The id of the user to update the hash of
   * @param hashVersion - new hashVersion
   * @param salt - new salt
   * @param hash - the salt
   */
  updateHash: (id: string, hashVersion: string, salt: string, hash: string) => Promise<void>;

  /**
   * Makes the user to be an admin
   * @param id the id of the user to make to an admin
   */
  makeUserAdmin: (id: string) => Promise<void>;

  /**
   * Makes the user to be a normal user (non-admin-user)
   * @param id the id of the user to make to a normal user
   */
  makeUserNormalUser: (id: string) => Promise<void>;

  /**
   * Modifies the user's metadata
   * @param id the id of the user to modify the metadata of
   * @param meta - new metadata object
   */
  modifyUserMeta: (id: string, meta: Record<string, unknown>) => Promise<void>;

  /**
   * Removes the user - This is irreversible
   * @param id - the id of the user to remove
   */
  removeUser: (id: string) => Promise<void>;

  /**
   * Gets the user with the given id
   * @param id - id of the user to get
   * @returns Promise fulfilling with user object or null
   */
  getUserById: (id: string) => Promise<User | null>;

  /**
   * Gets the user with the given username
   * @param username - username of the user to get
   * @returns Promise fulfilling with user object or null
   */
  getUserByUsername: (username: string) => Promise<User | null>;

  /**
   * Gets all users (simplified to username and admin state)
   * @returns Promise fulfilling with array of `userListItem`s
   */
  getUsers: () => Promise<UserListItem[]>;

  /**
   * Checks if a user exists with the given id
   * @param id - id of the user to check existence for
   * @returns Promise fulfilling with boolean, true if user exists
   */
  userExistsById: (id: string) => Promise<boolean>;

  /**
   * Checks if a user exists with the given username
   * @param username - username of the user to check existence for
   * @returns Promise fulfilling with boolean, true if user exists
   */
  userExistsByUsername: (username: string) => Promise<boolean>;

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
}

export { DatabaseType };
