"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCandidateProfileSchemas,
  type SkillInput,
} from "@/features/candidate-profile/schemas";
import {
  addSkillAction,
  removeSkillAction,
  type ProfileActionResult,
} from "@/features/candidate-profile/server/actions";
import type {
  CandidateDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";

type SkillItem = { id: string; name: string };

export function SkillManager({
  skills,
  candidate,
  validation,
}: {
  skills: SkillItem[];
  candidate: CandidateDictionary;
  validation: ValidationDictionary;
}) {
  const t = candidate.profile.skills;
  const router = useRouter();
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const [removing, startRemoving] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SkillInput>({
    resolver: zodResolver(
      createCandidateProfileSchemas(validation, candidate).skillSchema,
    ),
    defaultValues: { name: "" },
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = await addSkillAction(values);

    if (!nextResult.success) {
      const message = nextResult.fieldErrors?.name;
      if (message) setError("name", { message });
      setResult(nextResult);
      return;
    }

    reset();
    setResult(nextResult);
    router.refresh();
  });

  function remove(skillId: string) {
    setResult(null);
    startRemoving(async () => {
      const nextResult = await removeSkillAction(skillId);
      setResult(nextResult);
      if (nextResult.success) router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      {skills.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={t.listAria}>
          {skills.map((skill) => (
            <li key={skill.id}>
              <Badge variant="secondary" className="gap-1 py-1 pl-3">
                {skill.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="-mr-1 rounded-full"
                  aria-label={formatMessage(t.removeAria, {
                    skill: skill.name,
                  })}
                  disabled={removing}
                  onClick={() => remove(skill.id)}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm leading-6">{t.empty}</p>
      )}

      <form className="grid gap-2 sm:max-w-md" onSubmit={submit} noValidate>
        <Label htmlFor="skill-name">{t.addLabel}</Label>
        <div className="flex gap-2">
          <Input
            id="skill-name"
            placeholder={t.placeholder}
            maxLength={80}
            disabled={isSubmitting || removing}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "skill-name-error" : undefined}
            {...register("name")}
          />
          <Button type="submit" disabled={isSubmitting || removing}>
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            <span className="sr-only sm:not-sr-only">{t.add}</span>
          </Button>
        </div>
        {errors.name ? (
          <p
            id="skill-name-error"
            className="text-destructive text-xs"
            role="alert"
          >
            {errors.name.message}
          </p>
        ) : null}
        <p
          aria-live="polite"
          className={
            result?.success
              ? "text-primary text-xs"
              : "text-destructive text-xs"
          }
        >
          {result?.message}
        </p>
      </form>
    </div>
  );
}
