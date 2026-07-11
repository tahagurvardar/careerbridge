import type { Prisma } from "@/generated/prisma/client";
import type {
  CandidateApplicationSearch,
  RecruiterApplicationSearch,
} from "@/features/applications/schemas";

const INSENSITIVE = "insensitive" as const;

/**
 * Candidate application filter. Always scoped to the candidate's own id; free
 * text spans the job title and company name. Kept pure for unit testing.
 */
export function buildCandidateApplicationWhere(
  candidateId: string,
  search: CandidateApplicationSearch,
): Prisma.JobApplicationWhereInput {
  const where: Prisma.JobApplicationWhereInput = { candidateId };

  if (search.status) where.status = search.status;
  if (search.q) {
    where.OR = [
      { job: { title: { contains: search.q, mode: INSENSITIVE } } },
      { job: { company: { name: { contains: search.q, mode: INSENSITIVE } } } },
    ];
  }

  return where;
}

/**
 * Recruiter application filter. Always constrained to jobs whose company the
 * recruiter OWNS, so no search term can reach applications from other companies
 * or MEMBER-only companies. Free text spans candidate name/email, job title,
 * and company name.
 */
export function buildRecruiterApplicationWhere(
  userId: string,
  search: RecruiterApplicationSearch,
): Prisma.JobApplicationWhereInput {
  const jobWhere: Prisma.JobWhereInput = {
    company: { memberships: { some: { userId, role: "OWNER" } } },
  };
  if (search.companyId) jobWhere.companyId = search.companyId;

  const where: Prisma.JobApplicationWhereInput = { job: jobWhere };
  if (search.jobId) where.jobId = search.jobId;
  if (search.status) where.status = search.status;
  if (search.q) {
    where.OR = [
      { candidate: { name: { contains: search.q, mode: INSENSITIVE } } },
      { candidate: { email: { contains: search.q, mode: INSENSITIVE } } },
      { job: { title: { contains: search.q, mode: INSENSITIVE } } },
      { job: { company: { name: { contains: search.q, mode: INSENSITIVE } } } },
    ];
  }

  return where;
}
