import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "..", "..", "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "ridgeline.db")}`;
}

export const db = createClient({
  url:       resolveUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let migrated = false;
export async function runMigrations() {
  if (migrated) return;
  migrated = true;
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema     = fs.readFileSync(schemaPath, "utf-8");
  const statements = schema.split(";").map((s) => s.trim()).filter(Boolean);
  for (const sql of statements) {
    await db.execute(sql + ";");
  }
}

export async function q(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r;
}

export async function all(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map(rowToObj(r.columns));
}

export async function get(sql, args = []) {
  const r = await db.execute({ sql, args });
  if (!r.rows.length) return null;
  return rowToObj(r.columns)(r.rows[0]);
}

export async function run(sql, args = []) {
  const r = await db.execute({ sql, args });
  return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
}

function rowToObj(columns) {
  return (row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  };
}
