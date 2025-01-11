import Request from '@/types/server/Request';
import express from 'express';
import { sendError, sendOK, sendUnauthorized } from '@/server/util';
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
import { loadLogger } from '@/logging';

const registerHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, password, meta } = body;

  const result = await register(username as string, password as string, (meta ?? {}) as Record<string, unknown>);

  if (result === userAlreadyExists) {
    return sendError(res, `User ${username} exists already`);
  }

  logger.info('Successfully registered user.', { username });
  sendOK(res, { username });
};

const addUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, password, meta, admin } = body;

  const added = await addUser(username as string, password as string, admin as boolean, (meta ?? {}) as Record<string, unknown>);

  if (!added) {
    return sendError(res, `User ${username} exists already`);
  }

  logger.info('Successfully added user.', { username, admin });
  sendOK(res, { username });
};

const changeUsernameHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, newUsername } = body;

  const result = await changeUsername(username as string, newUsername as string);

  if (result === userAlreadyExists) {
    return sendError(res, `There is always a user with name ${newUsername}`);
  }

  logger.info('Successfully changed username.', { username, newUsername });
  sendOK(res, { username: newUsername });
};

const setAdminStateHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, admin } = body;

  await setAdminState(username as string, admin as boolean);

  logger.info('Successfully set admin state.', { username, admin });
  sendOK(res);
};

const saveMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const username = (req.params as Record<string, unknown>).username;
  const { meta } = body;

  await saveMeta(username as string, (meta ?? {}) as Record<string, unknown>);

  logger.info('Successfully saved user meta data.', { username, meta });
  sendOK(res);
};

const changePasswordHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, newPassword } = body;

  await changePassword(username as string, newPassword as string);

  logger.info('Successfully changed password.', { username });
  sendOK(res);
};

const deleteUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const username = (req.params as Record<string, unknown>).username;

  await deleteUser(username as string);

  logger.info('Successfully removed user.', { username });
  sendOK(res);
};

const loadMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const username = (req.params as Record<string, unknown>).username;

  const meta = await loadMeta(username as string);

  logger.info('Successfully loaded user meta data.', { username, meta });
  sendOK(res, { meta });
};

const getUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const username = (req.params as Record<string, unknown>).username;

  const user = await getUser(username as string);

  logger.info('Successfully loaded user.', { username });
  sendOK(res, { user });
};

const getUsersHandler = async function (_: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const users = await getUsers();

  logger.info('Successfully loaded list of users.');
  logger.debug('Loaded following users.', { users });
  sendOK(res, { users });
};

const loginHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, password } = body;

  const tokenOrError = await login(username as string, password as string);

  if (tokenOrError === attemptsExceeded) {
    return sendUnauthorized(res, `Login attempts exceeded for username ${username}`);
  }

  if (tokenOrError === invalidCredentials) {
    return sendUnauthorized(res, 'invalid credentials provided');
  }

  logger.info('Successfully logged in user.', { username });
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
