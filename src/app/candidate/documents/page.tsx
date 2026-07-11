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
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Documents",
  description: "Manage your private CareerBridge CV.",
};

function downloadHref(documentId: string) {
  return `/api/documents/${documentId}/download`;
}

export default async function CandidateDocumentsPage() {
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
            <Badge variant="secondary">Candidate documents</Badge>
            <span className="text-muted-foreground text-sm">
              Private to your account
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            Your CV
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            Upload one current CV as a PDF. When you apply to a job, the CV you
            have at that moment is attached to the application and stays with
            it, even if you replace your CV later.
          </p>
        </div>

        <div className="mt-9 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText aria-hidden="true" className="text-primary size-5" />
                Current CV
              </CardTitle>
              <CardDescription>
                {current
                  ? "This CV is attached to any new application you submit."
                  : "You have no current CV. Upload a PDF to attach it to future applications."}
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
                      {formatFileSize(current.sizeBytes)} · Uploaded{" "}
                      {formatJobDate(current.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a href={downloadHref(current.id)}>
                        <Download aria-hidden="true" />
                        Download
                      </a>
                    </Button>
                    <RemoveResumeButton />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <p className="text-sm font-medium">
                  {current ? "Replace your CV" : "Upload your CV"}
                </p>
                <ResumeUploadForm hasCurrentResume={Boolean(current)} />
                {current ? (
                  <p className="text-muted-foreground text-xs leading-5">
                    Replacing keeps your previous CV attached to any application
                    it is already on. Only new applications use the replacement.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {previous.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Previous versions</CardTitle>
                <CardDescription>
                  Earlier CVs are kept private so applications they are attached
                  to keep working.
                </CardDescription>
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
                          {formatFileSize(document.sizeBytes)} · Uploaded{" "}
                          {formatJobDate(document.uploadedAt)}
                        </p>
                        {document.applicationCount > 0 ? (
                          <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                            <Paperclip
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Attached to {document.applicationCount}{" "}
                            {document.applicationCount === 1
                              ? "application"
                              : "applications"}
                          </p>
                        ) : (
                          <p className="text-muted-foreground mt-1.5 text-xs">
                            Not attached to any application
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
                          Download
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
                How your CV is stored
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground grid gap-2 text-sm leading-6">
              <p>
                Your CV is kept in private storage and is never listed on public
                pages or given a public link. Only you, and the hiring team of a
                job you attached it to, can download it — always through an
                authenticated, access-logged request.
              </p>
              <p>
                CareerBridge accepts PDF files up to {MAX_RESUME_MB} MB and does
                not open, render, or execute their contents. Dedicated malware
                scanning is not yet part of this phase; only upload CVs you
                trust.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/candidate/dashboard">Back to dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/candidate/applications">
              View your applications
              <Paperclip aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
