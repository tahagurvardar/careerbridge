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

## Current phase: Secure Candidate documents

Phase 3C adds secure private Candidate CV documents on the completed identity, profile, Company, Job, application, and saved-job foundations:

- Let a Candidate upload one current CV as a PDF, replace it, download it, and remove it from their active profile
- Store each upload as an immutable version and move a one-to-one current-CV pointer, so old versions stay valid on the applications they are attached to
- Validate uploads by non-zero size up to 5 MB, `application/pdf` MIME, `.pdf` extension, and a `%PDF-` signature together, with server-generated storage keys and server-computed SHA-256
- Snapshot the Candidate's current CV onto a new application, keep pre-existing applications valid with no CV, and allow a one-time attach to an eligible existing active application
- Serve downloads only through an authenticated, per-request re-authorized route that forces an attachment and never exposes storage internals or a public URL
- Give an OWNER Recruiter download access only to the exact CV attached to an application for a Job at a Company they own, and audit-log successful downloads
- Keep the local filesystem driver to development and test, require S3-compatible private storage in production, and keep malware scanning and AI resume parsing deferred

Candidate documents are private Candidate data. Public Job, Company, and Candidate surfaces expose no document records, filenames, counts, attachment state, storage keys, or access logs. Candidate identity always comes from the session; the browser never supplies a document ID, storage key, `candidateId`, or `resumeDocumentId`. Existing Better Auth endpoint allow-lists and every prior authorization boundary remain unchanged, and Recruiter/Admin accounts receive no implicit Candidate behavior.

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

## Saved Jobs access matrix

| Actor      | Public Job save control | Save eligible Job             | View saved list | Remove saved Job  | See Candidate save data |
| ---------- | ----------------------- | ----------------------------- | --------------- | ----------------- | ----------------------- |
| Signed out | Sign in to save         | Redirect to sign-in           | Redirect        | Redirect          | No                      |
| Candidate  | Yes                     | If Job and Company are public | Own only        | Own relation only | Own only                |
| Recruiter  | No                      | Denied                        | Denied          | Denied            | No                      |
| Admin      | No                      | Denied                        | Denied          | Denied            | No implicit access      |

New saves require a PUBLISHED Job under a published Company and are re-checked against current database state. Unique `(candidateId, jobId)` prevents sequential and concurrent duplicates. Existing rows remain when publication changes; the Candidate list marks them unavailable, removes the public link, and still permits removal. Search spans title, Company name, location, and skill, is bounded to 100 characters, and never weakens Candidate ownership. No public surface displays save counts or saver identity.

## Candidate Document access matrix

| Actor               | Upload / replace / remove own CV | Download own CV     | Download CV attached to an application       | See another Candidate's document |
| ------------------- | -------------------------------- | ------------------- | -------------------------------------------- | -------------------------------- |
| Signed out          | Redirect to sign-in              | Denied (uniform)    | Denied (uniform)                             | No                               |
| Candidate           | Own only                         | Own current + prior | Own applications only                        | Denied by ownership              |
| Recruiter nonmember | Denied                           | No                  | Not found                                    | No                               |
| Recruiter MEMBER    | Denied                           | No                  | Denied                                       | No                               |
| Recruiter OWNER     | Denied                           | No                  | Only the CV attached to an owned-Company Job | No                               |
| Admin               | Denied                           | No                  | No implicit access                           | No implicit access               |

Each upload creates an immutable version and moves a one-to-one current-CV pointer; applying pins that exact version onto the application so replacing or removing the current CV never changes historical attachments. Downloads are re-authorized on every request from the session: a Candidate reaches only their own documents and a Recruiter reaches only the exact document attached to an application for a Job at a Company they OWN. MEMBER, nonmember, cross-Candidate, Admin, and signed-out requests are denied identically, and unknown or unauthorized document IDs return the same not-found without revealing existence. Responses force a download with `application/pdf`, a safe filename, `private, no-store`, and `nosniff`; storage keys, buckets, endpoints, paths, and credentials are never exposed. Successful authorized downloads are audit-logged; denials are not.

## Intentionally deferred after Phase 3C

- Email verification and real email delivery
- Password reset and account recovery
- Social authentication
- Avatar upload and public Candidate document sharing
- Dedicated CV malware scanning and quarantine
- AI resume parsing, OCR, CV scoring, and match analysis
- Recruiter invitations, email invitations, and membership administration
- Company verification and logo/document upload
- Recruiter document uploads, offer documents, and identity/certificate documents
- Recruiter-only candidate notes and bulk application actions
- Candidate matching, job recommendations, and saved-search alerts
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
