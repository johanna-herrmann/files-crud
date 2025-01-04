import { userMiddleware, registerMiddleware } from './user';
import { loadMiddleware, fileSaveMiddleware, fileDeleteMiddleware, fileSaveMetaMiddleware, directoryListingMiddleware } from './file/file';
import { fileCopyMoveMiddleware } from './file/copyMove';
import { logAccessMiddleware } from './access';
import { notFoundMiddleware } from '@/server/middleware/404';

const fileLoadMiddleware = loadMiddleware;
const fileLoadMetaMiddleware = loadMiddleware;
const fileLoadDataMiddleware = loadMiddleware;
const fileCopyMiddleware = fileCopyMoveMiddleware;
const fileMoveMiddleware = fileCopyMoveMiddleware;

export {
  userMiddleware,
  registerMiddleware,
  fileSaveMiddleware,
  fileSaveMetaMiddleware,
  fileLoadMiddleware,
  fileLoadMetaMiddleware,
  fileLoadDataMiddleware,
  fileDeleteMiddleware,
  directoryListingMiddleware,
  fileCopyMiddleware,
  fileMoveMiddleware,
  logAccessMiddleware,
  notFoundMiddleware
};
