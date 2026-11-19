import { isIP } from "node:net";
import { domainToASCII } from "node:url";

const reservedBackendServices = new Set(["app", "fallback", "traefik"]);

export function normalizeHost(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("Host must be a domain name or IP address");
  }

  const candidate = value.trim().replace(/\.$/, "");
  if (isIP(candidate) > 0) {
    return candidate.toLowerCase();
  }

  const hostname = domainToASCII(candidate).toLowerCase();
  const labels = hostname.split(".");
  if (
    !hostname ||
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  ) {
    throw new TypeError("Host must be a fully qualified domain name or IP address");
  }

  return hostname;
}

export function parseSiteInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("A JSON object is required");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 80) {
    throw new TypeError("Name must be between 1 and 80 characters");
  }

  const host = normalizeHost(input.host);
  if (process.env.ADMIN_HOST && normalizeHost(process.env.ADMIN_HOST) === host) {
    throw new TypeError("Host is reserved for the manager");
  }
  const backendService =
    typeof input.backendService === "string" ? input.backendService.trim().toLowerCase() : "";
  if (
    !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(backendService) ||
    reservedBackendServices.has(backendService)
  ) {
    throw new TypeError("Backend service must be a valid application container service name");
  }

  if (!Number.isInteger(input.backendPort) || input.backendPort < 1 || input.backendPort > 65535) {
    throw new TypeError("Backend port must be an integer between 1 and 65535");
  }
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
    throw new TypeError("Enabled must be a boolean");
  }

  return {
    name,
    host,
    backendService,
    backendPort: input.backendPort,
    enabled: input.enabled ?? true,
  };
}
