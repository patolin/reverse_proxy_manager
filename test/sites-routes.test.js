import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { parse } from "yaml";
import { createAdminUser } from "../src/auth/admin-users.js";
import { createDatabase } from "../src/db/database.js";
import { createApp } from "../src/server.js";

let server;
let baseUrl;
let database;
let proxyDirectory;
let sessionCookie;

before(async () => {
  database = createDatabase(":memory:");
  await createAdminUser(database.db, "test-admin", "a-long-test-password");
  proxyDirectory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-proxy-"));
  server = createApp({ database, proxyDirectory }).listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: "a-long-test-password" }),
  });
  sessionCookie = response.headers.get("set-cookie")?.split(";")[0];
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  database.close();
  rmSync(proxyDirectory, { recursive: true, force: true });
});

test("site management validates input and updates Traefik routes", async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/sites`);
  assert.equal(unauthenticated.status, 401);

  const invalid = await fetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { cookie: sessionCookie, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Unsafe target",
      host: "unsafe.example.com",
      backendService: "backend:8080",
      backendPort: 8080,
    }),
  });
  assert.equal(invalid.status, 400);

  const domainResponse = await fetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { cookie: sessionCookie, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Example app",
      host: "WWW.Example.com.",
      backendService: "example-app",
      backendPort: 8080,
    }),
  });
  assert.equal(domainResponse.status, 201);
  const domainSite = (await domainResponse.json()).site;
  assert.equal(domainSite.host, "www.example.com");

  const duplicate = await fetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { cookie: sessionCookie, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Duplicate",
      host: "www.example.com",
      backendService: "another-app",
      backendPort: 8080,
    }),
  });
  assert.equal(duplicate.status, 409);

  const ipResponse = await fetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { cookie: sessionCookie, "content-type": "application/json" },
    body: JSON.stringify({
      name: "IP app",
      host: "203.0.113.15",
      backendService: "ip-app",
      backendPort: 3000,
    }),
  });
  assert.equal(ipResponse.status, 201);
  const ipSite = (await ipResponse.json()).site;

  let config = parse(readFileSync(join(proxyDirectory, "sites.yml"), "utf8"));
  assert.equal(config.http.routers["site-1-https"].rule, "Host(`www.example.com`)");
  assert.equal(config.http.routers["site-1-https"].tls.certResolver, "letsencrypt");
  assert.equal(config.http.routers["site-1-http"].middlewares[0], "https-redirect");
  assert.equal(config.http.routers["site-2-http"].rule, "Host(`203.0.113.15`)");
  assert.equal(config.http.routers["site-2-https"], undefined);
  assert.equal(config.http.services["site-1-backend"].loadBalancer.servers[0].url, "http://example-app:8080");
  assert.deepEqual(config.http.middlewares["site-1-errors"].errors.status, ["500-599"]);
  assert.equal(config.http.services["static-fallback"].loadBalancer.servers[0].url, "http://fallback:80");

  const update = await fetch(`${baseUrl}/api/sites/${domainSite.id}`, {
    method: "PUT",
    headers: { cookie: sessionCookie, "content-type": "application/json" },
    body: JSON.stringify({
      name: domainSite.name,
      host: domainSite.host,
      backendService: domainSite.backendService,
      backendPort: domainSite.backendPort,
      enabled: false,
    }),
  });
  assert.equal(update.status, 200);
  config = parse(readFileSync(join(proxyDirectory, "sites.yml"), "utf8"));
  assert.equal(config.http.routers["site-1-https"], undefined);

  const remove = await fetch(`${baseUrl}/api/sites/${ipSite.id}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie },
  });
  assert.equal(remove.status, 204);
  const list = await fetch(`${baseUrl}/api/sites`, { headers: { cookie: sessionCookie } });
  assert.equal((await list.json()).sites.length, 1);
});
