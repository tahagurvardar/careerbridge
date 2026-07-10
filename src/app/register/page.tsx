import type { Metadata } from "next";

import { PageIntro } from "@/components/shared/page-intro";
import { RegistrationForm } from "@/features/auth/components/registration-form";
import { requireGuest } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a CareerBridge Candidate or Recruiter account.",
};

export default async function RegisterPage() {
  await requireGuest();

  return (
    <>
      <PageIntro
        eyebrow="Choose your path"
        title="Create the workspace that fits your goals."
        description="Choose a Candidate or Recruiter account, then create your secure CareerBridge sign-in."
      />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <RegistrationForm />
      </section>
    </>
  );
}
