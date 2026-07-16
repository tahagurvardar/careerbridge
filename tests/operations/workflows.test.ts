import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function workflow(name: string) {
  return readFileSync(
    path.resolve(".github", "workflows", name),
    "utf8",
  ).replace(/\r\n?/g, "\n");
}

function integrationJob(ci: string) {
  const start = ci.indexOf("\n  integration:");
  expect(start).toBeGreaterThan(-1);
  return ci.slice(start);
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

  it("serializes integration jobs that share the isolated test database", () => {
    const integration = integrationJob(workflow("ci.yml"));

    expect(integration).toContain(
      "concurrency:\n      group: careerbridge-isolated-test-database\n      cancel-in-progress: false",
    );
  });

  it("sources the isolated test database only from the GitHub secret", () => {
    const ci = workflow("ci.yml");
    const integration = integrationJob(ci);

    expect(integration).toContain(
      "TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}",
    );
    // Every TEST_DATABASE_URL assignment in the workflow must come from the
    // secret; no inline or derived connection strings.
    const assignments = ci.match(/^\s*TEST_DATABASE_URL:.*$/gm) ?? [];
    expect(assignments.length).toBeGreaterThan(0);
    for (const assignment of assignments) {
      expect(assignment.trim()).toBe(
        "TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}",
      );
    }
    // The isolated test database must never be exposed as DATABASE_URL.
    expect(integration).not.toMatch(/^\s+DATABASE_URL:/m);
  });

  it("provides synthetic CI-only auth values to the integration job", () => {
    const integration = integrationJob(workflow("ci.yml"));

    expect(integration).toContain("BETTER_AUTH_URL: https://ci.example.test");
    expect(integration).toContain(
      "BETTER_AUTH_SECRET: ci-only-secret-that-is-never-used-000000000000",
    );
    expect(integration).toContain('RUN_DATABASE_INTEGRATION_TESTS: "true"');
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

  it("maps and validates the Vercel automation bypass secret", () => {
    const deploy = workflow("deploy-production.yml");

    expect(deploy).toContain(
      "VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}",
    );
    expect(deploy).toContain(
      "for name in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_AUTOMATION_BYPASS_SECRET DIRECT_URL; do",
    );
  });
});
