import express from 'express';
import { authorize, checkPassword } from '@/user';
import User from '@/types/User';
import Request from '@/types/Request';
import UserActionParams from '@/types/UserActionParams';
import { getToken, sendUnauthorized } from '@/server/util';
import { getConfig } from '@/config';

type Body = Record<string, string>;

const config = getConfig();

const isSelfAction = function (user: User, username: string): boolean {
  return user.username === username;
};

const isAdminAction = function (user: User, action: string, username: string): boolean {
  const adminOnlyActions = ['add', 'set-admin', 'list'];
  return adminOnlyActions.includes(action) || !isSelfAction(user, username);
};

const isSelfPasswordChange = function (user: User, action: string, username: string): boolean {
  return isSelfAction(user, username) && action === 'change-password';
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

const userMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const user = await authorize(getToken(req));
  if (!user) {
    return sendUnauthorized(res, 'You have to be logged in');
  }

  const { action, username } = req.params as UserActionParams;
  const body = req.body as Body;
  if (isAdminAction(user, action, username ?? body.username ?? '[]')) {
    return handleAdminAction(user.admin, res, next);
  }
  if (isSelfPasswordChange(user, action, username ?? body.username ?? '')) {
    return await handleSelfPasswordChange(user.username, body.oldPassword ?? '', res, next);
  }

  next();
};

const registerMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  if (!config.register || config.register === 'all') {
    return next();
  }

  if (config.register === 'token') {
    const body = req.body as Body;
    const token = body.token ?? '[]';
    return config.tokens?.includes(token) ? next() : sendUnauthorized(res, 'Register is not allowed without valid register token');
  }

  sendUnauthorized(res, 'Register is disabled. Ask an admin to add you as user');
};

export { userMiddleware, registerMiddleware };
