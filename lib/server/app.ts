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
  listDirectoryItemsHandler
} from '@/server/handler';
import { getConfig } from '@/config';
import Config from '@/types/config/Config';

const FILE_SIZE_LIMIT = 1024 * 1024 * 100; // 100 MiB;
const TIMEOUT = 15 * 1000; // 15 seconds;

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
    fileUpload({
      abortOnLimit: true,
      responseOnLimit: `uploaded file is to big. Limit: 100 MiB`,
      limits: { fileSize: FILE_SIZE_LIMIT },
      uploadTimeout: TIMEOUT
    })
  );
  return app;
};

const addUserHandling = function (app: express.Application): void {
  app.use('/user', userMiddleware);
  app.post('/register', registerMiddleware, registerHandler);
  app.post('/login', loginHandler);
  app.post('/user/add', addUserHandler);
  app.post('/user/set-admin', setAdminStateHandler);
  app.post('/user/change-username', changeUsernameHandler);
  app.post('/user/change-password', changePasswordHandler);
  app.post('/user/save-meta/:username', saveUserMetaHandler);
  app.delete('/user/delete/:username', deleteUserHandler);
  app.get('/user/load-meta/:username', loadUserMetaHandler);
  app.get('/user/one/:username', getUserHandler);
  app.get('/user/list', getUsersHandler);
};

const addFileHandling = function (app: express.Application): void {
  app.post('/file/save/*path', fileSaveMiddleware, saveFileHandler);
  app.post('/file/save-meta/*path', fileSaveMetaMiddleware, saveFileMetaHandler);
  app.post('/file/copy', fileCopyMiddleware, copyFileHandler);
  app.post('/file/move', fileMoveMiddleware, moveFileHandler);
  app.delete('/file/delete/*path', fileDeleteMiddleware, deleteFileHandler);
  app.get('/file/load-meta/*path', fileLoadMetaMiddleware, loadFileMetaHandler);
  app.get('/file/load-data/*path', fileLoadDataMiddleware, loadFileDataHandler);
  app.get('/file/one/*path', fileLoadMiddleware, loadFileHandler);
  app.get('/file/list/*path', directoryListingMiddleware, listDirectoryItemsHandler);
};

const addFallbacks = function (app: express.Application): void {
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
};

const buildApp = function (noFallbacks?: boolean): express.Application {
  const config = getConfig();
  const app = config.server?.useHttp2 ? http2Express(express) : express();
  addCommonMiddlewares(app, config);
  addUserHandling(app);
  addFileHandling(app);

  if (noFallbacks) {
    return app;
  }

  addFallbacks(app);
  return app;
};

export { buildApp };
