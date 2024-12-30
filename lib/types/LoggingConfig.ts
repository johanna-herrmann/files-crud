import LoggingFormat from '@/types/LoggingFormat';

interface LoggingConfig {
  accessLogFile?: string;
  errorLogFile?: string;
  ttyLoggingFormat?: LoggingFormat;
  enableErrorFileLogging?: boolean;
  enableAccessLogging?: boolean;
  fileLoggingFormat?: LoggingFormat;
  enableLogFileRotation?: boolean;
  logFileRotationMaxFiles?: string;
  logFileRotationEnableCompression?: boolean;
}

export default LoggingConfig;
