import { userMiddleware, registerMiddleware } from './user';
import { loadMiddleware, fileSaveMiddleware, fileDeleteMiddleware, fileSaveMetaMiddleware, directoryListingMiddleware } from './file/file';
import { fileCopyMoveMiddleware } from './file/copyMove';

const fileLoadMiddleware = loadMiddleware;
const fileLoadMetaMiddleware = loadMiddleware;
const fileCopyMiddleware = fileCopyMoveMiddleware;
const fileMoveMiddleware = fileCopyMoveMiddleware;

export {
  userMiddleware,
  registerMiddleware,
  fileSaveMiddleware,
  fileSaveMetaMiddleware,
  fileLoadMiddleware,
  fileLoadMetaMiddleware,
  fileDeleteMiddleware,
  directoryListingMiddleware,
  fileCopyMiddleware,
  fileMoveMiddleware
};
