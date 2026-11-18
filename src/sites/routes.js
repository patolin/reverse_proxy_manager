import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { findAdminForRequest } from "../auth/sessions.js";
import { sites } from "../db/schema.js";
import { writeTraefikConfig } from "../proxy/traefik-config.js";
import { parseSiteInput } from "./validation.js";

function isUniqueConstraint(error) {
  return error?.code === "SQLITE_CONSTRAINT_UNIQUE";
}

function readSites(database) {
  return database.select().from(sites).orderBy(asc(sites.id)).all();
}

export function createSitesRouter(database, proxyDirectory) {
  const router = Router();

  router.use((request, response, next) => {
    if (!findAdminForRequest(database, request)) {
      return response.status(401).json({ error: "Authentication required" });
    }
    return next();
  });

  writeTraefikConfig(readSites(database), proxyDirectory);

  router.get("/", (_request, response) => {
    response.json({ sites: readSites(database) });
  });

  router.post("/", (request, response) => {
    let input;
    try {
      input = parseSiteInput(request.body);
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }

    const createdAt = Date.now();
    try {
      const site = database.transaction((transaction) => {
        const site = transaction
          .insert(sites)
          .values({ ...input, createdAt, updatedAt: createdAt })
          .returning()
          .get();
        writeTraefikConfig(readSites(transaction), proxyDirectory);
        return site;
      });

      return response.status(201).json({ site });
    } catch (error) {
      if (isUniqueConstraint(error)) {
        return response.status(409).json({ error: "A site with that host already exists" });
      }
      throw error;
    }
  });

  router.put("/:id", (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return response.status(400).json({ error: "Site ID must be a positive integer" });
    }

    let input;
    try {
      input = parseSiteInput(request.body);
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }

    try {
      const site = database.transaction((transaction) => {
        const site = transaction
          .update(sites)
          .set({ ...input, updatedAt: Date.now() })
          .where(eq(sites.id, id))
          .returning()
          .get();
        if (!site) {
          return undefined;
        }
        writeTraefikConfig(readSites(transaction), proxyDirectory);
        return site;
      });

      if (!site) {
        return response.status(404).json({ error: "Site not found" });
      }
      return response.json({ site });
    } catch (error) {
      if (isUniqueConstraint(error)) {
        return response.status(409).json({ error: "A site with that host already exists" });
      }
      throw error;
    }
  });

  router.delete("/:id", (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return response.status(400).json({ error: "Site ID must be a positive integer" });
    }

    const deleted = database.transaction((transaction) => {
      const deleted = transaction.delete(sites).where(eq(sites.id, id)).returning().get();
      if (deleted) {
        writeTraefikConfig(readSites(transaction), proxyDirectory);
      }
      return deleted;
    });

    if (!deleted) {
      return response.status(404).json({ error: "Site not found" });
    }
    return response.status(204).end();
  });

  return router;
}
