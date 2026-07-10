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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPLOYMENT_TYPES,
  employmentTypeLabels,
  experienceSchema,
  type ExperienceInput,
} from "@/features/candidate-profile/schemas";
import type { ProfileActionResult } from "@/features/candidate-profile/server/actions";
import { FormField, FormStatus } from "./form-field";

export function ExperienceForm({
  defaultValues,
  action,
  submitLabel,
}: {
  defaultValues: ExperienceInput;
  action: (input: unknown) => Promise<ProfileActionResult>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceInput>({
    resolver: zodResolver(experienceSchema),
    defaultValues,
  });
  const isCurrent = useWatch({ control, name: "isCurrent" });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = await action(values);

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          if (message) setError(field as keyof ExperienceInput, { message });
        },
      );
      setResult(nextResult);
      return;
    }

    router.push(
      `/candidate/profile?updated=${encodeURIComponent(nextResult.message)}`,
    );
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="jobTitle"
          label="Job title"
          error={errors.jobTitle?.message}
        >
          <Input
            id="jobTitle"
            maxLength={160}
            placeholder="Software Engineer"
            aria-invalid={Boolean(errors.jobTitle)}
            aria-describedby={errors.jobTitle ? "jobTitle-error" : undefined}
            {...register("jobTitle")}
          />
        </FormField>
        <FormField
          id="companyName"
          label="Company"
          error={errors.companyName?.message}
        >
          <Input
            id="companyName"
            autoComplete="organization"
            maxLength={160}
            aria-invalid={Boolean(errors.companyName)}
            aria-describedby={
              errors.companyName ? "companyName-error" : undefined
            }
            {...register("companyName")}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="employmentType"
          label="Employment type"
          error={errors.employmentType?.message}
        >
          <Controller
            name="employmentType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="employmentType"
                  className="h-9 w-full"
                  aria-invalid={Boolean(errors.employmentType)}
                  aria-describedby={
                    errors.employmentType ? "employmentType-error" : undefined
                  }
                >
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {employmentTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          id="work-location"
          label="Location"
          error={errors.location?.message}
        >
          <Input
            id="work-location"
            maxLength={120}
            placeholder="Baku, Azerbaijan or Remote"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={
              errors.location ? "work-location-error" : undefined
            }
            {...register("location")}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="startDate"
          label="Start date"
          error={errors.startDate?.message}
        >
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="startDate"
                type="date"
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={
                  errors.startDate ? "startDate-error" : undefined
                }
              />
            )}
          />
        </FormField>
        <FormField
          id="endDate"
          label="End date"
          error={errors.endDate?.message}
        >
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="endDate"
                type="date"
                disabled={isCurrent}
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? "endDate-error" : undefined}
              />
            )}
          />
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          name="isCurrent"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="experience-is-current"
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
                if (checked) setValue("endDate", "", { shouldValidate: true });
              }}
            />
          )}
        />
        <Label htmlFor="experience-is-current">I currently work here</Label>
      </div>

      <FormField
        id="experience-description"
        label="Description"
        hint="Optional responsibilities, scope, and measurable outcomes."
        error={errors.description?.message}
      >
        <Textarea
          id="experience-description"
          rows={6}
          maxLength={2000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description
              ? "experience-description-error"
              : "experience-description-hint"
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
          {isSubmitting ? "Saving…" : submitLabel}
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
