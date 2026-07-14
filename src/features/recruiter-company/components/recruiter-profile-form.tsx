"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormStatus,
} from "@/features/candidate-profile/components/form-field";
import {
  createRecruiterCompanySchemas,
  type RecruiterProfileInput,
} from "@/features/recruiter-company/schemas";
import {
  saveRecruiterProfileAction,
  type RecruiterCompanyActionResult,
} from "@/features/recruiter-company/server/actions";
import { useLocale } from "@/i18n/client";
import type {
  CommonDictionary,
  RecruiterDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

export function RecruiterProfileForm({
  defaultValues,
  labels,
  recruiter,
  validation,
}: {
  defaultValues: RecruiterProfileInput;
  labels: {
    form: RecruiterDictionary["profileForm"];
    common: CommonDictionary["actions"];
  };
  recruiter: RecruiterDictionary;
  validation: ValidationDictionary;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [result, setResult] = useState<RecruiterCompanyActionResult | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RecruiterProfileInput>({
    resolver: zodResolver(
      createRecruiterCompanySchemas(validation, recruiter)
        .recruiterProfileSchema,
    ),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = await saveRecruiterProfileAction(values);

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          if (message)
            setError(field as keyof RecruiterProfileInput, { message });
        },
      );
      setResult(nextResult);
      return;
    }

    router.push(localizeInternalPath("/recruiter/profile?updated=1", locale));
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <FormField
        id="jobTitle"
        label={labels.form.jobTitle}
        hint={labels.form.jobTitleHint}
        error={errors.jobTitle?.message}
      >
        <Input
          id="jobTitle"
          maxLength={160}
          placeholder={labels.form.jobTitlePlaceholder}
          aria-invalid={Boolean(errors.jobTitle)}
          aria-describedby={
            errors.jobTitle ? "jobTitle-error" : "jobTitle-hint"
          }
          {...register("jobTitle")}
        />
      </FormField>

      <FormField
        id="bio"
        label={labels.form.bio}
        hint={labels.form.bioHint}
        error={errors.bio?.message}
      >
        <Textarea
          id="bio"
          rows={7}
          maxLength={2000}
          placeholder={labels.form.bioPlaceholder}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
          {...register("bio")}
        />
      </FormField>

      <FormField
        id="linkedinUrl"
        label={labels.form.linkedin}
        hint={labels.form.urlHint}
        error={errors.linkedinUrl?.message}
      >
        <Input
          id="linkedinUrl"
          type="url"
          inputMode="url"
          placeholder={labels.form.linkedinPlaceholder}
          aria-invalid={Boolean(errors.linkedinUrl)}
          aria-describedby={
            errors.linkedinUrl ? "linkedinUrl-error" : "linkedinUrl-hint"
          }
          {...register("linkedinUrl")}
        />
      </FormField>

      {result && !result.success ? (
        <FormStatus message={result.message} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {isSubmitting ? labels.common.saving : labels.form.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          {labels.common.cancel}
        </Button>
      </div>
    </form>
  );
}
