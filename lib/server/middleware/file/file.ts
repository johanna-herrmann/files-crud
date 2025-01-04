import Request from '@/types/server/Request';
import express from 'express';
import { authorize } from '@/user';
import { getToken, resolvePath, sendUnauthorized } from '@/server/util';
import User from '@/types/user/User';
import Permissions from '@/types/config/Permissions';
import Right from '@/types/config/Right';
import { loadStorage } from '@/storage';
import { Storage } from '@/storage/Storage';
import { getPermissions } from '@/server/middleware/file/permissions';

const nullData = { owner: '', meta: {}, contentType: '', size: -1 };

const ensureRights = function (permissions: Permissions, rights: Right[], path: string, res: express.Response): boolean {
  for (const right of rights) {
    if (!permissions[right]) {
      sendUnauthorized(res, `You are not allowed to ${right} ${path}`);
      return false;
    }
  }
  return true;
};

const checkForSingleFile = async function (
  user: User | null,
  path: string,
  exists: boolean,
  storage: Storage,
  res: express.Response,
  requiredRight: Right
): Promise<boolean> {
  const data = exists ? await storage.loadData(path) : nullData;
  const permissions = getPermissions(user, path, data, exists, false);
  return ensureRights(permissions, [requiredRight], path, res);
};

const loadMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  resolvePath(req);
  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const path = resolvePath(req);
  const exists = await storage.exists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, 'read');
  if (allowed) {
    next();
  }
};

const fileSaveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const storage = loadStorage();
  const user = (req.body.user ?? (await authorize(getToken(req)))) as User;
  const path = resolvePath(req);
  const exists = await storage.exists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, exists ? 'update' : 'create');
  if (allowed) {
    req.body.username = user?.username ?? '-';
    next();
  }
};

const fileDeleteMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const path = resolvePath(req);
  const exists = await storage.exists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, 'delete');
  if (allowed) {
    next();
  }
};

const fileSaveMetaMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const path = resolvePath(req);
  const exists = await storage.exists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, 'update');
  if (allowed) {
    next();
  }
};

const directoryListingMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const path = resolvePath(req);
  const exists = await storage.exists(path);
  const permissions = getPermissions(user, path, nullData, exists, true);
  const allowed = ensureRights(permissions, ['read'], path, res);
  if (allowed) {
    next();
  }
};

export { loadMiddleware, fileSaveMiddleware, fileDeleteMiddleware, fileSaveMetaMiddleware, directoryListingMiddleware };
