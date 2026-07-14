// Dictionary shape contracts. English is the source dictionary: these types
// are derived from the English namespace modules, and every other locale file
// declares its export with the matching type, so a missing or extra key in
// any locale is a compile-time error. Runtime parity tests additionally verify
// key sets and {placeholder} sets across locales.

import type { PluralForms } from "@/i18n/formatter";
import type { common } from "@/i18n/dictionaries/en/common";
import type { navigation } from "@/i18n/dictionaries/en/navigation";
import type { labels } from "@/i18n/dictionaries/en/labels";
import type { notifications } from "@/i18n/dictionaries/en/notifications";
import type { email } from "@/i18n/dictionaries/en/email";
import type { publicPages } from "@/i18n/dictionaries/en/public";
import type { metadata } from "@/i18n/dictionaries/en/metadata";
import type { auth } from "@/i18n/dictionaries/en/auth";
import type { candidate } from "@/i18n/dictionaries/en/candidate";
import type { recruiter } from "@/i18n/dictionaries/en/recruiter";
import type { admin } from "@/i18n/dictionaries/en/admin";
import type { analytics } from "@/i18n/dictionaries/en/analytics";
import type { applications } from "@/i18n/dictionaries/en/applications";
import type { interviews } from "@/i18n/dictionaries/en/interviews";
import type { validation } from "@/i18n/dictionaries/en/validation";
import type { errors } from "@/i18n/dictionaries/en/errors";

/**
 * Widens the English source shape into the per-locale contract: leaf strings
 * stay strings, and plural entries (objects with a required `other` string —
 * the key `other` is reserved for CLDR plural forms across all dictionaries)
 * widen to PluralForms so each locale supplies exactly the CLDR categories its
 * grammar needs (Russian adds `few`/`many`; English/Turkish/Azerbaijani use
 * `one`/`other`).
 */
type Localized<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralForms
    : { [K in keyof T]: Localized<T[K]> };

export type CommonDictionary = Localized<typeof common>;
export type NavigationDictionary = Localized<typeof navigation>;
export type LabelsDictionary = Localized<typeof labels>;
export type NotificationsDictionary = Localized<typeof notifications>;
export type EmailDictionary = Localized<typeof email>;
export type PublicDictionary = Localized<typeof publicPages>;
export type MetadataDictionary = Localized<typeof metadata>;
export type AuthDictionary = Localized<typeof auth>;
export type CandidateDictionary = Localized<typeof candidate>;
export type RecruiterDictionary = Localized<typeof recruiter>;
export type AdminDictionary = Localized<typeof admin>;
export type AnalyticsDictionary = Localized<typeof analytics>;
export type ApplicationsDictionary = Localized<typeof applications>;
export type InterviewsDictionary = Localized<typeof interviews>;
export type ValidationDictionary = Localized<typeof validation>;
export type ErrorsDictionary = Localized<typeof errors>;

export interface AppDictionary {
  common: CommonDictionary;
  navigation: NavigationDictionary;
  labels: LabelsDictionary;
  notifications: NotificationsDictionary;
  email: EmailDictionary;
  public: PublicDictionary;
  metadata: MetadataDictionary;
  auth: AuthDictionary;
  candidate: CandidateDictionary;
  recruiter: RecruiterDictionary;
  admin: AdminDictionary;
  analytics: AnalyticsDictionary;
  applications: ApplicationsDictionary;
  interviews: InterviewsDictionary;
  validation: ValidationDictionary;
  errors: ErrorsDictionary;
}

export type DictionaryNamespace = keyof AppDictionary;
