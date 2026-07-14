import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireActiveAdmin } from "@/features/admin/server/guard";

const adminNavigation = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Companies", href: "/admin/companies" },
  { label: "Jobs", href: "/admin/jobs" },
  { label: "Audit log", href: "/admin/audit" },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireActiveAdmin();

  return (
    <>
      <div className="bg-muted/35 border-b">
        <nav
          aria-label="Administration"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8"
        >
          {adminNavigation.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
      {children}
    </>
  );
}
