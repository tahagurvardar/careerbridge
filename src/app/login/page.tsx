import type { Metadata } from "next";
import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Sign in",
  description: "CareerBridge account access preview.",
};

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:px-8">
      <div className="max-w-xl">
        <Badge variant="secondary">Account access preview</Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Welcome back to your career workspace.
        </h1>
        <p className="text-muted-foreground mt-5 text-lg leading-8">
          Authentication arrives in the next phase. This page establishes the
          accessible account entry experience and visual foundation.
        </p>
        <ul className="mt-8 space-y-3 text-sm">
          {[
            "Secure role-based access",
            "Persistent sessions",
            "Account recovery",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-full">
                <Check aria-hidden="true" className="size-4" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Card className="mx-auto w-full max-w-md shadow-xl shadow-black/5">
        <CardHeader>
          <span className="bg-primary text-primary-foreground mb-4 flex size-11 items-center justify-center rounded-xl">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </span>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Form submission is intentionally disabled during foundation work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled
            />
          </div>
          <Button className="w-full" disabled>
            Authentication coming in Phase 1
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            New to CareerBridge?{" "}
            <Link
              href="/register"
              className="text-foreground focus-visible:ring-ring rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Explore account types
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
