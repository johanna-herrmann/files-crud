import { loadDb } from '@/database';
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
  const exists = await db.userExistsByUsername(username);
  if (exists) {
    return false;
  }
  const id = v4();
  const hashVersion = current.version;
  const [salt, hash] = await current.hashPassword(password);
  const user = { id, username, hashVersion, salt, hash, admin, meta };
  await db.addUser(user);
  return true;
};

const addUser = async function (username: string, password: string, admin: boolean, meta: Record<string, unknown>): Promise<boolean> {
  const db = await loadDb();
  return await createAndSaveUser(db, username, password, admin, meta);
};

const register = async function (username: string, password: string, meta: Record<string, unknown>): Promise<string> {
  const db = await loadDb();
  const added = await createAndSaveUser(db, username, password, false, meta);
  if (!added) {
    return userAlreadyExists;
  }
  return '';
};

const changeUsername = async function (id: string, newUsername: string): Promise<string> {
  const db = await loadDb();
  const exists = await db.userExistsByUsername(newUsername);
  if (exists) {
    return userAlreadyExists;
  }
  await db.changeUsername(id, newUsername);
  return '';
};

const setAdminState = async function (id: string, admin: boolean): Promise<void> {
  const db = await loadDb();
  if (admin) {
    return await db.makeUserAdmin(id);
  }
  await db.makeUserNormalUser(id);
};

const saveMeta = async function (id: string, meta: Record<string, unknown>): Promise<void> {
  const db = await loadDb();
  await db.modifyUserMeta(id, meta);
};

const loadMeta = async function (id: string): Promise<Record<string, unknown>> {
  const db = await loadDb();
  const user = await db.getUserById(id);
  return user?.meta ?? {};
};

const getUser = async function (id: string): Promise<UserDto | null> {
  const db = await loadDb();
  const user = await db.getUserById(id);
  if (!user) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hashVersion, salt, hash, ...userDto } = user;
  return userDto;
};

const getUsers = async function (): Promise<UserListItem[]> {
  const db = await loadDb();
  return await db.getUsers();
};

const deleteUser = async function (id: string): Promise<void> {
  const db = await loadDb();
  await db.removeUser(id);
};

export { addUser, register, changeUsername, setAdminState, saveMeta, loadMeta, getUser, getUsers, deleteUser, userAlreadyExists };
