"use server";

// Dedicated, validated locale-preference operation — the only writer of the
// locale cookie and of User.preferredLocale. The input is a Zod allow-list
// with unknown fields stripped, so no other field can ride along: role,
// accountStatus, moderationVersion, email, and the immutable
// Notification/EmailOutbox locale snapshots are unreachable from here by
// construction.

import { z } from "zod";
import { cookies } from "next/headers";

import { getCurrentSession } from "@/features/auth/server/session";
import { ROUTE_LOCALES, routeLocaleToDb } from "@/i18n/config";
import { getLocaleCookieOptions, LOCALE_COOKIE_NAME } from "@/i18n/cookie";
import { getPrismaClient } from "@/lib/prisma";

const localePreferenceSchema = z
  .object({
    locale: z.enum(ROUTE_LOCALES),
  })
  .strip();

export type LocalePreferenceResult = { success: boolean };

/**
 * Persists the caller's display-language choice.
 *
 * - Guest: sets the validated locale cookie only.
 * - Authenticated active user: also stores User.preferredLocale, keeping the
 *   cookie an exact mirror of the stored preference.
 * - Suspended user: `getCurrentSession` returns null (their sessions are
 *   revoked), so they are treated as a guest and no authenticated update can
 *   occur; the `accountStatus: "ACTIVE"` guard on the update is defense in
 *   depth on top of that.
 */
export async function setLocalePreferenceAction(
  input: unknown,
): Promise<LocalePreferenceResult> {
  const parsed = localePreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false };
  }
  const { locale } = parsed.data;

  const session = await getCurrentSession();
  if (session) {
    try {
      await getPrismaClient().user.update({
        where: { id: session.user.id, accountStatus: "ACTIVE" },
        data: { preferredLocale: routeLocaleToDb(locale) },
        select: { id: true },
      });
    } catch {
      // The account changed state mid-request; do not persist a cookie that
      // no longer mirrors a stored preference.
      return { success: false };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, getLocaleCookieOptions());
  return { success: true };
}
