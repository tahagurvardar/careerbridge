// English is the source dictionary: every other locale must provide exactly
// these keys with matching {placeholder} names. Values are plain text —
// never HTML, Markdown, or executable content.

export const common = {
  appName: "CareerBridge",
  skipToContent: "Skip to content",
  copyright: "© {year} CareerBridge. All rights reserved.",
  footerTagline: "Building better routes to meaningful work.",
  actions: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    close: "Close",
    view: "View",
    search: "Search",
    clear: "Clear",
    clearFilters: "Clear filters",
    submit: "Submit",
    confirm: "Confirm",
    tryAgain: "Try again",
    signIn: "Sign in",
    signOut: "Sign out",
    createAccount: "Create account",
    dashboard: "Dashboard",
    loading: "Loading…",
  },
  states: {
    notProvided: "Not provided",
    none: "None",
    unknown: "Unknown",
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: "Page {current} of {total}",
  },
  theme: {
    system: "System",
    light: "Light",
    dark: "Dark",
    switchLabel: "Current theme: {current}. Switch to {next} theme.",
    loading: "Theme preference is loading.",
  },
  notFound: {
    code: "404",
    title: "This path does not connect yet.",
    description:
      "The page may have moved, or it may be part of a future CareerBridge phase.",
    backHome: "Back to CareerBridge",
  },
};
