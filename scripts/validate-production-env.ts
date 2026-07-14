import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

import { validateServerEnvironment } from "../src/lib/env/server";

const pulledEnvironmentPath = path.resolve(".vercel", ".env.production.local");

if (existsSync(pulledEnvironmentPath)) {
  config({ path: pulledEnvironmentPath, override: false, quiet: true });
}

validateServerEnvironment(
  { ...process.env, VERCEL_ENV: "production" },
  { deployment: "production" },
);

console.info("Production environment validation passed.");
