import "dotenv/config";

import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Client, type QueryResultRow } from "pg";
import { z } from "zod";

export const APPROVED_ROOTS = [
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
] as const;

export const EXECUTE_CONFIRMATION = "DELETE_APPROVED_SYNTHETIC_PRODUCTION_DATA";
export const EXECUTE_AUTHORIZATION_ENV = "ALLOW_PRODUCTION_SYNTHETIC_CLEANUP";
export const OPERATIONS_DIRECTORY = path.resolve(
  process.cwd(),
  ".careerbridge-operations",
  "production-synthetic-data-cleanup",
);

export const EXECUTION_DELETE_ORDER = [
  "Session",
  "Account",
  "CandidateProfile",
  "RecruiterProfile",
  "CompanyMembership",
  "Job",
  "Company",
  "User",
] as const;

const APPROVED_RECORD_TYPES = [
  "User",
  "Account",
  "Session",
  "CandidateProfile",
  "RecruiterProfile",
  "Company",
  "CompanyMembership",
  "Job",
] as const;

export const FORBIDDEN_DEPENDENCY_TYPES = [
  "Education",
  "Experience",
  "CandidateSkill",
  "JobSkill",
  "SavedJob",
  "JobApplication",
  "ApplicationStatusHistory",
  "Interview",
  "InterviewEvent",
  "CandidateDocument",
  "CandidateResume",
  "CandidateDocumentAccessLog",
  "ApplicationNote",
  "ApplicationNoteRevision",
  "Notification",
  "UserEmailPreference",
  "EmailOutbox",
  "EmailDeliveryAttempt",
  "CompanyInvitation",
  "CompanyMembershipEvent",
  "AdminAuditEvent",
  "Verification",
] as const;

const EXPECTED_COUNTS = {
  User: 6,
  Account: 6,
  Session: 5,
  CandidateProfile: 1,
  RecruiterProfile: 1,
  Company: 2,
  CompanyMembership: 2,
  Job: 2,
} as const;

const KNOWN_ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"] as const;
const KNOWN_USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
const KNOWN_MEMBERSHIP_ROLES = ["OWNER", "MEMBER"] as const;
const KNOWN_JOB_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
] as const;
const KNOWN_MODERATION_STATUSES = ["VISIBLE", "HIDDEN"] as const;

const EXPECTED_FOREIGN_KEYS = [
  "account.userId->user.id",
  "admin_audit_event.actorAdminUserId->user.id",
  "admin_audit_event.targetCompanyId->company.id",
  "admin_audit_event.targetJobId->job.id",
  "admin_audit_event.targetUserId->user.id",
  "application_note.applicationId->job_application.id",
  "application_note.authorUserId->user.id",
  "application_note_revision.actorUserId->user.id",
  "application_note_revision.noteId->application_note.id",
  "application_status_history.applicationId->job_application.id",
  "application_status_history.changedByUserId->user.id",
  "candidate_document.candidateId->user.id",
  "candidate_document_access_log.actorUserId->user.id",
  "candidate_document_access_log.applicationId->job_application.id",
  "candidate_document_access_log.documentId->candidate_document.id",
  "candidate_profile.userId->user.id",
  "candidate_resume.candidateId->user.id",
  "candidate_resume.documentId->candidate_document.id",
  "candidate_skill.candidateProfileId->candidate_profile.id",
  "candidate_skill.skillId->skill.id",
  "company_invitation.companyId->company.id",
  "company_invitation.invitedByUserId->user.id",
  "company_invitation.inviteeUserId->user.id",
  "company_membership.companyId->company.id",
  "company_membership.userId->user.id",
  "company_membership_event.actorUserId->user.id",
  "company_membership_event.companyId->company.id",
  "company_membership_event.invitationId->company_invitation.id",
  "company_membership_event.subjectUserId->user.id",
  "education.candidateProfileId->candidate_profile.id",
  "email_delivery_attempt.outboxId->email_outbox.id",
  "email_outbox.applicationId->job_application.id",
  "email_outbox.companyId->company.id",
  "email_outbox.invitationId->company_invitation.id",
  "email_outbox.recipientUserId->user.id",
  "experience.candidateProfileId->candidate_profile.id",
  "interview.applicationId->job_application.id",
  "interview.organizerUserId->user.id",
  "interview_event.actorUserId->user.id",
  "interview_event.interviewId->interview.id",
  "job.companyId->company.id",
  "job_application.candidateId->user.id",
  "job_application.jobId->job.id",
  "job_application.resumeDocumentId->candidate_document.id",
  "job_skill.jobId->job.id",
  "job_skill.skillId->skill.id",
  "notification.actorUserId->user.id",
  "notification.applicationId->job_application.id",
  "notification.companyId->company.id",
  "notification.jobId->job.id",
  "notification.recipientUserId->user.id",
  "recruiter_profile.userId->user.id",
  "saved_job.candidateId->user.id",
  "saved_job.jobId->job.id",
  "session.userId->user.id",
  "user_email_preference.userId->user.id",
] as const;

type ApprovedRecordType = (typeof APPROVED_RECORD_TYPES)[number];
type ForbiddenDependencyType = (typeof FORBIDDEN_DEPENDENCY_TYPES)[number];
type RootKey = (typeof APPROVED_ROOTS)[number]["key"];

const timestampSchema = z.string().datetime({ offset: true });
const idSchema = z.string().min(1).max(255);
const rootKeySchema = z.enum(
  APPROVED_ROOTS.map((root) => root.key) as [RootKey, ...RootKey[]],
);

