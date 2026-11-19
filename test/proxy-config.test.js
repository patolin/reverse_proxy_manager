import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { writeTraefikConfig } from "../src/proxy/traefik-config.js";

test("manager domain gets HTTPS routing and a fallback service", () => {
  const directory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-proxy-"));

  try {
    const configPath = writeTraefikConfig([], directory, "Manager.Example.com.");
    const config = parse(readFileSync(configPath, "utf8"));

    assert.equal(config.http.routers["manager-http"].rule, "Host(`manager.example.com`)");
    assert.equal(config.http.routers["manager-http"].middlewares[0], "https-redirect");
    assert.equal(config.http.routers["manager-https"].tls.certResolver, "letsencrypt");
    assert.equal(config.http.services.manager.loadBalancer.servers[0].url, "http://app:3000");
    assert.equal(config.http.services["static-fallback"].loadBalancer.servers[0].url, "http://fallback:80");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("manager IP route stays on HTTP", () => {
  const directory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-proxy-"));

  try {
    const configPath = writeTraefikConfig([], directory, "192.0.2.10");
    const config = parse(readFileSync(configPath, "utf8"));

    assert.equal(config.http.routers["manager-http"].rule, "Host(`192.0.2.10`)");
    assert.equal(config.http.routers["manager-https"], undefined);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
