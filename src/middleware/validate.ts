import { RequestHandler } from 'express';
import { AnyZodObject, z } from 'zod';

/**
 * Validates and coerces req.body / req.query / req.params against a zod schema.
 * On success the parsed (typed, defaulted) values replace the raw input.
 * On failure the ZodError is passed to the error handler, which returns a 400.
 */
export const validate =
  <T extends AnyZodObject>(schema: T): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) return next(result.error);

    const data = result.data as z.infer<T>;
    if (data.body !== undefined) req.body = data.body;
    if (data.query !== undefined) req.query = data.query;
    if (data.params !== undefined) req.params = data.params;
    return next();
  };
