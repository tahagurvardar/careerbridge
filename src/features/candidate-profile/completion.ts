export type ProfileCompletionSignals = {
  headline: boolean;
  location: boolean;
  bio: boolean;
  skills: boolean;
  education: boolean;
  experience: boolean;
  professionalLink: boolean;
};

export type ProfileRecommendation = {
  key: keyof ProfileCompletionSignals;
  label: string;
  href: string;
};

// The six core sections carry 15 points each. A professional link carries the
// remaining 10 points, for a deterministic total of 100.
const COMPLETION_SECTIONS: ReadonlyArray<
  ProfileRecommendation & { weight: number }
> = [
  {
    key: "headline",
    label: "Add a professional headline",
    href: "/candidate/profile/edit",
    weight: 15,
  },
  {
    key: "location",
    label: "Add your location",
    href: "/candidate/profile/edit",
    weight: 15,
  },
  {
    key: "bio",
    label: "Write a short professional bio",
    href: "/candidate/profile/edit",
    weight: 15,
  },
  {
    key: "skills",
    label: "Add at least one skill",
    href: "/candidate/profile#skills",
    weight: 15,
  },
  {
    key: "education",
    label: "Add an education record",
    href: "/candidate/profile/education/new",
    weight: 15,
  },
  {
    key: "experience",
    label: "Add work experience",
    href: "/candidate/profile/experience/new",
    weight: 15,
  },
  {
    key: "professionalLink",
    label: "Add a professional link",
    href: "/candidate/profile/edit",
    weight: 10,
  },
];

export function calculateProfileCompletion(signals: ProfileCompletionSignals) {
  const percentage = COMPLETION_SECTIONS.reduce(
    (total, section) => total + (signals[section.key] ? section.weight : 0),
    0,
  );
  const incomplete = COMPLETION_SECTIONS.filter(
    (section) => !signals[section.key],
  ).map(({ key, label, href }) => ({ key, label, href }));

  return { percentage, incomplete };
}

export function getCompletionFromProfile(
  profile: {
    headline: string | null;
    location: string | null;
    bio: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    education: readonly unknown[];
    experience: readonly unknown[];
    skills: readonly unknown[];
  } | null,
) {
  return calculateProfileCompletion({
    headline: Boolean(profile?.headline),
    location: Boolean(profile?.location),
    bio: Boolean(profile?.bio),
    professionalLink: Boolean(
      profile?.websiteUrl || profile?.linkedinUrl || profile?.githubUrl,
    ),
    education: Boolean(profile?.education.length),
    experience: Boolean(profile?.experience.length),
    skills: Boolean(profile?.skills.length),
  });
}
