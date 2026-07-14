"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Menu, Waypoints } from "lucide-react";

import {
  LanguageSwitcher,
  type LanguageSwitcherLabels,
} from "@/components/layout/language-switcher";
import {
  ThemeToggle,
  type ThemeToggleLabels,
} from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutAction } from "@/features/auth/server/actions";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { formatUnreadBadge } from "@/features/notifications/notifications";

type NavigationItem = { label: string; href: string };

type MobileNavigationUser = {
  name: string;
  roleLabel: string;
  dashboardPath: string;
  privateNavigation: readonly NavigationItem[];
};

type MobileNavigationLabels = {
  openMenu: string;
  closeMenu: string;
  mobileAria: string;
  sheetDescription: string;
  notifications: string;
  dashboard: string;
  signOut: string;
  signIn: string;
  createAccount: string;
  appName: string;
};

type BellProps = { unreadCount: number; href: string; label: string };

// All copy and hrefs arrive pre-localized from the server header, so this
// client component ships no dictionary.
export function MobileNavigation({
  user,
  publicNavigation,
  bell,
  themeLabels,
  switcherLabels,
  labels,
  paths,
}: {
  user: MobileNavigationUser | null;
  publicNavigation: readonly NavigationItem[];
  bell: BellProps | null;
  themeLabels: ThemeToggleLabels;
  switcherLabels: LanguageSwitcherLabels;
  labels: MobileNavigationLabels;
  paths: { login: string; register: string };
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unreadBadge =
    bell === null ? null : formatUnreadBadge(bell.unreadCount);

  return (
    <div className="flex items-center gap-1 xl:hidden">
      {bell ? (
        <NotificationBell
          unreadCount={bell.unreadCount}
          href={bell.href}
          label={bell.label}
        />
      ) : null}
      <ThemeToggle labels={themeLabels} />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            size="icon"
            aria-label={open ? labels.closeMenu : labels.openMenu}
          >
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          closeLabel={labels.closeMenu}
          className="w-[min(88vw,22rem)]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <SheetHeader className="border-b px-5 py-5">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
                <Waypoints
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2.2}
                />
              </span>
              <SheetTitle className="text-lg font-semibold tracking-tight">
                {labels.appName}
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              {labels.sheetDescription}
            </SheetDescription>
          </SheetHeader>
          {user && (
            <div className="border-b px-5 py-4">
              <p className="truncate font-medium">{user.name}</p>
              <Badge variant="secondary" className="mt-2">
                {user.roleLabel}
              </Badge>
            </div>
          )}
          <nav aria-label={labels.mobileAria} className="flex flex-col px-3">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-3 text-base font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
            {user?.privateNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-3 text-base font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
            {bell ? (
              <Link
                href={bell.href}
                onClick={() => setOpen(false)}
                className="hover:bg-muted focus-visible:ring-ring flex items-center justify-between gap-2 rounded-lg px-3 py-3 text-base font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Bell aria-hidden="true" className="size-4" />
                  {labels.notifications}
                </span>
                {unreadBadge ? (
                  <Badge aria-hidden="true">{unreadBadge}</Badge>
                ) : null}
              </Link>
            ) : null}
          </nav>
          <div className="border-t px-5 py-4">
            <Suspense fallback={null}>
              <LanguageSwitcher labels={switcherLabels} className="w-full" />
            </Suspense>
          </div>
          <div className="mt-auto grid gap-2 border-t p-5">
            {user ? (
              <>
                <Button size="lg" asChild>
                  <Link
                    href={user.dashboardPath}
                    onClick={() => setOpen(false)}
                  >
                    {labels.dashboard}
                  </Link>
                </Button>
                <form action={signOutAction} onSubmit={() => setOpen(false)}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    {labels.signOut}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button variant="outline" size="lg" asChild>
                  <Link href={paths.login} onClick={() => setOpen(false)}>
                    {labels.signIn}
                  </Link>
                </Button>
                <Button size="lg" asChild>
                  <Link href={paths.register} onClick={() => setOpen(false)}>
                    {labels.createAccount}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
