"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormStatus } from "@/features/candidate-profile/components/form-field";
import {
  publishCompanyAction,
  type RecruiterCompanyActionResult,
  unpublishCompanyAction,
} from "@/features/recruiter-company/server/actions";

export function PublicationControl({
  companyId,
  isPublished,
}: {
  companyId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RecruiterCompanyActionResult | null>(
    null,
  );

  function submit() {
    setResult(null);
    startTransition(async () => {
      const nextResult = isPublished
        ? await unpublishCompanyAction(companyId)
        : await publishCompanyAction(companyId);
      setResult(nextResult);
      if (nextResult.success) router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant={isPublished ? "outline" : "default"}
        onClick={submit}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : isPublished ? (
          <EyeOff aria-hidden="true" />
        ) : (
          <Eye aria-hidden="true" />
        )}
        {pending
          ? "Updating…"
          : isPublished
            ? "Unpublish profile"
            : "Publish profile"}
      </Button>
      {result ? (
        <FormStatus message={result.message} success={result.success} />
      ) : null}
    </div>
  );
}
