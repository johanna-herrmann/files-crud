const getStack = function (): NodeJS.CallSite[] {
  const origPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = function (_, stack) {
    return stack;
  };
  const err = new Error();
  const stack = err.stack as unknown as NodeJS.CallSite[];
  Error.prepareStackTrace = origPrepareStackTrace;
  return stack;
};

const getCaller = function (): NodeJS.CallSite {
  const stack = getStack();
  return stack[4];
};

/**
 * gets the path to the file which called the function where this function was called in.
 *
 * Example: In file a.js a function calls a function in b.js. The function in b.js calls this getSourcePath function.
 * In this case this function returns the path to file a.js
 *
 * @returns The path
 */
const getSourcePath = function (): string {
  return getCaller().getFileName() || '-';
};

export { getSourcePath };
