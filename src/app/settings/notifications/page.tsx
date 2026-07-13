import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardPathForRole } from "@/features/auth/roles";
import { requireUser } from "@/features/auth/server/session";
import { EmailPreferenceForm } from "@/features/email/components/email-preference-form";
import { getEmailEventsForRole } from "@/features/email/email";
import { getEmailPreferenceValues } from "@/features/email/server/preferences";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Notification settings",
  description: "Manage transactional email delivery preferences.",
};

export default async function NotificationSettingsPage() {
  const session = await requireUser("/settings/notifications");
  if (session.user.role === "ADMIN") {
    redirect(getDashboardPathForRole(session.user.role));
  }
  const events = getEmailEventsForRole(session.user.role);
  const values = await getEmailPreferenceValues(
    getPrismaClient(),
    session.user.id,
    session.user.role,
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary">Settings</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Notification settings
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          Choose which transactional updates CareerBridge may place in the email
          delivery queue. Delivery is asynchronous and may be delayed.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Mail aria-hidden="true" className="size-5" />
              </span>
              <div>
                <CardTitle>Transactional email</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  Preferences apply when a new event occurs. Turning an event
                  back on does not send previously suppressed email.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmailPreferenceForm events={events} initialValues={values} />
          </CardContent>
        </Card>

        <Card className="mt-5" size="sm">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BellRing
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
              />
              <div>
                <p className="font-medium">
                  In-app notifications remain enabled.
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  These settings control email delivery only. Related pages
                  always check your access again when opened.
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/notifications">Open notifications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
