import Link from "next/link";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getDashboardPathForRole, roleLabels } from "@/features/auth/roles";
import { signOutAction } from "@/features/auth/server/actions";
import { getCurrentSession } from "@/features/auth/server/session";

export async function SiteHeader() {
  const session = await getCurrentSession();
  const navigationUser = session
    ? {
        name: session.user.name,
        roleLabel: roleLabels[session.user.role],
        dashboardPath: getDashboardPathForRole(session.user.role),
        privateNavigation:
          session.user.role === "CANDIDATE"
            ? [
                { label: "Applications", href: "/candidate/applications" },
                { label: "Saved jobs", href: "/candidate/saved-jobs" },
              ]
            : [],
      }
    : null;

  return (
    <header className="border-border/70 bg-background/88 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {siteConfig.navigation.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          {navigationUser?.privateNavigation.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          {navigationUser ? (
            <>
              <div className="mr-1 hidden items-center gap-2 lg:flex">
                <span className="max-w-40 truncate text-sm font-medium">
                  {navigationUser.name}
                </span>
                <Badge variant="secondary">{navigationUser.roleLabel}</Badge>
              </div>
              <Button variant="outline" asChild>
                <Link href={navigationUser.dashboardPath}>Dashboard</Link>
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
        <MobileNavigation user={navigationUser} />
      </div>
    </header>
  );
}
