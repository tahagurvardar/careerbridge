import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/features/auth/server/session";
import { revisionActionLabels } from "@/features/application-notes/notes";
import { getApplicationNoteHistory } from "@/features/application-notes/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Application note history",
  description: "Review the immutable history of an internal application note.",
};

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function ApplicationNoteHistoryPage({
  params,
}: {
  params: Promise<{ applicationId: string; noteId: string }>;
}) {
  const { applicationId, noteId } = await params;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/applications/${applicationId}/notes/${noteId}/history`,
  );
  const note = await getApplicationNoteHistory(
    getPrismaClient(),
    session.user.id,
    applicationId,
    noteId,
  );

  if (!note) notFound();

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={`/recruiter/applications/${applicationId}`}>
            <ArrowLeft aria-hidden="true" />
            Back to application
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge variant="secondary" className="gap-1.5">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Recruiter internal
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              Note history
            </h1>
            <p className="text-muted-foreground mt-3 leading-7 break-words">
              {note.application.candidate.name} · {note.application.job.title}{" "}
              at {note.application.job.company.name}
            </p>
          </div>
          {note.deletedAt ? (
            <Badge variant="outline">Deleted</Badge>
          ) : (
            <Badge>Active</Badge>
          )}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History aria-hidden="true" className="text-primary size-5" />
              Immutable revisions
            </CardTitle>
            <CardDescription>
              {note.revisions.length}{" "}
              {note.revisions.length === 1 ? "revision" : "revisions"}. Each
              entry is a full snapshot recorded with its mutation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-5">
              {note.revisions.map((revision) => (
                <li
                  key={revision.id}
                  className="min-w-0 rounded-xl border p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          revision.action === "DELETED"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {revisionActionLabels[revision.action]}
                      </Badge>
                      <span className="text-sm font-medium">
                        Revision {revision.version}
                      </span>
                    </div>
                    <time
                      className="text-muted-foreground text-xs"
                      dateTime={revision.createdAt.toISOString()}
                    >
                      {formatTimestamp(revision.createdAt)}
                    </time>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    By {revision.actor?.name ?? "Former recruiter"}
                  </p>
                  <p className="bg-muted/45 mt-4 min-w-0 rounded-lg p-4 leading-7 break-words whitespace-pre-wrap">
                    {revision.body}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
