import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createAdminUser } from "../src/auth/admin-users.js";
import { adminSessions } from "../src/db/schema.js";
import { createDatabase } from "../src/db/database.js";
import { createApp } from "../src/server.js";

let server;
let baseUrl;
let database;

before(async () => {
  database = createDatabase(":memory:");
  await createAdminUser(database.db, "test-admin", "a-long-test-password");
  server = createApp({ database }).listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  database.close();
});

test("login creates a hashed, secure session that can be used and revoked", async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "TEST-ADMIN", password: "a-long-test-password" }),
  });
  const cookie = loginResponse.headers.get("set-cookie");
  const sessionToken = cookie?.match(/rpm_session=([A-Za-z0-9_-]+)/)?.[1];
  const storedSession = database.db.select().from(adminSessions).get();

  assert.equal(loginResponse.status, 200);
  assert.ok(cookie?.includes("HttpOnly"));
  assert.ok(cookie?.includes("SameSite=Strict"));
  assert.ok(sessionToken);
  assert.notEqual(storedSession.sessionHash, sessionToken);

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: `rpm_session=${sessionToken}` },
  });
  assert.equal(meResponse.status, 200);
  assert.deepEqual(await meResponse.json(), {
    user: { id: 1, username: "test-admin" },
  });

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: `rpm_session=${sessionToken}` },
  });
  assert.equal(logoutResponse.status, 204);
  assert.ok(logoutResponse.headers.get("set-cookie")?.includes("Max-Age=0"));

  const afterLogoutResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: `rpm_session=${sessionToken}` },
  });
  assert.equal(afterLogoutResponse.status, 401);
});

test("invalid credentials do not authenticate", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: "incorrect-password" }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Invalid username or password" });
});
