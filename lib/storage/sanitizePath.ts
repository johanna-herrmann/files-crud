import paths from 'path';

class Sanitizer {
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  public ensureForeSlashes(): Sanitizer {
    this.path = this.path.replace(/\\/gu, '/');
    return this;
  }

  public removeLeadingAndTrailingDots(): Sanitizer {
    this.path = this.path.replace(/(^\.+|\.+$)/gu, '');
    return this;
  }

  public removeDotsAtSlashes(): Sanitizer {
    this.path = this.path.replace(/\.+\//gu, '/').replace(/\/\.+/gu, '/');
    return this;
  }

  public removeLeadingAndTrailingSlashes(): Sanitizer {
    this.path = this.path.replace(/(^\/+|\/+$)/gu, '');
    return this;
  }

  public reduceMultipleSlashes(): Sanitizer {
    this.path = this.path.replace(/\/+/gu, '/');
    return this;
  }

  public ensurePathSeparator(): Sanitizer {
    this.path = this.path.replace(/\//gu, paths.sep);
    return this;
  }

  public get() {
    return this.path;
  }
}

const sanitizePath = function (path: string): string {
  return new Sanitizer(path)
    .ensureForeSlashes()
    .removeLeadingAndTrailingDots()
    .removeDotsAtSlashes()
    .removeLeadingAndTrailingSlashes()
    .reduceMultipleSlashes()
    .ensurePathSeparator()
    .get();
};

export { sanitizePath };
