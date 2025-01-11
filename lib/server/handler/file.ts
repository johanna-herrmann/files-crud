import Request from '@/types/server/Request';
import express from 'express';
import { Readable } from 'stream';
import { resolvePath, sendError, sendOK } from '@/server/util';
import { loadStorage } from '@/storage';
import { loadLogger } from '@/logging';
import UploadRequest from '@/types/server/UploadRequest';

const saveHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);
  const { data, mimetype, md5 } = (req as UploadRequest).files.file;
  const headerMimetype = req.header('X-Mimetype');
  const actualMimetype = headerMimetype ?? mimetype;
  const size = data.length;
  const owner = req.body.username as string;
  const fileData = {
    contentType: actualMimetype,
    size,
    md5,
    owner,
    meta: {}
  };

  await storage.save(path, data, fileData);

  logger.info('Successfully saved file.', {
    path,
    size,
    mimetype: actualMimetype,
    mimetypeFrom: headerMimetype ? 'header' : 'files attribute'
  });
  sendOK(res, { path });
};

const loadHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const [content, data] = await storage.load(path);
  const { size, contentType } = data;
  const headerMimetype = req.header('X-Mimetype');
  const mimetype = headerMimetype ?? contentType;
  res.setHeader('Content-Disposition', `attachment; filename=${path.substring(path.lastIndexOf('/') + 1)}`);
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Length', size);
  const stream = Readable.from(content);
  logger.info('Successfully read file.', { path, size, mimetype, mimetypeFrom: headerMimetype ? 'header' : 'fileData' });
  stream.pipe(res);
};

const saveMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const meta = req.body.meta as Record<string, unknown> | undefined;
  const data = await storage.loadData(path);
  await storage.setData(path, { ...data, meta: meta ?? {} });
  logger.info('Successfully saved file meta data.', { path, meta });
  sendOK(res);
};

const loadMetaHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const { meta } = await storage.loadData(path);
  logger.info('Successfully loaded file meta data.', { path, meta });
  sendOK(res, { meta });
};

const loadDataHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  const data = await storage.loadData(path);
  logger.info('Successfully saved file data.', { path, data });
  sendOK(res, { data });
};

const copyHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
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

  logger.info('Successfully copied file.', { path, targetPath });
  sendOK(res, { path: targetPath });
};

const moveHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
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

  logger.info('Successfully moved file.', { path, targetPath });
  sendOK(res, { path: targetPath });
};

const deleteHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `File ${path} does not exist`);
  }

  await storage.delete(path);
  logger.info('Successfully removed file.', { path });
  sendOK(res);
};

const listHandler = async function (req: Request, res: express.Response): Promise<void> {
  const logger = loadLogger();
  const storage = loadStorage();
  const path = resolvePath(req);

  if (!(await storage.exists(path))) {
    return sendError(res, `Directory ${path} does not exist`);
  }

  const items = await storage.list(path);
  logger.info('Successfully loaded list of items.', { path });
  logger.debug('Loaded following directory items.', { directory: path, items });
  sendOK(res, { items });
};

export { saveHandler, loadHandler, saveMetaHandler, loadMetaHandler, loadDataHandler, copyHandler, moveHandler, deleteHandler, listHandler };
