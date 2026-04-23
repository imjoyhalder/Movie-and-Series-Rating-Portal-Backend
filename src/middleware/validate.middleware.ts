import { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

interface ValidateSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

type SchemaInput = ZodType | ValidateSchemas;

const isZodType = (s: SchemaInput): s is ZodType =>
  typeof (s as ZodType).parse === 'function' && !('body' in s) && !('query' in s) && !('params' in s);

export const validate =
  (schemas: SchemaInput) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (isZodType(schemas)) {
        req.body = schemas.parse(req.body);
      } else {
        if (schemas.body) req.body = schemas.body.parse(req.body);
        if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query;
        if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
