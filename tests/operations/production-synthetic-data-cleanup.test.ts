import { describe, expect, it } from "vitest";

import {
  APPROVED_ROOTS,
  CleanupSafetyError,
  EXECUTE_CONFIRMATION,
  EXECUTION_DELETE_ORDER,
  FORBIDDEN_DEPENDENCY_TYPES,
  assertExecuteAuthorization,
  assertPlanMatchesSnapshot,
  createPlan,
  digestPlan,
  discoverCompanies,
  discoverUsers,
  formatRedactedSummary,
  parseArguments,
  parsePlanEnvelope,
  runTransaction,
  validateSnapshot,
  type CleanupPlan,
  type ForbiddenCounts,
  type GraphSnapshot,
  type SafeRecords,
  type SqlClient,
} from "../../scripts/production-synthetic-data-cleanup";

const timestamp = "2026-07-13T10:00:00.000Z";

function forbiddenCounts(): ForbiddenCounts {
  return Object.fromEntries(
    FORBIDDEN_DEPENDENCY_TYPES.map((type) => [type, 0]),
  ) as ForbiddenCounts;
}

function validRecords(): SafeRecords {
  const users = APPROVED_ROOTS.flatMap((root, rootIndex) =>
    (["CANDIDATE", "RECRUITER", "ADMIN"] as const).map((role) => ({
      id: `user-${rootIndex}-${role.toLowerCase()}`,
      rootKey: root.key,
      role,
      status: "ACTIVE" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
  const companies = APPROVED_ROOTS.map((root, index) => ({
    id: `company-${index}`,
    rootKey: root.key,
    slug: root.companySlug,
    status: "VISIBLE" as const,
    publicationStatus: "PUBLISHED" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return {
    User: users,
    Account: users.map((user) => ({
      id: `account-${user.id}`,
      userId: user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    Session: users.slice(0, 5).map((user) => ({
      id: `session-${user.id}`,
      userId: user.id,
      expiresAt: "2026-07-20T10:00:00.000Z",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    CandidateProfile: [
      {
        id: "candidate-profile-0",
        userId: "user-0-candidate",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    RecruiterProfile: [
      {
        id: "recruiter-profile-1",
        userId: "user-1-recruiter",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    Company: companies,
    CompanyMembership: companies.map((company, index) => ({
      id: `membership-${index}`,
      userId: `user-${index}-recruiter`,
      companyId: company.id,
      role: "OWNER" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    Job: companies.map((company, index) => ({
      id: `job-${index}`,
      companyId: company.id,
      slug: APPROVED_ROOTS[index]!.jobSlug,
      status: "PUBLISHED" as const,
      moderationStatus: "VISIBLE" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  };
}

function validSnapshot(): GraphSnapshot {
  return { records: validRecords(), forbiddenCounts: forbiddenCounts() };
}

function emptySnapshot(): GraphSnapshot {
  return {
    records: {
      User: [],
      Account: [],
      Session: [],
      CandidateProfile: [],
      RecruiterProfile: [],
      Company: [],
      CompanyMembership: [],
      Job: [],
    },
    forbiddenCounts: forbiddenCounts(),
  };
}

function envelope(plan: CleanupPlan, digest = digestPlan(plan)): string {
  return JSON.stringify({ digest, plan });
}

describe("production synthetic data cleanup safety model", () => {
  it("contains only the two exact approved roots", () => {
    expect(APPROVED_ROOTS).toEqual([
      {
        key: "phase-6a-browser",
        displayName: "Phase 6A Browser",
        userMarker: "cb-browser-p6a-20260713-001",
        companySlug: "cb-browser-p6a-20260713-001-company",
        jobSlug: "cb-browser-p6a-20260713-001-job",
      },
      {
        key: "phase-7b-verification",
        displayName: "cb-verify-1783989194946-mrjx3sn6",
        userMarker: "cb-verify-1783989194946-mrjx3sn6",
        companySlug: "cb-verify-1783989194946-mrjx3sn6-company",
        jobSlug: "cb-verify-1783989194946-mrjx3sn6-job",
      },
    ]);
  });

  it("accepts the exact production Company and Job slugs", () => {
    const snapshot = validSnapshot();
    expect(validateSnapshot(snapshot)).toBe("ready");

    const plan = createPlan(snapshot, new Date(timestamp));
    expect(plan).toMatchObject({
      schemaVersion: 2,
      approvedUserMarkers: APPROVED_ROOTS.map((root) => root.userMarker),
      approvedCompanySlugs: APPROVED_ROOTS.map((root) => root.companySlug),
      approvedJobSlugs: APPROVED_ROOTS.map((root) => root.jobSlug),
    });
    expect(plan.records.Company.map((company) => company.slug)).toEqual(
      APPROVED_ROOTS.map((root) => root.companySlug),
    );
    expect(plan.records.Job.map((job) => job.slug)).toEqual(
      APPROVED_ROOTS.map((root) => root.jobSlug),
    );
  });

  it("uses User markers as the User discovery identifiers", async () => {
    const valuesSeen: unknown[][] = [];
    class UserDiscoveryClient implements SqlClient {
      async query<Row extends Record<string, unknown>>(
        _text: string,
        values?: unknown[],
      ) {
        valuesSeen.push(values ?? []);
        return { rows: [] as Row[], rowCount: 0 };
      }
    }

    await expect(discoverUsers(new UserDiscoveryClient())).resolves.toEqual([]);
    expect(valuesSeen).toEqual(
      APPROVED_ROOTS.map((root) => [root.displayName, root.userMarker]),
    );
  });

  it("discovers only the exact production Company slugs", async () => {
    let queryText = "";
    let queryValues: unknown[] | undefined;
    class CompanyDiscoveryClient implements SqlClient {
      async query<Row extends Record<string, unknown>>(
        text: string,
        values?: unknown[],
      ) {
        queryText = text;
        queryValues = values;
        const rows = APPROVED_ROOTS.map((root, index) => ({
          id: `discovered-company-${index}`,
          slug: root.companySlug,
          status: "VISIBLE",
          isPublished: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        }));
        return { rows: rows as unknown as Row[], rowCount: rows.length };
      }
    }

    const discovered = await discoverCompanies(new CompanyDiscoveryClient());
    expect(queryText).toContain(
      "WHERE synthetic_company.slug = ANY($1::text[])",
    );
    expect(queryValues).toEqual([
      APPROVED_ROOTS.map((root) => root.companySlug),
    ]);
    expect(discovered.map((company) => company.slug)).toEqual(
      APPROVED_ROOTS.map((root) => root.companySlug),
    );
    expect(queryValues).not.toEqual([
      APPROVED_ROOTS.map((root) => root.userMarker),
    ]);
  });

  it("rejects the old marker-only Company slugs", () => {
    const snapshot = validSnapshot();
    snapshot.records.Company[0]!.slug = APPROVED_ROOTS[0].userMarker;
    expect(() => validateSnapshot(snapshot)).toThrow(
      `exact approved slug ${APPROVED_ROOTS[0].companySlug}`,
    );
  });

  it("rejects an unexpected additional Job for an approved Company", () => {
    const snapshot = validSnapshot();
    snapshot.records.Job.push({
      ...snapshot.records.Job[0]!,
      id: "unexpected-additional-job",
      slug: "unexpected-additional-job",
    });
    expect(() => validateSnapshot(snapshot)).toThrow(
      "Job count changed: expected 2, found 3",
    );
  });

  it("requires each approved Job to use its exact production slug", () => {
    const snapshot = validSnapshot();
    snapshot.records.Job[0]!.slug = "wrong-job-slug";
    expect(() => validateSnapshot(snapshot)).toThrow(
      `exact approved Job slug ${APPROVED_ROOTS[0].jobSlug}`,
    );
  });

  it("defaults to preview and rejects execute-only preview arguments", () => {
    expect(parseArguments([])).toEqual({
      mode: "preview",
      planFile: undefined,
      confirmDigest: undefined,
      confirmation: undefined,
    });
    expect(() => parseArguments(["--plan-file", "plan.json"])).toThrow(
      "Execute-only arguments",
    );
  });

  it("treats a completely absent graph as an idempotent no-match plan", () => {
    const snapshot = emptySnapshot();
    expect(validateSnapshot(snapshot)).toBe("no_matches");
    expect(createPlan(snapshot, new Date(timestamp))).toMatchObject({
      status: "no_matches",
      counts: {
        User: 0,
        Account: 0,
        Session: 0,
        CandidateProfile: 0,
        RecruiterProfile: 0,
        Company: 0,
        CompanyMembership: 0,
        Job: 0,
      },
    });
  });

  it("rejects a partial approved graph", () => {
    const snapshot = validSnapshot();
    snapshot.records.Job.pop();
    expect(() => validateSnapshot(snapshot)).toThrow(
      "Job count changed: expected 2, found 1",
    );
  });

  it("rejects any unexpected dependency", () => {
    const snapshot = validSnapshot();
    snapshot.forbiddenCounts.Notification = 1;
    expect(() => validateSnapshot(snapshot)).toThrow(
      "Unexpected related record types were found: Notification",
    );
  });

  it("rejects document and storage dependencies without attempting S3", () => {
    const snapshot = validSnapshot();
    snapshot.forbiddenCounts.CandidateDocument = 1;
    expect(() => validateSnapshot(snapshot)).toThrow(
      "Storage cleanup must be handled separately; this utility never deletes S3 objects",
    );
  });

  it("rejects a database graph changed after the plan", () => {
    const snapshot = validSnapshot();
    const plan = createPlan(snapshot, new Date(timestamp));
    const changed = validSnapshot();
    changed.records.Session[0] = {
      ...changed.records.Session[0]!,
      id: "changed-session-id",
    };
    expect(() => assertPlanMatchesSnapshot(plan, changed)).toThrow(
      "database graph changed after preview",
    );
  });

  it("rejects digest mismatch and no-match plans in execute comparison", () => {
    const plan = createPlan(validSnapshot(), new Date(timestamp));
    expect(() => parsePlanEnvelope(envelope(plan, "0".repeat(64)))).toThrow(
      "plan digest does not match",
    );
    expect(() => parsePlanEnvelope(envelope(plan), "f".repeat(64))).toThrow(
      "confirmed digest does not match",
    );

    const noMatchPlan = createPlan(emptySnapshot(), new Date(timestamp));
    expect(() =>
      assertPlanMatchesSnapshot(noMatchPlan, emptySnapshot()),
    ).toThrow("no-match preview plan cannot authorize execute mode");
  });

  it("rejects old-schema plans before execute can use them", () => {
    const currentPlan = createPlan(validSnapshot(), new Date(timestamp));
    const oldPlan = {
      ...currentPlan,
      schemaVersion: 1,
      approvedRootSlugs: APPROVED_ROOTS.map((root) => root.userMarker),
    } as Record<string, unknown>;
    delete oldPlan.approvedUserMarkers;
    delete oldPlan.approvedCompanySlugs;
    delete oldPlan.approvedJobSlugs;

    expect(() =>
      parsePlanEnvelope(
        JSON.stringify({ digest: digestPlan(currentPlan), plan: oldPlan }),
      ),
    ).toThrow("invalid or sensitive-field-bearing shape");
  });

  it("requires the environment authorization and explicit confirmation", () => {
    const base = parseArguments([
      "--mode",
      "execute",
      "--plan-file",
      ".careerbridge-operations/plan.json",
      "--confirm-digest",
      "a".repeat(64),
      "--confirm",
      EXECUTE_CONFIRMATION,
    ]);
    expect(() =>
      assertExecuteAuthorization(base, {
        ALLOW_PRODUCTION_SYNTHETIC_CLEANUP: "true",
      }),
    ).not.toThrow();
    expect(() => assertExecuteAuthorization(base, {})).toThrow(
      "ALLOW_PRODUCTION_SYNTHETIC_CLEANUP=true",
    );

    const missingConfirmation = parseArguments([
      "--mode",
      "execute",
      "--plan-file",
      ".careerbridge-operations/plan.json",
      "--confirm-digest",
      "a".repeat(64),
      "--confirm",
      "DELETE_SOMETHING_ELSE",
    ]);
    expect(() =>
      assertExecuteAuthorization(missingConfirmation, {
        ALLOW_PRODUCTION_SYNTHETIC_CLEANUP: "true",
      }),
    ).toThrow(EXECUTE_CONFIRMATION);
  });

  it("keeps sensitive fields out of plans and redacted output", () => {
    const plan = createPlan(validSnapshot(), new Date(timestamp));
    const summary = formatRedactedSummary(
      "preview",
      plan,
      digestPlan(plan),
      ".careerbridge-operations/redacted-plan.json",
    );
    for (const forbidden of [
      "email",
      "password",
      "token",
      "connectionString",
      "storageKey",
      "textBody",
      "htmlBody",
      "message",
      "body",
    ]) {
      expect(summary.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }

    const unsafeEnvelope = JSON.parse(envelope(plan)) as {
      digest: string;
      plan: CleanupPlan & { records: SafeRecords };
    };
    Object.assign(unsafeEnvelope.plan.records.User[0]!, {
      email: "must-never-be-accepted@example.test",
    });
    expect(() => parsePlanEnvelope(JSON.stringify(unsafeEnvelope))).toThrow(
      "sensitive-field-bearing shape",
    );
  });

  it("uses dependency-safe deletion order with sessions before users", () => {
    expect(EXECUTION_DELETE_ORDER[0]).toBe("Session");
    expect(EXECUTION_DELETE_ORDER.at(-1)).toBe("User");
  });

  it("rolls back preview success and execute assertion failure", async () => {
    class FakeClient implements SqlClient {
      readonly commands: string[] = [];
      private readOnly = false;

      async query<Row extends Record<string, unknown>>(text: string) {
        this.commands.push(text);
        if (text.startsWith("BEGIN")) {
          this.readOnly = text.includes("READ ONLY");
        }
        const rows =
          text === "SHOW transaction_read_only"
            ? [{ transaction_read_only: this.readOnly ? "on" : "off" }]
            : [];
        return { rows: rows as unknown as Row[], rowCount: rows.length };
      }
    }

    const previewClient = new FakeClient();
    await expect(
      runTransaction(previewClient, "preview", async () => "ok"),
    ).resolves.toBe("ok");
    expect(previewClient.commands[0]).toBe(
      "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE",
    );
    expect(previewClient.commands.at(-1)).toBe("ROLLBACK");

    const executeClient = new FakeClient();
    await expect(
      runTransaction(executeClient, "execute", async () => {
        throw new CleanupSafetyError("forced assertion failure");
      }),
    ).rejects.toThrow("forced assertion failure");
    expect(executeClient.commands.at(-1)).toBe("ROLLBACK");
    expect(executeClient.commands).not.toContain("COMMIT");
  });
});
