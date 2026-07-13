import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";
import { getSkillLookupName } from "@/features/candidate-profile/schemas";

import { FakeDocumentStorage } from "./fake-storage";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-doc-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let storage: FakeDocumentStorage;
let docs: typeof import("@/features/candidate-documents/server/mutations");
let docData: typeof import("@/features/candidate-documents/server/data");
let applications: typeof import("@/features/applications/server/mutations");
let applicationData: typeof import("@/features/applications/server/data");
let jobData: typeof import("@/features/jobs/server/data");
let companyData: typeof import("@/features/recruiter-company/server/data");
let companies: typeof import("@/features/recruiter-company/server/mutations");
let keys: typeof import("@/lib/storage/keys");
let hash: typeof import("@/features/candidate-documents/hash");
let validation: typeof import("@/features/candidate-documents/validation");
let storageTypes: typeof import("@/lib/storage/types");

let ownerRecruiterId: string;
let memberRecruiterId: string;
let otherRecruiterId: string;
let adminId: string;
let companyPubId: string;
let companyPubSlug: string;
let companyOtherId: string;
let sharedSkillId: string;
const sharedSkillName = () => `${testPrefix} Docs Skill`;

let userSeq = 0;
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

function syntheticPdf(tag: string): Buffer {
  return Buffer.from(
    `%PDF-1.4\n%CareerBridge synthetic ${tag}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`,
    "utf8",
  );
}

async function makeCandidate(applyReady = false): Promise<string> {
  userSeq += 1;
  const user = await prisma.user.create({
    data: {
      id: `${testPrefix}-cand-${userSeq}`,
      name: `Doc Candidate ${userSeq}`,
      email: `${testPrefix}-cand-${userSeq}@example.test`,
      role: "CANDIDATE",
    },
    select: { id: true },
  });
  if (applyReady) {
    const profile = await prisma.candidateProfile.create({
      data: { userId: user.id, headline: "Engineer", location: "Baku" },
      select: { id: true },
    });
    await prisma.candidateSkill.create({
      data: { candidateProfileId: profile.id, skillId: sharedSkillId },
    });
  }
  return user.id;
}

async function uploadResume(candidateId: string, filename = "resume.pdf") {
  const bytes = syntheticPdf(
    `${candidateId}-${randomBytes(3).toString("hex")}`,
  );
  const storageKey = keys.generateResumeStorageKey();
  const { documentId } = await docs.replaceCurrentResume(
    prisma,
    storage,
    actor(candidateId, "CANDIDATE"),
    {
      storageKey,
      bytes,
      originalFilename: validation.sanitizeDocumentFilename(filename),
      mimeType: "application/pdf",
      sizeBytes: bytes.byteLength,
      sha256: hash.sha256Hex(bytes),
    },
  );
  return { documentId, storageKey, bytes };
}

