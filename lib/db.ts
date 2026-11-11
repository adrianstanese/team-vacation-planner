// One database entry point for every API route.
// Production and previews: Neon over HTTP (DATABASE_URL=postgres://...).
// Local development only: DATABASE_URL=pglite:./.pglite runs an in-process Postgres (PGlite), so the
// whole app, including admin, can be tested without a cloud database. PGlite is a dev dependency and is
// never bundled: it is loaded by a runtime-only import that the production build ignores.
import { neon } from "@neondatabase/serverless";

export type Row = Record<string, unknown>;
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

let cached: Sql | null = null;
let local: Promise<Sql> | null = null;

const LOCAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS teams (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now(), expires_at timestamptz);
  CREATE TABLE IF NOT EXISTS visits (id serial PRIMARY KEY, country text, created_at timestamptz DEFAULT now());
`;

async function openLocal(dir: string): Promise<Sql> {
  const pkg = "@electric-sql/pglite";
  const mod = await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ pkg);
  const db = new mod.PGlite(dir || undefined);
  await db.exec(LOCAL_SCHEMA);
  return async (strings, ...values) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
    const res = await db.query(text, values);
    return res.rows as Row[];
  };
}

export async function getSql(): Promise<Sql> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("pglite:")) {
    if (process.env.VERCEL) throw new Error("pglite is for local development only");
    local ||= openLocal(url.slice("pglite:".length));
    cached = await local;
    return cached;
  }
  cached = neon(url) as unknown as Sql;
  return cached;
}
