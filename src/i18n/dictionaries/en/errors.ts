// Safe application errors, translated at the presentation boundary. Internal
// error codes stay language-neutral; no locale reveals authorization detail or
// target existence that another locale hides.

export const errors = {
  generic: "Something went wrong. Please try again.",
  notFound: "The requested record was not found.",
  accessDenied: "You do not have access to this action.",
  validationFailed: "Check the highlighted fields and try again.",
  recordChanged: "This record changed. Refresh and try again.",
  duplicateAction: "This action was already completed.",
  invalidLifecycleAction: "This action is not available in the current state.",
  requestFailed: "The request could not be completed. Please try again.",
  localeUpdateFailed: "The language could not be updated. Please try again.",
};
