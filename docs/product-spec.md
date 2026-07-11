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

## Current phase: Job applications and applicant pipeline

Phase 3A adds a secure Job Application domain on the completed identity, Candidate, Recruiter/Company, and Job foundations:

- Let an eligible Candidate apply once to a published Job with an optional cover letter
- Re-check eligibility against fresh data: candidate role, published Job and Company, open deadline, complete minimum profile, and no prior application
- Let a Candidate view all their applications, one application in detail, current status, candidate-safe status history, and withdraw an eligible active application
- Let a Company OWNER view, search, and filter applications for owned Company Jobs, open an application, and see the applicant's relevant profile
- Let an OWNER move applications through a controlled SUBMITTED → UNDER_REVIEW → INTERVIEW → OFFER → HIRED pipeline, with rejection from any active state
- Record every status change — including the initial submission and withdrawal — as atomic status history
- Show real application counts on the Candidate dashboard, Recruiter dashboard, Job workspace, and Company workspace with no fabricated activity
- Keep CV upload/access, recruiter-only notes, saved jobs, notifications, and messaging as honest deferred states

Private application data is never exposed publicly. A recruiter sees a candidate's private profile only because the candidate applied to their job and only as an OWNER. Candidate identity is always derived from the session; status values are never trusted from browser input. Public identity behavior and Better Auth endpoint allow-lists remain unchanged. Admin receives no implicit Company ownership or application access.

Email ownership is not verified in Phase 1. The product must not claim that an address has been verified until real email delivery and verification are implemented.

## Candidate profile access matrix

| Actor      | View/edit profile         | Mutate owned child record | Mutate another Candidate |
| ---------- | ------------------------- | ------------------------- | ------------------------ |
| Signed out | Redirect to sign-in       | Redirect to sign-in       | Denied                   |
| Candidate  | Allowed                   | Allowed                   | Denied by ownership      |
| Recruiter  | Redirect to own dashboard | Denied                    | Denied                   |
| Admin      | Redirect to Admin         | Denied by current policy  | Denied by current policy |

Hidden navigation is not authorization. Every protected page validates the database-backed session and exact role on the server.

## Recruiter and Company access matrix

| Actor               | Recruiter profile  | Private Company workspace | Edit/publish Company | Public published profile |
| ------------------- | ------------------ | ------------------------- | -------------------- | ------------------------ |
| Signed out          | Redirect           | Redirect                  | Redirect             | Allowed                  |
| Candidate           | Denied             | Denied                    | Denied               | Allowed                  |
| Recruiter nonmember | Allowed for self   | Not found                 | Not found            | Allowed                  |
| Recruiter MEMBER    | Allowed for self   | Allowed                   | Denied               | Allowed                  |
| Recruiter OWNER     | Allowed for self   | Allowed                   | Allowed              | Allowed                  |
| Admin               | No implicit access | No implicit access        | No implicit access   | Allowed                  |

Companies are private until an OWNER explicitly publishes them. Publication requires name, description, industry, headquarters, and a safe website URL. Public search accepts bounded name, industry, and headquarters query parameters and returns only published rows. Public detail exposes Company profile fields only—never owner email, Recruiter profile, or membership data.

## Job access matrix

| Actor               | View own Company Jobs | Create/edit Job    | Publish/close/archive | Public published Job |
| ------------------- | --------------------- | ------------------ | --------------------- | -------------------- |
| Signed out          | Redirect              | Redirect           | Redirect              | Allowed              |
| Candidate           | Denied                | Denied             | Denied                | Allowed              |
| Recruiter nonmember | Not found             | Not found          | Not found             | Allowed              |
| Recruiter MEMBER    | Not found             | Denied             | Denied                | Allowed              |
| Recruiter OWNER     | Allowed               | Allowed            | Allowed               | Allowed              |
| Admin               | No implicit access    | No implicit access | No implicit access    | Allowed              |

Jobs are private drafts until an OWNER publishes a complete Job under a published Company. Lifecycle transitions are server-controlled: no status value is accepted from form input, and archived Jobs are read-only in this phase. Public search accepts a bounded keyword plus employment-type, workplace-type, and experience-level filters and returns only PUBLISHED Jobs from published Companies. Public detail exposes Job and Company presentational fields only—never internal identifiers, private timestamps, or membership data. Closing or archiving a Job removes it from public discovery immediately.

## Application access matrix

| Actor               | Apply to Job      | View own applications | View owned-Company applicants | Change application status |
| ------------------- | ----------------- | --------------------- | ----------------------------- | ------------------------- |
| Signed out          | Sign in to apply  | Redirect              | Redirect                      | Redirect                  |
| Candidate           | If eligible, once | Own only              | Denied                        | Withdraw own active only  |
| Recruiter nonmember | Cannot apply      | None                  | Not found                     | Not found                 |
| Recruiter MEMBER    | Cannot apply      | None                  | Denied                        | Denied                    |
| Recruiter OWNER     | Cannot apply      | None                  | Allowed (owned Company Jobs)  | Allowed pipeline moves    |
| Admin               | Cannot apply      | None                  | No implicit access            | No implicit access        |

A Candidate applies at most once per Job (enforced by a database unique constraint) and only when eligible: authenticated candidate, published Job under a published Company, open deadline, and a minimum profile (headline, location, at least one skill). Candidates may withdraw only from active states and may never set recruiter statuses; recruiters advance applications through the controlled pipeline and may never set WITHDRAWN. Recruiter access to an applicant's private profile exists only because the Candidate applied to a Job at a Company the Recruiter OWNs; it never appears on public pages or in unrelated Company workspaces. Foreign, MEMBER-only, and cross-Company identifiers return the same not-found result and never reveal application existence.

## Intentionally deferred after Phase 3A

- Email verification and real email delivery
- Password reset and account recovery
- Social authentication
- CV and avatar upload, and authorized recruiter CV access
- Recruiter invitations, email invitations, and membership administration
- Company verification and logo/document upload
- Recruiter-only candidate notes and bulk application actions
- Saved jobs, candidate matching, and job recommendations
- Candidate search, messaging, and notifications
- Public Candidate profile sharing and social feeds
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
