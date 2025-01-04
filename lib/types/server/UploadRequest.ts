import Request from '@/types/server/Request';

interface File {
  data: Buffer;
  mimetype: string;
}

interface Files {
  file: File;
}

type UploadRequest = Request & { files: Files };

export default UploadRequest;