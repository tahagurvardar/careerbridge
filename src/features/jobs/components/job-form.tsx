"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, LoaderCircle, Save } from "lucide-react";
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
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORKPLACE_TYPES,
  createJobSchemas,
  type JobCreateInput,
} from "@/features/jobs/schemas";
import {
  createJobAction,
  type JobActionResult,
  updateJobAction,
} from "@/features/jobs/server/actions";
import { useLocale } from "@/i18n/client";
import type {
  AppDictionary,
  RecruiterDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

type OwnedCompanyOption = { id: string; name: string; isPublished: boolean };

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function JobForm({
  jobId,
  companies,
  defaultValues,
  recruiter,
  validation,
  enumLabels,
  cancelLabel,
}: {
  jobId?: string;
  companies?: OwnedCompanyOption[];
  defaultValues: JobCreateInput;
  recruiter: RecruiterDictionary;
  validation: ValidationDictionary;
  enumLabels: AppDictionary["labels"];
  cancelLabel: string;
}) {
  const labels = recruiter.jobs.form;
  const router = useRouter();
  const locale = useLocale();
  const isEditing = Boolean(jobId);
  const [result, setResult] = useState<JobActionResult | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JobCreateInput>({
    // The create schema shares every content rule with the edit schema and only
    // adds companyId, which is always populated (and ignored server-side on
    // edit). Using it for both keeps one resolver type for the form.
    resolver: zodResolver(
      createJobSchemas(validation, recruiter).jobCreateSchema,
    ),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = jobId
      ? await updateJobAction(jobId, values)
      : await createJobAction(values);

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          if (message) setError(field as keyof JobCreateInput, { message });
        },
      );
      setResult(nextResult);
      return;
    }

    router.push(
      localizeInternalPath(nextResult.redirectTo ?? "/recruiter/jobs", locale),
    );
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      {!isEditing && companies ? (
        <FormField
          id="companyId"
          label={labels.company}
          hint={labels.companyHint}
          error={errors.companyId?.message}
        >
          <select
            id="companyId"
            className={selectClassName}
            aria-invalid={Boolean(errors.companyId)}
            aria-describedby={
              errors.companyId ? "companyId-error" : "companyId-hint"
            }
            {...register("companyId")}
          >
            <option value="">{labels.selectCompany}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.isPublished ? "" : ` (${labels.unpublished})`}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      <FormField
        id="title"
        label={labels.title}
        error={errors.title?.message}
        hint={labels.titleHint}
      >
        <Input
          id="title"
          maxLength={160}
          placeholder={labels.titlePlaceholder}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : "title-hint"}
          {...register("title")}
        />
      </FormField>

      <FormField
        id="summary"
        label={labels.summary}
        hint={labels.summaryHint}
        error={errors.summary?.message}
      >
        <Textarea
          id="summary"
          rows={3}
          maxLength={320}
          placeholder={labels.summaryPlaceholder}
          aria-invalid={Boolean(errors.summary)}
          aria-describedby={errors.summary ? "summary-error" : "summary-hint"}
          {...register("summary")}
        />
      </FormField>

      <FormField
        id="description"
        label={labels.description}
        hint={labels.descriptionHint}
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={7}
          maxLength={8000}
          placeholder={labels.descriptionPlaceholder}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "description-error" : "description-hint"
          }
          {...register("description")}
        />
      </FormField>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormField
          id="responsibilities"
          label={labels.responsibilities}
          hint={labels.responsibilitiesHint}
          error={errors.responsibilities?.message}
        >
          <Textarea
            id="responsibilities"
            rows={6}
            maxLength={6000}
            placeholder={labels.responsibilitiesPlaceholder}
            aria-invalid={Boolean(errors.responsibilities)}
            aria-describedby={
              errors.responsibilities
                ? "responsibilities-error"
                : "responsibilities-hint"
            }
            {...register("responsibilities")}
          />
        </FormField>
        <FormField
          id="requirements"
          label={labels.requirements}
          hint={labels.requirementsHint}
          error={errors.requirements?.message}
        >
          <Textarea
            id="requirements"
            rows={6}
            maxLength={6000}
            placeholder={labels.requirementsPlaceholder}
            aria-invalid={Boolean(errors.requirements)}
            aria-describedby={
              errors.requirements ? "requirements-error" : "requirements-hint"
            }
            {...register("requirements")}
          />
        </FormField>
      </div>

      <FormField
        id="location"
        label={labels.location}
        hint={labels.locationHint}
        error={errors.location?.message}
      >
        <Input
          id="location"
          maxLength={160}
          placeholder={labels.locationPlaceholder}
          aria-invalid={Boolean(errors.location)}
          aria-describedby={
            errors.location ? "location-error" : "location-hint"
          }
          {...register("location")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          id="employmentType"
          label={labels.employmentType}
          error={errors.employmentType?.message}
        >
          <select
            id="employmentType"
            className={selectClassName}
            aria-invalid={Boolean(errors.employmentType)}
            {...register("employmentType")}
          >
            <option value="">{labels.notSpecified}</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {enumLabels.employmentType[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="workplaceType"
          label={labels.workplaceType}
          error={errors.workplaceType?.message}
        >
          <select
            id="workplaceType"
            className={selectClassName}
            aria-invalid={Boolean(errors.workplaceType)}
            {...register("workplaceType")}
          >
            <option value="">{labels.notSpecified}</option>
            {WORKPLACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {enumLabels.workplaceType[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="experienceLevel"
          label={labels.experienceLevel}
          error={errors.experienceLevel?.message}
        >
          <select
            id="experienceLevel"
            className={selectClassName}
            aria-invalid={Boolean(errors.experienceLevel)}
            {...register("experienceLevel")}
          >
            <option value="">{labels.notSpecified}</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {enumLabels.experienceLevel[level]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="text-muted-foreground mb-2 text-sm font-medium">
          {labels.salaryLegend}
        </legend>
        <FormField
          id="salaryMin"
          label={labels.minimum}
          error={errors.salaryMin?.message}
        >
          <Input
            id="salaryMin"
            inputMode="numeric"
            placeholder="60000"
            aria-invalid={Boolean(errors.salaryMin)}
            {...register("salaryMin")}
          />
        </FormField>
        <FormField
          id="salaryMax"
          label={labels.maximum}
          error={errors.salaryMax?.message}
        >
          <Input
            id="salaryMax"
            inputMode="numeric"
            placeholder="80000"
            aria-invalid={Boolean(errors.salaryMax)}
            {...register("salaryMax")}
          />
        </FormField>
        <FormField
          id="salaryCurrency"
          label={labels.currency}
          hint={labels.currencyHint}
          error={errors.salaryCurrency?.message}
        >
          <Input
            id="salaryCurrency"
            maxLength={3}
            placeholder="USD"
            className="uppercase"
            aria-invalid={Boolean(errors.salaryCurrency)}
            aria-describedby={
              errors.salaryCurrency
                ? "salaryCurrency-error"
                : "salaryCurrency-hint"
            }
            {...register("salaryCurrency")}
          />
        </FormField>
      </fieldset>

      <FormField
        id="applicationDeadline"
        label={labels.deadline}
        hint={labels.deadlineHint}
        error={errors.applicationDeadline?.message}
      >
        <Input
          id="applicationDeadline"
          type="date"
          className="sm:max-w-xs"
          aria-invalid={Boolean(errors.applicationDeadline)}
          aria-describedby={
            errors.applicationDeadline
              ? "applicationDeadline-error"
              : "applicationDeadline-hint"
          }
          {...register("applicationDeadline")}
        />
      </FormField>

      {result && !result.success ? (
        <FormStatus message={result.message} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : isEditing ? (
            <Save aria-hidden="true" />
          ) : (
            <BriefcaseBusiness aria-hidden="true" />
          )}
          {isSubmitting
            ? labels.saving
            : isEditing
              ? labels.save
              : labels.createDraft}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}
