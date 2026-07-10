import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getSafeInternalPath } from "@/features/auth/roles";
import { requireGuest } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in securely to your CareerBridge workspace.",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackPath?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await requireGuest();

  const params = await searchParams;
  const rawCallback = Array.isArray(params.callbackPath)
    ? params.callbackPath[0]
    : params.callbackPath;
  const callbackPath = rawCallback
    ? getSafeInternalPath(rawCallback, "") || undefined
    : undefined;

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.82fr] lg:px-8">
      <div className="max-w-xl">
        <Badge variant="secondary">Secure account access</Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Welcome back to your career workspace.
        </h1>
        <p className="text-muted-foreground mt-5 text-lg leading-8">
          Sign in with your email and password. CareerBridge will take you to
          the dashboard assigned to your verified platform role.
        </p>
        <ul className="mt-8 space-y-3 text-sm">
          {[
            "Database-backed sessions",
            "Server-verified roles",
            "Secure sign-out",
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

      <SignInForm callbackPath={callbackPath} />
    </section>
  );
}