const userRecordSchema = z
  .object({
    id: idSchema,
    rootKey: rootKeySchema,
    role: z.enum(KNOWN_ROLES),
    status: z.enum(KNOWN_USER_STATUSES),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
const accountRecordSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
const sessionRecordSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    expiresAt: timestampSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
const profileRecordSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
const companyRecordSchema = z
  .object({
    id: idSchema,
    rootKey: rootKeySchema,
    slug: z.string().min(1).max(180),
    status: z.enum(KNOWN_MODERATION_STATUSES),
    publicationStatus: z.enum(["PUBLISHED", "UNPUBLISHED"]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
const membershipRecordSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    companyId: idSchema,
    role: z.enum(KNOWN_MEMBERSHIP_ROLES),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
const jobRecordSchema = z
  .object({
    id: idSchema,
    companyId: idSchema,
    slug: z.string().min(1).max(200),
    status: z.enum(KNOWN_JOB_STATUSES),
    moderationStatus: z.enum(KNOWN_MODERATION_STATUSES),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

const recordsSchema = z
  .object({
    User: z.array(userRecordSchema),
    Account: z.array(accountRecordSchema),
    Session: z.array(sessionRecordSchema),
    CandidateProfile: z.array(profileRecordSchema),
    RecruiterProfile: z.array(profileRecordSchema),
    Company: z.array(companyRecordSchema),
    CompanyMembership: z.array(membershipRecordSchema),
    Job: z.array(jobRecordSchema),
  })
  .strict();

const countsSchema = z
  .object({
    User: z.number().int().nonnegative(),
    Account: z.number().int().nonnegative(),
    Session: z.number().int().nonnegative(),
    CandidateProfile: z.number().int().nonnegative(),
    RecruiterProfile: z.number().int().nonnegative(),
    Company: z.number().int().nonnegative(),
    CompanyMembership: z.number().int().nonnegative(),
    Job: z.number().int().nonnegative(),
  })
  .strict();

const forbiddenCountsShape = Object.fromEntries(
  FORBIDDEN_DEPENDENCY_TYPES.map((type) => [
    type,
    z.number().int().nonnegative(),
  ]),
) as Record<ForbiddenDependencyType, z.ZodNumber>;
const forbiddenCountsSchema = z.object(forbiddenCountsShape).strict();

const cleanupPlanSchema = z
  .object({
    schemaVersion: z.literal(2),
    operation: z.literal("production-synthetic-data-cleanup"),
    status: z.enum(["ready", "no_matches"]),
    generatedAt: timestampSchema,
    approvedUserMarkers: z.tuple([
      z.literal(APPROVED_ROOTS[0].userMarker),
      z.literal(APPROVED_ROOTS[1].userMarker),
    ]),
    approvedCompanySlugs: z.tuple([
      z.literal(APPROVED_ROOTS[0].companySlug),
      z.literal(APPROVED_ROOTS[1].companySlug),
    ]),
    approvedJobSlugs: z.tuple([
      z.literal(APPROVED_ROOTS[0].jobSlug),
      z.literal(APPROVED_ROOTS[1].jobSlug),
    ]),
    counts: countsSchema,
    forbiddenCounts: forbiddenCountsSchema,
    deletionOrder: z.tuple(
      EXECUTION_DELETE_ORDER.map((type) => z.literal(type)) as [
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[0]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[1]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[2]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[3]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[4]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[5]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[6]>,
        z.ZodLiteral<(typeof EXECUTION_DELETE_ORDER)[7]>,
      ],
    ),
    records: recordsSchema,
  })
  .strict();

const planEnvelopeSchema = z
  .object({
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    plan: cleanupPlanSchema,
  })
  .strict();

export type SafeRecords = z.infer<typeof recordsSchema>;
export type ForbiddenCounts = z.infer<typeof forbiddenCountsSchema>;
export type CleanupPlan = z.infer<typeof cleanupPlanSchema>;

export interface GraphSnapshot {
  records: SafeRecords;
  forbiddenCounts: ForbiddenCounts;
}

export interface SqlClient {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
}

export interface ParsedArguments {
  mode: "preview" | "execute";
  planFile?: string;
  confirmDigest?: string;
  confirmation?: string;
}

export class CleanupSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CleanupSafetyError";
  }
}

function emptyRecords(): SafeRecords {
  return {
    User: [],
    Account: [],
    Session: [],
    CandidateProfile: [],
    RecruiterProfile: [],
    Company: [],
    CompanyMembership: [],
    Job: [],
  };
}

function emptyForbiddenCounts(): ForbiddenCounts {
  return Object.fromEntries(
    FORBIDDEN_DEPENDENCY_TYPES.map((type) => [type, 0]),
  ) as ForbiddenCounts;
}

function normalizeTimestamp(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return date.toISOString();
    }
  }
  throw new CleanupSafetyError("A database timestamp was invalid.");
}

function normalizeCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new CleanupSafetyError("A dependency count was invalid.");
  }
  return count;
}

function sortRecords(records: SafeRecords): SafeRecords {
  return Object.fromEntries(
    APPROVED_RECORD_TYPES.map((type) => [
      type,
      [...records[type]].sort((left, right) => left.id.localeCompare(right.id)),
    ]),
  ) as SafeRecords;
}

function recordCounts(records: SafeRecords): CleanupPlan["counts"] {
  return Object.fromEntries(
    APPROVED_RECORD_TYPES.map((type) => [type, records[type].length]),
  ) as CleanupPlan["counts"];
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digestPlan(plan: CleanupPlan): string {
  return createHash("sha256").update(canonicalize(plan)).digest("hex");
}

export function parseArguments(argv: string[]): ParsedArguments {
  const values = new Map<string, string>();
  const supported = new Set([
    "--mode",
    "--plan-file",
    "--confirm-digest",
    "--confirm",
  ]);

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag || !supported.has(flag) || !value || value.startsWith("--")) {
      throw new CleanupSafetyError(
        "Arguments must use supported --flag value pairs.",
      );
    }
    if (values.has(flag)) {
      throw new CleanupSafetyError(`Duplicate argument rejected: ${flag}.`);
    }
    values.set(flag, value);
  }

  const mode = values.get("--mode") ?? "preview";
  if (mode !== "preview" && mode !== "execute") {
    throw new CleanupSafetyError("Mode must be preview or execute.");
  }

  const parsed: ParsedArguments = {
    mode,
    planFile: values.get("--plan-file"),
    confirmDigest: values.get("--confirm-digest"),
    confirmation: values.get("--confirm"),
  };

  if (
    mode === "preview" &&
    (parsed.planFile || parsed.confirmDigest || parsed.confirmation)
  ) {
    throw new CleanupSafetyError(
      "Execute-only arguments are not accepted in preview mode.",
    );
  }
  return parsed;
}

