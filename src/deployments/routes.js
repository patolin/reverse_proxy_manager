import { eq } from "drizzle-orm";
import { Router } from "express";
import { findAdminForRequest } from "../auth/sessions.js";
import { sites } from "../db/schema.js";
import { DeploymentInProgressError } from "./queue.js";
import { parseDeploymentInput } from "./validation.js";

function parseSiteId(value) {
  const siteId = Number(value);
  return Number.isSafeInteger(siteId) && siteId > 0 ? siteId : undefined;
}

export function createDeploymentRouter(database, queue) {
  const router = Router();

  router.use((request, response, next) => {
    if (!findAdminForRequest(database, request)) {
      return response.status(401).json({ error: "Authentication required" });
    }
    return next();
  });

  router.get("/deployments", (_request, response) => {
    response.json({ deployments: queue.listRecent() });
  });

  router.get("/sites/:siteId/deployments", (request, response) => {
    const siteId = parseSiteId(request.params.siteId);
    if (!siteId) {
      return response.status(400).json({ error: "Site ID must be a positive integer" });
    }

    const site = database.select({ id: sites.id }).from(sites).where(eq(sites.id, siteId)).get();
    if (!site) {
      return response.status(404).json({ error: "Site not found" });
    }

    return response.json({ deployments: queue.listForSite(siteId) });
  });

  router.post("/sites/:siteId/deployments", (request, response) => {
    const siteId = parseSiteId(request.params.siteId);
    if (!siteId) {
      return response.status(400).json({ error: "Site ID must be a positive integer" });
    }

    const site = database
      .select({ id: sites.id, backendService: sites.backendService })
      .from(sites)
      .where(eq(sites.id, siteId))
      .get();
    if (!site) {
      return response.status(404).json({ error: "Site not found" });
    }

    let input;
    try {
      input = parseDeploymentInput(request.body, site.backendService);
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }

    try {
      const deployment = queue.enqueue({ siteId, ...input });
      return response.status(202).json({ deployment });
    } catch (error) {
      if (error instanceof DeploymentInProgressError) {
        return response.status(409).json({ error: error.message });
      }
      throw error;
    }
  });

  return router;
}
