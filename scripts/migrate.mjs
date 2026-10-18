import { existsSync, mkdirSync, openSync, closeSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Prisma 6 on this platform needs the SQLite file to exist before migrate deploy.
// Open exclusively: never truncate or replace an existing database.
const url = process.env.DATABASE_URL || "file:./dev.db";
if (!url.startsWith("file:"))
  throw new Error("This application requires a SQLite file DATABASE_URL.");
const filename = path.resolve("prisma", url.slice(5).split("?")[0]);
mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
if (!existsSync(filename)) closeSync(openSync(filename, "wx", 0o600));
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  },
);
process.exit(result.status ?? 1);