export function assertExecuteAuthorization(
  args: ParsedArguments,
  environment: Record<string, string | undefined>,
): asserts args is ParsedArguments & {
  mode: "execute";
  planFile: string;
  confirmDigest: string;
  confirmation: string;
} {
  if (args.mode !== "execute") {
    throw new CleanupSafetyError(
      "Execute authorization requires execute mode.",
    );
  }
  if (!args.planFile) {
    throw new CleanupSafetyError("Execute mode requires --plan-file.");
  }
  if (!args.confirmDigest) {
    throw new CleanupSafetyError("Execute mode requires --confirm-digest.");
  }
  if (!/^[a-f0-9]{64}$/.test(args.confirmDigest)) {
    throw new CleanupSafetyError(
      "The confirmed digest must be an exact lowercase SHA-256 digest.",
    );
  }
  if (environment[EXECUTE_AUTHORIZATION_ENV] !== "true") {
    throw new CleanupSafetyError(
      `${EXECUTE_AUTHORIZATION_ENV}=true is required for execute mode.`,
    );
  }
  if (args.confirmation !== EXECUTE_CONFIRMATION) {
    throw new CleanupSafetyError(
      `Execute mode requires --confirm ${EXECUTE_CONFIRMATION}.`,
    );
  }
}

function isNoMatch(snapshot: GraphSnapshot): boolean {
  return (
    APPROVED_RECORD_TYPES.every(
      (type) => snapshot.records[type].length === 0,
    ) &&
    FORBIDDEN_DEPENDENCY_TYPES.every(
      (type) => snapshot.forbiddenCounts[type] === 0,
    )
  );
}

function assertKnownRelationships(records: SafeRecords): void {
  const users = new Map(records.User.map((record) => [record.id, record]));
  const companies = new Set(records.Company.map((record) => record.id));

  for (const account of records.Account) {
    if (!users.has(account.userId)) {
      throw new CleanupSafetyError("An Account has an unknown User relation.");
    }
  }
  for (const session of records.Session) {
    if (!users.has(session.userId)) {
      throw new CleanupSafetyError("A Session has an unknown User relation.");
    }
  }
  for (const profile of records.CandidateProfile) {
    if (users.get(profile.userId)?.role !== "CANDIDATE") {
      throw new CleanupSafetyError(
        "A CandidateProfile has an unexpected User relation.",
      );
    }
  }
  for (const profile of records.RecruiterProfile) {
    if (users.get(profile.userId)?.role !== "RECRUITER") {
      throw new CleanupSafetyError(
        "A RecruiterProfile has an unexpected User relation.",
      );
    }
  }
  for (const membership of records.CompanyMembership) {
    if (!users.has(membership.userId) || !companies.has(membership.companyId)) {
      throw new CleanupSafetyError(
        "A CompanyMembership has an unknown relation.",
      );
    }
  }
  for (const job of records.Job) {
    if (!companies.has(job.companyId)) {
      throw new CleanupSafetyError("A Job has an unknown Company relation.");
    }
  }
}

export function validateSnapshot(
  rawSnapshot: GraphSnapshot,
): "ready" | "no_matches" {
  const snapshot: GraphSnapshot = {
    records: recordsSchema.parse(sortRecords(rawSnapshot.records)),
    forbiddenCounts: forbiddenCountsSchema.parse(rawSnapshot.forbiddenCounts),
  };

  if (isNoMatch(snapshot)) {
    return "no_matches";
  }

  const unexpected = FORBIDDEN_DEPENDENCY_TYPES.filter(
    (type) => snapshot.forbiddenCounts[type] !== 0,
  );
  if (unexpected.length > 0) {
    const documentDependency = unexpected.some((type) =>
      [
        "CandidateDocument",
        "CandidateResume",
        "CandidateDocumentAccessLog",
      ].includes(type),
    );
    const storageGuidance = documentDependency
      ? " Storage cleanup must be handled separately; this utility never deletes S3 objects."
      : "";
    throw new CleanupSafetyError(
      `Unexpected related record types were found: ${unexpected.join(", ")}.${storageGuidance}`,
    );
  }

  const counts = recordCounts(snapshot.records);
  for (const type of APPROVED_RECORD_TYPES) {
    if (counts[type] !== EXPECTED_COUNTS[type]) {
      throw new CleanupSafetyError(
        `${type} count changed: expected ${EXPECTED_COUNTS[type]}, found ${counts[type]}.`,
      );
    }
  }

  for (const root of APPROVED_ROOTS) {
    const rootUsers = snapshot.records.User.filter(
      (record) => record.rootKey === root.key,
    );
    const roles = rootUsers.map((record) => record.role).sort();
    if (
      roles.length !== KNOWN_ROLES.length ||
      canonicalize(roles) !== canonicalize([...KNOWN_ROLES].sort())
    ) {
      throw new CleanupSafetyError(
        `Approved root ${root.userMarker} does not have exactly one known User role of each type.`,
      );
    }

    const rootCompanies = snapshot.records.Company.filter(
      (record) =>
        record.rootKey === root.key && record.slug === root.companySlug,
    );
    if (rootCompanies.length !== 1) {
      throw new CleanupSafetyError(
        `Approved root ${root.userMarker} does not have exactly one Company with the exact approved slug ${root.companySlug}.`,
      );
    }
    const company = rootCompanies[0];
    if (!company) {
      throw new CleanupSafetyError("An approved Company root is missing.");
    }

    const memberships = snapshot.records.CompanyMembership.filter(
      (record) => record.companyId === company.id,
    );
    if (memberships.length !== 1 || memberships[0]?.role !== "OWNER") {
      throw new CleanupSafetyError(
        `Approved root ${root.userMarker} does not have exactly one OWNER membership.`,
      );
    }
    const membershipUser = rootUsers.find(
      (record) => record.id === memberships[0]?.userId,
    );
    if (membershipUser?.role !== "RECRUITER") {
      throw new CleanupSafetyError(
        `Approved root ${root.userMarker} has an unexpected membership relationship.`,
      );
    }

    const companyJobs = snapshot.records.Job.filter(
      (record) => record.companyId === company.id,
    );
    if (companyJobs.length !== 1) {
      throw new CleanupSafetyError(
        `Approved root ${root.userMarker} does not have exactly one Job.`,
      );
    }
    if (companyJobs[0]?.slug !== root.jobSlug) {
      throw new CleanupSafetyError(
        `Approved root ${root.userMarker} does not have the exact approved Job slug ${root.jobSlug}.`,
      );
    }
  }

  const accountsPerUser = new Map<string, number>();
  for (const account of snapshot.records.Account) {
    accountsPerUser.set(
      account.userId,
      (accountsPerUser.get(account.userId) ?? 0) + 1,
    );
  }
  if (
    snapshot.records.User.some((user) => accountsPerUser.get(user.id) !== 1)
  ) {
    throw new CleanupSafetyError(
      "Each approved synthetic User must have exactly one Account.",
    );
  }

  assertKnownRelationships(snapshot.records);
  return "ready";
}

