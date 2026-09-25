import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';

/** Typed query builder for the D1 database. */
export function getDb() {
  return drizzle(env.DB, { schema });
}

/** Raw D1 access, for batches and hand-written SQL. */
export function getD1() {
  return env.DB;
}

/** R2 bucket for uploaded photos, or null while R2 is not enabled. */
export function getPhotoBucket() {
  return env.FILES ?? null;
}
