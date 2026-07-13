import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";
import { getSkillLookupName } from "@/features/candidate-profile/schemas";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-app-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let applications: typeof import("@/features/applications/server/mutations");
let applicationData: typeof import("@/features/applications/server/data");
let jobData: typeof import("@/features/jobs/server/data");
let companies: typeof import("@/features/recruiter-company/server/mutations");

let candidateAId: string;
let candidateBId: string;
let ownerRecruiterId: string;
let memberRecruiterId: string;
let otherRecruiterId: string;
let adminId: string;
let companyPubId: string;

let publishedJobId: string;
let draftJobSlug: string;
let closedJobSlug: string;
let archivedJobSlug: string;
let deadlineJobSlug: string;
let unpubCompanyJobSlug: string;
let otherCompanyJobId: string;

const createdCompanyIds = new Set<string>();
const createdSkillNames = new Set<string>();
let jobSeq = 0;

function getTestDatabaseURL() {
  if (
    process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Database integration tests require explicit opt-in and TEST_DATABASE_URL.",
    );
  }
  if (
    [process.env.DATABASE_URL, process.env.DIRECT_URL].some(
      (url) => url && url === process.env.TEST_DATABASE_URL,
    )
  ) {
    throw new Error(
      "TEST_DATABASE_URL must not match an application database URL.",
    );
  }
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection URL.");
  }
  return process.env.TEST_DATABASE_URL;
}

function actor(userId: string, role: PlatformRole) {
  return { userId, role } as const;
}

const completeCompany = {
  tagline: "Builds useful tools",
  description: "A complete integration-test company profile.",
  industry: "Technology",
  headquarters: "Baku",
  websiteUrl: "https://example.test/",
  companySize: "ELEVEN_TO_FIFTY" as const,
  foundedYear: 2020,
};

async function createJob(
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; slug: string }> {
  jobSeq += 1;
  return prisma.job.create({
    data: {
      companyId: companyPubId,
      title: `${testPrefix} Job ${jobSeq}`,
      slug: `${testPrefix}-job-${jobSeq}`,
      status: "DRAFT",
      ...overrides,
    },
    select: { id: true, slug: true },
  });
}

function createPublishedJob(overrides: Record<string, unknown> = {}) {
  return createJob({
    status: "PUBLISHED",
    publishedAt: new Date(),
    ...overrides,
  });
}

async function applyFresh(candidateId = candidateAId) {
  const job = await createPublishedJob();
  const application = await applications.createJobApplication(
    prisma,
    actor(candidateId, "CANDIDATE"),
    job.slug,
    "",
  );
  return { applicationId: application.id, jobId: job.id, slug: job.slug };
}

