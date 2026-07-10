import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    // Every integration suite shares one dedicated test database. Running the
    // files sequentially avoids serializable write conflicts between suites
    // that both create companies or memberships in parallel workers.
    fileParallelism: false,
    // These suites make real round-trips to a remote PostgreSQL test database,
    // so allow well beyond the 5s default for multi-step lifecycle scenarios.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
