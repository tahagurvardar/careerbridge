// Transactional email copy (rendered server-side in the recipient's locale at
// enqueue time and stored immutably on the outbox row) plus the email
// preference UI. Bodies stay plain: user-generated values are interpolated as
// text and HTML-escaped by the template layer; no meeting URLs, locations,
// notes, CV metadata, or candidate emails ever appear here.

export const email = {
  events: {
    companyInvitation: {
      subject: "You have been invited to join {companyName}",
      message: "You were invited to join {companyName} on CareerBridge.",
      cta: "View invitation",
    },
    applicationSubmitted: {
      subject: "New application for {jobTitle}",
      message: "{candidate} applied for {jobTitle}.",
      cta: "Review application",
    },
    applicationStatusChanged: {
      subject: "Your application status was updated",
      message: "Your application for {jobTitle} is now {status}.",
      cta: "View application",
    },
    applicationWithdrawn: {
      subject: "Application withdrawn for {jobTitle}",
      message: "{candidate} withdrew their application for {jobTitle}.",
      cta: "View application",
    },
    interviewScheduled: {
      subject: "Interview scheduled for {jobTitle}",
      message:
        "An interview was scheduled for your application to {jobTitle}. Sign in to review the schedule and respond.",
      cta: "View interview",
    },
    interviewRescheduled: {
      subject: "Interview rescheduled for {jobTitle}",
      message:
        "Your interview for {jobTitle} was rescheduled. Sign in to review the new time and respond.",
      cta: "View interview",
    },
    interviewCanceled: {
      subject: "Interview canceled for {jobTitle}",
      message: "Your interview for {jobTitle} was canceled.",
      cta: "View interview",
    },
    interviewResponseReceived: {
      subject: "Interview response received for {jobTitle}",
      messageAccepted: "{candidate} accepted the interview for {jobTitle}.",
      messageDeclined: "{candidate} declined the interview for {jobTitle}.",
      cta: "View interview",
    },
  },
  eventLabels: {
    COMPANY_INVITATION_RECEIVED: "Company invitations",
    APPLICATION_SUBMITTED: "New applications",
    APPLICATION_STATUS_CHANGED: "Application status updates",
    APPLICATION_WITHDRAWN: "Application withdrawals",
    INTERVIEW_SCHEDULED: "Interview scheduled",
    INTERVIEW_RESCHEDULED: "Interview rescheduled",
    INTERVIEW_CANCELED: "Interview canceled",
    INTERVIEW_RESPONSE_RECEIVED: "Interview responses",
  },
  eventDescriptions: {
    COMPANY_INVITATION_RECEIVED:
      "Email me when I am invited to join a company.",
    APPLICATION_SUBMITTED:
      "Email me when a candidate applies to a company I own.",
    APPLICATION_STATUS_CHANGED:
      "Email me when a recruiter updates one of my applications.",
    APPLICATION_WITHDRAWN:
      "Email me when a candidate withdraws from a company I own.",
    INTERVIEW_SCHEDULED:
      "Email me when an interview is scheduled for one of my applications.",
    INTERVIEW_RESCHEDULED: "Email me when one of my interviews is rescheduled.",
    INTERVIEW_CANCELED: "Email me when one of my interviews is canceled.",
    INTERVIEW_RESPONSE_RECEIVED:
      "Email me when a candidate accepts or declines an interview.",
  },
  settings: {
    badge: "Settings",
    title: "Notification settings",
    description:
      "Choose which transactional updates CareerBridge may place in the email delivery queue. Delivery is asynchronous and may be delayed.",
    cardTitle: "Transactional email",
    cardDescription:
      "Preferences apply when a new event occurs. Turning an event back on does not send previously suppressed email.",
    fieldsetLegend: "Transactional email preferences",
    save: "Save email settings",
    inAppTitle: "In-app notifications remain enabled.",
    inAppDescription:
      "These settings control email delivery only. Related pages always check your access again when opened.",
    openNotifications: "Open notifications",
  },
  actions: {
    notAvailable: "Email settings are not available.",
    invalid: "Those email settings could not be saved.",
    saved: "Email settings saved.",
    saveFailed: "We could not save your email settings. Please try again.",
  },
};
