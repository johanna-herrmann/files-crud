import Request from '@/types/Request';
import express from 'express';
import { authorize } from '@/user';
import { getToken, sendUnauthorized } from '@/server/util';
import FileActionParams from '@/types/FileActionParams';
import User from '@/types/User';
import Permissions from '@/types/Permissions';
import { getConfig } from '@/config';
import PermissionConfig from '@/types/PermissionConfig';
import { closeDb, loadDb } from '@/database';
import Database from '@/types/Database';
import File from '@/types/File';
import Right from '@/types/Right';

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

const getPermissions = function (user: User | null, path: string, file: File | null, list?: boolean): Permissions {
  const permissionConfig = getPermissionConfig(path, !!file, list);

  if (user?.admin) {
    return permissionConfig.admin ?? config.defaultPermissions?.admin ?? allPermissions;
  }

  if (file?.owner === user?.ownerId || path.split('/')[0] === `user_${user?.ownerId}`) {
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
    case 'meta':
      return ['update'];
    case 'delete':
      return ['delete'];
    case 'one':
    case 'list':
    case 'copySource':
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

const handleTargetedAction = async function (db: Database, user: User | null, action: string, target: string, res: express.Response): Promise<void> {
  const file = await db.getFile(target);
  const ioAction = getIoAction(action, 'Target');
  const permissions = getPermissions(user, target, file);
  const requiredRights = getRequiredRights(ioAction, !!file);
  ensureRights(permissions, requiredRights, target, res);
};

const fileMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  try {
    const db = await loadDb();

    const user = await authorize(getToken(req));
    const { action, path, target } = req.params as FileActionParams;
    const body = req.body as Body;
    const actualPath = path ?? body.path ?? '[]';
    const file = await db.getFile(actualPath);
    const ioAction = getIoAction(action, 'Source');
    const permissions = getPermissions(user, actualPath, file, action === 'list');
    const requiredRights = getRequiredRights(ioAction, !!file);
    ensureRights(permissions, requiredRights, actualPath, res);
    if (!!target) {
      return await handleTargetedAction(db, user, action, target, res);
    }

    next();
  } finally {
    await closeDb();
  }
};

export { fileMiddleware };
