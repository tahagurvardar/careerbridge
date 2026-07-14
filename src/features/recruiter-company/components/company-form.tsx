"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle, Save } from "lucide-react";
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
  COMPANY_SIZES,
  createRecruiterCompanySchemas,
  type CompanyInput,
  type ValidatedCompany,
} from "@/features/recruiter-company/schemas";
import {
  createCompanyAction,
  type RecruiterCompanyActionResult,
  updateCompanyAction,
} from "@/features/recruiter-company/server/actions";
import { useLocale } from "@/i18n/client";
import type {
  CommonDictionary,
  LabelsDictionary,
  RecruiterDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

export function CompanyForm({
  companyId,
  defaultValues,
  labels,
  recruiter,
  validation,
}: {
  companyId?: string;
  defaultValues: CompanyInput;
  labels: {
    form: RecruiterDictionary["companyForm"];
    common: CommonDictionary["actions"];
    companySize: LabelsDictionary["companySize"];
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
  } = useForm<CompanyInput, unknown, ValidatedCompany>({
    resolver: zodResolver(
      createRecruiterCompanySchemas(validation, recruiter).companySchema,
    ),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = companyId
      ? await updateCompanyAction(companyId, values)
      : await createCompanyAction(values);

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          if (message) setError(field as keyof CompanyInput, { message });
        },
      );
      setResult(nextResult);
      return;
    }

    router.push(
      localizeInternalPath(
        nextResult.redirectTo ?? "/recruiter/companies",
        locale,
      ),
    );
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <FormField
        id="name"
        label={labels.form.name}
        error={errors.name?.message}
      >
        <Input
          id="name"
          maxLength={160}
          placeholder={labels.form.namePlaceholder}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="tagline"
        label={labels.form.tagline}
        hint={labels.form.taglineHint}
        error={errors.tagline?.message}
      >
        <Input
          id="tagline"
          maxLength={240}
          placeholder={labels.form.taglinePlaceholder}
          aria-invalid={Boolean(errors.tagline)}
          aria-describedby={errors.tagline ? "tagline-error" : "tagline-hint"}
          {...register("tagline")}
        />
      </FormField>

      <FormField
        id="description"
        label={labels.form.description}
        hint={labels.form.descriptionHint}
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={8}
          maxLength={4000}
          placeholder={labels.form.descriptionPlaceholder}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "description-error" : "description-hint"
          }
          {...register("description")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="industry"
          label={labels.form.industry}
          error={errors.industry?.message}
        >
          <Input
            id="industry"
            maxLength={120}
            placeholder={labels.form.industryPlaceholder}
            aria-invalid={Boolean(errors.industry)}
            aria-describedby={errors.industry ? "industry-error" : undefined}
            {...register("industry")}
          />
        </FormField>
        <FormField
          id="headquarters"
          label={labels.form.headquarters}
          error={errors.headquarters?.message}
        >
          <Input
            id="headquarters"
            maxLength={160}
            placeholder={labels.form.headquartersPlaceholder}
            aria-invalid={Boolean(errors.headquarters)}
            aria-describedby={
              errors.headquarters ? "headquarters-error" : undefined
            }
            {...register("headquarters")}
          />
        </FormField>
      </div>

      <FormField
        id="websiteUrl"
        label={labels.form.website}
        hint={labels.form.urlHint}
        error={errors.websiteUrl?.message}
      >
        <Input
          id="websiteUrl"
          type="url"
          inputMode="url"
          placeholder={labels.form.websitePlaceholder}
          aria-invalid={Boolean(errors.websiteUrl)}
          aria-describedby={
            errors.websiteUrl ? "websiteUrl-error" : "websiteUrl-hint"
          }
          {...register("websiteUrl")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="companySize"
          label={labels.form.companySize}
          error={errors.companySize?.message}
        >
          <select
            id="companySize"
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
            aria-invalid={Boolean(errors.companySize)}
            aria-describedby={
              errors.companySize ? "companySize-error" : undefined
            }
            {...register("companySize")}
          >
            <option value="">{labels.form.notSpecified}</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {labels.companySize[size]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="foundedYear"
          label={labels.form.foundedYear}
          error={errors.foundedYear?.message}
        >
          <Input
            id="foundedYear"
            inputMode="numeric"
            placeholder="2018"
            maxLength={4}
            aria-invalid={Boolean(errors.foundedYear)}
            aria-describedby={
              errors.foundedYear ? "foundedYear-error" : undefined
            }
            {...register("foundedYear")}
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
          ) : companyId ? (
            <Save aria-hidden="true" />
          ) : (
            <Building2 aria-hidden="true" />
          )}
          {isSubmitting
            ? labels.common.saving
            : companyId
              ? labels.form.save
              : labels.form.create}
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
