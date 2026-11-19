import express from "express";
import helmet from "helmet";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createAuthRouter } from "./auth/routes.js";
import { createDatabase } from "./db/database.js";
import { createDeploymentQueue } from "./deployments/queue.js";
import { createDeploymentRouter } from "./deployments/routes.js";
import { createSitesRouter } from "./sites/routes.js";

export function createApp({ database, deploymentQueue, proxyDirectory }) {
  if (!database?.db || !deploymentQueue) {
    throw new TypeError("Database and deployment queue connections are required");
  }

  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.use("/api/auth", createAuthRouter(database.db));
  app.use("/api/sites", createSitesRouter(database.db, proxyDirectory, deploymentQueue));
  app.use("/api", createDeploymentRouter(database.db, deploymentQueue));
  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "API endpoint not found" });
  });
  if (process.env.NODE_ENV === "production") {
    const webDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
    app.use(express.static(webDirectory, { index: false }));
    app.use((request, response, next) => {
      if (request.method !== "GET") {
        return next();
      }
      response.sendFile(resolve(webDirectory, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  }
  app.use((error, _request, response, _next) => {
    if (error?.type === "entity.parse.failed") {
      return response.status(400).json({ error: "Invalid JSON body" });
    }
    if (error?.status === 413) {
      return response.status(413).json({ error: "Request body is too large" });
    }

    console.error("Unhandled request error", error);
    return response.status(500).json({ error: "Internal server error" });
  });

  return app;
}

export function startServer() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const database = createDatabase();
  const deploymentQueue = createDeploymentQueue();
  const app = createApp({ database, deploymentQueue });
  const host = process.env.HOST ?? "127.0.0.1";
  const server = app.listen(port, host, () => {
    console.log(`Reverse proxy manager listening on port ${port}`);
  });
  const closeConnections = () => {
    database.close();
    deploymentQueue.close();
  };
  server.once("close", closeConnections);
  server.once("error", closeConnections);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
