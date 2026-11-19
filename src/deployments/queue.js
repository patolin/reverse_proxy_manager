import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const jobColumns = `
  id, site_id, repository, branch, compose_file, service_name,
  status, error, created_at, started_at, completed_at
`;

function mapJob(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    siteId: row.site_id,
    repository: row.repository,
    branch: row.branch,
    composeFile: row.compose_file,
    serviceName: row.service_name,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export class DeploymentInProgressError extends Error {
  constructor() {
    super("A deployment is already queued or running for this site");
    this.name = "DeploymentInProgressError";
  }
}

export function createDeploymentQueue(queuePath = process.env.DEPLOYMENT_QUEUE_PATH ?? "./data/deployments.sqlite") {
  const path = queuePath === ":memory:" || isAbsolute(queuePath)
    ? queuePath
    : resolve(process.cwd(), queuePath);
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const client = new Database(path);
  client.pragma("busy_timeout = 5000");
  client.pragma("journal_mode = WAL");
  client.exec(`
    CREATE TABLE IF NOT EXISTS deployment_jobs (
      id TEXT PRIMARY KEY,
      site_id INTEGER NOT NULL,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL,
      compose_file TEXT NOT NULL,
      service_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
      error TEXT,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS deployment_jobs_site_created_idx
      ON deployment_jobs (site_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS deployment_jobs_status_created_idx
      ON deployment_jobs (status, created_at);
  `);

  const findById = client.prepare(`SELECT ${jobColumns} FROM deployment_jobs WHERE id = ?`);
  const insertJob = client.prepare(`
    INSERT INTO deployment_jobs (
      id, site_id, repository, branch, compose_file, service_name,
      status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)
  `);
  const enqueueTransaction = client.transaction((job) => {
    const activeJob = client
      .prepare("SELECT id FROM deployment_jobs WHERE site_id = ? AND status IN ('queued', 'running')")
      .get(job.siteId);
    if (activeJob) {
      throw new DeploymentInProgressError();
    }

    const id = randomUUID();
    insertJob.run(
      id,
      job.siteId,
      job.repository,
      job.branch,
      job.composeFile,
      job.serviceName,
      Date.now(),
    );
    return mapJob(findById.get(id));
  });

  const claimTransaction = client.transaction(() => {
    const row = client
      .prepare(`SELECT ${jobColumns} FROM deployment_jobs WHERE status = 'queued' ORDER BY created_at, id LIMIT 1`)
      .get();
    if (!row) {
      return undefined;
    }

    const startedAt = Date.now();
    const update = client
      .prepare("UPDATE deployment_jobs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'")
      .run(startedAt, row.id);
    return update.changes === 1 ? mapJob(findById.get(row.id)) : undefined;
  });

  return {
    enqueue: (job) => enqueueTransaction.immediate(job),
    listForSite: (siteId, limit = 10) =>
      client
        .prepare(`SELECT ${jobColumns} FROM deployment_jobs WHERE site_id = ? ORDER BY created_at DESC LIMIT ?`)
        .all(siteId, limit)
        .map(mapJob),
    listRecent: (limit = 100) =>
      client
        .prepare(`SELECT ${jobColumns} FROM deployment_jobs ORDER BY created_at DESC LIMIT ?`)
        .all(limit)
        .map(mapJob),
    claimNext: () => claimTransaction.immediate(),
    complete: (id, status, error = null) => {
      if (!["succeeded", "failed"].includes(status)) {
        throw new TypeError("Deployment completion status must be succeeded or failed");
      }
      client
        .prepare("UPDATE deployment_jobs SET status = ?, error = ?, completed_at = ? WHERE id = ? AND status = 'running'")
        .run(status, error, Date.now(), id);
    },
    markInterrupted: () => {
      client
        .prepare(`
          UPDATE deployment_jobs
          SET status = 'failed', error = 'Worker restarted before deployment completed', completed_at = ?
          WHERE status = 'running'
        `)
        .run(Date.now());
    },
    close: () => client.close(),
  };
}
