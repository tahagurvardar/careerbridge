"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Menu, Waypoints } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
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
import { siteConfig } from "@/config/site";
import { signOutAction } from "@/features/auth/server/actions";

type MobileNavigationUser = {
  name: string;
  roleLabel: string;
  dashboardPath: string;
};

export function MobileNavigation({
  user,
}: {
  user: MobileNavigationUser | null;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-1 md:hidden">
      <ThemeToggle />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            size="icon"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          >
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
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
                CareerBridge
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              CareerBridge navigation
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
          <nav aria-label="Mobile navigation" className="flex flex-col px-3">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-3 text-base font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto grid gap-2 border-t p-5">
            {user ? (
              <>
                <Button size="lg" asChild>
                  <Link
                    href={user.dashboardPath}
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                </Button>
                <form action={signOutAction} onSubmit={() => setOpen(false)}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button size="lg" asChild>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    Create account
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
