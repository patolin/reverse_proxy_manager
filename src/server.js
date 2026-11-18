import express from "express";
import { pathToFileURL } from "node:url";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  return app;
}

export function startServer() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const app = createApp();
  return app.listen(port, "0.0.0.0", () => {
    console.log(`Reverse proxy manager listening on port ${port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