export function createPlan(
  snapshot: GraphSnapshot,
  generatedAt = new Date(),
): CleanupPlan {
  const status = validateSnapshot(snapshot);
  const records = sortRecords(snapshot.records);
  return cleanupPlanSchema.parse({
    schemaVersion: 2,
    operation: "production-synthetic-data-cleanup",
    status,
    generatedAt: generatedAt.toISOString(),
    approvedUserMarkers: APPROVED_ROOTS.map((root) => root.userMarker),
    approvedCompanySlugs: APPROVED_ROOTS.map((root) => root.companySlug),
    approvedJobSlugs: APPROVED_ROOTS.map((root) => root.jobSlug),
    counts: recordCounts(records),
    forbiddenCounts: snapshot.forbiddenCounts,
    deletionOrder: EXECUTION_DELETE_ORDER,
    records,
  });
}

export function parsePlanEnvelope(
  input: string,
  confirmedDigest?: string,
): { digest: string; plan: CleanupPlan } {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(input);
  } catch {
    throw new CleanupSafetyError("The cleanup plan file is not valid JSON.");
  }

  const parsed = planEnvelopeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new CleanupSafetyError(
      "The cleanup plan file has an invalid or sensitive-field-bearing shape.",
    );
  }
  const computedDigest = digestPlan(parsed.data.plan);
  if (computedDigest !== parsed.data.digest) {
    throw new CleanupSafetyError(
      "The cleanup plan digest does not match its contents.",
    );
  }
  if (confirmedDigest && computedDigest !== confirmedDigest) {
    throw new CleanupSafetyError(
      "The confirmed digest does not match the verified cleanup plan.",
    );
  }
  return parsed.data;
}

export function assertPlanMatchesSnapshot(
  plan: CleanupPlan,
  snapshot: GraphSnapshot,
): void {
  const currentPlan = createPlan(snapshot, new Date(plan.generatedAt));
  if (plan.status !== "ready") {
    throw new CleanupSafetyError(
      "A no-match preview plan cannot authorize execute mode.",
    );
  }
  if (
    canonicalize({
      status: plan.status,
      counts: plan.counts,
      forbiddenCounts: plan.forbiddenCounts,
      records: sortRecords(plan.records),
    }) !==
    canonicalize({
      status: currentPlan.status,
      counts: currentPlan.counts,
      forbiddenCounts: currentPlan.forbiddenCounts,
      records: sortRecords(currentPlan.records),
    })
  ) {
    throw new CleanupSafetyError(
      "The database graph changed after preview; regenerate and review the plan.",
    );
  }
}

export async function runTransaction<T>(
  client: SqlClient,
  mode: "preview" | "execute",
  operation: () => Promise<T>,
): Promise<T> {
  const begin =
    mode === "preview"
      ? "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE"
      : "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE";
  await client.query(begin);
  let open = true;

  try {
    if (mode === "execute") {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL statement_timeout = '60s'");
    }
    const setting = await client.query<{ transaction_read_only: string }>(
      "SHOW transaction_read_only",
    );
    const expected = mode === "preview" ? "on" : "off";
    if (setting.rows[0]?.transaction_read_only !== expected) {
      throw new CleanupSafetyError(
        `Transaction read-only verification failed for ${mode} mode.`,
      );
    }

    const result = await operation();
    await client.query(mode === "preview" ? "ROLLBACK" : "COMMIT");
    open = false;
    return result;
  } catch (error) {
    if (open) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // The original assertion remains the useful, redacted failure.
      }
    }
    throw error;
  }
}

async function assertExpectedForeignKeys(client: SqlClient): Promise<void> {
  const result = await client.query<{
    source_table: string;
    source_column: string;
    target_table: string;
    target_column: string;
  }>(`
    SELECT
      source_table.relname AS source_table,
      source_column.attname AS source_column,
      target_table.relname AS target_table,
      target_column.attname AS target_column
    FROM pg_constraint AS constraint_record
    JOIN pg_class AS source_table
      ON source_table.oid = constraint_record.conrelid
    JOIN pg_namespace AS source_namespace
      ON source_namespace.oid = source_table.relnamespace
    JOIN pg_class AS target_table
      ON target_table.oid = constraint_record.confrelid
    JOIN LATERAL unnest(constraint_record.conkey)
      WITH ORDINALITY AS source_key(attribute_number, position) ON true
    JOIN LATERAL unnest(constraint_record.confkey)
      WITH ORDINALITY AS target_key(attribute_number, position)
      ON target_key.position = source_key.position
    JOIN pg_attribute AS source_column
      ON source_column.attrelid = source_table.oid
      AND source_column.attnum = source_key.attribute_number
    JOIN pg_attribute AS target_column
      ON target_column.attrelid = target_table.oid
      AND target_column.attnum = target_key.attribute_number
    WHERE constraint_record.contype = 'f'
      AND source_namespace.nspname = current_schema()
    ORDER BY source_table.relname, source_column.attname
  `);

  const actual = result.rows
    .map(
      (row) =>
        `${row.source_table}.${row.source_column}->${row.target_table}.${row.target_column}`,
    )
    .sort();
  const expected = [...EXPECTED_FOREIGN_KEYS].sort();
  if (canonicalize(actual) !== canonicalize(expected)) {
    throw new CleanupSafetyError(
      "Database foreign-key relationships differ from the reviewed cleanup graph.",
    );
  }
}

function rootUserPredicate(alias: string): {
  sql: string;
  values: string[];
} {
  const clauses: string[] = [];
  const values: string[] = [];
  for (const root of APPROVED_ROOTS) {
    const namePosition = values.push(root.displayName);
    const markerPosition = values.push(root.userMarker);
    clauses.push(
      `(${alias}.name = $${namePosition} OR strpos(${alias}.email, $${markerPosition}) > 0)`,
    );
  }
  return { sql: clauses.join(" OR "), values };
}

