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

## Current phase: Job lifecycle and discovery

Phase 2C adds a secure Company-owned Job domain on the completed identity, Candidate, and Recruiter/Company foundations:

- Let a Company OWNER create a Job as a private draft for a Company they own
- Let an OWNER edit a draft or published Job and manage its required skills from the shared Skill catalog
- Enforce an explicit draft, published, closed, and archived lifecycle with server-only transitions
- Gate publishing on fresh readiness: a published Company plus complete Job content and at least one skill
- Set publication and closure timestamps on the server and remove closed or archived Jobs from discovery immediately
- Let public visitors search and filter published Jobs and open published Job detail pages
- Show real Job counts on the Recruiter dashboard and Company workspace with no fabricated activity
- Keep applicants, saved Jobs, matching, and Job analytics as honest deferred states

Only PUBLISHED Jobs from published Companies are public; drafts, closed, archived, and unpublished-Company Jobs are never disclosed. Public identity behavior and Better Auth endpoint allow-lists remain unchanged. Admin receives no implicit Company ownership or Job access. Publication communicates visibility only and must never be described as verification.

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

## Intentionally deferred after Phase 2C

- Email verification and real email delivery
- Password reset and account recovery
- Social authentication
- CV and avatar upload
- Recruiter invitations, email invitations, and membership administration
- Company verification and logo/document upload
- Applications, application status history, and candidate CV access
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
