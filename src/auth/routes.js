import { Router } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { adminUsers } from "../db/schema.js";
import { verifyPassword } from "./password.js";
import {
  clearSessionCookie,
  createSession,
  findAdminForRequest,
  revokeSession,
  setSessionCookie,
} from "./sessions.js";

const dummyPasswordHash = [
  "scrypt",
  16384,
  8,
  1,
  Buffer.alloc(16).toString("base64url"),
  Buffer.alloc(64).toString("base64url"),
].join("$");

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({ error: "Too many login attempts. Try again later." });
  },
});

export function createAuthRouter(database) {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  router.post("/login", loginRateLimit, async (request, response) => {
    const body = request.body;
    const username =
      typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (
      !/^[a-z0-9._-]{3,64}$/.test(username) ||
      Buffer.byteLength(password, "utf8") > 1024 ||
      password.length === 0
    ) {
      await verifyPassword(password, dummyPasswordHash);
      return response.status(401).json({ error: "Invalid username or password" });
    }

    const administrator = database
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        passwordHash: adminUsers.passwordHash,
      })
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .get();
    const passwordMatches = await verifyPassword(
      password,
      administrator?.passwordHash ?? dummyPasswordHash,
    );

    if (!administrator || !passwordMatches) {
      return response.status(401).json({ error: "Invalid username or password" });
    }

    const session = createSession(database, administrator.id);
    setSessionCookie(response, session.token, session.expiresAt);
    return response.json({
      user: { id: administrator.id, username: administrator.username },
    });
  });

  router.get("/me", (request, response) => {
    const administrator = findAdminForRequest(database, request);
    if (!administrator) {
      return response.status(401).json({ error: "Authentication required" });
    }
    return response.json({ user: administrator });
  });

  router.post("/logout", (request, response) => {
    revokeSession(database, request);
    clearSessionCookie(response);
    return response.status(204).end();
  });

  return router;
}
