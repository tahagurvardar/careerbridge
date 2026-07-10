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

export type CurrentSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>
> & {
  user: {
    role: PlatformRole;
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

    const role = platformRoleSchema.safeParse(session.user.role);

    if (!role.success) {
      return null;
    }

    return {
      ...session,
      user: {
        ...session.user,
        role: role.data,
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
