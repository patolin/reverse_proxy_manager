import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  createDeploymentQueue,
  DeploymentInProgressError,
} from "../src/deployments/queue.js";
import {
  parseDeploymentInput,
  parseGitHubRepository,
  validateBranch,
  validateComposeFile,
} from "../src/deployments/validation.js";
import { DeploymentError, executeDeployment } from "../deployment-worker/worker.js";

test("deployment input accepts public GitHub URLs and rejects unsafe parameters", () => {
  assert.deepEqual(parseDeploymentInput({
    repository: "https://github.com/example/app",
    branch: "main",
    composeFile: "deploy/compose.yaml",
  }, "web"), {
    repository: "https://github.com/example/app.git",
    branch: "main",
    composeFile: "deploy/compose.yaml",
    serviceName: "web",
  });
  assert.throws(() => parseGitHubRepository("https://github.com.attacker.test/example/app"), /public GitHub URL/);
  assert.throws(() => validateBranch("--upload-pack=bad"), /Git branch name/);
  assert.throws(() => validateComposeFile("../compose.yaml"), /relative YAML file path/);
  assert.throws(() => validateComposeFile("/tmp/compose.yaml"), /relative YAML file path/);
});

test("deployment queue claims one job at a time and records completion", () => {
  const queue = createDeploymentQueue(":memory:");
  const input = {
    siteId: 12,
    repository: "https://github.com/example/app.git",
    branch: "main",
    composeFile: "compose.yaml",
    serviceName: "web",
  };

  try {
    const queued = queue.enqueue(input);
    assert.equal(queued.status, "queued");
    assert.throws(() => queue.enqueue(input), DeploymentInProgressError);

    const running = queue.claimNext();
    assert.equal(running.id, queued.id);
    assert.equal(running.status, "running");
    queue.complete(running.id, "succeeded");

    assert.equal(queue.listForSite(12)[0].status, "succeeded");
    assert.equal(queue.claimNext(), undefined);
  } finally {
    queue.close();
  }
});

test("worker runs only validated Compose deployments and requires the shared proxy network", async () => {
  const directory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-deploy-"));
  const job = {
    id: randomUUID(),
    siteId: 3,
    repository: "https://github.com/example/app.git",
    branch: "main",
    composeFile: "compose.yaml",
    serviceName: "web",
  };
  const commands = [];
  const run = async (command, args, cwd) => {
    commands.push({ command, args, cwd });
    if (command === "git" && args[0] === "clone") {
      const checkout = args.at(-1);
      mkdirSync(checkout, { recursive: true });
      writeFileSync(join(checkout, "compose.yaml"), "services: {}");
    }
    if (command === "docker" && args.includes("--format")) {
      return {
        stdout: JSON.stringify({
          services: { web: { networks: { proxy: {} } } },
          networks: { proxy: { name: "reverse-proxy-manager-proxy" } },
        }),
      };
    }
    return { stdout: "" };
  };

  try {
    await executeDeployment(job, { deploymentRoot: directory, run });
    assert.ok(readFileSync(join(directory, "site-3", "compose.yaml"), "utf8"));
    assert.ok(commands.some(({ command, args, cwd }) =>
      command === "docker" &&
      args.includes("up") &&
      args.includes(join(directory, "site-3", "compose.yaml")) &&
      cwd === join(directory, "site-3"),
    ));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  const unsafeDirectory = mkdtempSync(join(tmpdir(), "reverse-proxy-manager-deploy-"));
  const unsafeJob = { ...job, id: randomUUID(), siteId: 4 };
  const unsafeRun = async (command, args) => {
    if (command === "git" && args[0] === "clone") {
      mkdirSync(args.at(-1), { recursive: true });
      writeFileSync(join(args.at(-1), "compose.yaml"), "services: {}");
    }
    if (command === "docker" && args.includes("--format")) {
      return {
        stdout: JSON.stringify({
          services: { web: { networks: { default: {} } } },
          networks: { default: { name: "rpm-site-4_default" } },
        }),
      };
    }
    return { stdout: "" };
  };

  try {
    await assert.rejects(
      executeDeployment(unsafeJob, { deploymentRoot: unsafeDirectory, run: unsafeRun }),
      (error) =>
        error instanceof DeploymentError &&
        error.message.includes("external network"),
    );
  } finally {
    rmSync(unsafeDirectory, { recursive: true, force: true });
  }
});
