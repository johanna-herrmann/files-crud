import Request from '@/types/Request';
import express from 'express';
import { authorize } from '@/user';
import { getToken, sendUnauthorized } from '@/server/util';
import FileActionParams from '@/types/FileActionParams';
import User from '@/types/User';
import Permissions from '@/types/Permissions';
import { getConfig } from '@/config';
import PermissionConfig from '@/types/PermissionConfig';
import Right from '@/types/Right';
import { loadStorage } from '@/storage';
import FileData from '@/types/FileData';
import { Storage } from '@/storage/Storage';

type Body = Record<string, string>;

const config = getConfig();

const allPermissions: Permissions = {
  create: true,
  read: true,
  update: true,
  delete: true
};

const getIoAction = function (action: string, type: 'Source' | 'Target'): string {
  if (action === 'copy' || action === 'move') {
    return `${action}${type}`;
  }
  return action;
};

const getPermissionConfig = function (path: string, exists: boolean, list?: boolean): PermissionConfig {
  if (!list && exists && config.userFilePermissions) {
    return config.userFilePermissions;
  }
  if (path.split('/')[0].startsWith('user_') && config.userDirectoryPermissions) {
    return config.userDirectoryPermissions;
  }
  const directoryPermissions = config.directoryPermissions ?? {};
  return directoryPermissions[path.split('/')[0]] ?? config.defaultPermissions ?? {};
};

const getPermissions = function (user: User | null, path: string, data: FileData | null, list?: boolean): Permissions {
  const permissionConfig = getPermissionConfig(path, !!data, list);

  if (user?.admin) {
    return permissionConfig.admin ?? config.defaultPermissions?.admin ?? allPermissions;
  }

  if (data?.owner === user?.ownerId || path.split('/')[0] === `user_${user?.ownerId}`) {
    return permissionConfig.owner ?? permissionConfig.user ?? config.defaultPermissions?.user ?? { read: true };
  }

  if (!!user) {
    return permissionConfig.user ?? config.defaultPermissions?.user ?? { read: true };
  }

  return permissionConfig.public ?? config.defaultPermissions?.public ?? {};
};

const getRequiredRights = function (action: string, exists: boolean): Right[] {
  switch (action) {
    case 'save':
    case 'copyTarget':
    case 'moveTarget':
      return [exists ? 'update' : 'create'];
    case 'moveSource':
      return ['read', 'delete'];
    case 'save-meta':
      return ['update'];
    case 'delete':
      return ['delete'];
    case 'one':
    case 'list':
    case 'copySource':
    case 'load-meta':
    default:
      return ['read'];
  }
};

const ensureRights = function (permissions: Permissions, rights: Right[], path: string, res: express.Response): void {
  rights.forEach((right) => {
    if (!permissions[right]) {
      sendUnauthorized(res, `You are not allowed to ${right} ${path}`);
    }
  });
};

const handleTargetedAction = async function (
  storage: Storage,
  user: User | null,
  action: string,
  target: string,
  res: express.Response
): Promise<void> {
  const data = await storage.loadData(target);
  const ioAction = getIoAction(action, 'Target');
  const permissions = getPermissions(user, target, data);
  const requiredRights = getRequiredRights(ioAction, !!data);
  ensureRights(permissions, requiredRights, target, res);
};

const fileMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const storage = loadStorage();

  const user = await authorize(getToken(req));
  const { action, path, target } = req.params as FileActionParams;
  const body = req.body as Body;
  const actualPath = path ?? body.path ?? '[]';
  const data = await storage.loadData(actualPath);
  const ioAction = getIoAction(action, 'Source');
  const permissions = getPermissions(user, actualPath, data, action === 'list');
  const requiredRights = getRequiredRights(ioAction, !!data);
  ensureRights(permissions, requiredRights, actualPath, res);
  if (!!target) {
    return await handleTargetedAction(storage, user, action, target, res);
  }

  next();
};

export { fileMiddleware };
