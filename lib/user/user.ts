import { closeDb, loadDb } from '@/database';
import Database from '@/types/database/Database';
import { v4 } from 'uuid';
import { current } from '@/user/passwordHashing/versions';
import UserListItem from '@/types/user/UserListItem';
import UserDto from '@/types/user/UserDto';

const userAlreadyExists = 'USER_ALREADY_EXISTS';

const createAndSaveUser = async function (
  db: Database,
  username: string,
  password: string,
  admin: boolean,
  meta: Record<string, unknown>
): Promise<boolean> {
  const exists = await db.userExists(username);
  if (exists) {
    return false;
  }
  const ownerId = v4();
  const hashVersion = current.version;
  const [salt, hash] = await current.hashPassword(password);
  const user = { username, hashVersion, salt, hash, ownerId, admin, meta };
  await db.addUser(user);
  return true;
};

const addUser = async function (username: string, password: string, admin: boolean, meta: Record<string, unknown>): Promise<boolean> {
  try {
    const db = await loadDb();
    return await createAndSaveUser(db, username, password, admin, meta);
  } finally {
    await closeDb();
  }
};

const register = async function (username: string, password: string, meta: Record<string, unknown>): Promise<string> {
  try {
    const db = await loadDb();
    const added = await createAndSaveUser(db, username, password, false, meta);
    if (!added) {
      return userAlreadyExists;
    }
  } finally {
    await closeDb();
  }
  return '';
};

const changeUsername = async function (oldUsername: string, newUsername: string): Promise<string> {
  try {
    const db = await loadDb();
    const exists = await db.userExists(newUsername);
    if (exists) {
      return userAlreadyExists;
    }
    await db.changeUsername(oldUsername, newUsername);
    return '';
  } finally {
    await closeDb();
  }
};

const setAdminState = async function (username: string, admin: boolean): Promise<void> {
  try {
    const db = await loadDb();
    if (admin) {
      return await db.makeUserAdmin(username);
    }
    await db.makeUserNormalUser(username);
  } finally {
    await closeDb();
  }
};

const saveMeta = async function (username: string, meta: Record<string, unknown>): Promise<void> {
  try {
    const db = await loadDb();
    await db.modifyUserMeta(username, meta);
  } finally {
    await closeDb();
  }
};

const loadMeta = async function (username: string): Promise<Record<string, unknown>> {
  try {
    const db = await loadDb();
    const user = await db.getUser(username);
    return user?.meta ?? {};
  } finally {
    await closeDb();
  }
};

const getUser = async function (username: string): Promise<UserDto | null> {
  try {
    const db = await loadDb();
    const user = await db.getUser(username);
    if (!user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashVersion, salt, hash, ...userDto } = user;
    return userDto;
  } finally {
    await closeDb();
  }
};

const getUsers = async function (): Promise<UserListItem[]> {
  try {
    const db = await loadDb();
    return await db.getUsers();
  } finally {
    await closeDb();
  }
};

const deleteUser = async function (username: string): Promise<void> {
  try {
    const db = await loadDb();
    await db.removeUser(username);
  } finally {
    await closeDb();
  }
};

export { addUser, register, changeUsername, setAdminState, saveMeta, loadMeta, getUser, getUsers, deleteUser, userAlreadyExists };