export async function discoverUsers(
  client: SqlClient,
): Promise<SafeRecords["User"]> {
  const records: SafeRecords["User"] = [];
  for (const root of APPROVED_ROOTS) {
    const result = await client.query<{
      id: string;
      role: (typeof KNOWN_ROLES)[number];
      status: (typeof KNOWN_USER_STATUSES)[number];
      createdAt: unknown;
      updatedAt: unknown;
    }>(
      `
        SELECT
          synthetic_user.id,
          synthetic_user.role::text AS role,
          synthetic_user."accountStatus"::text AS status,
          synthetic_user."createdAt",
          synthetic_user."updatedAt"
        FROM "user" AS synthetic_user
        WHERE synthetic_user.name = $1 OR strpos(synthetic_user.email, $2) > 0
        ORDER BY synthetic_user.id
      `,
      [root.displayName, root.userMarker],
    );
    records.push(
      ...result.rows.map((row) => ({
        id: row.id,
        rootKey: root.key,
        role: row.role,
        status: row.status,
        createdAt: normalizeTimestamp(row.createdAt),
        updatedAt: normalizeTimestamp(row.updatedAt),
      })),
    );
  }
  return records;
}

export async function discoverCompanies(
  client: SqlClient,
): Promise<SafeRecords["Company"]> {
  const result = await client.query<{
    id: string;
    slug: string;
    status: (typeof KNOWN_MODERATION_STATUSES)[number];
    isPublished: boolean;
    createdAt: unknown;
    updatedAt: unknown;
  }>(
    `
      SELECT
        synthetic_company.id,
        synthetic_company.slug,
        synthetic_company."moderationStatus"::text AS status,
        synthetic_company."isPublished",
        synthetic_company."createdAt",
        synthetic_company."updatedAt"
      FROM company AS synthetic_company
      WHERE synthetic_company.slug = ANY($1::text[])
      ORDER BY synthetic_company.id
    `,
    [APPROVED_ROOTS.map((root) => root.companySlug)],
  );
  return result.rows.map((row) => {
    const root = APPROVED_ROOTS.find(
      (approvedRoot) => approvedRoot.companySlug === row.slug,
    );
    if (!root) {
      throw new CleanupSafetyError(
        "Company discovery returned a non-approved slug.",
      );
    }
    return {
      id: row.id,
      rootKey: root.key,
      slug: row.slug,
      status: row.status,
      publicationStatus: row.isPublished ? "PUBLISHED" : "UNPUBLISHED",
      createdAt: normalizeTimestamp(row.createdAt),
      updatedAt: normalizeTimestamp(row.updatedAt),
    };
  });
}

async function discoverApprovedRecords(
  client: SqlClient,
): Promise<SafeRecords> {
  const records = emptyRecords();
  records.User = await discoverUsers(client);
  records.Company = await discoverCompanies(client);

  const userIds = records.User.map((record) => record.id);
  const companyIds = records.Company.map((record) => record.id);

  const accountResult = await client.query<{
    id: string;
    userId: string;
    createdAt: unknown;
    updatedAt: unknown;
  }>(
    `SELECT id, "userId", "createdAt", "updatedAt"
     FROM account WHERE "userId" = ANY($1::text[]) ORDER BY id`,
    [userIds],
  );
  records.Account = accountResult.rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }));

  const sessionResult = await client.query<{
    id: string;
    userId: string;
    expiresAt: unknown;
    createdAt: unknown;
    updatedAt: unknown;
  }>(
    `SELECT id, "userId", "expiresAt", "createdAt", "updatedAt"
     FROM session WHERE "userId" = ANY($1::text[]) ORDER BY id`,
    [userIds],
  );
  records.Session = sessionResult.rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    expiresAt: normalizeTimestamp(row.expiresAt),
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }));

  for (const [recordType, table] of [
    ["CandidateProfile", "candidate_profile"],
    ["RecruiterProfile", "recruiter_profile"],
  ] as const) {
    const result = await client.query<{
      id: string;
      userId: string;
      createdAt: unknown;
      updatedAt: unknown;
    }>(
      `SELECT id, "userId", "createdAt", "updatedAt"
       FROM ${table} WHERE "userId" = ANY($1::text[]) ORDER BY id`,
      [userIds],
    );
    records[recordType] = result.rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      createdAt: normalizeTimestamp(row.createdAt),
      updatedAt: normalizeTimestamp(row.updatedAt),
    }));
  }

  const membershipResult = await client.query<{
    id: string;
    userId: string;
    companyId: string;
    role: (typeof KNOWN_MEMBERSHIP_ROLES)[number];
    createdAt: unknown;
    updatedAt: unknown;
  }>(
    `SELECT id, "userId", "companyId", role::text AS role, "createdAt", "updatedAt"
     FROM company_membership
     WHERE "userId" = ANY($1::text[]) OR "companyId" = ANY($2::text[])
     ORDER BY id`,
    [userIds, companyIds],
  );
  records.CompanyMembership = membershipResult.rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    role: row.role,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }));

  const jobResult = await client.query<{
    id: string;
    companyId: string;
    slug: string;
    status: (typeof KNOWN_JOB_STATUSES)[number];
    moderationStatus: (typeof KNOWN_MODERATION_STATUSES)[number];
    createdAt: unknown;
    updatedAt: unknown;
  }>(
    `SELECT id, "companyId", slug, status::text AS status,
            "moderationStatus"::text AS "moderationStatus", "createdAt", "updatedAt"
     FROM job WHERE "companyId" = ANY($1::text[]) ORDER BY id`,
    [companyIds],
  );
  records.Job = jobResult.rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    slug: row.slug,
    status: row.status,
    moderationStatus: row.moderationStatus,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }));

  return recordsSchema.parse(sortRecords(records));
}

interface DependencyCountQuery {
  type: ForbiddenDependencyType;
  sql: string;
  values: unknown[];
}

