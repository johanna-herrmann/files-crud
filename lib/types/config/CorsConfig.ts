interface CorsConfig {
  origin?: string | string[];
  methods?: string | string[] | undefined;
  allowedHeaders?: string | string[] | undefined;
  exposedHeaders?: string | string[] | undefined;
  credentials?: boolean | undefined;
  maxAge?: number | undefined;
}

export { CorsConfig };
