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
  createCandidateProfileSchemas,
  type BasicProfileInput,
} from "@/features/candidate-profile/schemas";
import {
  saveBasicProfileAction,
  type ProfileActionResult,
} from "@/features/candidate-profile/server/actions";
import { FormField, FormStatus } from "./form-field";
import { useLocale } from "@/i18n/client";
import type {
  CandidateDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

export function BasicProfileForm({
  defaultValues,
  candidate,
  validation,
}: {
  defaultValues: BasicProfileInput;
  candidate: CandidateDictionary;
  validation: ValidationDictionary;
}) {
  const t = candidate.profile.basicForm;
  const router = useRouter();
  const locale = useLocale();
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BasicProfileInput>({
    resolver: zodResolver(
      createCandidateProfileSchemas(validation, candidate).basicProfileSchema,
    ),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = await saveBasicProfileAction(values);

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          if (message) {
            setError(field as keyof BasicProfileInput, { message });
          }
        },
      );
      setResult(nextResult);
      return;
    }

    router.push(
      localizeInternalPath(
        `/candidate/profile?updated=${encodeURIComponent(nextResult.feedbackCode ?? "")}`,
        locale,
      ),
    );
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="headline"
          label={t.headlineLabel}
          hint={t.headlineHint}
          error={errors.headline?.message}
        >
          <Input
            id="headline"
            placeholder={t.headlinePlaceholder}
            maxLength={160}
            aria-invalid={Boolean(errors.headline)}
            aria-describedby={
              errors.headline ? "headline-error" : "headline-hint"
            }
            {...register("headline")}
          />
        </FormField>

        <FormField
          id="location"
          label={t.locationLabel}
          hint={t.locationHint}
          error={errors.location?.message}
        >
          <Input
            id="location"
            placeholder={t.locationPlaceholder}
            maxLength={120}
            aria-invalid={Boolean(errors.location)}
            aria-describedby={
              errors.location ? "location-error" : "location-hint"
            }
            {...register("location")}
          />
        </FormField>
      </div>

      <FormField
        id="bio"
        label={t.bioLabel}
        hint={t.bioHint}
        error={errors.bio?.message}
      >
        <Textarea
          id="bio"
          rows={7}
          maxLength={2000}
          placeholder={t.bioPlaceholder}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
          {...register("bio")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="websiteUrl"
          label={t.websiteLabel}
          error={errors.websiteUrl?.message}
        >
          <Input
            id="websiteUrl"
            type="url"
            inputMode="url"
            placeholder="https://yourportfolio.com"
            aria-invalid={Boolean(errors.websiteUrl)}
            aria-describedby={
              errors.websiteUrl ? "websiteUrl-error" : undefined
            }
            {...register("websiteUrl")}
          />
        </FormField>

        <FormField
          id="linkedinUrl"
          label={t.linkedInLabel}
          error={errors.linkedinUrl?.message}
        >
          <Input
            id="linkedinUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/your-name"
            aria-invalid={Boolean(errors.linkedinUrl)}
            aria-describedby={
              errors.linkedinUrl ? "linkedinUrl-error" : undefined
            }
            {...register("linkedinUrl")}
          />
        </FormField>

        <FormField
          id="githubUrl"
          label={t.gitHubLabel}
          error={errors.githubUrl?.message}
        >
          <Input
            id="githubUrl"
            type="url"
            inputMode="url"
            placeholder="https://github.com/your-name"
            aria-invalid={Boolean(errors.githubUrl)}
            aria-describedby={errors.githubUrl ? "githubUrl-error" : undefined}
            {...register("githubUrl")}
          />
        </FormField>
      </div>

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
          {isSubmitting ? t.saving : t.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
