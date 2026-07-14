// Eagerly loaded notification/email/label dictionaries for server-side event
// rendering. Notification and EmailOutbox copy is rendered in each RECIPIENT's
// locale inside the authoritative transaction — the request locale is
// irrelevant there — so the emit layer needs synchronous access to all four
// locales. These slices are small and this module is only imported by
// server-side emit code and unit tests, never by Client Components, so no
// dictionary ships to the browser through it.

import type {
  EmailDictionary,
  LabelsDictionary,
  NotificationsDictionary,
} from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";

import { labels as enLabels } from "@/i18n/dictionaries/en/labels";
import { notifications as enNotifications } from "@/i18n/dictionaries/en/notifications";
import { email as enEmail } from "@/i18n/dictionaries/en/email";
import { labels as trLabels } from "@/i18n/dictionaries/tr/labels";
import { notifications as trNotifications } from "@/i18n/dictionaries/tr/notifications";
import { email as trEmail } from "@/i18n/dictionaries/tr/email";
import { labels as azLabels } from "@/i18n/dictionaries/az/labels";
import { notifications as azNotifications } from "@/i18n/dictionaries/az/notifications";
import { email as azEmail } from "@/i18n/dictionaries/az/email";
import { labels as ruLabels } from "@/i18n/dictionaries/ru/labels";
import { notifications as ruNotifications } from "@/i18n/dictionaries/ru/notifications";
import { email as ruEmail } from "@/i18n/dictionaries/ru/email";

export interface EventMessageDictionaries {
  labels: LabelsDictionary;
  notifications: NotificationsDictionary;
  email: EmailDictionary;
}

export const eventMessageDictionaries: Record<
  RouteLocale,
  EventMessageDictionaries
> = {
  en: { labels: enLabels, notifications: enNotifications, email: enEmail },
  tr: { labels: trLabels, notifications: trNotifications, email: trEmail },
  az: { labels: azLabels, notifications: azNotifications, email: azEmail },
  ru: { labels: ruLabels, notifications: ruNotifications, email: ruEmail },
};

export function getEventMessages(
  locale: RouteLocale,
): EventMessageDictionaries {
  return eventMessageDictionaries[locale];
}
