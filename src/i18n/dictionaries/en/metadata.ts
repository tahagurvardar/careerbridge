// Public page metadata (titles, descriptions, OpenGraph copy). User-generated
// Job titles and Company names are interpolated verbatim into templates.

export const metadata = {
  root: {
    defaultTitle: "CareerBridge — Find work that moves you forward",
    template: "%s | CareerBridge",
    description:
      "CareerBridge connects ambitious candidates with thoughtful teams through a modern job and internship platform.",
    ogTitle: "CareerBridge",
    ogDescription:
      "A clearer path from potential to opportunity for candidates and recruiters.",
  },
  jobs: {
    title: "Jobs",
    description:
      "Search published jobs on CareerBridge by role, company, skill, and location.",
  },
  jobDetail: {
    notFoundTitle: "Job not found",
    descriptionFallback:
      "{jobTitle} at {companyName} — published on CareerBridge.",
  },
  companies: {
    title: "Companies",
    description: "Discover published company profiles on CareerBridge.",
  },
  companyDetail: {
    title: "Company profile",
    description: "View a published Company profile on CareerBridge.",
  },
  login: {
    title: "Sign in",
    description: "Sign in securely to your CareerBridge workspace.",
  },
  register: {
    title: "Create an account",
    description: "Create a CareerBridge Candidate or Recruiter account.",
  },
  notifications: {
    title: "Notifications",
    description: "Your CareerBridge activity and notification center.",
  },
  notificationSettings: {
    title: "Notification settings",
    description: "Manage transactional email delivery preferences.",
  },
};
