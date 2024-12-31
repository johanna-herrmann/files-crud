import LoggingFormat from '@/types/LoggingFormat';
import LogFileRotationFrequencyUnit from '@/types/LogFileRotationFrequencyUnit';

interface LoggingConfig {
  accessLogFile?: string;
  errorLogFile?: string;
  ttyLoggingFormat?: LoggingFormat;
  enableErrorFileLogging?: boolean;
  enableAccessLogging?: boolean;
  fileLoggingFormat?: LoggingFormat;
  enableLogFileRotation?: boolean;
  logFileRotationFrequencyUnit?: LogFileRotationFrequencyUnit;
  logFileRotationMaxFiles?: string;
  logFileRotationEnableCompression?: boolean;
}

export default LoggingConfig;
