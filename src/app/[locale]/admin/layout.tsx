import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  await requireActiveAdmin();
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const adminNavigation = [
    { label: dictionary.common.actions.dashboard, href: "/admin" },
    { label: dictionary.navigation.admin.users, href: "/admin/users" },
    {
      label: dictionary.navigation.admin.analytics,
      href: "/admin/analytics",
    },
    {
      label: dictionary.navigation.admin.companies,
      href: "/admin/companies",
    },
    { label: dictionary.navigation.admin.jobs, href: "/admin/jobs" },
    { label: dictionary.navigation.admin.auditLog, href: "/admin/audit" },
  ] as const;

  return (
    <>
      <div className="bg-muted/35 border-b">
        <nav
          aria-label={dictionary.admin.shared.badge}
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8"
        >
          {adminNavigation.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={localizeInternalPath(item.href, locale)}>
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
      {children}
    </>
  );
}
