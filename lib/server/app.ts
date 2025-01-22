import express from 'express';
import http2Express from 'http2-express-bridge';
import autoPush from 'http2-express-autopush';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import {
  registerMiddleware,
  userMiddleware,
  fileSaveMiddleware,
  fileSaveMetaMiddleware,
  fileCopyMiddleware,
  fileMoveMiddleware,
  fileDeleteMiddleware,
  fileLoadMiddleware,
  fileLoadMetaMiddleware,
  fileLoadDataMiddleware,
  directoryListingMiddleware,
  logAccessMiddleware,
  headerMiddleware,
  controlMiddleware,
  notFoundMiddleware,
  errorMiddleware
} from '@/server/middleware';
import {
  addUserHandler,
  registerHandler,
  loginHandler,
  changeUsernameHandler,
  changePasswordHandler,
  setAdminStateHandler,
  saveUserMetaHandler,
  deleteUserHandler,
  loadUserMetaHandler,
  getUserHandler,
  getUsersHandler,
  saveFileHandler,
  saveFileMetaHandler,
  copyFileHandler,
  moveFileHandler,
  deleteFileHandler,
  loadFileHandler,
  loadFileMetaHandler,
  loadFileDataHandler,
  listDirectoryItemsHandler,
  stopHandler,
  reloadHandler
} from '@/server/handler';
import { getFullConfig } from '@/config/config';
import Config from '@/types/config/Config';

const TIMEOUT = 15 * 1000; // 15 seconds;

const parseSizeLimit = function (input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }
  const lastChar = input.charAt(input.length - 1);
  if (/\d/.test(lastChar)) {
    return Number(input);
  }
  const number = Number(input.substring(0, input.length - 1));
  const units = ['k', 'm', 'g', 't', 'p', 'e'];
  return number * 1024 ** (units.indexOf(lastChar.toLowerCase()) + 1);
};

const addCommonMiddlewares = function (app: express.Application, config: Config) {
  app.use(headerMiddleware);
  if (!!config.server?.cors) {
    app.use(cors(config.server.cors));
  }
  app.use(express.json());
  app.use('/', logAccessMiddleware);
  if (!!config.webRoot) {
    const staticHandler = config.server?.useHttp2 ? autoPush : express.static;
    app.use(staticHandler(config.webRoot));
  }
  app.use(
    '/api/',
    fileUpload({
      abortOnLimit: true,
      responseOnLimit: `uploaded file is to big. Limit: 100 MiB`,
      limits: { fileSize: parseSizeLimit(config.server?.fileSizeLimit as string | number) },
      uploadTimeout: TIMEOUT
    })
  );
  return app;
};

const addUserHandling = function (app: express.Application): void {
  app.use('/api/user/:action{/:username}', userMiddleware);
  app.post('/api/register', registerMiddleware, registerHandler);
  app.post('/api/login', loginHandler);
  app.post('/api/user/add', addUserHandler);
  app.post('/api/user/set-admin', setAdminStateHandler);
  app.post('/api/user/change-username', changeUsernameHandler);
  app.post('/api/user/change-password', changePasswordHandler);
  app.post('/api/user/save-meta/:username', saveUserMetaHandler);
  app.delete('/api/user/delete/:username', deleteUserHandler);
  app.get('/api/user/load-meta/:username', loadUserMetaHandler);
  app.get('/api/user/one/:username', getUserHandler);
  app.get('/api/user/list', getUsersHandler);
};

const addFileHandling = function (app: express.Application): void {
  app.post('/api/file/save/*path', fileSaveMiddleware, saveFileHandler);
  app.post('/api/file/save-meta/*path', fileSaveMetaMiddleware, saveFileMetaHandler);
  app.post('/api/file/copy', fileCopyMiddleware, copyFileHandler);
  app.post('/api/file/move', fileMoveMiddleware, moveFileHandler);
  app.delete('/api/file/delete/*path', fileDeleteMiddleware, deleteFileHandler);
  app.get('/api/file/load-meta/*path', fileLoadMetaMiddleware, loadFileMetaHandler);
  app.get('/api/file/load-data/*path', fileLoadDataMiddleware, loadFileDataHandler);
  app.get('/api/file/one/*path', fileLoadMiddleware, loadFileHandler);
  app.get('/api/file/list/*path', directoryListingMiddleware, listDirectoryItemsHandler);
};

const addControlHandling = function (app: express.Application): void {
  app.use('/control/', controlMiddleware);
  app.post('/control/stop', stopHandler);
  app.post('/control/reload', reloadHandler);
};

const addFallbacks = function (app: express.Application): void {
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
};

const buildApp = function (noFallbacks?: boolean): express.Application {
  const config = getFullConfig();
  const app = config.server?.useHttp2 ? http2Express(express) : express();
  addCommonMiddlewares(app, config);
  addUserHandling(app);
  addFileHandling(app);
  addControlHandling(app);

  if (noFallbacks) {
    return app;
  }

  addFallbacks(app);
  return app;
};

export { buildApp, parseSizeLimit };
