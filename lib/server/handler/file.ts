import Request from '@/types/server/Request';
import express from 'express';
import { resolvePath, sendError, sendOK } from '@/server/util';
import UploadRequest from '@/types/server/UploadRequest';
import { loadStorage } from '@/storage';
import { Readable } from 'stream';

const saveHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const path = resolvePath(req);
  const { data, mimetype } = (req as UploadRequest).files.file;

  await storage.save(path, data, {
    contentType: mimetype,
    owner: req.body.username as string,
    meta: {}
  });

  sendOK(res, { path });
};

const loadHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const [content, data] = await storage.load(path);
  const contentType = data.contentType;
  res.setHeader('Content-Disposition', `attachment; filename=${path.substring(path.lastIndexOf('/') + 1)}`);
  res.setHeader('Content-Type', contentType);
  const stream = Readable.from(content);
  stream.pipe(res);
};

const saveMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const meta = req.body.meta as Record<string, unknown> | undefined;
  const data = await storage.loadData(path);
  await storage.setData(path, { ...data, meta: meta ?? {} });
  sendOK(res);
};

const loadMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const { meta } = await storage.loadData(path);
  sendOK(res, { meta });
};

const copyHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const { path, targetPath, keepOwner, username } = req.body;

  if (!(await storage.exists(path as string))) {
    return sendError(res, `File ${path} does not exist`);
  }

  if (keepOwner) {
    await storage.copy(path as string, targetPath as string);
  } else {
    await storage.copy(path as string, targetPath as string, username as string);
  }

  sendOK(res, { path: targetPath });
};

const moveHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const { path, targetPath, keepOwner, username } = req.body;

  if (!(await storage.exists(path as string))) {
    return sendError(res, `File ${path} does not exist`);
  }

  if (keepOwner) {
    await storage.move(path as string, targetPath as string);
  } else {
    await storage.move(path as string, targetPath as string, username as string);
  }

  sendOK(res, { path: targetPath });
};

const deleteHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  await storage.delete(path);
  sendOK(res);
};

const listHandler = async function (req: Request, res: express.Response): Promise<void> {
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `Directory ${path} does not exist`);
  }

  const items = await storage.list(path);
  sendOK(res, { items });
};

export { saveHandler, loadHandler, saveMetaHandler, loadMetaHandler, copyHandler, moveHandler, deleteHandler, listHandler };
