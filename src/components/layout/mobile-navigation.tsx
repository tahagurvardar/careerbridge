"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 md:hidden">
      <ThemeToggle />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open navigation menu"
          >
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[min(88vw,22rem)]">
          <SheetHeader className="border-b px-5 py-5">
            <SheetTitle asChild>
              <Brand />
            </SheetTitle>
            <SheetDescription className="sr-only">
              CareerBridge navigation
            </SheetDescription>
          </SheetHeader>
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