async function discoverForbiddenCounts(
  client: SqlClient,
  records: SafeRecords,
): Promise<ForbiddenCounts> {
  const userIds = records.User.map((record) => record.id);
  const companyIds = records.Company.map((record) => record.id);
  const jobIds = records.Job.map((record) => record.id);
  const candidateProfileIds = records.CandidateProfile.map(
    (record) => record.id,
  );

  const applicationIdsResult = await client.query<{ id: string }>(
    `SELECT id FROM job_application
     WHERE "candidateId" = ANY($1::text[]) OR "jobId" = ANY($2::text[])
     ORDER BY id`,
    [userIds, jobIds],
  );
  const applicationIds = applicationIdsResult.rows.map((row) => row.id);

  const documentIdsResult = await client.query<{ id: string }>(
    `SELECT id FROM candidate_document
     WHERE "candidateId" = ANY($1::text[]) ORDER BY id`,
    [userIds],
  );
  const documentIds = documentIdsResult.rows.map((row) => row.id);

  const invitationIdsResult = await client.query<{ id: string }>(
    `SELECT id FROM company_invitation
     WHERE "companyId" = ANY($1::text[])
        OR "inviteeUserId" = ANY($2::text[])
        OR "invitedByUserId" = ANY($2::text[])
     ORDER BY id`,
    [companyIds, userIds],
  );
  const invitationIds = invitationIdsResult.rows.map((row) => row.id);

  const interviewIdsResult = await client.query<{ id: string }>(
    `SELECT id FROM interview
     WHERE "applicationId" = ANY($1::text[])
        OR "organizerUserId" = ANY($2::text[])
     ORDER BY id`,
    [applicationIds, userIds],
  );
  const interviewIds = interviewIdsResult.rows.map((row) => row.id);

  const noteIdsResult = await client.query<{ id: string }>(
    `SELECT id FROM application_note
     WHERE "applicationId" = ANY($1::text[])
        OR "authorUserId" = ANY($2::text[])
     ORDER BY id`,
    [applicationIds, userIds],
  );
  const noteIds = noteIdsResult.rows.map((row) => row.id);

  const outboxIdsResult = await client.query<{ id: string }>(
    `SELECT id FROM email_outbox
     WHERE "recipientUserId" = ANY($1::text[])
        OR "applicationId" = ANY($2::text[])
        OR "companyId" = ANY($3::text[])
        OR "invitationId" = ANY($4::text[])
     ORDER BY id`,
    [userIds, applicationIds, companyIds, invitationIds],
  );
  const outboxIds = outboxIdsResult.rows.map((row) => row.id);

  const queries: DependencyCountQuery[] = [
    {
      type: "Education",
      sql: `SELECT COUNT(*)::int AS count FROM education WHERE "candidateProfileId" = ANY($1::text[])`,
      values: [candidateProfileIds],
    },
    {
      type: "Experience",
      sql: `SELECT COUNT(*)::int AS count FROM experience WHERE "candidateProfileId" = ANY($1::text[])`,
      values: [candidateProfileIds],
    },
    {
      type: "CandidateSkill",
      sql: `SELECT COUNT(*)::int AS count FROM candidate_skill WHERE "candidateProfileId" = ANY($1::text[])`,
      values: [candidateProfileIds],
    },
    {
      type: "JobSkill",
      sql: `SELECT COUNT(*)::int AS count FROM job_skill WHERE "jobId" = ANY($1::text[])`,
      values: [jobIds],
    },
    {
      type: "SavedJob",
      sql: `SELECT COUNT(*)::int AS count FROM saved_job WHERE "candidateId" = ANY($1::text[]) OR "jobId" = ANY($2::text[])`,
      values: [userIds, jobIds],
    },
    {
      type: "JobApplication",
      sql: `SELECT COUNT(*)::int AS count FROM job_application WHERE id = ANY($1::text[])`,
      values: [applicationIds],
    },
    {
      type: "ApplicationStatusHistory",
      sql: `SELECT COUNT(*)::int AS count FROM application_status_history WHERE "applicationId" = ANY($1::text[]) OR "changedByUserId" = ANY($2::text[])`,
      values: [applicationIds, userIds],
    },
    {
      type: "Interview",
      sql: `SELECT COUNT(*)::int AS count FROM interview WHERE id = ANY($1::text[])`,
      values: [interviewIds],
    },
    {
      type: "InterviewEvent",
      sql: `SELECT COUNT(*)::int AS count FROM interview_event WHERE "interviewId" = ANY($1::text[]) OR "actorUserId" = ANY($2::text[])`,
      values: [interviewIds, userIds],
    },
    {
      type: "CandidateDocument",
      sql: `SELECT COUNT(*)::int AS count FROM candidate_document WHERE id = ANY($1::text[])`,
      values: [documentIds],
    },
    {
      type: "CandidateResume",
      sql: `SELECT COUNT(*)::int AS count FROM candidate_resume WHERE "candidateId" = ANY($1::text[]) OR "documentId" = ANY($2::text[])`,
      values: [userIds, documentIds],
    },
    {
      type: "CandidateDocumentAccessLog",
      sql: `SELECT COUNT(*)::int AS count FROM candidate_document_access_log WHERE "documentId" = ANY($1::text[]) OR "actorUserId" = ANY($2::text[]) OR "applicationId" = ANY($3::text[])`,
      values: [documentIds, userIds, applicationIds],
    },
    {
      type: "ApplicationNote",
      sql: `SELECT COUNT(*)::int AS count FROM application_note WHERE id = ANY($1::text[])`,
      values: [noteIds],
    },
    {
      type: "ApplicationNoteRevision",
      sql: `SELECT COUNT(*)::int AS count FROM application_note_revision WHERE "noteId" = ANY($1::text[]) OR "actorUserId" = ANY($2::text[])`,
      values: [noteIds, userIds],
    },
    {
      type: "Notification",
      sql: `SELECT COUNT(*)::int AS count FROM notification WHERE "recipientUserId" = ANY($1::text[]) OR "actorUserId" = ANY($1::text[]) OR "applicationId" = ANY($2::text[]) OR "jobId" = ANY($3::text[]) OR "companyId" = ANY($4::text[])`,
      values: [userIds, applicationIds, jobIds, companyIds],
    },
    {
      type: "UserEmailPreference",
      sql: `SELECT COUNT(*)::int AS count FROM user_email_preference WHERE "userId" = ANY($1::text[])`,
      values: [userIds],
    },
    {
      type: "EmailOutbox",
      sql: `SELECT COUNT(*)::int AS count FROM email_outbox WHERE id = ANY($1::text[])`,
      values: [outboxIds],
    },
    {
      type: "EmailDeliveryAttempt",
      sql: `SELECT COUNT(*)::int AS count FROM email_delivery_attempt WHERE "outboxId" = ANY($1::text[])`,
      values: [outboxIds],
    },
    {
      type: "CompanyInvitation",
      sql: `SELECT COUNT(*)::int AS count FROM company_invitation WHERE id = ANY($1::text[])`,
      values: [invitationIds],
    },
    {
      type: "CompanyMembershipEvent",
      sql: `SELECT COUNT(*)::int AS count FROM company_membership_event WHERE "companyId" = ANY($1::text[]) OR "actorUserId" = ANY($2::text[]) OR "subjectUserId" = ANY($2::text[]) OR "invitationId" = ANY($3::text[])`,
      values: [companyIds, userIds, invitationIds],
    },
    {
      type: "AdminAuditEvent",
      sql: `SELECT COUNT(*)::int AS count FROM admin_audit_event WHERE "actorAdminUserId" = ANY($1::text[]) OR "targetUserId" = ANY($1::text[]) OR "targetCompanyId" = ANY($2::text[]) OR "targetJobId" = ANY($3::text[])`,
      values: [userIds, companyIds, jobIds],
    },
    {
      type: "Verification",
      sql: `SELECT COUNT(*)::int AS count
            FROM verification AS verification_record
            JOIN "user" AS synthetic_user
              ON synthetic_user.email = verification_record.identifier
            WHERE synthetic_user.id = ANY($1::text[])`,
      values: [userIds],
    },
  ];

  const counts = emptyForbiddenCounts();
  for (const query of queries) {
    const result = await client.query<{ count: unknown }>(
      query.sql,
      query.values,
    );
    counts[query.type] = normalizeCount(result.rows[0]?.count ?? 0);
  }
  return forbiddenCountsSchema.parse(counts);
}

