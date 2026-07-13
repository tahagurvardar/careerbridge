import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InterviewStatusBadge } from "@/features/interviews/components/interview-status-badge";
import {
  formatInterviewRange,
  interviewFormatLabels,
  type InterviewStatusValue,
} from "@/features/interviews/interviews";
import type { InterviewFormat } from "@/generated/prisma/enums";

export interface InterviewAgendaItem {
  id: string;
  title: string;
  format: InterviewFormat;
  status: InterviewStatusValue;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  jobTitle: string;
  companyName: string;
  /** Recruiter-facing rows only; never rendered for Candidates. */
  candidateName?: string;
}

/**
 * Agenda-style interview rows shared by the Candidate and Recruiter surfaces.
 * Schedule details beyond time and format (meeting link, location,
 * instructions) intentionally stay on the re-authorized detail route.
 */
export function InterviewAgendaList({
  items,
  detailBasePath,
  emptyMessage,
}: {
  items: InterviewAgendaItem[];
  detailBasePath: "/candidate/interviews" | "/recruiter/interviews";
  emptyMessage: string;
}) {
  if (!items.length) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{item.title}</p>
              <InterviewStatusBadge status={item.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {item.candidateName ? `${item.candidateName} · ` : ""}
              {item.jobTitle} · {item.companyName}
            </p>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5">
                <CalendarClock aria-hidden="true" className="size-3.5" />
                {formatInterviewRange(item.startAt, item.endAt, item.timeZone)}
              </span>
              <span>{interviewFormatLabels[item.format]}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="shrink-0 self-start sm:self-center"
          >
            <Link href={`${detailBasePath}/${item.id}`}>View</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
