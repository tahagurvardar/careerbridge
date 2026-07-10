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
  employmentTypeLabels,
  experienceLevelLabels,
  jobCreateSchema,
  type JobCreateInput,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import {
  createJobAction,
  type JobActionResult,
  updateJobAction,
} from "@/features/jobs/server/actions";

type OwnedCompanyOption = { id: string; name: string; isPublished: boolean };

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function JobForm({
  jobId,
  companies,
  defaultValues,
}: {
  jobId?: string;
  companies?: OwnedCompanyOption[];
  defaultValues: JobCreateInput;
}) {
  const router = useRouter();
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
    resolver: zodResolver(jobCreateSchema),
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

    router.push(nextResult.redirectTo ?? "/recruiter/jobs");
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      {!isEditing && companies ? (
        <FormField
          id="companyId"
          label="Company"
          hint="You can only create jobs for companies you own."
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
            <option value="">Select a company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.isPublished ? "" : " (unpublished)"}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      <FormField
        id="title"
        label="Job title"
        error={errors.title?.message}
        hint="A clear role title, for example “Frontend Engineer”."
      >
        <Input
          id="title"
          maxLength={160}
          placeholder="Frontend Engineer"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : "title-hint"}
          {...register("title")}
        />
      </FormField>

      <FormField
        id="summary"
        label="Summary"
        hint="A concise one or two sentence overview. Required before publishing."
        error={errors.summary?.message}
      >
        <Textarea
          id="summary"
          rows={3}
          maxLength={320}
          placeholder="What the role is about, in a sentence or two."
          aria-invalid={Boolean(errors.summary)}
          aria-describedby={errors.summary ? "summary-error" : "summary-hint"}
          {...register("summary")}
        />
      </FormField>

      <FormField
        id="description"
        label="Description"
        hint="Plain text only. Required before publishing."
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={7}
          maxLength={8000}
          placeholder="Describe the role, team, and what success looks like."
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
          label="Responsibilities"
          hint="One per line works well. Required before publishing."
          error={errors.responsibilities?.message}
        >
          <Textarea
            id="responsibilities"
            rows={6}
            maxLength={6000}
            placeholder={"Lead feature delivery\nCollaborate on design reviews"}
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
          label="Requirements"
          hint="One per line works well. Required before publishing."
          error={errors.requirements?.message}
        >
          <Textarea
            id="requirements"
            rows={6}
            maxLength={6000}
            placeholder={"3+ years with React\nStrong communication"}
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
        label="Location"
        hint="City, region, or “Remote”. Required before publishing."
        error={errors.location?.message}
      >
        <Input
          id="location"
          maxLength={160}
          placeholder="Baku, Azerbaijan"
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
          label="Employment type"
          error={errors.employmentType?.message}
        >
          <select
            id="employmentType"
            className={selectClassName}
            aria-invalid={Boolean(errors.employmentType)}
            {...register("employmentType")}
          >
            <option value="">Not specified</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {employmentTypeLabels[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="workplaceType"
          label="Workplace type"
          error={errors.workplaceType?.message}
        >
          <select
            id="workplaceType"
            className={selectClassName}
            aria-invalid={Boolean(errors.workplaceType)}
            {...register("workplaceType")}
          >
            <option value="">Not specified</option>
            {WORKPLACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {workplaceTypeLabels[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="experienceLevel"
          label="Experience level"
          error={errors.experienceLevel?.message}
        >
          <select
            id="experienceLevel"
            className={selectClassName}
            aria-invalid={Boolean(errors.experienceLevel)}
            {...register("experienceLevel")}
          >
            <option value="">Not specified</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {experienceLevelLabels[level]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="text-muted-foreground mb-2 text-sm font-medium">
          Salary range (optional, whole amounts)
        </legend>
        <FormField
          id="salaryMin"
          label="Minimum"
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
          label="Maximum"
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
          label="Currency"
          hint="3-letter code, e.g. USD."
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
        label="Application deadline"
        hint="Optional. Cannot be in the past when publishing."
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
            ? "Saving…"
            : isEditing
              ? "Save job"
              : "Create draft job"}
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
