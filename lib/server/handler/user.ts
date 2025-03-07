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
import { getExpiresAt } from '@/user/jwt';
import { Request } from '@/types/server/Request';

const registerHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { username, password, meta } = body;

  const result = await register(username as string, password as string, (meta ?? {}) as Record<string, unknown>);

  if (result === userAlreadyExists) {
    return sendError(res, `User ${username} exists already`);
  }

  logger.info('Successfully registered user.', { username });

  if ((password as string).length < 10) {
    logger.warn('Password is a bit short. Consider password rules implementation.', { length: (password as string).length });
  }

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

  if ((password as string).length < 10) {
    logger.warn('Password is a bit short. Consider password rules implementation.', { length: (password as string).length });
  }

  sendOK(res, { username });
};

const changeUsernameHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { id, newUsername } = body;

  const result = await changeUsername(id as string, newUsername as string);

  if (result === userAlreadyExists) {
    return sendError(res, `There is always a user with name ${newUsername}`);
  }

  logger.info('Successfully changed username.', { id, newUsername });
  sendOK(res, { username: newUsername });
};

const setAdminStateHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { id, admin } = body;

  await setAdminState(id as string, admin as boolean);

  logger.info('Successfully set admin state.', { id, admin });
  sendOK(res);
};

const saveMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const id = body.id ?? '';
  const { meta } = body;

  await saveMeta(id as string, (meta ?? {}) as Record<string, unknown>);

  logger.info('Successfully saved user meta data.', { id, meta });
  sendOK(res);
};

const changePasswordHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;
  const { id, newPassword } = body;

  await changePassword(id as string, newPassword as string);

  logger.info('Successfully changed password.', { id });

  if ((newPassword as string).length < 10) {
    logger.warn('Password is a bit short. Consider password rules implementation.', { length: (newPassword as string).length });
  }

  sendOK(res);
};

const deleteUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const id = req.body.id ?? '';

  await deleteUser(id as string);

  logger.info('Successfully removed user.', { id });
  sendOK(res);
};

const loadMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const id = req.body.id ?? '';

  const meta = await loadMeta(id as string);

  logger.info('Successfully loaded user meta data.', { id, meta });
  sendOK(res, { meta });
};

const getUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const id = req.body.id ?? '';

  const user = await getUser(id as string);

  if (!user) {
    sendError(res, `User with id ${id} does not exist.`);
  }

  logger.info('Successfully loaded user.', { username: user?.username });
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

  const expiresAt = getExpiresAt(tokenOrError);

  logger.info('Successfully logged in user.', { username });
  sendOK(res, { token: tokenOrError, expiresAt });
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
