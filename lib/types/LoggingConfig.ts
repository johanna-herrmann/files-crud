import LoggingFormat from '@/types/LoggingFormat';
import LogFileRotationFrequencyUnit from '@/types/LogFileRotationFrequencyUnit';
import AccessLoggingFormat from '@/types/AccessLoggingFormat';

interface LoggingConfig {
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
