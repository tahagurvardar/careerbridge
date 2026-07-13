import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { EmailEventType } from "@/generated/prisma/enums";
import type { PlatformRole } from "@/features/auth/roles";
import {
  getEmailEventsForRole,
  resolveEmailPreference,
} from "@/features/email/email";

export type EmailPreferenceValues = Record<EmailEventType, boolean>;

export async function getEmailPreferenceValues(
  prisma: PrismaClient,
  userId: string,
  role: PlatformRole,
): Promise<Partial<EmailPreferenceValues>> {
  const supportedEvents = getEmailEventsForRole(role);
  const rows = await prisma.userEmailPreference.findMany({
    where: { userId, eventType: { in: [...supportedEvents] } },
    select: { eventType: true, enabled: true },
  });
  return Object.fromEntries(
    supportedEvents.map((eventType) => [
      eventType,
      resolveEmailPreference(rows, eventType),
    ]),
  );
}

export async function replaceOwnEmailPreferences(
  prisma: PrismaClient,
  userId: string,
  role: "CANDIDATE" | "RECRUITER",
  values: Partial<EmailPreferenceValues>,
): Promise<void> {
  const supportedEvents = getEmailEventsForRole(role);
  await prisma.$transaction(
    supportedEvents.map((eventType) =>
      prisma.userEmailPreference.upsert({
        where: { userId_eventType: { userId, eventType } },
        create: { userId, eventType, enabled: values[eventType] === true },
        update: { enabled: values[eventType] === true },
      }),
    ),
  );
}
