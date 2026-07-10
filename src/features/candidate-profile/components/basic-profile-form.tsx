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
  basicProfileSchema,
  type BasicProfileInput,
} from "@/features/candidate-profile/schemas";
import {
  saveBasicProfileAction,
  type ProfileActionResult,
} from "@/features/candidate-profile/server/actions";
import { FormField, FormStatus } from "./form-field";

export function BasicProfileForm({
  defaultValues,
}: {
  defaultValues: BasicProfileInput;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BasicProfileInput>({
    resolver: zodResolver(basicProfileSchema),
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
      `/candidate/profile?updated=${encodeURIComponent(nextResult.message)}`,
    );
  });

  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="headline"
          label="Professional headline"
          hint="A focused summary, such as “Frontend engineer building accessible products.”"
          error={errors.headline?.message}
        >
          <Input
            id="headline"
            placeholder="Product designer focused on fintech"
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
          label="Location"
          hint="City and country, or a remote-work preference."
          error={errors.location?.message}
        >
          <Input
            id="location"
            placeholder="Baku, Azerbaijan"
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
        label="Professional bio"
        hint="Describe your experience, strengths, and the work you want to do."
        error={errors.bio?.message}
      >
        <Textarea
          id="bio"
          rows={7}
          maxLength={2000}
          placeholder="Share a concise overview of your professional background."
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
          {...register("bio")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="websiteUrl"
          label="Website"
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
          label="LinkedIn"
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
          label="GitHub"
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
          {isSubmitting ? "Saving…" : "Save profile"}
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
