import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import {
  getDashboardPathForRole,
  getSafeInternalPath,
  type PlatformRole,
  platformRoleSchema,
} from "@/features/auth/roles";
import { getAuth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export type CurrentSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>
> & {
  user: {
    role: PlatformRole;
    accountStatus: "ACTIVE";
  };
};

export const getCurrentSession = cache(
  async (): Promise<CurrentSession | null> => {
    await connection();

    const session = await getAuth().api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return null;
    }

    const databaseUser = await getPrismaClient().user.findUnique({
      where: { id: session.user.id },
      select: { role: true, accountStatus: true },
    });
    const role = platformRoleSchema.safeParse(databaseUser?.role);

    if (!role.success || databaseUser?.accountStatus !== "ACTIVE") {
      if (databaseUser?.accountStatus === "SUSPENDED") {
        await getPrismaClient().session.deleteMany({
          where: { userId: session.user.id },
        });
      }
      return null;
    }

    return {
      ...session,
      user: {
        ...session.user,
        role: role.data,
        accountStatus: "ACTIVE",
      },
    } as CurrentSession;
  },
);

export async function getCurrentUser() {
  return (await getCurrentSession())?.user ?? null;
}

export async function requireUser(callbackPath?: string) {
  const session = await getCurrentSession();

  if (!session) {
    const safeCallback = callbackPath
      ? getSafeInternalPath(callbackPath, "")
      : "";
    const query = safeCallback
      ? `?callbackPath=${encodeURIComponent(safeCallback)}`
      : "";

    redirect(`/login${query}`);
  }

  return session;
}

export async function requireGuest() {
  const session = await getCurrentSession();

  if (session) {
    redirect(getDashboardPathForRole(session.user.role));
  }
}

export async function requireRole(role: PlatformRole, callbackPath?: string) {
  const session = await requireUser(callbackPath);

  if (session.user.role !== role) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  return session;
}
