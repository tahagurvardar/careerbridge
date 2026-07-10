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
import { skillSchema, type SkillInput } from "@/features/jobs/schemas";
import {
  addJobSkillAction,
  type JobActionResult,
  removeJobSkillAction,
} from "@/features/jobs/server/actions";

type SkillItem = { id: string; name: string };

export function JobSkillManager({
  jobId,
  skills,
  editable,
}: {
  jobId: string;
  skills: SkillItem[];
  editable: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<JobActionResult | null>(null);
  const [removing, startRemoving] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SkillInput>({
    resolver: zodResolver(skillSchema),
    defaultValues: { name: "" },
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const nextResult = await addJobSkillAction(jobId, values);

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
      const nextResult = await removeJobSkillAction(jobId, skillId);
      setResult(nextResult);
      if (nextResult.success) router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      {skills.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Required skills">
          {skills.map((skill) => (
            <li key={skill.id}>
              <Badge variant="secondary" className="gap-1 py-1 pl-3">
                {skill.name}
                {editable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="-mr-1 rounded-full"
                    aria-label={`Remove ${skill.name}`}
                    disabled={removing}
                    onClick={() => remove(skill.id)}
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </Button>
                ) : null}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm leading-6">
          No required skills yet. Add at least one skill before publishing so
          candidates understand what the role needs.
        </p>
      )}

      {editable ? (
        <form className="grid gap-2 sm:max-w-md" onSubmit={submit} noValidate>
          <Label htmlFor="job-skill-name">Add a required skill</Label>
          <div className="flex gap-2">
            <Input
              id="job-skill-name"
              placeholder="TypeScript"
              maxLength={80}
              disabled={isSubmitting || removing}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? "job-skill-name-error" : undefined
              }
              {...register("name")}
            />
            <Button type="submit" disabled={isSubmitting || removing}>
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              <span className="sr-only sm:not-sr-only">Add</span>
            </Button>
          </div>
          {errors.name ? (
            <p
              id="job-skill-name-error"
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
      ) : (
        <p className="text-muted-foreground text-sm">
          Skills can only be changed while a job is a draft or published.
        </p>
      )}
    </div>
  );
}
