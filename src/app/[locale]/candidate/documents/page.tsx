import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Paperclip, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/features/auth/server/session";
import { formatFileSize } from "@/features/candidate-documents/documents";
import { RemoveResumeButton } from "@/features/candidate-documents/components/remove-resume-button";
import { ResumeUploadForm } from "@/features/candidate-documents/components/resume-upload-form";
import { getCandidateDocumentsOverview } from "@/features/candidate-documents/server/data";
import { MAX_RESUME_MB } from "@/features/candidate-documents/validation";
import { formatJobDate } from "@/features/jobs/format";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/documents">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { documents } = (await getDictionary(locale)).candidate;
  return {
    title: documents.metaTitle,
    description: documents.metaDescription,
  };
}

function downloadHref(documentId: string) {
  return `/api/documents/${documentId}/download`;
}

export default async function CandidateDocumentsPage({
  params,
}: PageProps<"/[locale]/candidate/documents">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.documents;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("CANDIDATE", "/candidate/documents");
  const { currentDocumentId, documents } = await getCandidateDocumentsOverview(
    getPrismaClient(),
    session.user.id,
  );
  const current = documents.find(
    (document) => document.id === currentDocumentId,
  );
  const previous = documents.filter(
    (document) => document.id !== currentDocumentId,
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t.badge}</Badge>
            <span className="text-muted-foreground text-sm">
              {t.privateLabel}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">{t.intro}</p>
        </div>

        <div className="mt-9 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText aria-hidden="true" className="text-primary size-5" />
                {t.currentTitle}
              </CardTitle>
              <CardDescription>
                {current ? t.currentDescription : t.currentEmptyDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {current ? (
                <div className="bg-muted/50 flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <FileText
                        aria-hidden="true"
                        className="text-muted-foreground size-4 shrink-0"
                      />
                      <span className="truncate">{current.filename}</span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatFileSize(current.sizeBytes)} ·{" "}
                      {formatMessage(t.uploadedOn, {
                        date: formatJobDate(locale, current.uploadedAt),
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a href={downloadHref(current.id)}>
                        <Download aria-hidden="true" />
                        {t.download}
                      </a>
                    </Button>
                    <RemoveResumeButton t={t.remove} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <p className="text-sm font-medium">
                  {current ? t.replaceTitle : t.uploadTitle}
                </p>
                <ResumeUploadForm
                  hasCurrentResume={Boolean(current)}
                  t={t.upload}
                />
                {current ? (
                  <p className="text-muted-foreground text-xs leading-5">
                    {t.replaceNote}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {previous.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t.previousTitle}</CardTitle>
                <CardDescription>{t.previousDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-border divide-y">
                  {previous.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <FileText
                            aria-hidden="true"
                            className="text-muted-foreground size-4 shrink-0"
                          />
                          <span className="truncate">{document.filename}</span>
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {formatFileSize(document.sizeBytes)} ·{" "}
                          {formatMessage(t.uploadedOn, {
                            date: formatJobDate(locale, document.uploadedAt),
                          })}
                        </p>
                        {document.applicationCount > 0 ? (
                          <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                            <Paperclip
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            {formatCount(
                              locale,
                              document.applicationCount,
                              t.attachedCount,
                            )}
                          </p>
                        ) : (
                          <p className="text-muted-foreground mt-1.5 text-xs">
                            {t.notAttached}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="self-start sm:self-center"
                      >
                        <a href={downloadHref(document.id)}>
                          <Download aria-hidden="true" />
                          {t.download}
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck
                  aria-hidden="true"
                  className="text-primary size-5"
                />
                {t.storageTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground grid gap-2 text-sm leading-6">
              <p>{t.storageDescription}</p>
              <p>
                {formatMessage(t.safetyDescription, { max: MAX_RESUME_MB })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={localize("/candidate/dashboard")}>
              {t.backToDashboard}
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={localize("/candidate/applications")}>
              {t.viewApplications}
              <Paperclip aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
