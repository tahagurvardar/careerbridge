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
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/settings/notifications">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  return {
    title: metadata.notificationSettings.title,
    description: metadata.notificationSettings.description,
  };
}

export default async function NotificationSettingsPage({
  params,
}: PageProps<"/[locale]/settings/notifications">) {
  const locale = resolvePageLocale((await params).locale);
  const { email } = await getDictionary(locale);
  const t = email.settings;

  const session = await requireUser("/settings/notifications");
  if (session.user.role === "ADMIN") {
    redirect(
      localizeInternalPath(getDashboardPathForRole(session.user.role), locale),
    );
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
        <Badge variant="secondary">{t.badge}</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          {t.description}
        </p>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Mail aria-hidden="true" className="size-5" />
              </span>
              <div>
                <CardTitle>{t.cardTitle}</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  {t.cardDescription}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmailPreferenceForm
              events={events}
              initialValues={values}
              labels={{
                fieldsetLegend: t.fieldsetLegend,
                save: t.save,
                eventLabels: email.eventLabels,
                eventDescriptions: email.eventDescriptions,
              }}
            />
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
                <p className="font-medium">{t.inAppTitle}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {t.inAppDescription}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href={localizeInternalPath("/notifications", locale)}>
                {t.openNotifications}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
