"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormStatus,
} from "@/features/candidate-profile/components/form-field";
import {
  inviteRecruiterAction,
  type CompanyTeamActionResult,
} from "@/features/company-team/server/actions";

export function InviteRecruiterForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<CompanyTeamActionResult | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const nextResult = await inviteRecruiterAction(companyId, { email });
      setResult(nextResult);
      if (nextResult.success) {
        setEmail("");
        router.refresh();
      }
    });
  }

  const emailError =
    result && !result.success ? result.fieldErrors?.email : undefined;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormField
        id="invite-email"
        label="Recruiter email"
        hint="The email must belong to an existing CareerBridge Recruiter account."
        error={emailError}
      >
        <Input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(emailError)}
          aria-describedby={
            emailError ? "invite-email-error" : "invite-email-hint"
          }
          disabled={pending}
          placeholder="recruiter@example.com"
        />
      </FormField>
      <Button type="submit" disabled={pending || !email.trim()}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Send aria-hidden="true" />
        )}
        {pending ? "Sending…" : "Send invitation"}
      </Button>
      {result ? (
        <FormStatus message={result.message} success={result.success} />
      ) : null}
    </form>
  );
}