function moveByOwner(applicationId: string, target: string) {
  return applications.transitionApplicationByRecruiter(
    prisma,
    actor(ownerRecruiterId, "RECRUITER"),
    applicationId,
    // Cast so the test can also exercise runtime rejection of invalid targets.
    target as never,
  );
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Job application pipeline database boundaries"
    : "Job application pipeline database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [
        prismaModule,
        applicationMutations,
        applicationDataModule,
        jobDataModule,
        companyMutations,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/applications/server/mutations"),
        import("@/features/applications/server/data"),
        import("@/features/jobs/server/data"),
        import("@/features/recruiter-company/server/mutations"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      applications = applicationMutations;
      applicationData = applicationDataModule;
      jobData = jobDataModule;
      companies = companyMutations;

      const users = await Promise.all(
        (
          [
            ["candidate-a", "CANDIDATE"],
            ["candidate-b", "CANDIDATE"],
            ["owner-recruiter", "RECRUITER"],
            ["member-recruiter", "RECRUITER"],
            ["other-recruiter", "RECRUITER"],
            ["admin", "ADMIN"],
          ] as const
        ).map(([label, role]) =>
          prisma.user.create({
            data: {
              id: `${testPrefix}-${label}`,
              name: `App Test ${label}`,
              email: `${testPrefix}-${label}@example.test`,
              role,
            },
            select: { id: true },
          }),
        ),
      );
      [
        candidateAId,
        candidateBId,
        ownerRecruiterId,
        memberRecruiterId,
        otherRecruiterId,
        adminId,
      ] = users.map(({ id }) => id);

      // Candidate A: complete apply profile (headline, location, one skill).
      const profileA = await prisma.candidateProfile.create({
        data: {
          userId: candidateAId,
          headline: "Frontend Engineer",
          location: "Baku",
        },
        select: { id: true },
      });
      const skillName = `${testPrefix} React`;
      createdSkillNames.add(skillName);
      const skill = await prisma.skill.upsert({
        where: { normalizedName: getSkillLookupName(skillName) },
        create: {
          name: skillName,
          normalizedName: getSkillLookupName(skillName),
        },
        update: {},
        select: { id: true },
      });
      await prisma.candidateSkill.create({
        data: { candidateProfileId: profileA.id, skillId: skill.id },
      });

      // Candidate B: incomplete apply profile (no skill).
      await prisma.candidateProfile.create({
        data: { userId: candidateBId, headline: "Designer", location: "Baku" },
      });

      const companyPub = await companies.createRecruiterCompany(
        prisma,
        actor(ownerRecruiterId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Pub Co` },
      );
      const companyUnpub = await companies.createRecruiterCompany(
        prisma,
        actor(ownerRecruiterId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Unpub Co` },
      );
      const companyOther = await companies.createRecruiterCompany(
        prisma,
        actor(otherRecruiterId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Other Co` },
      );
      companyPubId = companyPub.id;
      [companyPub.id, companyUnpub.id, companyOther.id].forEach((id) =>
        createdCompanyIds.add(id),
      );

      await companies.publishRecruiterCompany(
        prisma,
        actor(ownerRecruiterId, "RECRUITER"),
        companyPub.id,
      );
      await companies.publishRecruiterCompany(
        prisma,
        actor(otherRecruiterId, "RECRUITER"),
        companyOther.id,
      );
      await prisma.companyMembership.create({
        data: {
          userId: memberRecruiterId,
          companyId: companyPub.id,
          role: "MEMBER",
        },
      });

      const [
        published,
        draft,
        closed,
        archived,
        deadline,
        unpubCompanyJob,
        otherCompanyJob,
      ] = await Promise.all([
        createPublishedJob(),
        createJob({ status: "DRAFT" }),
        createJob({
          status: "CLOSED",
          publishedAt: new Date(),
          closedAt: new Date(),
        }),
        createJob({ status: "ARCHIVED" }),
        createPublishedJob({
          applicationDeadline: new Date("2020-01-01T00:00:00.000Z"),
        }),
        createJob({
          companyId: companyUnpub.id,
          status: "PUBLISHED",
          publishedAt: new Date(),
        }),
        createJob({
          companyId: companyOther.id,
          status: "PUBLISHED",
          publishedAt: new Date(),
        }),
      ]);
      publishedJobId = published.id;
      draftJobSlug = draft.slug;
      closedJobSlug = closed.slug;
      archivedJobSlug = archived.slug;
      deadlineJobSlug = deadline.slug;
      unpubCompanyJobSlug = unpubCompanyJob.slug;
      otherCompanyJobId = otherCompanyJob.id;
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      // Prefix matches guarantee cleanup even after a partial setup failure.
      await prisma.emailOutbox.deleteMany({
        where: { recipientEmail: { startsWith: testPrefix } },
      });
      await prisma.company.deleteMany({
        where: {
          OR: [
            { id: { in: [...createdCompanyIds] } },
            { name: { startsWith: testPrefix } },
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: testPrefix } },
      });
      await prisma.skill.deleteMany({
        where: {
          normalizedName: {
            in: [...createdSkillNames].map(getSkillLookupName),
          },
          candidates: { none: {} },
          jobs: { none: {} },
        },
      });
      await prisma.$disconnect();
    }, 60_000);

    it("lets an eligible candidate apply and records the initial status history", async () => {
      const job = await createPublishedJob();
      const application = await applications.createJobApplication(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        job.slug,
        "  Excited to apply  ",
      );
      const stored = await prisma.jobApplication.findUnique({
        where: { id: application.id },
        include: { history: true },
      });
      expect(stored).toMatchObject({
        status: "SUBMITTED",
        candidateId: candidateAId,
        coverLetter: "Excited to apply",
      });
      expect(stored?.history).toHaveLength(1);
      expect(stored?.history[0]).toMatchObject({
        fromStatus: null,
        toStatus: "SUBMITTED",
        changedByUserId: candidateAId,
      });
    });

    it("blocks applying without the required profile fields", async () => {
      const job = await createPublishedJob();
      await expect(
        applications.createJobApplication(
          prisma,
          actor(candidateBId, "CANDIDATE"),
          job.slug,
          "",
        ),
      ).rejects.toMatchObject({ code: "PROFILE_INCOMPLETE" });
    });

    it("blocks applying to draft, closed, archived, and unpublished-company jobs", async () => {
      for (const slug of [
        draftJobSlug,
        closedJobSlug,
        archivedJobSlug,
        unpubCompanyJobSlug,
      ]) {
        await expect(
          applications.createJobApplication(
            prisma,
            actor(candidateAId, "CANDIDATE"),
            slug,
            "",
          ),
        ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
      }
    });

    it("blocks applying after the deadline", async () => {
      await expect(
        applications.createJobApplication(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          deadlineJobSlug,
          "",
        ),
      ).rejects.toMatchObject({ code: "DEADLINE_PASSED" });
    });

    it("forbids recruiters and admins from applying", async () => {
      const job = await createPublishedJob();
      await expect(
        applications.createJobApplication(
          prisma,
          actor(ownerRecruiterId, "RECRUITER"),
          job.slug,
          "",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        applications.createJobApplication(
          prisma,
          actor(adminId, "ADMIN"),
          job.slug,
          "",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("prevents duplicate and concurrent duplicate applications", async () => {
      const job = await createPublishedJob();
      await applications.createJobApplication(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        job.slug,
        "",
      );
      await expect(
        applications.createJobApplication(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          job.slug,
          "",
        ),
      ).rejects.toMatchObject({ code: "ALREADY_APPLIED" });

      const concurrentJob = await createPublishedJob();
      const results = await Promise.allSettled([
        applications.createJobApplication(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          concurrentJob.slug,
          "",
        ),
        applications.createJobApplication(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          concurrentJob.slug,
          "",
        ),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const count = await prisma.jobApplication.count({
        where: { jobId: concurrentJob.id },
      });
      expect(count).toBe(1);
    });

    it("lets a candidate read only their own application", async () => {
      const { applicationId } = await applyFresh();
      expect(
        await applicationData.getCandidateApplication(
          prisma,
          candidateAId,
          applicationId,
        ),
      ).not.toBeNull();
      expect(
        await applicationData.getCandidateApplication(
          prisma,
          candidateBId,
          applicationId,
        ),
      ).toBeNull();
    });

    it("lets a candidate withdraw active applications and records history", async () => {
      const submitted = await applyFresh();
      const withdrawn = await applications.withdrawJobApplication(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        submitted.applicationId,
      );
      expect(withdrawn.status).toBe("WITHDRAWN");
      const stored = await prisma.jobApplication.findUnique({
        where: { id: submitted.applicationId },
        include: { history: { orderBy: { createdAt: "asc" } } },
      });
      expect(stored?.status).toBe("WITHDRAWN");
      expect(stored?.withdrawnAt).not.toBeNull();
      expect(stored?.history.at(-1)).toMatchObject({
        fromStatus: "SUBMITTED",
        toStatus: "WITHDRAWN",
        changedByUserId: candidateAId,
      });

      const underReview = await applyFresh();
      await moveByOwner(underReview.applicationId, "UNDER_REVIEW");
      const withdrawn2 = await applications.withdrawJobApplication(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        underReview.applicationId,
      );
      expect(withdrawn2.status).toBe("WITHDRAWN");
    });

    it("blocks withdrawing terminal applications and foreign applications", async () => {
      const hired = await applyFresh();
      await moveByOwner(hired.applicationId, "UNDER_REVIEW");
      await moveByOwner(hired.applicationId, "INTERVIEW");
      await moveByOwner(hired.applicationId, "OFFER");
      await moveByOwner(hired.applicationId, "HIRED");
      await expect(
        applications.withdrawJobApplication(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          hired.applicationId,
        ),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      const rejected = await applyFresh();
      await moveByOwner(rejected.applicationId, "REJECTED");
      await expect(
        applications.withdrawJobApplication(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          rejected.applicationId,
        ),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      const foreign = await applyFresh();
      await expect(
        applications.withdrawJobApplication(
          prisma,
          actor(candidateBId, "CANDIDATE"),
          foreign.applicationId,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("scopes recruiter reads to owned companies", async () => {
      const { applicationId, jobId } = await applyFresh();
      expect(
        await applicationData.getRecruiterApplication(
          prisma,
          ownerRecruiterId,
          applicationId,
        ),
      ).not.toBeNull();
      expect(
        await applicationData.getJobApplicantPipeline(
          prisma,
          ownerRecruiterId,
          jobId,
        ),
      ).not.toBeNull();

      // MEMBER of the company cannot access the pipeline or the application.
      expect(
        await applicationData.getJobApplicantPipeline(
          prisma,
          memberRecruiterId,
          jobId,
        ),
      ).toBeNull();
      expect(
        await applicationData.getRecruiterApplication(
          prisma,
          memberRecruiterId,
          applicationId,
        ),
      ).toBeNull();

      // A recruiter from another company cannot access it either.
      expect(
        await applicationData.getRecruiterApplication(
          prisma,
          otherRecruiterId,
          applicationId,
        ),
      ).toBeNull();
    });

    it("lets an OWNER move an application through the full pipeline", async () => {
      const { applicationId } = await applyFresh();
      expect((await moveByOwner(applicationId, "UNDER_REVIEW")).status).toBe(
        "UNDER_REVIEW",
      );
      expect((await moveByOwner(applicationId, "INTERVIEW")).status).toBe(
        "INTERVIEW",
      );
      expect((await moveByOwner(applicationId, "OFFER")).status).toBe("OFFER");
      expect((await moveByOwner(applicationId, "HIRED")).status).toBe("HIRED");

      const stored = await prisma.jobApplication.findUnique({
        where: { id: applicationId },
        include: { history: true },
      });
      expect(stored?.status).toBe("HIRED");
      // Initial submit + four transitions.
      expect(stored?.history).toHaveLength(5);
      expect(
        stored?.history.every((entry) =>
          entry.toStatus === "SUBMITTED"
            ? entry.changedByUserId === candidateAId
            : entry.changedByUserId === ownerRecruiterId,
        ),
      ).toBe(true);
    });

    it("rejects invalid, terminal, and WITHDRAWN recruiter transitions", async () => {
      const { applicationId } = await applyFresh();
      // Skipping a stage is rejected.
      await expect(moveByOwner(applicationId, "OFFER")).rejects.toMatchObject({
        code: "INVALID_TRANSITION",
      });
      // A recruiter can never set WITHDRAWN.
      await expect(
        moveByOwner(applicationId, "WITHDRAWN"),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      await moveByOwner(applicationId, "REJECTED");
      // Terminal-state mutation is rejected.
      await expect(
        moveByOwner(applicationId, "UNDER_REVIEW"),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      // A non-owner cannot transition it.
      const owned = await applyFresh();
      await expect(
        applications.transitionApplicationByRecruiter(
          prisma,
          actor(otherRecruiterId, "RECRUITER"),
          owned.applicationId,
          "UNDER_REVIEW",
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("keeps recruiter application queries within owned companies", async () => {
      const { applicationId } = await applyFresh();

      const ownerResults = await applicationData.getRecruiterApplications(
        prisma,
        ownerRecruiterId,
        { q: "", status: "", companyId: "", jobId: "" },
      );
      expect(ownerResults.some((a) => a.id === applicationId)).toBe(true);
      expect(ownerResults.every((a) => a.job.company.id === companyPubId)).toBe(
        true,
      );

      const otherResults = await applicationData.getRecruiterApplications(
        prisma,
        otherRecruiterId,
        { q: "", status: "", companyId: "", jobId: "" },
      );
      expect(otherResults.some((a) => a.id === applicationId)).toBe(false);
    });

    it("never exposes application or candidate data on public job queries", async () => {
      const { slug } = await applyFresh();
      const publicJob = await jobData.getPublishedJobBySlug(prisma, slug);
      expect(publicJob).not.toBeNull();
      const keys = Object.keys(publicJob ?? {});
      expect(keys).not.toContain("applications");
      expect(keys).not.toContain("candidate");
      // The company projection never leaks membership data.
      expect(Object.keys(publicJob?.company ?? {})).toEqual(["name", "slug"]);
    });

    it("does not expose unrelated membership data in the recruiter detail", async () => {
      const { applicationId } = await applyFresh();
      const detail = await applicationData.getRecruiterApplication(
        prisma,
        ownerRecruiterId,
        applicationId,
      );
      expect(detail).not.toBeNull();
      expect(Object.keys(detail?.job.company ?? {})).toEqual([
        "id",
        "name",
        "slug",
        "isPublished",
      ]);
    });

    it("keeps other-company jobs out of the owner's pipeline reads", async () => {
      expect(
        await applicationData.getJobApplicantPipeline(
          prisma,
          ownerRecruiterId,
          otherCompanyJobId,
        ),
      ).toBeNull();
      // The published job under the owner's company is reachable.
      expect(
        await applicationData.getJobApplicantPipeline(
          prisma,
          ownerRecruiterId,
          publishedJobId,
        ),
      ).not.toBeNull();
    });
  },
);
