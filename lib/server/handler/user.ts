import express from 'express';
import joi from 'joi';
import { sendOK, sendUnauthorized, sendError, sendValidationError } from '@/server/util';
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

const idConstraint = 'required string, uuid or "self"';
const usernameConstraint = 'required string, 3 to 64 chars long';
const passwordConstraint = 'required string, at least 8 chars long';
const metaConstraint = 'optional object';
const adminConstraint = 'optional boolean';
const requiredAdminConstraint = 'required boolean';

const registerHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;

  const bodySchema = joi.object({
    username: joi.string().min(3).max(64).required(),
    password: joi.string().min(8).required(),
    meta: joi.object({})
  });
  const error = bodySchema.validate(body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, { username: usernameConstraint, password: passwordConstraint, meta: metaConstraint }, body);
  }

  const { username, password, meta } = body;

  const result = await register(username as string, password as string, (meta ?? {}) as Record<string, unknown>);

  if (result === userAlreadyExists) {
    return sendError(res, `User ${username} exists already`);
  }

  logger.info('Successfully registered user.', { username });

  if ((password as string).length < 10) {
    logger.warn('Password is a bit short. Consider increasing password minimal length to 10.', { length: (password as string).length });
  }

  sendOK(res, { username });
};

const addUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;

  const bodySchema = joi.object({
    username: joi.string().min(3).max(64).required(),
    password: joi.string().min(8).required(),
    meta: joi.object({}),
    admin: joi.boolean()
  });
  const error = bodySchema.validate(body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(
      res,
      {
        username: usernameConstraint,
        password: passwordConstraint,
        meta: metaConstraint,
        admin: adminConstraint
      },
      body
    );
  }

  const { username, password, meta, admin } = body;

  const added = await addUser(username as string, password as string, admin as boolean, (meta ?? {}) as Record<string, unknown>);

  if (!added) {
    return sendError(res, `User ${username} exists already`);
  }

  logger.info('Successfully added user.', { username, admin });

  if ((password as string).length < 10) {
    logger.warn('Password is a bit short. Consider increasing password minimal length to 10.', { length: (password as string).length });
  }

  sendOK(res, { username });
};

const changeUsernameHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required(),
    newUsername: joi.string().min(3).max(64).required()
  });
  const error = bodySchema.validate(body, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint, newUsername: usernameConstraint }, body);
  }

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

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required(),
    admin: joi.boolean().required()
  });
  const error = bodySchema.validate(body, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint, admin: requiredAdminConstraint }, body);
  }

  const { id, admin } = body;

  await setAdminState(id as string, admin as boolean);

  logger.info('Successfully set admin state.', { id, admin });
  sendOK(res);
};

const saveMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required(),
    meta: joi.object({})
  });
  const error = bodySchema.validate(body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint, meta: metaConstraint }, body);
  }

  const id = body.id ?? '';
  const { meta } = body;

  await saveMeta(id as string, (meta ?? {}) as Record<string, unknown>);

  logger.info('Successfully saved user meta data.', { id, meta });
  sendOK(res);
};

const changePasswordHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const body = req.body;

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required(),
    newPassword: joi.string().min(8).required()
  });
  const error = bodySchema.validate(body, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint, newPassword: passwordConstraint }, body);
  }

  const { id, newPassword } = body;

  await changePassword(id as string, newPassword as string);

  logger.info('Successfully changed password.', { id });

  if ((newPassword as string).length < 10) {
    logger.warn('Password is a bit short. Consider increasing password minimal length to 10.', { length: (newPassword as string).length });
  }

  sendOK(res);
};

const deleteUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required()
  });
  const error = bodySchema.validate(req.body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint }, req.body);
  }

  const id = req.body.id ?? '';

  await deleteUser(id as string);

  logger.info('Successfully removed user.', { id });
  sendOK(res);
};

const loadMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required()
  });
  const error = bodySchema.validate(req.body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint }, req.body);
  }

  const id = req.body.id ?? '';

  const meta = await loadMeta(id as string);

  logger.info('Successfully loaded user meta data.', { id, meta });
  sendOK(res, { meta });
};

const getUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();

  const bodySchema = joi.object({
    id: joi.alternatives([joi.string().uuid(), 'self']).required()
  });
  const error = bodySchema.validate(req.body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, { id: idConstraint }, req.body);
  }

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

  const bodySchema = joi.object({
    username: joi.string().min(3).max(64).required(),
    password: joi.string().min(8).required()
  });
  const error = bodySchema.validate(body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, { username: usernameConstraint, password: passwordConstraint }, req.body);
  }

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
