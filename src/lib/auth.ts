import crypto from "crypto";

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(password + salt).digest("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.createHash("sha256").update(password + salt).digest("hex");
  return computed === hash;
}

export const SESSION_COOKIE = "session";
