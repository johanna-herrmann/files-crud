import { format } from 'winston';

const { colorize } = format;

const red = function (text: string): string {
  return colorize().colorize('error', text);
};

const green = function (text: string): string {
  return colorize().colorize('info', text);
};

class Printer {
  public printLine(line: string): Printer {
    process.stdout.write(`${line}\n`);
    return this;
  }

  public printBlock(block: string): Printer {
    process.stdout.write(`${block}\n`);
    return this;
  }

  public printStep(path: string): Printer {
    process.stdout.write(`Checking ${path} `);
    return this;
  }

  public printValid(): Printer {
    process.stdout.write(`  ${green('Valid')}\n`);
    return this;
  }

  public printInvalid(): Printer {
    process.stdout.write(`  ${red('Invalid')}\n`);
    return this;
  }

  public printCheckingError(): Printer {
    process.stdout.write(`  ${red('Error')}\n`);
    return this;
  }

  public printError(message: string): Printer {
    process.stderr.write(`${red(message)}\n`);
    return this;
  }

  public printSummary(valid: number, invalid: number, errors: number): Printer {
    const totalLine = `total: ${valid + invalid + errors}`;
    const validLine = `valid: ${valid ? green(valid + '') : 0}`;
    const invalidLine = `invalid: ${invalid ? red(invalid + '') : 0}`;
    const errorsLine = `errors: ${errors ? red(errors + '') : 0}`;
    process.stdout.write(`${totalLine}\n${validLine}\n${invalidLine}\n${errorsLine}\n`);
    return this;
  }

  public printFailed(): Printer {
    process.stdout.write(`${red('Failed due to error')}\n`);
    return this;
  }
}

const printer = new Printer();

export { printer, Printer };
