# CareerBridge product specification

## Product vision

CareerBridge is a job and internship platform that gives candidates a clearer route to meaningful work and gives hiring teams a more structured way to find, evaluate, and support talent.

The product should feel trustworthy, focused, and useful before any AI capability is introduced. AI will later improve relevance and drafting assistance, but the core experience must remain complete, understandable, and operable without it.

## Problem statement

Candidates often split their career information, opportunity discovery, and application tracking across disconnected tools. Recruiters face inconsistent candidate information, noisy pipelines, and limited visibility into process health. Platform operators need reliable moderation and analytics without resorting to opaque workflows.

CareerBridge brings these activities into one role-aware system with shared domain concepts and explicit status transitions.

## User roles

### Candidate

- Create and maintain a professional profile
- Add education, experience, and skills
- Upload and manage a CV
- Search and filter jobs and internships
- Save opportunities
- Apply for roles
- Track application status and history

### Recruiter

- Create and maintain a company profile
- Create, edit, publish, and close job listings
- Review applicants and candidate profiles
- Access candidate CVs when authorized
- Update application statuses
- View recruitment workflow analytics

### Admin

- Manage users, companies, listings, and reports
- Review platform-level analytics
- Moderate content and respond to trust and safety concerns
- Audit important platform actions

## MVP scope

The initial product MVP is expected to include:

1. Role-based account creation and secure sessions
2. Candidate profile, education, experience, skill, and CV management
3. Company profiles and recruiter membership
4. Job listing lifecycle and public discovery
5. Saved jobs and application submission
6. Candidate and recruiter application tracking
7. Basic admin moderation and operational views
8. Essential product analytics and audit records

## Current phase: identity and access

Phase 1 builds secure identity on the completed Phase 0 foundation:

- Candidate and Recruiter email/password registration
- Database-backed authenticated sessions and sign-out
- Session-aware public navigation on desktop and mobile
- Server-protected Candidate, Recruiter, and Admin workspace previews
- Typed platform roles with a least-privileged Candidate default
- A gated, development-only Admin bootstrap
- Focused registration, redirect, role, and authorization tests

Public visitors may choose only Candidate or Recruiter. Admin is never displayed or accepted in public registration. Browser-supplied roles are validated against a server allow-list and checked again at the authentication persistence boundary.

Email ownership is not verified in Phase 1. The product must not claim that an address has been verified until real email delivery and verification are implemented.

## Phase 1 access matrix

| Actor      | Candidate dashboard       | Recruiter dashboard       | Admin area                |
| ---------- | ------------------------- | ------------------------- | ------------------------- |
| Signed out | Redirect to sign-in       | Redirect to sign-in       | Redirect to sign-in       |
| Candidate  | Allowed                   | Redirect to own dashboard | Redirect to own dashboard |
| Recruiter  | Redirect to own dashboard | Allowed                   | Redirect to own dashboard |
| Admin      | Redirect to Admin         | Redirect to Admin         | Allowed                   |

Hidden navigation is not authorization. Every protected page validates the database-backed session and exact role on the server.

## Intentionally deferred after Phase 1

- Email verification and real email delivery
- Password reset and account recovery
- Social authentication
- Complete Candidate and Recruiter profiles
- Company creation and membership
- Jobs, applications, saved jobs, CV uploads, messaging, and notifications
- Production Admin provisioning, moderation, and audit workflows
- AI, billing, and payments

## Future AI scope

Potential AI-assisted capabilities include:

- Candidate-to-job match scoring with explainable factors
- CV structure and content analysis
- Cover-letter drafting grounded in the candidate and job
- Recruiter-facing summarization and comparison aids

AI product requirements:

- No autonomous hiring or rejection decisions
- Clear disclosure whenever AI is used
- User review before generated content is submitted
- Explainable signals rather than unexplained scores
- Data minimization, retention controls, and auditability
- Evaluation for bias, quality, safety, and failure modes before release

## Product quality requirements

- Keyboard-accessible workflows and visible focus treatment
- Responsive layouts across mobile, tablet, and desktop
- Designed empty, loading, validation, error, and success states
- Clear ownership and authorization for every protected action
- Consistent status language and traceable state transitions
- No fabricated production data in public previews

## Success signals

Quantitative targets will be defined once real workflows and analytics exist. Early success should be assessed through:

- Candidate profile completion and application completion
- Search-to-save and search-to-application conversion
- Recruiter time from publication to first qualified review
- Application status freshness and candidate visibility
- Accessibility, reliability, and performance quality gates
