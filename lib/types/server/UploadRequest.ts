import Request from './Request';
import Files from './Files';

type UploadRequest = Request & { files: Files };

export default UploadRequest;
