import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-profile-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let mutations: typeof import("@/features/candidate-profile/server/mutations");
let candidateOneId: string;
let candidateTwoId: string;
let recruiterId: string;

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
      (applicationURL) =>
        applicationURL && process.env.TEST_DATABASE_URL === applicationURL,
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

function actor(userId: string, role: "CANDIDATE" | "RECRUITER") {
  return { userId, role } as const;
}

const profileInput = {
  headline: "Platform engineer",
  location: "Baku",
  bio: "Builds reliable systems.",
  websiteUrl: "https://example.test/",
  linkedinUrl: "",
  githubUrl: "",
};

const educationInput = {
  school: "Integration Test University",
  degree: "BSc",
  fieldOfStudy: "Computer Science",
  startYear: 2020,
  endYear: 2024,
  isCurrent: false,
  description: "",
};

const experienceInput = {
  companyName: "Integration Test Company",
  jobTitle: "Engineer",
  employmentType: "FULL_TIME" as const,
  location: "Remote",
  startDate: "2024-01-01",
  endDate: "",
  isCurrent: true,
  description: "",
};

databaseDescribe(
  databaseIntegrationEnabled
    ? "Candidate profile database boundaries"
    : "Candidate profile database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [{ createPrismaClientForConnectionString }, mutationModule] =
        await Promise.all([
          import("@/lib/prisma"),
          import("@/features/candidate-profile/server/mutations"),
        ]);

      prisma = createPrismaClientForConnectionString(getTestDatabaseURL());
      mutations = mutationModule;
      const users = await Promise.all(
        ["candidate-one", "candidate-two", "recruiter"].map((label) =>
          prisma.user.create({
            data: {
              id: `${testPrefix}-${label}`,
              name: `Profile Test ${label}`,
              email: `${testPrefix}-${label}@example.test`,
              role: label === "recruiter" ? "RECRUITER" : "CANDIDATE",
            },
            select: { id: true },
          }),
        ),
      );
      [candidateOneId, candidateTwoId, recruiterId] = users.map(
        (user) => user.id,
      );
    }, 30_000);

    afterAll(async () => {
      if (prisma) {
        await prisma.user.deleteMany({
          where: { email: { startsWith: testPrefix } },
        });
        await prisma.$disconnect();
      }
    }, 30_000);

    it("allows a Candidate to create a profile", async () => {
      await mutations.upsertCandidateProfile(
        prisma,
        actor(candidateOneId, "CANDIDATE"),
        profileInput,
      );

      await expect(
        prisma.candidateProfile.findUnique({
          where: { userId: candidateOneId },
        }),
      ).resolves.toMatchObject({ headline: "Platform engineer" });
    });

    it("prevents a Recruiter from creating Candidate profile data", async () => {
      await expect(
        mutations.upsertCandidateProfile(
          prisma,
          actor(recruiterId, "RECRUITER"),
          profileInput,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("updates only the authenticated Candidate's profile", async () => {
      await mutations.upsertCandidateProfile(
        prisma,
        actor(candidateTwoId, "CANDIDATE"),
        { ...profileInput, headline: "Candidate two" },
      );
      await mutations.upsertCandidateProfile(
        prisma,
        actor(candidateOneId, "CANDIDATE"),
        { ...profileInput, headline: "Candidate one updated" },
      );

      const profiles = await prisma.candidateProfile.findMany({
        where: { userId: { in: [candidateOneId, candidateTwoId] } },
        select: { userId: true, headline: true },
      });
      expect(profiles).toEqual(
        expect.arrayContaining([
          { userId: candidateOneId, headline: "Candidate one updated" },
          { userId: candidateTwoId, headline: "Candidate two" },
        ]),
      );
    });

    it("prevents a Candidate from editing another Candidate's education", async () => {
      const education = await mutations.createCandidateEducation(
        prisma,
        actor(candidateTwoId, "CANDIDATE"),
        educationInput,
      );

      await expect(
        mutations.updateCandidateEducation(
          prisma,
          actor(candidateOneId, "CANDIDATE"),
          education.id,
          { ...educationInput, school: "Unauthorized change" },
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("prevents a Candidate from deleting another Candidate's experience", async () => {
      const experience = await mutations.createCandidateExperience(
        prisma,
        actor(candidateTwoId, "CANDIDATE"),
        experienceInput,
      );

      await expect(
        mutations.deleteCandidateExperience(
          prisma,
          actor(candidateOneId, "CANDIDATE"),
          experience.id,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("removes only one Candidate's assignment to a shared Skill", async () => {
      const sharedSkillName = `Shared Catalog ${testPrefix}`;
      const normalizedName = sharedSkillName.toLocaleLowerCase("en-US");

      try {
        await mutations.addCandidateSkill(
          prisma,
          actor(candidateOneId, "CANDIDATE"),
          sharedSkillName,
        );
        await mutations.addCandidateSkill(
          prisma,
          actor(candidateTwoId, "CANDIDATE"),
          `  ${sharedSkillName.toLocaleUpperCase("en-US")}  `,
        );

        const sharedSkill = await prisma.skill.findUniqueOrThrow({
          where: { normalizedName },
          select: { id: true, normalizedName: true },
        });

        await mutations.removeCandidateSkill(
          prisma,
          actor(candidateOneId, "CANDIDATE"),
          sharedSkill.id,
        );

        const [candidateOneRelation, candidateTwoRelation, catalogSkill] =
          await Promise.all([
            prisma.candidateSkill.findFirst({
              where: {
                skillId: sharedSkill.id,
                candidateProfile: { userId: candidateOneId },
              },
            }),
            prisma.candidateSkill.findFirst({
              where: {
                skillId: sharedSkill.id,
                candidateProfile: { userId: candidateTwoId },
              },
            }),
            prisma.skill.findUnique({ where: { id: sharedSkill.id } }),
          ]);

        expect(candidateOneRelation).toBeNull();
        expect(candidateTwoRelation).toMatchObject({ skillId: sharedSkill.id });
        expect(catalogSkill).toMatchObject({
          id: sharedSkill.id,
          normalizedName,
        });
      } finally {
        const cleanupSkill = await prisma.skill.findUnique({
          where: { normalizedName },
          select: { id: true },
        });

        if (cleanupSkill) {
          await prisma.candidateSkill.deleteMany({
            where: {
              skillId: cleanupSkill.id,
              candidateProfile: {
                userId: { in: [candidateOneId, candidateTwoId] },
              },
            },
          });
          await prisma.skill.deleteMany({
            where: { id: cleanupSkill.id, candidates: { none: {} } },
          });
        }
      }
    });

    it("prevents duplicate skill assignment", async () => {
      const candidate = actor(candidateOneId, "CANDIDATE");
      await mutations.addCandidateSkill(prisma, candidate, "TypeScript");

      await expect(
        mutations.addCandidateSkill(prisma, candidate, "TypeScript"),
      ).rejects.toMatchObject({ code: "DUPLICATE_SKILL" });
    });
  },
);
