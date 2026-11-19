import { posix as posixPath } from "node:path";

export function parseGitHubRepository(value) {
  if (typeof value !== "string" || value.length > 300) {
    throw new TypeError("Repository must be a public GitHub URL");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("Repository must be a public GitHub URL");
  }

  const path = url.pathname.replace(/\/+$/, "").replace(/\.git$/, "");
  const match = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(path);
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !match
  ) {
    throw new TypeError("Repository must be a public GitHub URL in owner/repository format");
  }

  return `https://github.com/${match[1]}/${match[2]}.git`;
}

export function validateBranch(value) {
  if (
    typeof value !== "string" ||
    value.length > 255 ||
    !/^[A-Za-z0-9_][A-Za-z0-9._/-]*$/.test(value) ||
    value.includes("..") ||
    value.includes("//") ||
    value.endsWith("/") ||
    value.endsWith(".") ||
    value.includes("@{")
  ) {
    throw new TypeError("Branch must be a valid Git branch name");
  }
  return value;
}

export function validateComposeFile(value) {
  if (
    typeof value !== "string" ||
    value.length > 200 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    !/^[A-Za-z0-9._/-]+\.ya?ml$/.test(value) ||
    posixPath.normalize(value) !== value ||
    value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new TypeError("Compose file must be a relative YAML file path inside the repository");
  }
  return value;
}

export function parseDeploymentInput(input, serviceName) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("A JSON object is required");
  }

  return {
    repository: parseGitHubRepository(input.repository),
    branch: validateBranch(input.branch ?? "main"),
    composeFile: validateComposeFile(input.composeFile ?? "compose.yaml"),
    serviceName,
  };
}
