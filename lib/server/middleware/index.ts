import { userMiddleware, registerMiddleware } from './user';
import { loadMiddleware, fileSaveMiddleware, fileDeleteMiddleware, fileSaveMetaMiddleware, directoryListingMiddleware } from './file/file';
import { fileCopyMoveMiddleware } from './file/copyMove';
import { logAccessMiddleware } from './access';
import { headerMiddleware } from './header';
import { controlMiddleware } from './control';
import { notFoundMiddleware } from './404';
import { errorMiddleware } from './error';

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
  headerMiddleware,
  controlMiddleware,
  notFoundMiddleware,
  errorMiddleware
};