async function discoverSnapshot(client: SqlClient): Promise<GraphSnapshot> {
  await assertExpectedForeignKeys(client);
  const records = await discoverApprovedRecords(client);
  const forbiddenCounts = await discoverForbiddenCounts(client, records);
  return { records, forbiddenCounts };
}

function hardenConnectionString(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new CleanupSafetyError(
      "DATABASE_URL must be a valid PostgreSQL URL.",
    );
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new CleanupSafetyError("DATABASE_URL must be a PostgreSQL URL.");
  }
  const sslMode = url.searchParams.get("sslmode");
  if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

async function withDatabaseClient<T>(
  connectionString: string,
  operation: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({
    connectionString: hardenConnectionString(connectionString),
    application_name: "careerbridge-synthetic-cleanup",
  });
  await client.connect();
  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

async function writePlan(plan: CleanupPlan): Promise<{
  digest: string;
  planFile: string;
}> {
  await mkdir(OPERATIONS_DIRECTORY, { recursive: true, mode: 0o700 });
  try {
    await chmod(OPERATIONS_DIRECTORY, 0o700);
  } catch {
    // Windows does not apply POSIX directory modes; the gitignore boundary
    // remains the cross-platform protection.
  }

  const digest = digestPlan(plan);
  const fileTimestamp = plan.generatedAt.replace(/[:.]/g, "-");
  const planFile = path.join(
    OPERATIONS_DIRECTORY,
    `cleanup-plan-${fileTimestamp}.json`,
  );
  await writeFile(planFile, `${JSON.stringify({ digest, plan }, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  try {
    await chmod(planFile, 0o600);
  } catch {
    // See the Windows note above.
  }
  return { digest, planFile };
}

async function loadVerifiedPlan(
  planFile: string,
  confirmedDigest: string,
): Promise<{ digest: string; plan: CleanupPlan; planFile: string }> {
  await mkdir(OPERATIONS_DIRECTORY, { recursive: true, mode: 0o700 });
  const operationsRealPath = await realpath(OPERATIONS_DIRECTORY);
  const requestedPath = path.resolve(planFile);
  const stats = await lstat(requestedPath).catch(() => undefined);
  if (!stats?.isFile() || stats.isSymbolicLink()) {
    throw new CleanupSafetyError(
      "The plan file must be a regular, non-symlink file.",
    );
  }
  if (stats.size > 1_048_576) {
    throw new CleanupSafetyError("The plan file is unexpectedly large.");
  }
  const planRealPath = await realpath(requestedPath);
  const relative = path.relative(operationsRealPath, planRealPath);
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative) ||
    path.extname(planRealPath) !== ".json"
  ) {
    throw new CleanupSafetyError(
      "The plan file must be inside the gitignored cleanup operations directory.",
    );
  }
  const contents = await readFile(planRealPath, "utf8");
  const verified = parsePlanEnvelope(contents, confirmedDigest);
  if (verified.plan.status !== "ready") {
    throw new CleanupSafetyError(
      "A no-match preview plan cannot authorize execute mode.",
    );
  }
  return { ...verified, planFile: planRealPath };
}

async function lockPlannedRecords(
  client: SqlClient,
  plan: CleanupPlan,
): Promise<void> {
  const lockOrder: Array<{
    type: ApprovedRecordType;
    table: string;
  }> = [
    { type: "User", table: '"user"' },
    { type: "Company", table: "company" },
    { type: "CandidateProfile", table: "candidate_profile" },
    { type: "RecruiterProfile", table: "recruiter_profile" },
    { type: "Job", table: "job" },
    { type: "CompanyMembership", table: "company_membership" },
    { type: "Account", table: "account" },
    { type: "Session", table: "session" },
  ];

  for (const item of lockOrder) {
    const ids = plan.records[item.type].map((record) => record.id);
    const result = await client.query<{ id: string }>(
      `SELECT id FROM ${item.table} WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
      [ids],
    );
    if (result.rows.length !== ids.length) {
      throw new CleanupSafetyError(
        `${item.type} rows changed after preview; regenerate the plan.`,
      );
    }
  }
}

async function deleteExactPlannedRecords(
  client: SqlClient,
  plan: CleanupPlan,
): Promise<void> {
  const tables: Record<(typeof EXECUTION_DELETE_ORDER)[number], string> = {
    Session: "session",
    Account: "account",
    CandidateProfile: "candidate_profile",
    RecruiterProfile: "recruiter_profile",
    CompanyMembership: "company_membership",
    Job: "job",
    Company: "company",
    User: '"user"',
  };

  for (const type of EXECUTION_DELETE_ORDER) {
    const ids = plan.records[type].map((record) => record.id);
    const result = await client.query(
      `DELETE FROM ${tables[type]} WHERE id = ANY($1::text[])`,
      [ids],
    );
    if ((result.rowCount ?? 0) !== ids.length) {
      throw new CleanupSafetyError(
        `${type} deletion count changed; the transaction will roll back.`,
      );
    }
  }
}

