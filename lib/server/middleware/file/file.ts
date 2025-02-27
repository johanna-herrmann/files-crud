import Request from '@/types/server/Request';
import express from 'express';
import { authorize } from '@/user';
import { getToken, resolvePath, sendUnauthorized } from '@/server/util';
import { loadStorage } from '@/storage';
import { Storage } from '@/storage/Storage';
import { getPermissions } from '@/server/middleware/file/permissions';
import User from '@/types/user/User';
import Right from '@/types/config/Right';
import FileData from '@/types/storage/FileData';
import paths from 'path';

const nullData: FileData = { owner: '', contentType: '', size: -1, md5: '0'.repeat(32) };

const ensureRights = function (rightsSet: Right[], requiredRight: Right, path: string, res: express.Response): boolean {
  if (!rightsSet.includes(requiredRight)) {
    sendUnauthorized(res, `You are not allowed to ${requiredRight} ${path}`);
    return false;
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
  const permissions = getPermissions(user, path, data, exists, requiredRight);
  return ensureRights(permissions, requiredRight, path, res);
};

const checkForListing = async function (req: Request, res: express.Response, next: express.NextFunction, parent: boolean): Promise<void> {
  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const path = resolvePath(req);
  const directory = parent ? paths.dirname(paths.join(paths.sep, path)).substring(1) : path;
  const exists = await storage.exists(path);
  const permissions = getPermissions(user, directory, nullData, exists, 'list');
  const allowed = ensureRights(permissions, 'read', path, res);
  if (allowed) {
    next();
  }
};

const loadMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
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
    req.body.userId = user?.id ?? 'public';
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
  const data = await storage.loadData(path);
  const meta = data?.meta;
  const allowed = await checkForSingleFile(user, path, exists, storage, res, meta ? 'update' : 'create');
  if (allowed) {
    next();
  }
};

const directoryListingMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  await checkForListing(req, res, next, false);
};

const existsMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  await checkForListing(req, res, next, true);
};

export { loadMiddleware, fileSaveMiddleware, fileDeleteMiddleware, fileSaveMetaMiddleware, directoryListingMiddleware, existsMiddleware };
