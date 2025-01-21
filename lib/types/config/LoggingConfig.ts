import LoggingFormat from '@/types/config/LoggingFormat';
import LogFileRotationFrequencyUnit from '@/types/config/LogFileRotationFrequencyUnit';
import AccessLoggingFormat from '@/types/config/AccessLoggingFormat';

interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  accessLogFile?: string;
  errorLogFile?: string;
  ttyLoggingFormat?: LoggingFormat;
  fileLoggingFormat?: LoggingFormat;
  accessLoggingFormat?: AccessLoggingFormat;
  enableErrorFileLogging?: boolean;
  enableAccessLogging?: boolean;
  enableLogFileRotation?: boolean;
  logFileRotationFrequencyUnit?: LogFileRotationFrequencyUnit;
  logFileRotationMaxFiles?: string;
  logFileRotationEnableCompression?: boolean;
  ipLogging?: 'full' | 'anonymous' | 'none';
}

export default LoggingConfig;
