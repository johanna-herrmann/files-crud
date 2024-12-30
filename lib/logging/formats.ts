import { format } from 'winston';
import LoggingFormat from '@/types/LoggingFormat';

const { combine, timestamp, printf, colorize } = format;

const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const humanReadableLine = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath }) => {
    return `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}`;
  })
);

const humanReadableBlock = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath }) => {
    return `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${BOTTOM_LINE}\n`;
  })
);

const coloredHumanReadableLine = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath }) => {
    return colorize().colorize(level, `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}`);
  })
);

const coloredHumanReadableBlock = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath }) => {
    const block = colorize().colorize(level, `${timestamp} - [${sourcePath}] - ${level.toUpperCase()}: - ${message}`).split(' - ').join('\n');
    return `${block}\n${BOTTOM_LINE}\n`;
  })
);

const json = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath }) => {
    const logEntry = { timestamp, level, source: sourcePath, message };
    return JSON.stringify(logEntry);
  })
);

const formats: Record<LoggingFormat, typeof humanReadableLine> = {
  humanReadableLine,
  humanReadableBlock,
  coloredHumanReadableLine,
  coloredHumanReadableBlock,
  json
};

export { formats, BOTTOM_LINE };
