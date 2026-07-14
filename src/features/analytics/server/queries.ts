import "server-only";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  APPLICATION_STATUSES,
  type ApplicationStatusValue,
} from "@/features/applications/schemas";
import {
  buildFunnelResult,
  type AnalyticsDateRange,
  type FunnelResult,
  type TrendBucket,
} from "@/features/analytics/analytics";

export type AnalyticsActor = {
  userId: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED";
};

export class AnalyticsAccessError extends Error {
  constructor() {
    super("Analytics are unavailable for this scope.");
    this.name = "AnalyticsAccessError";
  }
}

export type ApplicationAnalyticsScope = {
  joins: Prisma.Sql;
  predicate: Prisma.Sql;
};

export const PLATFORM_APPLICATION_SCOPE: ApplicationAnalyticsScope = {
  joins: Prisma.empty,
  predicate: Prisma.empty,
};

export function candidateApplicationScope(
  candidateId: string,
): ApplicationAnalyticsScope {
  return {
    joins: Prisma.empty,
    predicate: Prisma.sql`AND ja."candidateId" = ${candidateId}`,
  };
}

export function recruiterApplicationScope(
  companyId: string,
  jobId?: string | null,
): ApplicationAnalyticsScope {
  return {
    joins: Prisma.sql`INNER JOIN "job" j ON j."id" = ja."jobId"`,
    predicate: jobId
      ? Prisma.sql`AND j."companyId" = ${companyId} AND ja."jobId" = ${jobId}`
      : Prisma.sql`AND j."companyId" = ${companyId}`,
  };
}

export function createdAtWhere(range: AnalyticsDateRange) {
  return {
    ...(range.startAt ? { gte: range.startAt } : {}),
    lt: range.endAt,
  };
}

export function countRecord<TStatus extends string>(
  statuses: readonly TStatus[],
  rows: readonly { status: TStatus; _count: number | { _all: number } }[],
): Record<TStatus, number> {
  return Object.fromEntries(
    statuses.map((status) => {
      const row = rows.find((item) => item.status === status);
      const count =
        typeof row?._count === "number" ? row._count : (row?._count._all ?? 0);
      return [status, count];
    }),
  ) as Record<TStatus, number>;
}

type FunnelRow = { status: string; count: bigint | number };

function applicationRangePredicate(range: AnalyticsDateRange): Prisma.Sql {
  return range.startAt
    ? Prisma.sql`AND ja."createdAt" >= ${range.startAt} AND ja."createdAt" < ${range.endAt}`
    : Prisma.sql`AND ja."createdAt" < ${range.endAt}`;
}

/**
 * The Application row itself establishes SUBMITTED for every cohort member.
 * UNION de-duplicates stage re-entry in immutable status history before the
 * database counts stages, so raw Application or identity rows never leave SQL.
 */
export async function queryApplicationFunnel(
  prisma: PrismaClient,
  scope: ApplicationAnalyticsScope,
  range: AnalyticsDateRange,
): Promise<FunnelResult> {
  const rows = await prisma.$queryRaw<FunnelRow[]>(Prisma.sql`
    WITH cohort AS (
      SELECT ja."id"
      FROM "job_application" ja
      ${scope.joins}
      WHERE TRUE
        ${applicationRangePredicate(range)}
        ${scope.predicate}
    ), reached AS (
      SELECT cohort."id" AS "applicationId", 'SUBMITTED'::text AS "status"
      FROM cohort
      UNION
      SELECT ash."applicationId", ash."toStatus"::text AS "status"
      FROM "application_status_history" ash
      INNER JOIN cohort ON cohort."id" = ash."applicationId"
    )
    SELECT "status", COUNT(*)::bigint AS "count"
    FROM reached
    GROUP BY "status"
  `);

  const counts: Partial<Record<ApplicationStatusValue, number>> = {};
  for (const row of rows) {
    if ((APPLICATION_STATUSES as readonly string[]).includes(row.status)) {
      counts[row.status as ApplicationStatusValue] = Number(row.count);
    }
  }
  return buildFunnelResult(counts);
}

type EarliestRow = { earliestAt: Date | null };

export async function queryPlatformTrendEarliest(
  prisma: PrismaClient,
): Promise<Date | null> {
  const [row] = await prisma.$queryRaw<EarliestRow[]>(Prisma.sql`
    SELECT MIN(events."createdAt") AS "earliestAt"
    FROM (
      SELECT "createdAt" FROM "user"
      UNION ALL SELECT "createdAt" FROM "company"
      UNION ALL SELECT "createdAt" FROM "job"
      UNION ALL SELECT "createdAt" FROM "job_application"
      UNION ALL SELECT "createdAt" FROM "interview"
    ) events
  `);
  return row?.earliestAt ?? null;
}

