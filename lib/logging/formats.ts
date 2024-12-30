import { format } from 'winston';
import LoggingFormat from '@/types/LoggingFormat';

const { combine, timestamp, printf, colorize } = format;

const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const humanReadableLine = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath, error }) => {
    const errorPad = error ? ` - ${(error as Error).message}` : '';
    return `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${errorPad}`;
  })
);

const humanReadableBlock = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath, error }) => {
    const errorPad = error ? `\n${(error as Error).message}` : '';
    return `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}${errorPad}\n${BOTTOM_LINE}\n`;
  })
);

const coloredHumanReadableLine = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath, error }) => {
    const errorPad = error ? ` - ${(error as Error).message}` : '';
    return colorize().colorize(level, `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}${errorPad}`);
  })
);

const coloredHumanReadableBlock = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath, error }) => {
    const errorPad = error ? ` - ${(error as Error).message}` : '';
    const block = colorize()
      .colorize(level, `${timestamp} - [${sourcePath}] - ${level.toUpperCase()}: - ${message}${errorPad}`)
      .split(' - ')
      .join('\n');
    return `${block}\n${BOTTOM_LINE}\n`;
  })
);

const json = combine(
  timestamp(),
  printf(({ level, message, timestamp, sourcePath, error }) => {
    const logEntry = { timestamp, level, source: sourcePath, message, errorMessage: (error as Error)?.message ?? undefined };
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
