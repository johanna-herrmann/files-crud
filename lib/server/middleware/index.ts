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
import { fileCopyMiddleware, fileMoveMiddleware } from './file/copyMove';
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
