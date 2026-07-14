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
import {
  createApplySchema,
  type ApplyInput,
} from "@/features/applications/schemas";
import {
  type ApplicationActionResult,
  applyToJobAction,
} from "@/features/applications/server/actions";
import { useLocale } from "@/i18n/client";
import type { PublicDictionary, ValidationDictionary } from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

export function ApplyForm({
  slug,
  labels,
  validation,
}: {
  slug: string;
  labels: PublicDictionary["applyPage"];
  validation: ValidationDictionary;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [result, setResult] = useState<ApplicationActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyInput>({
    resolver: zodResolver(createApplySchema(validation)),
    defaultValues: { coverLetter: "" },
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const next = await applyToJobAction(slug, values);
    if (!next.success) {
      setResult(next);
      return;
    }
    router.push(
      localizeInternalPath(
        next.redirectTo ?? "/candidate/applications",
        locale,
      ),
    );
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <FormField
        id="coverLetter"
        label={labels.coverLetter}
        hint={labels.coverLetterHint}
        error={errors.coverLetter?.message}
      >
        <Textarea
          id="coverLetter"
          rows={10}
          maxLength={6000}
          placeholder={labels.coverLetterPlaceholder}
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
              <Link
                href={localizeInternalPath("/candidate/profile/edit", locale)}
              >
                {labels.completeProfile}
              </Link>
            </Button>
          ) : null}
          {result.alreadyApplied ? (
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              asChild
            >
              <Link
                href={localizeInternalPath("/candidate/applications", locale)}
              >
                {labels.viewApplications}
              </Link>
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
          {isSubmitting ? labels.submitting : labels.submit}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}
