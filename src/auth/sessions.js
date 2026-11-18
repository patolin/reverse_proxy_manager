import { createHash, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { adminSessions, adminUsers } from "../db/schema.js";

const cookieName = "rpm_session";
const sessionLifetimeMs = 12 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader !== "string") {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

function secureCookieAttribute() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function createSession(database, adminUserId, now = Date.now()) {
  database.delete(adminSessions).where(lt(adminSessions.expiresAt, now)).run();

  const token = randomBytes(32).toString("base64url");
  database
    .insert(adminSessions)
    .values({
      sessionHash: hashToken(token),
      adminUserId,
      createdAt: now,
      expiresAt: now + sessionLifetimeMs,
    })
    .run();

  return { token, expiresAt: now + sessionLifetimeMs };
}

export function findAdminForRequest(database, request, now = Date.now()) {
  const token = getSessionToken(request);
  if (!token) {
    return undefined;
  }

  const sessionHash = hashToken(token);
  const session = database
    .select({
      sessionHash: adminSessions.sessionHash,
      expiresAt: adminSessions.expiresAt,
      id: adminUsers.id,
      username: adminUsers.username,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(eq(adminSessions.sessionHash, sessionHash))
    .get();

  if (!session) {
    return undefined;
  }
  if (session.expiresAt <= now) {
    database.delete(adminSessions).where(eq(adminSessions.sessionHash, sessionHash)).run();
    return undefined;
  }

  return { id: session.id, username: session.username };
}

export function revokeSession(database, request) {
  const token = getSessionToken(request);
  if (token) {
    database.delete(adminSessions).where(eq(adminSessions.sessionHash, hashToken(token))).run();
  }
}

export function setSessionCookie(response, token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookieAttribute()}`,
  );
}

export function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookieAttribute()}`,
  );
}
