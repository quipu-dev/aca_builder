export class SchemaValidationError extends Error {
  constructor(public issues: string[]) {
    super(`API 数据格式校验失败: ${issues.join('; ')}`);
    this.name = 'SchemaValidationError';
  }
}

export interface TypeValidator<T> {
  parse: (input: unknown) => T;
}

export const s = {
  string: (): TypeValidator<string> => ({
    parse: (val) => {
      if (typeof val !== 'string')
        throw new SchemaValidationError([`期望 string，实际为 ${typeof val}`]);
      return val;
    },
  }),
  number: (): TypeValidator<number> => ({
    parse: (val) => {
      if (typeof val !== 'number')
        throw new SchemaValidationError([`期望 number，实际为 ${typeof val}`]);
      return val;
    },
  }),
  boolean: (): TypeValidator<boolean> => ({
    parse: (val) => {
      if (typeof val !== 'boolean')
        throw new SchemaValidationError([`期望 boolean，实际为 ${typeof val}`]);
      return val;
    },
  }),
  array: <T>(itemValidator: TypeValidator<T>): TypeValidator<T[]> => ({
    parse: (val) => {
      if (!Array.isArray(val))
        throw new SchemaValidationError([`期望 array，实际为 ${typeof val}`]);
      return val.map((item) => itemValidator.parse(item));
    },
  }),
  object: <T extends Record<string, TypeValidator<unknown>>>(
    shape: T,
  ): TypeValidator<{ [K in keyof T]: ReturnType<T[K]['parse']> }> => ({
    parse: (val) => {
      if (typeof val !== 'object' || val === null) {
        throw new SchemaValidationError(['期望非空 object']);
      }
      const res: Record<string, unknown> = {};
      const obj = val as Record<string, unknown>;
      for (const [k, validator] of Object.entries(shape)) {
        res[k] = validator.parse(obj[k]);
      }
      return res as { [K in keyof T]: ReturnType<T[K]['parse']> };
    },
  }),
  optional: <T>(inner: TypeValidator<T>): TypeValidator<T | undefined> => ({
    parse: (val) => (val === undefined || val === null ? undefined : inner.parse(val)),
  }),
  record: <T>(inner: TypeValidator<T>): TypeValidator<Record<string, T>> => ({
    parse: (val) => {
      if (typeof val !== 'object' || val === null) {
        throw new SchemaValidationError(['期望 record 映射对象']);
      }
      const res: Record<string, T> = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = inner.parse(v);
      }
      return res;
    },
  }),
  any: (): TypeValidator<unknown> => ({
    parse: (val) => val,
  }),
};
