import express from 'express';
import joi, { ObjectSchema } from 'joi';
import { authorize, checkPassword } from '@/user';
import { getToken, sendUnauthorized, sendValidationError } from '@/server/util';
import { getFullConfig } from '@/config/config';
import { User } from '@/types/user/User';
import { Request } from '@/types/server/Request';

const idConstraint = 'required string, uuid or "self"';
const usernameConstraint = 'required string, 3 to 64 chars long';
const passwordConstraint = 'optional string, at least 8 chars long';
const requiredPasswordConstraint = 'required string, at least 8 chars long';
const metaConstraint = 'optional object';
const adminConstraint = 'optional boolean';
const requiredAdminConstraint = 'required boolean';

const bodySchemas: Record<string, ObjectSchema> = {
  add: joi.object({
    username: joi.string().min(3).max(64).required(),
    password: joi.string().min(8).required(),
    admin: joi.boolean(),
    meta: joi.object()
  }),
  'set-admin': joi.object({
    id: joi.alternatives(joi.string().uuid(), 'self').required(),
    admin: joi.boolean().required()
  }),
  'change-username': joi.object({
    id: joi.alternatives(joi.string().uuid(), 'self').required(),
    newUsername: joi.string().min(3).max(64).required()
  }),
  'change-password': joi.object({
    id: joi.alternatives(joi.string().uuid(), 'self').required(),
    newPassword: joi.string().min(8).required(),
    oldPassword: joi.string().min(8)
  }),
  'save-meta': joi.object({
    meta: joi.object()
  })
};

const bodyConstraints: Record<string, Record<string, string>> = {
  add: {
    username: usernameConstraint,
    password: requiredPasswordConstraint,
    admin: adminConstraint,
    meta: metaConstraint
  },
  'set-admin': {
    id: idConstraint,
    admin: requiredAdminConstraint
  },
  'change-username': {
    id: idConstraint,
    newUsername: usernameConstraint
  },
  'change-password': {
    id: idConstraint,
    newPassword: requiredPasswordConstraint,
    oldPassword: passwordConstraint
  },
  'save-meta': {
    meta: metaConstraint
  }
};

const pathIdSchema = joi.alternatives(joi.string().uuid(), 'self').required();
const pathIdRequiredFor = ['save-meta', 'load-meta', 'load', 'remove'];

const getActualId = function (user: User, req: Request): string {
  const idFromParams = req.params.id as string | undefined;
  const idFromBody = req.body?.id as string | undefined;
  const idOrSelf = idFromBody ?? idFromParams ?? '[]';
  return idOrSelf === 'self' ? user.id : idOrSelf;
};

const isSelfAction = function (user: User, id: string): boolean {
  return user.id === id;
};

const isAdminAction = function (user: User, action: string, id: string): boolean {
  const adminOnlyActions = ['add', 'set-admin', 'list'];
  return adminOnlyActions.includes(action) || !isSelfAction(user, id);
};

const isSelfPasswordChange = function (user: User, action: string, id: string): boolean {
  return isSelfAction(user, id) && action === 'change-password';
};

const handleAdminAction = function (admin: boolean, res: express.Response, next: express.NextFunction): void {
  if (admin) {
    return next();
  }
  sendUnauthorized(res, 'You have to be admin');
};

const handleSelfPasswordChange = async function (username: string, password: string, res: express.Response, next: express.NextFunction) {
  const checkPasswordResult = await checkPassword(username, password);
  if (!checkPasswordResult) {
    return next();
  }
  sendUnauthorized(res, 'You have to provide your password');
};

const validateUserActionAndSendErrorIfInvalid = function (req: Request, res: express.Response): boolean {
  const action = req.params?.action ?? '-';
  const body = req.body ?? {};
  const bodySchema = bodySchemas[action];
  if (bodySchema) {
    const bodyError = bodySchema.validate(body).error;
    if (bodyError) {
      sendValidationError(res, 'body', bodyConstraints[action], body);
      return false;
    }
  }
  const idRequired = pathIdRequiredFor.includes(action);
  if (idRequired) {
    const pathError = pathIdSchema.validate(req.params.id).error;
    if (pathError) {
      sendValidationError(res, 'path parameter', { id: idConstraint }, { id: req.params.id });
      return false;
    }
  }
  return true;
};

const userMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const valid = validateUserActionAndSendErrorIfInvalid(req, res);
  if (!valid) {
    return;
  }

  const user = await authorize(getToken(req));
  if (!user) {
    return sendUnauthorized(res, 'You have to be logged in');
  }

  const { action } = req.params;
  const id = getActualId(user, req);
  const body = req.body ?? {};
  body.id = id;
  req.body = body;
  if (isAdminAction(user, action, id)) {
    return handleAdminAction(user.admin, res, next);
  }
  if (isSelfPasswordChange(user, action, id)) {
    return await handleSelfPasswordChange(user.username, (req.body?.oldPassword as string) ?? '', res, next);
  }

  next();
};

const registerMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const body = req.body ?? {};
  const bodySchema = joi.object({
    username: joi.string().min(3).max(64).required(),
    password: joi.string().min(8).required(),
    meta: joi.object({})
  });
  const error = bodySchema.validate(body, { convert: false, allowUnknown: true }).error;
  if (error) {
    return sendValidationError(res, 'body', { username: usernameConstraint, password: requiredPasswordConstraint, meta: metaConstraint }, body);
  }

  const config = getFullConfig();
  if (config.register === 'all') {
    return next();
  }

  if (config.register === 'token') {
    const body = req.body ?? {};
    const token = (body.token ?? '[]') as string;
    return config.tokens?.includes(token) ? next() : sendUnauthorized(res, 'Register is not allowed without valid register token');
  }

  sendUnauthorized(res, 'Register is disabled. Ask an admin to add you as user');
};

export { userMiddleware, registerMiddleware };