async function createPublishedJob(companyId = companyPubId) {
  jobSeq += 1;
  return prisma.job.create({
    data: {
      companyId,
      title: `${testPrefix} Job ${jobSeq}`,
      slug: `${testPrefix}-job-${jobSeq}`,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: { id: true, slug: true },
  });
}

async function applyTo(candidateId: string, slug: string) {
  return applications.createJobApplication(
    prisma,
    actor(candidateId, "CANDIDATE"),
    slug,
    "",
  );
}

async function attachedDocumentId(applicationId: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { resumeDocumentId: true },
  });
  return application?.resumeDocumentId ?? null;
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Secure Candidate document boundaries"
    : "Secure Candidate document boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [
        prismaModule,
        docsModule,
        docDataModule,
        applicationMutations,
        applicationDataModule,
        jobDataModule,
        companyDataModule,
        companyMutations,
        keysModule,
        hashModule,
        validationModule,
        typesModule,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/candidate-documents/server/mutations"),
        import("@/features/candidate-documents/server/data"),
        import("@/features/applications/server/mutations"),
        import("@/features/applications/server/data"),
        import("@/features/jobs/server/data"),
        import("@/features/recruiter-company/server/data"),
        import("@/features/recruiter-company/server/mutations"),
        import("@/lib/storage/keys"),
        import("@/features/candidate-documents/hash"),
        import("@/features/candidate-documents/validation"),
        import("@/lib/storage/types"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      docs = docsModule;
      docData = docDataModule;
      applications = applicationMutations;
      applicationData = applicationDataModule;
      jobData = jobDataModule;
      companyData = companyDataModule;
      companies = companyMutations;
      keys = keysModule;
      hash = hashModule;
      validation = validationModule;
      storageTypes = typesModule;
      storage = new FakeDocumentStorage();

      const recruiters = await Promise.all(
        (
          [
            ["owner-recruiter", "RECRUITER"],
            ["member-recruiter", "RECRUITER"],
            ["other-recruiter", "RECRUITER"],
            ["admin", "ADMIN"],
          ] as const
        ).map(([label, role]) =>
          prisma.user.create({
            data: {
              id: `${testPrefix}-${label}`,
              name: `Doc ${label}`,
              email: `${testPrefix}-${label}@example.test`,
              role,
            },
            select: { id: true },
          }),
        ),
      );
      [ownerRecruiterId, memberRecruiterId, otherRecruiterId, adminId] =
        recruiters.map(({ id }) => id);

      const skill = await prisma.skill.upsert({
        where: { normalizedName: getSkillLookupName(sharedSkillName()) },
        create: {
          name: sharedSkillName(),
          normalizedName: getSkillLookupName(sharedSkillName()),
        },
        update: {},
        select: { id: true },
      });
      sharedSkillId = skill.id;

      const companyPub = await companies.createRecruiterCompany(
        prisma,
        actor(ownerRecruiterId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Pub Co` },
      );
      const companyOther = await companies.createRecruiterCompany(
        prisma,
        actor(otherRecruiterId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Other Co` },
      );
      companyPubId = companyPub.id;
      companyPubSlug = companyPub.slug;
      companyOtherId = companyOther.id;

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
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      await prisma.emailOutbox.deleteMany({
        where: { recipientEmail: { startsWith: testPrefix } },
      });
      await prisma.company.deleteMany({
        where: { name: { startsWith: testPrefix } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: testPrefix } },
      });
      await prisma.skill.deleteMany({
        where: {
          normalizedName: getSkillLookupName(sharedSkillName()),
          candidates: { none: {} },
          jobs: { none: {} },
        },
      });
      await prisma.$disconnect();
    }, 60_000);

    // ---------------------------------------------------------------------
    // Upload, current pointer, immutability, and replacement
    // ---------------------------------------------------------------------

    it("lets a candidate upload a valid PDF that becomes their current CV", async () => {
      const candidateId = await makeCandidate();
      const { documentId, storageKey, bytes } = await uploadResume(candidateId);

      const document = await prisma.candidateDocument.findUnique({
        where: { id: documentId },
      });
      expect(document).toMatchObject({
        candidateId,
        kind: "RESUME",
        storageKey,
        mimeType: "application/pdf",
        sizeBytes: bytes.byteLength,
        sha256: hash.sha256Hex(bytes),
        removedFromProfileAt: null,
      });

      const pointer = await prisma.candidateResume.findUnique({
        where: { candidateId },
      });
      expect(pointer?.documentId).toBe(documentId);
      expect(storage.objects.has(storageKey)).toBe(true);
    });

    it("rejects non-PDF and oversized uploads before any storage or database write", () => {
      expect(
        validation.validateResumeUpload({
          size: 10,
          mimeType: "image/png",
          filename: "x.png",
          header: new Uint8Array([1, 2, 3, 4, 5]),
        }).ok,
      ).toBe(false);
      expect(
        validation.validateResumeUpload({
          size: validation.MAX_RESUME_BYTES + 1,
          mimeType: "application/pdf",
          filename: "x.pdf",
          header: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
        }).ok,
      ).toBe(false);
    });

    it("forbids recruiters and admins from uploading a candidate CV", async () => {
      const bytes = syntheticPdf("forbidden");
      const input = {
        storageKey: keys.generateResumeStorageKey(),
        bytes,
        originalFilename: "resume.pdf",
        mimeType: "application/pdf",
        sizeBytes: bytes.byteLength,
        sha256: hash.sha256Hex(bytes),
      };
      await expect(
        docs.replaceCurrentResume(
          prisma,
          storage,
          actor(ownerRecruiterId, "RECRUITER"),
          input,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        docs.replaceCurrentResume(
          prisma,
          storage,
          actor(adminId, "ADMIN"),
          input,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("creates a new immutable version on replacement without mutating the previous one", async () => {
      const candidateId = await makeCandidate();
      const first = await uploadResume(candidateId, "first.pdf");
      const firstBefore = await prisma.candidateDocument.findUniqueOrThrow({
        where: { id: first.documentId },
      });

      const second = await uploadResume(candidateId, "second.pdf");
      expect(second.documentId).not.toBe(first.documentId);

      const firstAfter = await prisma.candidateDocument.findUniqueOrThrow({
        where: { id: first.documentId },
      });
      expect(firstAfter).toEqual(firstBefore);

      const documents = await prisma.candidateDocument.findMany({
        where: { candidateId },
      });
      expect(documents).toHaveLength(2);

      const pointers = await prisma.candidateResume.findMany({
        where: { candidateId },
      });
      expect(pointers).toHaveLength(1);
      expect(pointers[0]?.documentId).toBe(second.documentId);
    });

    it("keeps a single current pointer under concurrent replacement", async () => {
      const candidateId = await makeCandidate();
      const results = await Promise.allSettled([
        uploadResume(candidateId, "a.pdf"),
        uploadResume(candidateId, "b.pdf"),
      ]);
      expect(results.some((r) => r.status === "fulfilled")).toBe(true);

      const pointers = await prisma.candidateResume.findMany({
        where: { candidateId },
        include: { document: { select: { candidateId: true } } },
      });
      expect(pointers).toHaveLength(1);
      expect(pointers[0]?.document.candidateId).toBe(candidateId);
    });

    // ---------------------------------------------------------------------
    // Candidate download authorization
    // ---------------------------------------------------------------------

    it("authorizes a candidate for their own current and previous CVs only", async () => {
      const candidateId = await makeCandidate();
      const previous = await uploadResume(candidateId, "old.pdf");
      const current = await uploadResume(candidateId, "new.pdf");

      for (const documentId of [current.documentId, previous.documentId]) {
        const decision = await docs.authorizeDocumentDownload(
          prisma,
          actor(candidateId, "CANDIDATE"),
          documentId,
        );
        expect(decision).toMatchObject({ accessType: "OWNER_DOWNLOAD" });
      }

      const otherCandidate = await makeCandidate();
      expect(
        await docs.authorizeDocumentDownload(
          prisma,
          actor(otherCandidate, "CANDIDATE"),
          current.documentId,
        ),
      ).toBeNull();
    });

    it("denies signed-out users and does not reveal unknown ids", async () => {
      const candidateId = await makeCandidate();
      const { documentId } = await uploadResume(candidateId);

      expect(
        await docs.authorizeDocumentDownload(prisma, null, documentId),
      ).toBeNull();
      // Unknown id resolves to the same null as an unauthorized one.
      expect(
        await docs.authorizeDocumentDownload(
          prisma,
          actor(candidateId, "CANDIDATE"),
          "does-not-exist",
        ),
      ).toBeNull();
    });

    // ---------------------------------------------------------------------
    // Application CV snapshot
    // ---------------------------------------------------------------------

    it("leaves applications without a current CV attached as null", async () => {
      const candidateId = await makeCandidate(true);
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);
      expect(await attachedDocumentId(application.id)).toBeNull();
    });

    it("snapshots the current CV and pins it across later replacement", async () => {
      const candidateId = await makeCandidate(true);
      const original = await uploadResume(candidateId, "snapshot.pdf");

      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);
      expect(await attachedDocumentId(application.id)).toBe(
        original.documentId,
      );

      // Replacing the current CV must not change the historical attachment.
      const replacement = await uploadResume(candidateId, "replacement.pdf");
      expect(await attachedDocumentId(application.id)).toBe(
        original.documentId,
      );

      // A new application after replacement snapshots the new CV.
      const job2 = await createPublishedJob();
      const application2 = await applyTo(candidateId, job2.slug);
      expect(await attachedDocumentId(application2.id)).toBe(
        replacement.documentId,
      );
    });

    it("never attaches another candidate's document on apply", async () => {
      const candidateA = await makeCandidate(true);
      const candidateB = await makeCandidate(true);
      await uploadResume(candidateA, "a.pdf");
      const bDoc = await uploadResume(candidateB, "b.pdf");

      const job = await createPublishedJob();
      const application = await applyTo(candidateA, job.slug);
      const attached = await attachedDocumentId(application.id);
      expect(attached).not.toBe(bDoc.documentId);
      const attachedDoc = await prisma.candidateDocument.findUnique({
        where: { id: attached ?? "" },
        select: { candidateId: true },
      });
      expect(attachedDoc?.candidateId).toBe(candidateA);
    });

    // ---------------------------------------------------------------------
    // Existing-application one-time attachment
    // ---------------------------------------------------------------------

    it("lets an eligible existing application attach the current CV exactly once", async () => {
      const candidateId = await makeCandidate(true);
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);
      expect(await attachedDocumentId(application.id)).toBeNull();

      await uploadResume(candidateId, "later.pdf");
      const current = await docData.getCandidateCurrentResume(
        prisma,
        candidateId,
      );
      await docs.attachCurrentResumeToApplication(
        prisma,
        actor(candidateId, "CANDIDATE"),
        application.id,
      );
      const attached = await attachedDocumentId(application.id);
      expect(attached).toBe(current.hasResume ? current.documentId : null);

      // A second attach — even after replacing the CV — cannot change it.
      await uploadResume(candidateId, "even-later.pdf");
      await expect(
        docs.attachCurrentResumeToApplication(
          prisma,
          actor(candidateId, "CANDIDATE"),
          application.id,
        ),
      ).rejects.toMatchObject({ code: "ALREADY_ATTACHED" });
      expect(await attachedDocumentId(application.id)).toBe(attached);
    });

    it("refuses a late attachment on a terminal application", async () => {
      const candidateId = await makeCandidate(true);
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);
      await applications.transitionApplicationByRecruiter(
        prisma,
        actor(ownerRecruiterId, "RECRUITER"),
        application.id,
        "REJECTED",
      );
      await uploadResume(candidateId, "too-late.pdf");
      await expect(
        docs.attachCurrentResumeToApplication(
          prisma,
          actor(candidateId, "CANDIDATE"),
          application.id,
        ),
      ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    });

    it("cannot attach another candidate's application", async () => {
      const owner = await makeCandidate(true);
      const stranger = await makeCandidate(true);
      const job = await createPublishedJob();
      const application = await applyTo(owner, job.slug);
      await uploadResume(stranger, "stranger.pdf");
      await expect(
        docs.attachCurrentResumeToApplication(
          prisma,
          actor(stranger, "CANDIDATE"),
          application.id,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    // ---------------------------------------------------------------------
    // Recruiter download authorization
    // ---------------------------------------------------------------------

    it("authorizes the owning company recruiter but no one else", async () => {
      const candidateId = await makeCandidate(true);
      const { documentId } = await uploadResume(candidateId, "review.pdf");
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);

      const ownerDecision = await docs.authorizeDocumentDownload(
        prisma,
        actor(ownerRecruiterId, "RECRUITER"),
        documentId,
      );
      expect(ownerDecision).toMatchObject({
        accessType: "RECRUITER_APPLICATION_DOWNLOAD",
        applicationId: application.id,
      });

      for (const recruiter of [
        actor(memberRecruiterId, "RECRUITER"),
        actor(otherRecruiterId, "RECRUITER"),
        actor(adminId, "ADMIN"),
      ]) {
        expect(
          await docs.authorizeDocumentDownload(prisma, recruiter, documentId),
        ).toBeNull();
      }
    });

    it("denies a recruiter a document with no application relation", async () => {
      const candidateId = await makeCandidate(true);
      const { documentId } = await uploadResume(candidateId, "unattached.pdf");
      // Uploaded but never applied — no owned application references it.
      expect(
        await docs.authorizeDocumentDownload(
          prisma,
          actor(ownerRecruiterId, "RECRUITER"),
          documentId,
        ),
      ).toBeNull();

      // Attached only to another company's application — still denied.
      const otherJob = await createPublishedJob(companyOtherId);
      await applyTo(candidateId, otherJob.slug);
      expect(
        await docs.authorizeDocumentDownload(
          prisma,
          actor(ownerRecruiterId, "RECRUITER"),
          documentId,
        ),
      ).toBeNull();
    });

    // ---------------------------------------------------------------------
    // Remove current CV
    // ---------------------------------------------------------------------

    it("clears the current pointer while keeping historical attachments downloadable", async () => {
      const candidateId = await makeCandidate(true);
      const { documentId } = await uploadResume(candidateId, "keep.pdf");
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);

      const removal = await docs.removeCurrentResume(
        prisma,
        actor(candidateId, "CANDIDATE"),
      );
      expect(removal).toEqual({ removed: true });

      expect(
        await prisma.candidateResume.findUnique({ where: { candidateId } }),
      ).toBeNull();
      const document = await prisma.candidateDocument.findUniqueOrThrow({
        where: { id: documentId },
      });
      expect(document.removedFromProfileAt).not.toBeNull();

      // The historical application attachment is untouched...
      expect(await attachedDocumentId(application.id)).toBe(documentId);
      // ...and the owning recruiter can still download it.
      expect(
        await docs.authorizeDocumentDownload(
          prisma,
          actor(ownerRecruiterId, "RECRUITER"),
          documentId,
        ),
      ).toMatchObject({ accessType: "RECRUITER_APPLICATION_DOWNLOAD" });

      // A new application after removal snapshots no CV.
      const job2 = await createPublishedJob();
      const application2 = await applyTo(candidateId, job2.slug);
      expect(await attachedDocumentId(application2.id)).toBeNull();
    });

    // ---------------------------------------------------------------------
    // Access audit
    // ---------------------------------------------------------------------

    it("logs authorized downloads and never logs a denied one", async () => {
      const candidateId = await makeCandidate(true);
      const { documentId } = await uploadResume(candidateId, "audit.pdf");
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);

      await docs.logDocumentDownload(prisma, {
        documentId,
        actorUserId: candidateId,
        applicationId: null,
        accessType: "OWNER_DOWNLOAD",
      });
      await docs.logDocumentDownload(prisma, {
        documentId,
        actorUserId: ownerRecruiterId,
        applicationId: application.id,
        accessType: "RECRUITER_APPLICATION_DOWNLOAD",
      });

      const logs = await prisma.candidateDocumentAccessLog.findMany({
        where: { documentId },
        orderBy: { createdAt: "asc" },
      });
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        actorUserId: candidateId,
        applicationId: null,
        accessType: "OWNER_DOWNLOAD",
      });
      expect(logs[1]).toMatchObject({
        actorUserId: ownerRecruiterId,
        applicationId: application.id,
        accessType: "RECRUITER_APPLICATION_DOWNLOAD",
      });

      // A denied authorization is side-effect free: no log is written.
      const stranger = await makeCandidate();
      const before = await prisma.candidateDocumentAccessLog.count({
        where: { documentId },
      });
      expect(
        await docs.authorizeDocumentDownload(
          prisma,
          actor(stranger, "CANDIDATE"),
          documentId,
        ),
      ).toBeNull();
      const after = await prisma.candidateDocumentAccessLog.count({
        where: { documentId },
      });
      expect(after).toBe(before);
    });

    // ---------------------------------------------------------------------
    // Public privacy and browser-facing data boundaries
    // ---------------------------------------------------------------------

    it("never exposes document data on public or recruiter-list surfaces", async () => {
      const candidateId = await makeCandidate(true);
      await uploadResume(candidateId, "private.pdf");
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);

      const publicJob = await jobData.getPublishedJobBySlug(prisma, job.slug);
      const publicJobKeys = Object.keys(publicJob ?? {});
      expect(publicJobKeys).not.toContain("resumeDocument");
      expect(publicJobKeys).not.toContain("applications");

      const publicCompany = await companyData.getPublishedCompanyBySlug(
        prisma,
        companyPubSlug,
      );
      const publicCompanyText = JSON.stringify(publicCompany ?? {});
      expect(publicCompanyText).not.toContain("resumeDocument");
      expect(publicCompanyText).not.toContain("storageKey");

      // Recruiter list exposes only an attachment boolean, never the id.
      const list = await applicationData.getRecruiterApplications(
        prisma,
        ownerRecruiterId,
        { q: "", status: "", companyId: "", jobId: "" },
      );
      const row = list.find((item) => item.id === application.id);
      expect(row).toBeDefined();
      expect(row).toHaveProperty("hasResume", true);
      expect(row).not.toHaveProperty("resumeDocumentId");
      expect(row).not.toHaveProperty("resumeDocument");
    });

    it("never returns storage keys or hashes to browser-facing reads", async () => {
      const candidateId = await makeCandidate(true);
      await uploadResume(candidateId, "leak-check.pdf");
      const job = await createPublishedJob();
      const application = await applyTo(candidateId, job.slug);

      const overview = await docData.getCandidateDocumentsOverview(
        prisma,
        candidateId,
      );
      const current = await docData.getCandidateCurrentResume(
        prisma,
        candidateId,
      );
      const candidateApp = await applicationData.getCandidateApplication(
        prisma,
        candidateId,
        application.id,
      );
      const recruiterApp = await applicationData.getRecruiterApplication(
        prisma,
        ownerRecruiterId,
        application.id,
      );

      for (const payload of [overview, current, candidateApp, recruiterApp]) {
        const text = JSON.stringify(payload);
        expect(text).not.toContain("storageKey");
        expect(text).not.toContain("sha256");
      }
      expect(candidateApp?.resumeDocument?.id).toBeTruthy();
      expect(recruiterApp?.resumeDocument?.id).toBeTruthy();
    });

    // ---------------------------------------------------------------------
    // Storage / database consistency
    // ---------------------------------------------------------------------

    it("writes no metadata when the storage upload fails", async () => {
      const candidateId = await makeCandidate();
      storage.failNextPut = true;
      const bytes = syntheticPdf("fail-upload");
      await expect(
        docs.replaceCurrentResume(
          prisma,
          storage,
          actor(candidateId, "CANDIDATE"),
          {
            storageKey: keys.generateResumeStorageKey(),
            bytes,
            originalFilename: "resume.pdf",
            mimeType: "application/pdf",
            sizeBytes: bytes.byteLength,
            sha256: hash.sha256Hex(bytes),
          },
        ),
      ).rejects.toBeInstanceOf(storageTypes.DocumentStorageError);

      expect(
        await prisma.candidateDocument.count({ where: { candidateId } }),
      ).toBe(0);
      expect(
        await prisma.candidateResume.findUnique({ where: { candidateId } }),
      ).toBeNull();
    });

    it("best-effort deletes the uploaded object when the database write fails", async () => {
      const candidateId = await makeCandidate();
      // Pre-seed a document to force a unique-storageKey collision inside the
      // transaction, simulating a database failure after the object upload.
      const collisionKey = keys.generateResumeStorageKey();
      await prisma.candidateDocument.create({
        data: {
          candidateId,
          kind: "RESUME",
          storageKey: collisionKey,
          originalFilename: "seed.pdf",
          mimeType: "application/pdf",
          sizeBytes: 10,
          sha256: hash.sha256Hex(Buffer.from("seed")),
        },
      });

      const bytes = syntheticPdf("collision");
      await expect(
        docs.replaceCurrentResume(
          prisma,
          storage,
          actor(candidateId, "CANDIDATE"),
          {
            storageKey: collisionKey,
            bytes,
            originalFilename: "resume.pdf",
            mimeType: "application/pdf",
            sizeBytes: bytes.byteLength,
            sha256: hash.sha256Hex(bytes),
          },
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      expect(storage.deletes).toContain(collisionKey);
      expect(storage.objects.has(collisionKey)).toBe(false);
      // No second row was created for the colliding key.
      expect(
        await prisma.candidateDocument.count({
          where: { storageKey: collisionKey },
        }),
      ).toBe(1);
    });
  },
);