async function verifyExactDeletion(
  client: SqlClient,
  plan: CleanupPlan,
): Promise<void> {
  const tables: Record<ApprovedRecordType, string> = {
    User: '"user"',
    Account: "account",
    Session: "session",
    CandidateProfile: "candidate_profile",
    RecruiterProfile: "recruiter_profile",
    Company: "company",
    CompanyMembership: "company_membership",
    Job: "job",
  };
  for (const type of APPROVED_RECORD_TYPES) {
    const ids = plan.records[type].map((record) => record.id);
    const result = await client.query<{ count: unknown }>(
      `SELECT COUNT(*)::int AS count FROM ${tables[type]} WHERE id = ANY($1::text[])`,
      [ids],
    );
    if (normalizeCount(result.rows[0]?.count ?? 0) !== 0) {
      throw new CleanupSafetyError(
        `${type} post-delete verification failed; the transaction will roll back.`,
      );
    }
  }

  const userPredicate = rootUserPredicate("synthetic_user");
  const userRoots = await client.query<{ count: unknown }>(
    `SELECT COUNT(*)::int AS count FROM "user" AS synthetic_user WHERE ${userPredicate.sql}`,
    userPredicate.values,
  );
  const companyRoots = await client.query<{ count: unknown }>(
    `SELECT COUNT(*)::int AS count FROM company
     WHERE slug = ANY($1::text[])`,
    [APPROVED_ROOTS.map((root) => root.companySlug)],
  );
  const jobRoots = await client.query<{ count: unknown }>(
    `SELECT COUNT(*)::int AS count FROM job
     WHERE slug = ANY($1::text[])`,
    [APPROVED_ROOTS.map((root) => root.jobSlug)],
  );
  if (
    normalizeCount(userRoots.rows[0]?.count ?? 0) !== 0 ||
    normalizeCount(companyRoots.rows[0]?.count ?? 0) !== 0 ||
    normalizeCount(jobRoots.rows[0]?.count ?? 0) !== 0
  ) {
    throw new CleanupSafetyError(
      "Approved root post-delete verification failed; the transaction will roll back.",
    );
  }
}

export async function runPreview(connectionString: string): Promise<{
  digest: string;
  plan: CleanupPlan;
  planFile: string;
}> {
  const snapshot = await withDatabaseClient(connectionString, (client) =>
    runTransaction(client, "preview", async () => {
      const discovered = await discoverSnapshot(client);
      validateSnapshot(discovered);
      return discovered;
    }),
  );
  const plan = createPlan(snapshot);
  const written = await writePlan(plan);
  return { ...written, plan };
}

export async function runExecute(options: {
  connectionString: string;
  planFile: string;
  confirmDigest: string;
  authorization: string | undefined;
  confirmation: string;
  beforeCommit?: () => Promise<void> | void;
}): Promise<{ digest: string; plan: CleanupPlan; planFile: string }> {
  if (options.authorization !== "true") {
    throw new CleanupSafetyError(
      `${EXECUTE_AUTHORIZATION_ENV}=true is required for execute mode.`,
    );
  }
  if (options.confirmation !== EXECUTE_CONFIRMATION) {
    throw new CleanupSafetyError(
      `Execute mode requires --confirm ${EXECUTE_CONFIRMATION}.`,
    );
  }
  const verified = await loadVerifiedPlan(
    options.planFile,
    options.confirmDigest,
  );
  await withDatabaseClient(options.connectionString, (client) =>
    runTransaction(client, "execute", async () => {
      await assertExpectedForeignKeys(client);
      await lockPlannedRecords(client, verified.plan);
      const snapshot = await discoverSnapshot(client);
      assertPlanMatchesSnapshot(verified.plan, snapshot);
      await deleteExactPlannedRecords(client, verified.plan);
      await verifyExactDeletion(client, verified.plan);
      await options.beforeCommit?.();
    }),
  );
  return verified;
}

function formatStatuses(plan: CleanupPlan): string {
  const userStatuses = [...new Set(plan.records.User.map((row) => row.status))]
    .sort()
    .join(", ");
  const jobStatuses = [...new Set(plan.records.Job.map((row) => row.status))]
    .sort()
    .join(", ");
  return [userStatuses, jobStatuses].filter(Boolean).join(", ") || "none";
}

export function formatRedactedSummary(
  mode: "preview" | "execute",
  plan: CleanupPlan,
  digest: string,
  planFile: string,
): string {
  const roles =
    [...new Set(plan.records.User.map((row) => row.role))].sort().join(", ") ||
    "none";
  const lines = [
    `Mode: ${mode}`,
    `Plan status: ${plan.status}`,
    `Approved user markers: ${plan.approvedUserMarkers.join(", ")}`,
    `Approved Company slugs: ${plan.approvedCompanySlugs.join(", ")}`,
    `Approved Job slugs: ${plan.approvedJobSlugs.join(", ")}`,
    `Generated at: ${plan.generatedAt}`,
    `Roles: ${roles}`,
    `Statuses: ${formatStatuses(plan)}`,
    ...APPROVED_RECORD_TYPES.map((type) => `${type}: ${plan.counts[type]}`),
    `Unexpected dependencies: ${FORBIDDEN_DEPENDENCY_TYPES.reduce(
      (sum, type) => sum + plan.forbiddenCounts[type],
      0,
    )}`,
    `Plan file: ${path.relative(process.cwd(), planFile) || path.basename(planFile)}`,
    `Plan SHA-256: ${digest}`,
    mode === "preview"
      ? "Database result: ROLLBACK"
      : "Database result: COMMIT after exact zero verification",
    "Storage result: no S3 deletion is implemented or performed.",
  ];
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new CleanupSafetyError("DATABASE_URL is required.");
  }

  if (args.mode === "preview") {
    const result = await runPreview(connectionString);
    console.info(
      formatRedactedSummary(
        "preview",
        result.plan,
        result.digest,
        result.planFile,
      ),
    );
    return;
  }

  assertExecuteAuthorization(args, process.env);
  const result = await runExecute({
    connectionString,
    planFile: args.planFile,
    confirmDigest: args.confirmDigest,
    authorization: process.env[EXECUTE_AUTHORIZATION_ENV],
    confirmation: args.confirmation,
  });
  console.info(
    formatRedactedSummary(
      "execute",
      result.plan,
      result.digest,
      result.planFile,
    ),
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (invokedPath === import.meta.url) {
  void main().catch((error: unknown) => {
    const message =
      error instanceof CleanupSafetyError
        ? error.message
        : "Synthetic cleanup failed safely; no unreviewed details were printed.";
    console.error(message);
    process.exitCode = 1;
  });
}
