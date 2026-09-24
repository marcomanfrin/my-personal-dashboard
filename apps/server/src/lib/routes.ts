import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { nonEmpty, parse } from './validate';

const IdParams = z.object({ id: z.uuid() });

/** The `:id` path parameter, validated as a uuid. */
export const idOf = (req: FastifyRequest): string => parse(IdParams, req.params, 'Path').id;

/** A PATCH body parsed with `schema`, rejected when empty. */
export const patchOf = <S extends z.ZodType>(schema: S, req: FastifyRequest): z.infer<S> =>
  nonEmpty(parse(schema, req.body ?? {}, 'Body') as object) as z.infer<S>;

export const queryOf = <S extends z.ZodType>(schema: S, req: FastifyRequest): z.infer<S> =>
  parse(schema, req.query ?? {}, 'Query');
