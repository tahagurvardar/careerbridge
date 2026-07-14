"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createCandidateProfileSchemas,
  type EducationInput,
} from "@/features/candidate-profile/schemas";
import type { ProfileActionResult } from "@/features/candidate-profile/server/actions";
import { FormField, FormStatus } from "./form-field";
import { useLocale } from "@/i18n/client";
import type {
  CandidateDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

export function EducationForm({
  defaultValues,
  action,
  submitLabel,
  candidate,
  validation,
}: {
  defaultValues: EducationInput;
  action: (input: unknown) => Promise<ProfileActionResult>;
  submitLabel: string;
  candidate: CandidateDictionary;
  validation: ValidationDictionary;
}) {
  const t = candidate.profile.educationForm;
  const router = useRouter();
  const locale = useLocale();
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EducationInput>({
    resolver: zodResolver(
      createCandidateProfileSchemas(validation, candidate).educationSchema,
    ),
    defaultValues,
  });
  const isCurrent = useWatch({ control, name: "isCurrent" });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = await action(values);

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          if (message) setError(field as keyof EducationInput, { message });
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
      <FormField id="school" label={t.school} error={errors.school?.message}>
        <Input
          id="school"
          autoComplete="organization"
          maxLength={160}
          aria-invalid={Boolean(errors.school)}
          aria-describedby={errors.school ? "school-error" : undefined}
          {...register("school")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="degree" label={t.degree} error={errors.degree?.message}>
          <Input
            id="degree"
            placeholder={t.degreePlaceholder}
            maxLength={120}
            aria-invalid={Boolean(errors.degree)}
            aria-describedby={errors.degree ? "degree-error" : undefined}
            {...register("degree")}
          />
        </FormField>
        <FormField
          id="fieldOfStudy"
          label={t.fieldOfStudy}
          error={errors.fieldOfStudy?.message}
        >
          <Input
            id="fieldOfStudy"
            placeholder={t.fieldPlaceholder}
            maxLength={120}
            aria-invalid={Boolean(errors.fieldOfStudy)}
            aria-describedby={
              errors.fieldOfStudy ? "fieldOfStudy-error" : undefined
            }
            {...register("fieldOfStudy")}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="startYear"
          label={t.startYear}
          error={errors.startYear?.message}
        >
          <Input
            id="startYear"
            type="number"
            inputMode="numeric"
            aria-invalid={Boolean(errors.startYear)}
            aria-describedby={errors.startYear ? "startYear-error" : undefined}
            {...register("startYear", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          id="endYear"
          label={t.endYear}
          error={errors.endYear?.message}
        >
          <Input
            id="endYear"
            type="number"
            inputMode="numeric"
            disabled={isCurrent}
            aria-invalid={Boolean(errors.endYear)}
            aria-describedby={errors.endYear ? "endYear-error" : undefined}
            {...register("endYear", {
              setValueAs: (value) => (value === "" ? null : Number(value)),
            })}
          />
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          name="isCurrent"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="education-is-current"
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
                if (checked)
                  setValue("endYear", null, { shouldValidate: true });
              }}
            />
          )}
        />
        <Label htmlFor="education-is-current">{t.current}</Label>
      </div>

      <FormField
        id="education-description"
        label={t.description}
        hint={t.descriptionHint}
        error={errors.description?.message}
      >
        <Textarea
          id="education-description"
          rows={5}
          maxLength={2000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description
              ? "education-description-error"
              : "education-description-hint"
          }
          {...register("description")}
        />
      </FormField>

      {result && !result.success ? (
        <FormStatus message={result.message} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {isSubmitting ? t.saving : submitLabel}
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
