import Request from '@/types/server/Request';
import express from 'express';
import { sendError, sendOK } from '@/server/util';
import {
  addUser,
  changePassword,
  changeUsername,
  deleteUser,
  saveMeta,
  loadMeta,
  getUser,
  getUsers,
  register,
  setAdminState,
  login,
  userAlreadyExists,
  attemptsExceeded,
  invalidCredentials
} from '@/user';

const registerHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const { username, password, meta } = body;

  const result = await register(username as string, password as string, (meta ?? {}) as Record<string, unknown>);

  if (result === userAlreadyExists) {
    return sendError(res, `User ${username} exists already`);
  }

  sendOK(res, { username });
};

const addUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const { username, password, meta, admin } = body;

  const added = await addUser(username as string, password as string, admin as boolean, (meta ?? {}) as Record<string, unknown>);

  if (!added) {
    return sendError(res, `User ${username} exists already`);
  }

  sendOK(res, { username });
};

const changeUsernameHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const { username, newUsername } = body;

  const result = await changeUsername(username as string, newUsername as string);

  if (result === userAlreadyExists) {
    return sendError(res, `There is always a user with name ${newUsername}`);
  }

  sendOK(res, { username: newUsername });
};

const setAdminStateHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const { username, admin } = body;

  await setAdminState(username as string, admin as boolean);

  sendOK(res);
};

const saveMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const username = (req.params as Record<string, unknown>).username;
  const { meta } = body;

  await saveMeta(username as string, (meta ?? {}) as Record<string, unknown>);

  sendOK(res);
};

const changePasswordHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const { username, newPassword } = body;

  await changePassword(username as string, newPassword as string);

  sendOK(res);
};

const deleteUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const username = (req.params as Record<string, unknown>).username;

  await deleteUser(username as string);

  sendOK(res);
};

const loadMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const username = (req.params as Record<string, unknown>).username;

  const meta = await loadMeta(username as string);

  sendOK(res, { meta });
};

const getUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const username = (req.params as Record<string, unknown>).username;

  const user = await getUser(username as string);

  sendOK(res, { user });
};

const getUsersHandler = async function (_: Request, res: express.Response): Promise<void> {
  const users = await getUsers();

  sendOK(res, { users });
};

const loginHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const { username, password } = body;

  const tokenOrError = await login(username as string, password as string);

  if (tokenOrError === attemptsExceeded) {
    return sendError(res, `Login attempts exceeded for username ${username}`);
  }

  if (tokenOrError === invalidCredentials) {
    return sendError(res, 'invalid credentials provided');
  }

  sendOK(res, { token: tokenOrError });
};

export {
  registerHandler,
  addUserHandler,
  changeUsernameHandler,
  changePasswordHandler,
  setAdminStateHandler,
  saveMetaHandler,
  loadMetaHandler,
  getUserHandler,
  getUsersHandler,
  deleteUserHandler,
  loginHandler
};