export async function queryScopedApplicationTrendEarliest(
  prisma: PrismaClient,
  scope: ApplicationAnalyticsScope,
): Promise<Date | null> {
  const [row] = await prisma.$queryRaw<EarliestRow[]>(Prisma.sql`
    SELECT MIN(ja."createdAt") AS "earliestAt"
    FROM "job_application" ja
    ${scope.joins}
    WHERE TRUE ${scope.predicate}
  `);
  return row?.earliestAt ?? null;
}

type TrendRow = { bucketStart: Date; count: bigint | number };

function bucketValues(buckets: readonly TrendBucket[]): Prisma.Sql {
  return Prisma.join(
    buckets.map(
      (bucket) =>
        Prisma.sql`(${bucket.startAt}::timestamp, ${bucket.endAt}::timestamp)`,
    ),
  );
}

function normalizeTrendRows(rows: readonly TrendRow[]) {
  return rows.map((row) => ({
    bucketStart: row.bucketStart,
    count: Number(row.count),
  }));
}

export type PlatformTrendSource =
  "USERS" | "COMPANIES" | "JOBS" | "APPLICATIONS" | "INTERVIEWS";

/**
 * Source is a closed server-owned union. Each branch contains a static table
 * identifier; only server-derived bucket instants are parameterized into SQL.
 */
export async function queryPlatformTrend(
  prisma: PrismaClient,
  source: PlatformTrendSource,
  buckets: readonly TrendBucket[],
) {
  if (buckets.length === 0) return [];
  const values = bucketValues(buckets);

  if (source === "USERS") {
    const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH buckets("startAt", "endAt") AS (VALUES ${values})
      SELECT buckets."startAt" AS "bucketStart", COUNT(entity."id")::bigint AS "count"
      FROM buckets
      LEFT JOIN "user" entity
        ON entity."createdAt" >= buckets."startAt"
       AND entity."createdAt" < buckets."endAt"
      GROUP BY buckets."startAt"
      ORDER BY buckets."startAt" ASC
    `);
    return normalizeTrendRows(rows);
  }

  if (source === "COMPANIES") {
    const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH buckets("startAt", "endAt") AS (VALUES ${values})
      SELECT buckets."startAt" AS "bucketStart", COUNT(entity."id")::bigint AS "count"
      FROM buckets
      LEFT JOIN "company" entity
        ON entity."createdAt" >= buckets."startAt"
       AND entity."createdAt" < buckets."endAt"
      GROUP BY buckets."startAt"
      ORDER BY buckets."startAt" ASC
    `);
    return normalizeTrendRows(rows);
  }

  if (source === "JOBS") {
    const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH buckets("startAt", "endAt") AS (VALUES ${values})
      SELECT buckets."startAt" AS "bucketStart", COUNT(entity."id")::bigint AS "count"
      FROM buckets
      LEFT JOIN "job" entity
        ON entity."createdAt" >= buckets."startAt"
       AND entity."createdAt" < buckets."endAt"
      GROUP BY buckets."startAt"
      ORDER BY buckets."startAt" ASC
    `);
    return normalizeTrendRows(rows);
  }

  if (source === "APPLICATIONS") {
    const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH buckets("startAt", "endAt") AS (VALUES ${values})
      SELECT buckets."startAt" AS "bucketStart", COUNT(entity."id")::bigint AS "count"
      FROM buckets
      LEFT JOIN "job_application" entity
        ON entity."createdAt" >= buckets."startAt"
       AND entity."createdAt" < buckets."endAt"
      GROUP BY buckets."startAt"
      ORDER BY buckets."startAt" ASC
    `);
    return normalizeTrendRows(rows);
  }

  const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
    WITH buckets("startAt", "endAt") AS (VALUES ${values})
    SELECT buckets."startAt" AS "bucketStart", COUNT(entity."id")::bigint AS "count"
    FROM buckets
    LEFT JOIN "interview" entity
      ON entity."createdAt" >= buckets."startAt"
     AND entity."createdAt" < buckets."endAt"
    GROUP BY buckets."startAt"
    ORDER BY buckets."startAt" ASC
  `);
  return normalizeTrendRows(rows);
}

export async function queryScopedApplicationTrend(
  prisma: PrismaClient,
  scope: ApplicationAnalyticsScope,
  buckets: readonly TrendBucket[],
) {
  if (buckets.length === 0) return [];
  const rows = await prisma.$queryRaw<TrendRow[]>(Prisma.sql`
    WITH buckets("startAt", "endAt") AS (VALUES ${bucketValues(buckets)}),
    scoped AS (
      SELECT ja."id", ja."createdAt"
      FROM "job_application" ja
      ${scope.joins}
      WHERE TRUE ${scope.predicate}
    )
    SELECT buckets."startAt" AS "bucketStart", COUNT(scoped."id")::bigint AS "count"
    FROM buckets
    LEFT JOIN scoped
      ON scoped."createdAt" >= buckets."startAt"
     AND scoped."createdAt" < buckets."endAt"
    GROUP BY buckets."startAt"
    ORDER BY buckets."startAt" ASC
  `);
  return normalizeTrendRows(rows);
}
