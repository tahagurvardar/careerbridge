"use client";

import { useState, useTransition } from "react";
import { CircleCheckBig, CircleX, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormStatus } from "@/features/candidate-profile/components/form-field";
import {
  acceptInterviewAction,
  declineInterviewAction,
  type InterviewActionResult,
} from "@/features/interviews/server/actions";
import type { InterviewsDictionary } from "@/i18n/dictionary";

/**
 * Explicit Candidate accept/decline controls. Each button calls its own
 * dedicated Server Action with only the interview id and the version token —
 * the browser never submits a status value — and the server re-authorizes
 * ownership regardless of what is rendered here.
 */
export function InterviewResponseActions({
  interviewId,
  expectedVersion,
  t,
}: {
  interviewId: string;
  expectedVersion: number;
  t: InterviewsDictionary["responseActions"];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<InterviewActionResult | null>(null);

  function run(action: "accept" | "decline") {
    setResult(null);
    startTransition(async () => {
      const next =
        action === "accept"
          ? await acceptInterviewAction(interviewId, expectedVersion)
          : await declineInterviewAction(interviewId, expectedVersion);
      setResult(next);
      if (next.success) router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => run("accept")} disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <CircleCheckBig aria-hidden="true" />
          )}
          {t.accept}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => run("decline")}
          disabled={pending}
        >
          <CircleX aria-hidden="true" />
          {t.decline}
        </Button>
      </div>
      {result ? (
        <FormStatus message={result.message} success={result.success} />
      ) : null}
    </div>
  );
}
