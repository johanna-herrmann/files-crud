import express from 'express';
import http2Express from 'http2-express-bridge';
import { getFullConfig } from '@/config/config';
import {
  registerMiddleware,
  userMiddleware,
  uploadFileMiddleware,
  fileSaveMiddleware,
  fileSaveMetaMiddleware,
  fileCopyMiddleware,
  fileMoveMiddleware,
  fileDeleteMiddleware,
  fileLoadMiddleware,
  fileLoadMetaMiddleware,
  fileLoadDataMiddleware,
  directoryListingMiddleware,
  existsMiddleware,
  corsMiddleware,
  staticMiddleware,
  logAccessMiddleware,
  headerMiddleware,
  controlMiddleware,
  bodyFallbackMiddleware,
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
  fileExistsHandler,
  directoryExistsHandler,
  stopHandler,
  reloadHandler
} from '@/server/handler';

const buildApp = function (noFallbacks?: boolean): express.Application {
  const fallbacks = !noFallbacks;
  const config = getFullConfig();
  const app = config.server?.useHttp2 ? http2Express(express) : express();

  // common middlewares
  app.use(headerMiddleware);
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(bodyFallbackMiddleware);
  app.use(logAccessMiddleware);

  // user routes
  app.use('/api/user/:action{/:id}', userMiddleware);
  app.post('/api/register', registerMiddleware, registerHandler);
  app.post('/api/login', loginHandler);
  app.post('/api/user/add', addUserHandler);
  app.post('/api/user/set-admin', setAdminStateHandler);
  app.post('/api/user/change-username', changeUsernameHandler);
  app.post('/api/user/change-password', changePasswordHandler);
  app.post('/api/user/save-meta/:id', saveUserMetaHandler);
  app.delete('/api/user/remove/:id', deleteUserHandler);
  app.get('/api/user/load-meta/:id', loadUserMetaHandler);
  app.get('/api/user/load/:id', getUserHandler);
  app.get('/api/user/list', getUsersHandler);

  // file routes
  app.post('/api/file/upload/*path', fileSaveMiddleware, uploadFileMiddleware, saveFileHandler);
  app.post('/api/file/save-meta/*path', fileSaveMetaMiddleware, saveFileMetaHandler);
  app.post('/api/file/copy', fileCopyMiddleware, copyFileHandler);
  app.post('/api/file/move', fileMoveMiddleware, moveFileHandler);
  app.delete('/api/file/remove/*path', fileDeleteMiddleware, deleteFileHandler);
  app.get('/api/file/load-meta/*path', fileLoadMetaMiddleware, loadFileMetaHandler);
  app.get('/api/file/load-data/*path', fileLoadDataMiddleware, loadFileDataHandler);
  app.get('/api/file/download/*path', fileLoadMiddleware, loadFileHandler);
  app.get('/api/file/list/{*path}', directoryListingMiddleware, listDirectoryItemsHandler);
  app.get('/api/file/file-exists/{*path}', existsMiddleware, fileExistsHandler);
  app.get('/api/file/directory-exists/{*path}', existsMiddleware, directoryExistsHandler);

  // control routes
  app.use('/control/', controlMiddleware);
  app.post('/control/stop', stopHandler);
  app.post('/control/reload', reloadHandler);

  // web server
  app.use(staticMiddleware);

  // fallbacks
  if (fallbacks) {
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);
  }

  return app;
};

export { buildApp };
