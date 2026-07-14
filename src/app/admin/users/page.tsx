import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserRoundSearch, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/pagination";
import { userAccountStatusLabels } from "@/features/admin/moderation";
import { parseAdminUserSearch } from "@/features/admin/schemas";
import { getAdminUsers } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { PLATFORM_ROLES, roleLabels } from "@/features/auth/roles";
import { formatJobDate } from "@/features/jobs/format";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Search and review safe CareerBridge user moderation summaries.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireActiveAdmin("/admin/users");
  const search = parseAdminUserSearch(await searchParams);
  const result = await getAdminUsers(getPrismaClient(), search);
  const hasFilters = Boolean(search.q || search.role || search.status);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Users"
          description="Search safe identity summaries and review account moderation state without opening private profile or domain content."
        />

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              role="search"
              className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end"
            >
              <label className="grid gap-2 text-sm font-medium" htmlFor="q">
                Name or email
                <Input
                  id="q"
                  name="q"
                  defaultValue={search.q}
                  maxLength={100}
                  placeholder="Search users"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="role">
                Role
                <select
                  id="role"
                  name="role"
                  defaultValue={search.role}
                  className={selectClassName}
                >
                  <option value="">All roles</option>
                  {PLATFORM_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="status"
              >
                Account status
                <select
                  id="status"
                  name="status"
                  defaultValue={search.status}
                  className={selectClassName}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  Filter
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/users" aria-label="Clear user filters">
                      <X aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Moderation directory</h2>
          <p className="text-muted-foreground text-sm" role="status">
            {result.total} {result.total === 1 ? "result" : "results"}
          </p>
        </div>

        {result.items.length ? (
          <ul className="mt-4 grid gap-4">
            {result.items.map((user) => (
              <li key={user.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">
                        {user.name}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {user.email}
                      </p>
                    </div>
                    <Badge
                      variant={
                        user.accountStatus === "SUSPENDED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {userAccountStatusLabels[user.accountStatus]}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <span>{roleLabels[user.role]}</span>
                      <span>Joined {formatJobDate(user.createdAt)}</span>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={`/admin/users/${user.id}`}>Review user</Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <UserRoundSearch
                aria-hidden="true"
                className="text-muted-foreground size-10"
              />
              <h2 className="mt-4 text-xl font-semibold">No users found</h2>
              <p className="text-muted-foreground mt-2">
                Try a broader search or clear the current filters.
              </p>
            </CardContent>
          </Card>
        )}

        <AdminPagination
          pathname="/admin/users"
          page={result.page}
          totalPages={result.totalPages}
          search={search}
        />
      </div>
    </section>
  );
}
