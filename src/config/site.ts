export const siteConfig = {
  name: "CareerBridge",
  description:
    "A clearer path from professional potential to meaningful opportunity.",
  navigation: [
    { label: "Home", href: "/" },
    { label: "Find jobs", href: "/jobs" },
    { label: "Companies", href: "/companies" },
  ],
  footerNavigation: {
    platform: [
      { label: "Browse jobs", href: "/jobs" },
      { label: "Explore companies", href: "/companies" },
      { label: "Create an account", href: "/register" },
    ],
    access: [
      { label: "Candidate access", href: "/login" },
      { label: "Recruiter access", href: "/login" },
      { label: "Join CareerBridge", href: "/register" },
    ],
  },
} as const;
