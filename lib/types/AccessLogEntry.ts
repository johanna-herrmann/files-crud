interface AccessLogEntry {
  ip: string;
  timestamp: string;
  method: string;
  path: string;
  httpVersion: string;
  statusCode: string;
  contentLength: string;
  referer: string;
  userAgent: string;
}

export default AccessLogEntry;
