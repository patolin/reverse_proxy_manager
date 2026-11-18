import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;
const maxMemory = 64 * 1024 * 1024;
const minimumPasswordLength = 12;

export function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= minimumPasswordLength &&
    Buffer.byteLength(password, "utf8") <= 1024
  );
}

export async function hashPassword(password) {
  if (!validatePassword(password)) {
    throw new TypeError("Password must be at least 12 characters and no more than 1024 bytes");
  }

  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: maxMemory,
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || typeof encodedHash !== "string") {
    return false;
  }

  const [algorithm, encodedCost, encodedBlockSize, encodedParallelization, encodedSalt, encodedKey] =
    encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    encodedCost !== String(cost) ||
    encodedBlockSize !== String(blockSize) ||
    encodedParallelization !== String(parallelization) ||
    !encodedSalt ||
    !encodedKey
  ) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");
  if (salt.length !== 16 || expectedKey.length !== keyLength) {
    return false;
  }

  const actualKey = await scryptAsync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: maxMemory,
  });

  return timingSafeEqual(actualKey, expectedKey);
}
