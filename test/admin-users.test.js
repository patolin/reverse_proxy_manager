import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createAdminUser } from "../src/auth/admin-users.js";
import { verifyPassword } from "../src/auth/password.js";
import { createDatabase } from "../src/db/database.js";
import { adminUsers } from "../src/db/schema.js";

test("administrator bootstrap stores a normalized username and a verifiable password hash", async () => {
  const database = createDatabase(":memory:");

  try {
    const created = await createAdminUser(database.db, " Admin.User ", "a-long-test-password");
    const stored = database.db.select().from(adminUsers).get();

    assert.equal(created.username, "admin.user");
    assert.equal(stored.username, "admin.user");
    assert.notEqual(stored.passwordHash, "a-long-test-password");
    assert.equal(await verifyPassword("a-long-test-password", stored.passwordHash), true);
    assert.equal(await verifyPassword("incorrect-password", stored.passwordHash), false);
  } finally {
    database.close();
  }
});

test("administrator bootstrap rejects weak passwords and duplicate usernames", async () => {
  const database = createDatabase(":memory:");

  try {
    await assert.rejects(
      createAdminUser(database.db, "admin", "too-short"),
      /at least 12 characters/,
    );

    await createAdminUser(database.db, "admin", "a-long-test-password");
    await assert.rejects(
      createAdminUser(database.db, "ADMIN", "another-long-password"),
      /already exists/,
    );
  } finally {
    database.close();
  }
});

test("database migrations create persistent storage in a new directory", async () => {
  const directory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-"));
  const databasePath = join(directory, "nested", "manager.sqlite");
  let database;

  try {
    database = createDatabase(databasePath);
    await createAdminUser(database.db, "persisted-admin", "a-long-test-password");
    database.close();
    database = undefined;

    database = createDatabase(databasePath);
    const stored = database.db.select().from(adminUsers).get();
    assert.equal(stored.username, "persisted-admin");
  } finally {
    database?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
