import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getSafeInternalPath } from "@/features/auth/roles";
import { requireGuest } from "@/features/auth/server/session";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  return {
    title: metadata.login.title,
    description: metadata.login.description,
    alternates: buildLocaleAlternates("/login", locale),
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  await requireGuest();

  const locale = resolvePageLocale((await params).locale);
  const { auth, validation } = await getDictionary(locale);

  const query = await searchParams;
  const rawCallback = Array.isArray(query.callbackPath)
    ? query.callbackPath[0]
    : query.callbackPath;
  const callbackPath = rawCallback
    ? getSafeInternalPath(rawCallback, "") || undefined
    : undefined;

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.82fr] lg:px-8">
      <div className="max-w-xl">
        <Badge variant="secondary">{auth.login.badge}</Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          {auth.login.title}
        </h1>
        <p className="text-muted-foreground mt-5 text-lg leading-8">
          {auth.login.description}
        </p>
        <ul className="mt-8 space-y-3 text-sm">
          {[auth.login.point1, auth.login.point2, auth.login.point3].map(
            (item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-full">
                  <Check aria-hidden="true" className="size-4" />
                </span>
                {item}
              </li>
            ),
          )}
        </ul>
      </div>

      <SignInForm
        callbackPath={callbackPath}
        t={auth.login}
        validation={validation}
      />
    </section>
  );
}
