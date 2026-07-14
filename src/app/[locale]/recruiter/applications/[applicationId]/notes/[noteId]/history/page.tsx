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
import { getApplicationNoteHistory } from "@/features/application-notes/server/data";
import {
  formatCount,
  formatDateTimeUtc,
  formatInteger,
} from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/applications/[applicationId]/notes/[noteId]/history">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.noteHistory.metaTitle,
    description: recruiter.noteHistory.metaDescription,
  };
}

export default async function ApplicationNoteHistoryPage({
  params,
}: {
  params: Promise<{ locale: string; applicationId: string; noteId: string }>;
}) {
  const { locale: localeParam, applicationId, noteId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.noteHistory;
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
          <Link
            href={localizeInternalPath(
              `/recruiter/applications/${applicationId}`,
              locale,
            )}
          >
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge variant="secondary" className="gap-1.5">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              {t.internal}
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-3 leading-7 break-words">
              {formatMessage(t.context, {
                candidate: note.application.candidate.name,
                job: note.application.job.title,
                company: note.application.job.company.name,
              })}
            </p>
          </div>
          {note.deletedAt ? (
            <Badge variant="outline">{t.deleted}</Badge>
          ) : (
            <Badge>{t.active}</Badge>
          )}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History aria-hidden="true" className="text-primary size-5" />
              {t.revisionsTitle}
            </CardTitle>
            <CardDescription>
              {formatMessage(t.revisionsDescription, {
                count: formatCount(
                  locale,
                  note.revisions.length,
                  t.revisionCount,
                ),
              })}
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
                        {dictionary.labels.noteRevisionAction[revision.action]}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatMessage(t.revision, {
                          version: formatInteger(locale, revision.version),
                        })}
                      </span>
                    </div>
                    <time
                      className="text-muted-foreground text-xs"
                      dateTime={revision.createdAt.toISOString()}
                    >
                      {formatDateTimeUtc(locale, revision.createdAt)}
                    </time>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {formatMessage(t.by, {
                      name: revision.actor?.name ?? t.formerRecruiter,
                    })}
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
