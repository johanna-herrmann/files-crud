import paths from 'path';
import express from 'express';
import joi from 'joi';
import { authorize } from '@/user';
import { getToken, resolvePath, sendUnauthorized, sendValidationError } from '@/server/util';
import { loadStorage } from '@/storage';
import { Storage } from '@/storage/Storage';
import { getPermissions } from '@/server/middleware/file/permissions';
import { User } from '@/types/user/User';
import { Right } from '@/types/config/Right';
import { FileData } from '@/types/storage/FileData';
import { Request } from '@/types/server/Request';

const nullData: FileData = { owner: '', contentType: '', size: -1, md5: '0'.repeat(32) };
const notEmptyPathConstraint = 'required string, not empty';

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
  const exists = await storage.directoryExists(path);
  const permissions = getPermissions(user, directory, nullData, exists, 'list');
  const allowed = ensureRights(permissions, 'read', path, res);
  if (allowed) {
    next();
  }
};

const loadMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const path = resolvePath(req);

  const bodySchema = joi.object({
    path: joi.string().required()
  });
  const error = bodySchema.validate({ path }, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { path: notEmptyPathConstraint }, { path });
  }

  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const exists = await storage.fileExists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, 'read');
  if (allowed) {
    next();
  }
};

const fileSaveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const path = resolvePath(req);

  const bodySchema = joi.object({
    path: joi.string().required()
  });
  const error = bodySchema.validate({ path }, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { path: notEmptyPathConstraint }, { path });
  }

  const storage = loadStorage();
  const user = (req.body?.user ?? (await authorize(getToken(req)))) as User;
  const exists = await storage.fileExists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, exists ? 'update' : 'create');
  if (allowed) {
    const body = req.body ?? {};
    body.userId = user?.id ?? 'public';
    req.body = body;
    next();
  }
};

const fileDeleteMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const path = resolvePath(req);

  const bodySchema = joi.object({
    path: joi.string().required()
  });
  const error = bodySchema.validate({ path }, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { path: notEmptyPathConstraint }, { path });
  }

  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const exists = await storage.fileExists(path);
  const allowed = await checkForSingleFile(user, path, exists, storage, res, 'delete');
  if (allowed) {
    next();
  }
};

const fileSaveMetaMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const path = resolvePath(req);

  const bodySchema = joi.object({
    path: joi.string().required()
  });
  const error = bodySchema.validate({ path }, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { path: notEmptyPathConstraint }, { path });
  }

  const storage = loadStorage();
  const user = await authorize(getToken(req));
  const exists = await storage.fileExists(path);
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
  const path = resolvePath(req);

  const bodySchema = joi.object({
    path: joi.string().required()
  });
  const error = bodySchema.validate({ path }, { convert: false }).error;
  if (error) {
    return sendValidationError(res, { path: notEmptyPathConstraint }, { path });
  }

  await checkForListing(req, res, next, true);
};

export { loadMiddleware, fileSaveMiddleware, fileDeleteMiddleware, fileSaveMetaMiddleware, directoryListingMiddleware, existsMiddleware };
