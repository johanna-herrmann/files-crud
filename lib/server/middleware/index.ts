import { userMiddleware, registerMiddleware } from './user';
import { uploadFileMiddleware } from './upload';
import {
  loadMiddleware,
  fileSaveMiddleware,
  fileDeleteMiddleware,
  fileSaveMetaMiddleware,
  directoryListingMiddleware,
  existsMiddleware
} from './file/file';
import { fileCopyMoveMiddleware } from './file/copyMove';
import { logAccessMiddleware } from './access';
import { corsMiddleware } from './cors';
import { staticMiddleware } from './static';
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
  uploadFileMiddleware,
  fileSaveMiddleware,
  fileSaveMetaMiddleware,
  fileLoadMiddleware,
  fileLoadMetaMiddleware,
  fileLoadDataMiddleware,
  fileDeleteMiddleware,
  directoryListingMiddleware,
  existsMiddleware,
  fileCopyMiddleware,
  fileMoveMiddleware,
  corsMiddleware,
  staticMiddleware,
  logAccessMiddleware,
  headerMiddleware,
  controlMiddleware,
  notFoundMiddleware,
  errorMiddleware
};
