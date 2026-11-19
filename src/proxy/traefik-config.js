import { randomBytes } from "node:crypto";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isIP } from "node:net";
import { stringify } from "yaml";
import { normalizeHost } from "../sites/validation.js";

function createDynamicConfig(sites, managerHost) {
  const routers = {};
  const services = {};
  const middlewares = {};

  for (const site of sites) {
    if (!site.enabled) {
      continue;
    }

    const backendName = `site-${site.id}-backend`;
    const errorMiddlewareName = `site-${site.id}-errors`;
    const hostRule = isIP(site.host) === 6 ? `[${site.host}]` : site.host;

    services[backendName] = {
      loadBalancer: {
        servers: [{ url: `http://${site.backendService}:${site.backendPort}` }],
        passHostHeader: true,
      },
    };
    middlewares[errorMiddlewareName] = {
      errors: {
        status: ["500-599"],
        service: "static-fallback",
        query: "/{status}.html",
      },
    };

    if (isIP(site.host) === 0) {
      routers[`site-${site.id}-http`] = {
        rule: `Host(\`${hostRule}\`)`,
        entryPoints: ["web"],
        middlewares: ["https-redirect"],
        service: backendName,
      };
      routers[`site-${site.id}-https`] = {
        rule: `Host(\`${hostRule}\`)`,
        entryPoints: ["websecure"],
        middlewares: [errorMiddlewareName],
        service: backendName,
        tls: { certResolver: "letsencrypt" },
      };
      middlewares["https-redirect"] = {
        redirectScheme: { scheme: "https", permanent: true },
      };
    } else {
      routers[`site-${site.id}-http`] = {
        rule: `Host(\`${hostRule}\`)`,
        entryPoints: ["web"],
        middlewares: [errorMiddlewareName],
        service: backendName,
      };
    }
  }

  if (managerHost) {
    const host = normalizeHost(managerHost);
    const hostRule = isIP(host) === 6 ? `[${host}]` : host;
    services.manager = {
      loadBalancer: {
        servers: [{ url: "http://app:3000" }],
        passHostHeader: true,
      },
    };

    if (isIP(host) === 0) {
      routers["manager-http"] = {
        rule: `Host(\`${hostRule}\`)`,
        entryPoints: ["web"],
        middlewares: ["https-redirect"],
        service: "manager",
      };
      routers["manager-https"] = {
        rule: `Host(\`${hostRule}\`)`,
        entryPoints: ["websecure"],
        middlewares: ["manager-errors"],
        service: "manager",
        tls: { certResolver: "letsencrypt" },
      };
      middlewares["https-redirect"] = {
        redirectScheme: { scheme: "https", permanent: true },
      };
    } else {
      routers["manager-http"] = {
        rule: `Host(\`${hostRule}\`)`,
        entryPoints: ["web"],
        middlewares: ["manager-errors"],
        service: "manager",
      };
    }

    middlewares["manager-errors"] = {
      errors: {
        status: ["500-599"],
        service: "static-fallback",
        query: "/{status}.html",
      },
    };
  }

  if (Object.keys(routers).length > 0) {
    services["static-fallback"] = {
      loadBalancer: {
        servers: [{ url: "http://fallback:80" }],
        passHostHeader: true,
      },
    };
  }

  return { http: { routers, services, middlewares } };
}

export function writeTraefikConfig(
  sites,
  directory = process.env.TRAEFIK_DYNAMIC_DIRECTORY ?? "./data/traefik",
  managerHost = process.env.ADMIN_HOST,
) {
  const resolvedDirectory = resolve(directory);
  mkdirSync(resolvedDirectory, { recursive: true });

  const configPath = resolve(resolvedDirectory, "sites.yml");
  const temporaryPath = `${configPath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;

  try {
    writeFileSync(temporaryPath, stringify(createDynamicConfig(sites, managerHost)), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o640,
    });
    renameSync(temporaryPath, configPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }

  return configPath;
}
