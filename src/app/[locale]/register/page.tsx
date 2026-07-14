import type { Metadata } from "next";

import { PageIntro } from "@/components/shared/page-intro";
import { RegistrationForm } from "@/features/auth/components/registration-form";
import { requireGuest } from "@/features/auth/server/session";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/register">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  return {
    title: metadata.register.title,
    description: metadata.register.description,
    alternates: buildLocaleAlternates("/register", locale),
  };
}

export default async function RegisterPage({
  params,
}: PageProps<"/[locale]/register">) {
  await requireGuest();

  const locale = resolvePageLocale((await params).locale);
  const { auth, validation } = await getDictionary(locale);

  return (
    <>
      <PageIntro
        eyebrow={auth.register.introEyebrow}
        title={auth.register.introTitle}
        description={auth.register.introDescription}
      />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <RegistrationForm t={auth.register} validation={validation} />
      </section>
    </>
  );
}
