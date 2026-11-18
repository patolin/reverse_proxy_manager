import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

const migrationDirectory = fileURLToPath(new URL("../../migrations/", import.meta.url));

function runMigrations(client) {
  client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const appliedMigrations = new Set(
    client.prepare("SELECT filename FROM schema_migrations").all().map(({ filename }) => filename),
  );
  const migrationFiles = readdirSync(migrationDirectory)
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      continue;
    }

    const migration = readFileSync(resolve(migrationDirectory, filename), "utf8");
    const applyMigration = client.transaction(() => {
      client.exec(migration);
      client
        .prepare("INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)")
        .run(filename, Date.now());
    });
    applyMigration.immediate();
  }
}

export function createDatabase(databasePath = process.env.DATABASE_PATH ?? "./data/app.sqlite") {
  const path = databasePath === ":memory:" || isAbsolute(databasePath)
    ? databasePath
    : resolve(process.cwd(), databasePath);

  if (path !== ":memory:") {
    const directory = dirname(path);
    mkdirSync(directory, { recursive: true });
  }

  const client = new Database(path);
  client.pragma("foreign_keys = ON");
  client.pragma("busy_timeout = 5000");
  client.pragma("journal_mode = WAL");
  runMigrations(client);

  return {
    db: drizzle(client, { schema }),
    close: () => client.close(),
  };
}
