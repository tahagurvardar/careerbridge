import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function workflow(name: string) {
  return readFileSync(path.resolve(".github", "workflows", name), "utf8");
}

describe("deployment workflow contracts", () => {
  it("keeps CI triggers, permissions, cancellation, and test isolation explicit", () => {
    const ci = workflow("ci.yml");
    expect(ci).toContain("pull_request:");
    expect(ci).toContain("branches:\n      - main");
    expect(ci).toContain("contents: read");
    expect(ci).toContain("cancel-in-progress: true");
    expect(ci).toContain("TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}");
    expect(ci).toContain('RUN_DATABASE_INTEGRATION_TESTS: "true"');
    expect(ci).not.toMatch(/^\s+DATABASE_URL:.*TEST_DATABASE_URL/m);
  });

  it("builds before migrating and deploys only the prebuilt artifact", () => {
    const deploy = workflow("deploy-production.yml");
    const build = deploy.indexOf("vercel@${VERCEL_CLI_VERSION} build");
    const migrate = deploy.indexOf("npm run prisma:migrate:deploy");
    const prebuilt = deploy.indexOf("deploy --prebuilt --prod");
    const smoke = deploy.indexOf("npm run smoke:production");

    expect(deploy).toContain("workflow_dispatch:");
    expect(deploy).toContain("environment: production");
    expect(deploy).toContain("cancel-in-progress: false");
    expect(build).toBeGreaterThan(-1);
    expect(migrate).toBeGreaterThan(build);
    expect(prebuilt).toBeGreaterThan(migrate);
    expect(smoke).toBeGreaterThan(prebuilt);
  });
});
