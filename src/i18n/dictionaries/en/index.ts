import type { AppDictionary } from "@/i18n/dictionary";

import { common } from "./common";
import { navigation } from "./navigation";
import { labels } from "./labels";
import { notifications } from "./notifications";
import { email } from "./email";
import { publicPages } from "./public";
import { metadata } from "./metadata";
import { auth } from "./auth";
import { candidate } from "./candidate";
import { recruiter } from "./recruiter";
import { admin } from "./admin";
import { analytics } from "./analytics";
import { applications } from "./applications";
import { interviews } from "./interviews";
import { validation } from "./validation";
import { errors } from "./errors";

export const dictionary: AppDictionary = {
  common,
  navigation,
  labels,
  notifications,
  email,
  public: publicPages,
  metadata,
  auth,
  candidate,
  recruiter,
  admin,
  analytics,
  applications,
  interviews,
  validation,
  errors,
};
