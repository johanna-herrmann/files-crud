import LoggingFormat from '@/types/LoggingFormat';

interface LoggingConfig {
  accessLogFile?: string;
  errorLogFile?: string;
  ttyLoggingFormat?: LoggingFormat;
  disableErrorFileLogging?: boolean;
  disableAccessLogging?: boolean;
  fileLoggingFormat?: LoggingFormat;
}

export default LoggingConfig;
