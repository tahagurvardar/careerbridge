// Notification event copy (rendered server-side in the recipient's locale at
// event time and stored immutably) plus Activity Center UI strings. Values in
// {braces} are interpolated as plain text — user-generated Job titles and
// names are never translated or rendered as HTML.

export const notifications = {
  events: {
    applicationSubmitted: {
      title: "New application received",
      message: "{candidate} applied for {jobTitle}.",
    },
    applicationStatusChanged: {
      title: "Application status updated",
      message: "Your application for {jobTitle} is now {status}.",
    },
    applicationWithdrawn: {
      title: "Application withdrawn",
      message: "{candidate} withdrew their application for {jobTitle}.",
    },
    companyInvitationReceived: {
      title: "Company invitation",
      message: "You were invited to join {companyName}.",
    },
    interviewScheduled: {
      title: "Interview scheduled",
      message: "An interview was scheduled for your application to {jobTitle}.",
    },
    interviewRescheduled: {
      title: "Interview rescheduled",
      message: "Your interview for {jobTitle} was rescheduled.",
    },
    interviewCanceled: {
      title: "Interview canceled",
      message: "Your interview for {jobTitle} was canceled.",
    },
    interviewResponseReceived: {
      title: "Interview response received",
      messageAccepted: "{candidate} accepted the interview for {jobTitle}.",
      messageDeclined: "{candidate} declined the interview for {jobTitle}.",
    },
  },
  bell: {
    label: "Notifications",
    unreadLabel: "Notifications, {count} unread",
  },
  center: {
    badge: "Activity",
    title: "Notifications",
    description:
      "Updates about your applications, delivered in the app. Opening a notification takes you to the related page, which always checks your access.",
    total: "Total",
    unread: "Unread",
    read: "Read",
    filterAria: "Filter notifications",
    emailSettings: "Email settings",
    clearFilter: "Clear filter",
    count: { one: "{count} notification", other: "{count} notifications" },
    pagesAria: "Notification pages",
    emptyTitle: "No notifications yet",
    emptyFilteredTitle: "No matching notifications",
    emptyDescription:
      "When there is activity on your applications, it will show up here.",
    emptyFilteredDescription:
      "Try a different filter to see more of your notifications.",
    viewAll: "View all notifications",
    newBadge: "New",
    readSr: "Read",
    view: "View",
    markRead: "Mark read",
    markAllRead: "Mark all as read",
  },
  actions: {
    invalidNotification: "That notification is not available.",
    markedRead: "Notification marked as read.",
    markedAllRead: "All notifications marked as read.",
    updateFailed: "We could not update that notification. Please try again.",
    updateAllFailed:
      "We could not update your notifications. Please try again.",
  },
};
