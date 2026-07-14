import { Suspense } from "react";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Brand } from "@/components/shared/brand";
import {
  ThemeToggle,
  type ThemeToggleLabels,
} from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardPathForRole } from "@/features/auth/roles";
import { signOutAction } from "@/features/auth/server/actions";
import { getCurrentSession } from "@/features/auth/server/session";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { isNotificationCenterRole } from "@/features/notifications/notifications";
import { getUnreadNotificationCount } from "@/features/notifications/server/data";
import type { RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function SiteHeader({ locale }: { locale: RouteLocale }) {
  const dictionary = await getDictionary(locale);
  const { navigation, common, labels, notifications } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);

  const session = await getCurrentSession();
  // Only Candidates and Recruiters get a bell; public and Admin headers issue
  // no notification query and expose no count.
  const unreadCount =
    session && isNotificationCenterRole(session.user.role)
      ? await getUnreadNotificationCount(getPrismaClient(), session.user.id)
      : null;

  const publicNavigation = [
    { label: navigation.home, href: localize("/") },
    { label: navigation.findJobs, href: localize("/jobs") },
    { label: navigation.companies, href: localize("/companies") },
  ];
  const navigationUser = session
    ? {
        name: session.user.name,
        roleLabel: labels.role[session.user.role],
        dashboardPath: localize(getDashboardPathForRole(session.user.role)),
        privateNavigation:
          session.user.role === "CANDIDATE"
            ? [
                {
                  label: navigation.candidate.applications,
                  href: localize("/candidate/applications"),
                },
                {
                  label: navigation.candidate.analytics,
                  href: localize("/candidate/analytics"),
                },
                {
                  label: navigation.candidate.interviews,
                  href: localize("/candidate/interviews"),
                },
                {
                  label: navigation.candidate.documents,
                  href: localize("/candidate/documents"),
                },
                {
                  label: navigation.candidate.savedJobs,
                  href: localize("/candidate/saved-jobs"),
                },
              ]
            : session.user.role === "RECRUITER"
              ? [
                  {
                    label: navigation.recruiter.companies,
                    href: localize("/recruiter/companies"),
                  },
                  {
                    label: navigation.recruiter.analytics,
                    href: localize("/recruiter/analytics"),
                  },
                  {
                    label: navigation.recruiter.interviews,
                    href: localize("/recruiter/interviews"),
                  },
                  {
                    label: navigation.recruiter.invitations,
                    href: localize("/recruiter/invitations"),
                  },
                ]
              : [
                  {
                    label: navigation.admin.users,
                    href: localize("/admin/users"),
                  },
                  {
                    label: navigation.admin.analytics,
                    href: localize("/admin/analytics"),
                  },
                  {
                    label: navigation.admin.companies,
                    href: localize("/admin/companies"),
                  },
                  {
                    label: navigation.admin.jobs,
                    href: localize("/admin/jobs"),
                  },
                  {
                    label: navigation.admin.auditLog,
                    href: localize("/admin/audit"),
                  },
                ],
      }
    : null;

  const themeLabels: ThemeToggleLabels = {
    system: common.theme.system,
    light: common.theme.light,
    dark: common.theme.dark,
    switchLabel: common.theme.switchLabel,
    loading: common.theme.loading,
  };
  const bell =
    unreadCount === null
      ? null
      : {
          unreadCount,
          href: localize("/notifications"),
          label:
            unreadCount > 0
              ? formatMessage(notifications.bell.unreadLabel, {
                  count: unreadCount,
                })
              : notifications.bell.label,
        };
  const switcherLabels = {
    label: navigation.languageSwitcher.label,
    ariaLabel: navigation.languageSwitcher.ariaLabel,
    updating: navigation.languageSwitcher.updating,
  };

  return (
    <header className="border-border/70 bg-background/88 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand href={localize("/")} ariaLabel={navigation.brandHomeAria} />
        <nav
          aria-label={navigation.primaryAria}
          className="hidden items-center gap-1 xl:flex"
        >
          {(navigationUser?.privateNavigation ?? publicNavigation).map(
            (item) => (
              <Button key={item.href} variant="ghost" asChild>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ),
          )}
        </nav>
        <div className="hidden items-center gap-1.5 xl:flex">
          {bell ? (
            <NotificationBell
              unreadCount={bell.unreadCount}
              href={bell.href}
              label={bell.label}
            />
          ) : null}
          <Suspense fallback={null}>
            <LanguageSwitcher labels={switcherLabels} />
          </Suspense>
          <ThemeToggle labels={themeLabels} />
          {navigationUser ? (
            <>
              <div className="mr-1 hidden items-center gap-2 2xl:flex">
                <span className="max-w-40 truncate text-sm font-medium">
                  {navigationUser.name}
                </span>
                <Badge variant="secondary">{navigationUser.roleLabel}</Badge>
              </div>
              <Button variant="outline" asChild>
                <Link href={navigationUser.dashboardPath}>
                  {common.actions.dashboard}
                </Link>
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost">
                  {common.actions.signOut}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href={localize("/login")}>{common.actions.signIn}</Link>
              </Button>
              <Button asChild>
                <Link href={localize("/register")}>
                  {common.actions.createAccount}
                </Link>
              </Button>
            </>
          )}
        </div>
        <MobileNavigation
          user={navigationUser}
          publicNavigation={publicNavigation}
          bell={bell}
          themeLabels={themeLabels}
          switcherLabels={switcherLabels}
          labels={{
            openMenu: navigation.openMenu,
            closeMenu: navigation.closeMenu,
            mobileAria: navigation.mobileAria,
            sheetDescription: navigation.sheetDescription,
            notifications: navigation.notifications,
            dashboard: common.actions.dashboard,
            signOut: common.actions.signOut,
            signIn: common.actions.signIn,
            createAccount: common.actions.createAccount,
            appName: common.appName,
          }}
          paths={{
            login: localize("/login"),
            register: localize("/register"),
          }}
        />
      </div>
    </header>
  );
}
