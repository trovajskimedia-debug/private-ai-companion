import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";
import { ApiError } from "./http";

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = "companion_session";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(":");
  if (!salt || !encoded) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(encoded, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function authenticated() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const session = await db.session.findUnique({ where: { id: digest(token) } });
  return !!session && session.expiresAt > new Date();
}

export async function requireAuth() {
  if (!(await authenticated()))
    throw new ApiError(401, "Unlock your private space to continue.");
}

export async function createSession() {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.session.create({ data: { id: digest(token), expiresAt } });
  return { token, expiresAt };
}

// Single-owner application: process-wide throttling also avoids trusting forwarded IP headers.
let attempts: number[] = [];
export function throttleLogin() {
  attempts = attempts.filter((time) => time > Date.now() - 60_000);
  if (attempts.length >= 10)
    throw new ApiError(429, "Too many unlock attempts. Try again in a minute.");
  attempts.push(Date.now());
}
