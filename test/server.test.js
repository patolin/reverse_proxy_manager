import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { createDatabase } from "../src/db/database.js";
import { createApp } from "../src/server.js";

let server;
let baseUrl;
let database;
let proxyDirectory;

before(async () => {
  database = createDatabase(":memory:");
  proxyDirectory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-proxy-"));
  server = createApp({ database, proxyDirectory }).listen(0, "127.0.0.1");
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
  rmSync(proxyDirectory, { recursive: true, force: true });
});

test("health endpoint reports the service as healthy", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.equal(response.headers.has("x-powered-by"), false);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
