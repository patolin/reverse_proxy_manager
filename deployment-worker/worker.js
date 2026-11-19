import { execFile } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, renameSync, rmSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { createDeploymentQueue } from "../src/deployments/queue.js";
import {
  parseGitHubRepository,
  validateBranch,
  validateComposeFile,
} from "../src/deployments/validation.js";

const execFileAsync = promisify(execFile);
const composeNetworkName = process.env.PROXY_NETWORK_NAME ?? "reverse-proxy-manager-proxy";
const maxOutputBytes = 10 * 1024 * 1024;
const commandTimeoutMs = 30 * 60 * 1000;

export class DeploymentError extends Error {
  constructor(message) {
    super(message);
    this.name = "DeploymentError";
  }
}

function isWithinDirectory(parent, candidate) {
  const path = relative(parent, candidate);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function runCommand(command, args, cwd, failureMessage) {
  try {
    return await execFileAsync(command, args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      maxBuffer: maxOutputBytes,
      timeout: commandTimeoutMs,
      windowsHide: true,
    });
  } catch {
    throw new DeploymentError(failureMessage);
  }
}

function validateComposeService(config, serviceName) {
  const service = config.services?.[serviceName];
  if (!service) {
    throw new DeploymentError("The configured backend service was not found in the Compose file.");
  }

  const assignedNetworks = Object.keys(service.networks ?? {}).map(
    (networkKey) => config.networks?.[networkKey]?.name ?? networkKey,
  );
  if (!assignedNetworks.includes(composeNetworkName)) {
    throw new DeploymentError(
      `The backend service must join the external network "${composeNetworkName}".`,
    );
  }
}

export async function executeDeployment(job, {
  deploymentRoot = process.env.DEPLOYMENT_ROOT ?? "/deployments",
  run = runCommand,
} = {}) {
  if (!Number.isSafeInteger(job.siteId) || job.siteId < 1 || !/^[0-9a-f-]{36}$/.test(job.id)) {
    throw new DeploymentError("Deployment job identity is invalid.");
  }

  const repository = parseGitHubRepository(job.repository);
  const branch = validateBranch(job.branch);
  const composeFile = validateComposeFile(job.composeFile);
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(job.serviceName)) {
    throw new DeploymentError("Backend service name is invalid.");
  }

  const root = resolve(deploymentRoot);
  const siteDirectory = resolve(root, `site-${job.siteId}`);
  const attemptDirectory = resolve(root, `.site-${job.siteId}-${job.id}`);
  if (!isWithinDirectory(root, siteDirectory) || !isWithinDirectory(root, attemptDirectory)) {
    throw new DeploymentError("Deployment path is invalid.");
  }
  mkdirSync(root, { recursive: true });
  let previousDirectory;
  let previousMoved = false;
  let siteReplaced = false;

  try {
    await run("git", ["check-ref-format", "--branch", branch], root, "Git branch name is invalid.");
    await run("git", [
      "clone",
      "--depth",
      "1",
      "--single-branch",
      "--branch",
      branch,
      repository,
      attemptDirectory,
    ], root, "The public GitHub repository or branch could not be cloned.");

    const composePath = resolve(attemptDirectory, composeFile);
    if (!isWithinDirectory(attemptDirectory, composePath) || !existsSync(composePath)) {
      throw new DeploymentError("Compose file was not found inside the repository.");
    }
    const realComposePath = realpathSync(composePath);
    if (!isWithinDirectory(realpathSync(attemptDirectory), realComposePath)) {
      throw new DeploymentError("Compose file must resolve inside the repository.");
    }

    const projectName = `rpm-site-${job.siteId}`;
    const composeArgs = ["compose", "--project-name", projectName, "--file", realComposePath];
    const configResult = await run(
      "docker",
      [...composeArgs, "config", "--format", "json"],
      attemptDirectory,
      "Docker Compose configuration could not be loaded.",
    );
    let composeConfig;
    try {
      composeConfig = JSON.parse(configResult.stdout);
    } catch {
      throw new DeploymentError("Compose configuration could not be parsed.");
    }
    validateComposeService(composeConfig, job.serviceName);

    if (existsSync(siteDirectory)) {
      previousDirectory = `${siteDirectory}.old-${job.id}`;
      renameSync(siteDirectory, previousDirectory);
      previousMoved = true;
    }
    renameSync(attemptDirectory, siteDirectory);
    siteReplaced = true;

    await run(
      "docker",
      [
        "compose",
        "--project-name",
        projectName,
        "--file",
        join(siteDirectory, composeFile),
        "up",
        "--detach",
        "--build",
        "--remove-orphans",
      ],
      siteDirectory,
      "Docker Compose deployment failed. Review the repository and worker configuration.",
    );

    siteReplaced = false;
    if (previousDirectory) {
      try {
        rmSync(previousDirectory, { recursive: true, force: true });
      } catch {
        console.error(`Could not remove the previous checkout for site ${job.siteId}`);
      }
    }
    previousMoved = false;
  } catch (error) {
    rmSync(attemptDirectory, { recursive: true, force: true });
    if (siteReplaced && existsSync(siteDirectory)) {
      rmSync(siteDirectory, { recursive: true, force: true });
    }
    if (previousMoved && previousDirectory && existsSync(previousDirectory) && !existsSync(siteDirectory)) {
      renameSync(previousDirectory, siteDirectory);
      previousMoved = false;
    }
    if (error instanceof DeploymentError) {
      throw error;
    }
    throw new DeploymentError("Deployment failed. Check the worker logs.");
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runWorker(queue = createDeploymentQueue()) {
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  queue.markInterrupted();
  console.log("Deployment worker started");

  try {
    while (!stopping) {
      const job = queue.claimNext();
      if (!job) {
        await delay(1000);
        continue;
      }

      try {
        await executeDeployment(job);
        queue.complete(job.id, "succeeded");
        console.log(`Deployment ${job.id} completed`);
      } catch (error) {
        const message = error instanceof DeploymentError
          ? error.message
          : "Deployment failed. Check the worker logs.";
        queue.complete(job.id, "failed", message);
        console.error(`Deployment ${job.id} failed: ${message}`);
      }
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    queue.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runWorker();
}
