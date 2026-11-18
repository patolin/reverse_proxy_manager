import { createAdminUser } from "../auth/admin-users.js";
import { createDatabase } from "../db/database.js";

let database;

try {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD to create an administrator");
  }

  database = createDatabase();
  const administrator = await createAdminUser(database.db, username, password);
  console.log(`Created administrator "${administrator.username}".`);
} catch (error) {
  console.error(`Administrator creation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  database?.close();
}
