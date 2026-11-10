/**
 * Request validation with zod. `parse()` returns typed data or throws 400 with one entry per problem
 * ({ path, message }) so the website can show the message next to the right field.
 */
import { z, ZodTypeAny } from 'zod';
import { badRequest } from './errors.js';
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data ?? {});
  if (!r.success) throw badRequest('Invalid request', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}
// Common schemas: a YYYY-MM-DD date and paging parameters (?page=&pageSize=).
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const page = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(25) });
