import { eq } from "drizzle-orm";
import { adminUsers } from "../db/schema.js";
import { hashPassword, validatePassword } from "./password.js";

export async function createAdminUser(database, username, password) {
  if (typeof username !== "string") {
    throw new TypeError("Username must be 3 to 64 characters using letters, numbers, '.', '_' or '-'");
  }

  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(normalizedUsername)) {
    throw new TypeError("Username must be 3 to 64 characters using letters, numbers, '.', '_' or '-'");
  }
  if (!validatePassword(password)) {
    throw new TypeError("Password must be at least 12 characters and no more than 1024 bytes");
  }

  const existingUser = database
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, normalizedUsername))
    .get();
  if (existingUser) {
    throw new Error("An administrator with that username already exists");
  }

  const passwordHash = await hashPassword(password);
  const createdAt = Date.now();
  const result = database
    .insert(adminUsers)
    .values({ username: normalizedUsername, passwordHash, createdAt })
    .run();

  return { id: Number(result.lastInsertRowid), username: normalizedUsername, createdAt };
}
