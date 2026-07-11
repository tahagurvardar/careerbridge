"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormStatus,
} from "@/features/candidate-profile/components/form-field";
import { applySchema, type ApplyInput } from "@/features/applications/schemas";
import {
  type ApplicationActionResult,
  applyToJobAction,
} from "@/features/applications/server/actions";

export function ApplyForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [result, setResult] = useState<ApplicationActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyInput>({
    resolver: zodResolver(applySchema),
    defaultValues: { coverLetter: "" },
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const next = await applyToJobAction(slug, values);
    if (!next.success) {
      setResult(next);
      return;
    }
    router.push(next.redirectTo ?? "/candidate/applications");
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <FormField
        id="coverLetter"
        label="Cover letter"
        hint="Optional plain text. Share why you're a fit — line breaks are preserved."
        error={errors.coverLetter?.message}
      >
        <Textarea
          id="coverLetter"
          rows={10}
          maxLength={6000}
          placeholder="Introduce yourself and explain why you're a great fit for this role."
          aria-invalid={Boolean(errors.coverLetter)}
          aria-describedby={
            errors.coverLetter ? "coverLetter-error" : "coverLetter-hint"
          }
          {...register("coverLetter")}
        />
      </FormField>

      {result && !result.success ? (
        <div className="grid gap-2">
          <FormStatus message={result.message} />
          {result.profileIncomplete ? (
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              asChild
            >
              <Link href="/candidate/profile/edit">Complete your profile</Link>
            </Button>
          ) : null}
          {result.alreadyApplied ? (
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              asChild
            >
              <Link href="/candidate/applications">View your applications</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {isSubmitting ? "Submitting…" : "Submit application"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
