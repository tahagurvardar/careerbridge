// User-facing validation feedback. Schema factories consume this namespace so
// the same business rules reject identical input in every locale — only the
// message text varies. Generic patterned messages take {field}/{max}/{min}
// placeholders; field-specific messages exist where the English original was
// field-specific.

export const validation = {
  generic: {
    required: "This field is required.",
    tooLong: "Must be {max} characters or fewer.",
    fieldTooLong: "{field} must be {max} characters or fewer.",
    invalidValue: "Choose a valid value.",
  },
  auth: {
    chooseAccountType: "Choose a Candidate or Recruiter account.",
    fullNameRequired: "Enter your full name.",
    fullNameTooLong: "Full name must be 80 characters or fewer.",
    invalidEmail: "Enter a valid email address.",
    emailTooLong: "Email address is too long.",
    passwordMinLength: "Password must be at least 12 characters.",
    passwordMaxLength: "Password must be 128 characters or fewer.",
    passwordRequired: "Enter your password.",
    passwordsMustMatch: "Passwords must match.",
    acceptTerms: "Accept the Terms of Service and Privacy Policy to continue.",
  },
  profile: {
    fieldTooLong: "{field} must be {max} characters or fewer.",
    urlTooLong: "URL must be {max} characters or fewer.",
    urlScheme: "Use an http or https URL.",
    invalidUrl: "Enter a valid URL.",
    enterYear: "Enter a year.",
    wholeYear: "Enter a whole year.",
    yearMin: "Year must be {min} or later.",
    yearMax: "Year must be {max} or earlier.",
    required: "{field} is required.",
    currentProgramEnd: "A current program cannot have an end year.",
    endYearOrder: "End year cannot be earlier than start year.",
    validDate: "Enter a valid date.",
    chooseEmployment: "Choose an employment type.",
    currentRoleEnd: "A current role cannot have an end date.",
    endDateOrder: "End date cannot be earlier than start date.",
    skillMin: "Skill must be at least {min} characters.",
    skillMax: "Skill must be {max} characters or fewer.",
    skillCharacters:
      "Use letters, numbers, spaces, or common skill punctuation.",
  },
  jobs: {
    fieldTooLong: "{field} must be {max} characters or fewer.",
    titleMin: "Job title must be at least {min} characters.",
    titleMax: "Job title must be {max} characters or fewer.",
    wholeNonNegative: "Enter a whole, non-negative amount.",
    wholeAmount: "Enter a whole amount.",
    salaryNonNegative: "Salary cannot be negative.",
    salaryBetween: "Salary must be between {min} and {max}.",
    currencyCode: "Use a 3-letter ISO currency code, e.g. USD.",
    validDate: "Enter a valid date.",
    salaryOrder: "Maximum salary cannot be lower than the minimum.",
    currencyRequired: "Add a currency for the salary range.",
    chooseCompany: "Choose a company you own.",
  },
  company: {
    fieldTooLong: "{field} must be {max} characters or fewer.",
    urlTooLong: "URL must be {max} characters or fewer.",
    urlScheme: "Use an http or https URL.",
    invalidUrl: "Enter a valid URL.",
    nameRequired: "Company name is required.",
    chooseSize: "Choose a company size.",
    fourDigitYear: "Enter a four-digit year.",
    wholeYear: "Enter a whole year.",
    foundedBetween: "Founded year must be between {min} and {max}.",
  },
  team: {
    invalidEmail: "Enter a valid email address.",
    emailTooLong: "Email address is too long.",
  },
  locale: {
    unsupported: "Choose a supported language.",
  },
};
