# CareerBridge

CareerBridge is a production-oriented job and internship platform designed to connect ambitious candidates with thoughtful employers. The long-term product combines structured hiring workflows with responsible AI assistance while keeping transparency, accessibility, and human decision-making at the center.

> **Project status:** Phase 4C Transactional Email Delivery is implemented on **feat/transactional-email-delivery**, on top of the merged Phase 4B Company Team Membership. Company OWNERs invite existing Recruiter accounts, administer roles with a database-enforced last-owner invariant, and review audit history; application and invitation events now also queue private, preference-aware transactional email delivered by an authenticated dispatcher. SMS, push, and real-time delivery remain deferred.

## Foundation preview

The current application provides:

- A responsive, theme-aware CareerBridge marketing experience
- Presentable public routes for database-backed Jobs and Companies, sign-in, and registration
- Database-backed public Job discovery with URL-backed search and filters
- A scalable App Router structure with shared layout and feature boundaries
- A PostgreSQL-ready Prisma 7 setup with a lazy, build-safe client helper
- Better Auth email/password identity with database-backed sessions
- Public Candidate and Recruiter registration with server-side role allow-listing
- Server-protected Candidate, Recruiter, and Admin route boundaries
- Session-aware desktop and mobile navigation with secure sign-out
- Candidate-owned professional profiles with education, experience, and skills
- Deterministic profile-completion guidance on the profile and dashboard
- Recruiter profiles and private multi-Company membership workspaces
- Atomic Company ownership, completeness-gated publishing, and public discovery
- Company-owned Jobs with an explicit draft, published, closed, and archived lifecycle
- OWNER-authorized Job creation, editing, required skills, and publication readiness checks
- Candidate job applications with eligibility checks, optional cover letters, and duplicate prevention
- Candidate application tracking, candidate-safe status history, and eligible withdrawal
- Recruiter applicant pipeline with OWNER-only status transitions and atomic status history
- Candidate-owned Saved Jobs with duplicate-safe save/remove actions and retained unavailable history
- Searchable, availability-filtered Saved Jobs plus real dashboard counts and recent saves
- Recruiter-only internal application notes with an immutable, author-scoped revision history
- Transactional in-app notifications for application submission, status change, and withdrawal
- A private per-recipient Activity Center with filters, pagination, mark-as-read, and an unread header badge
- Company team invitations for existing Recruiter accounts with an explicit, expiring lifecycle
- OWNER-only team administration: promote, demote, remove, ownership transfer, leave, and audit history
- Role-relevant transactional email preferences and an atomic, provider-isolated email outbox
- A bearer-protected email dispatcher with skip-locked claiming, bounded retries, and dead letters
- Product, architecture, and delivery documentation

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- shadcn/ui with Radix UI primitives
- PostgreSQL and Prisma ORM
- Better Auth with the official Prisma adapter
- Zod
- React Hook Form
- Lucide icons
- npm

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- A Neon PostgreSQL development database

### Installation

```bash
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Configure the required values without committing them:

- `DATABASE_URL`: pooled Neon application connection
- `DIRECT_URL`: direct Neon Prisma CLI/migration connection
- `BETTER_AUTH_SECRET`: high-entropy secret of at least 32 characters
- `BETTER_AUTH_URL`: application origin, normally `http://localhost:3000` locally
- `DOCUMENT_STORAGE_DRIVER`: `local` for development/test (default) or `s3` for production-oriented private storage
- `DOCUMENT_STORAGE_LOCAL_ROOT`: local object directory for the `local` driver (defaults to the git-ignored `.careerbridge-private-storage`)
- `DOCUMENT_STORAGE_S3_*`: private bucket endpoint, region, bucket, credentials, and path-style flag (required only when the driver is `s3`; the bucket must be private and is never given public URLs)
- `EMAIL_*`: transactional email driver, sender identity, HTTPS app base URL, dispatcher bearer secret, and batch/retry bounds (the non-network `log` driver is the development/test default; production requires `resend` and rejects `log`)

Generate the client, apply migrations, and start the development server:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Development Admin bootstrap

Admin accounts are never a public registration choice. To create one intentionally in development, configure the placeholder `ADMIN_BOOTSTRAP_*` variables described in `.env.example`, including a dedicated `ADMIN_BOOTSTRAP_DATABASE_URL`, set `ADMIN_BOOTSTRAP_ENABLED=true`, then run:

```bash
npm run admin:bootstrap
```

The command refuses production execution, validates all inputs, writes only through the dedicated bootstrap database connection, never prints credentials, is idempotent for an existing Admin, and refuses to elevate an existing public account.

## Commands

| Command                    | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| npm run dev                | Start the local Next.js development server   |
| npm run build              | Create a production build                    |
| npm run start              | Serve the production build                   |
| npm run lint               | Run ESLint                                   |
| npm run typecheck          | Run TypeScript without emitting files        |
| npm run format             | Format the repository with Prettier          |
| npm run format:check       | Verify formatting                            |
| npm test                   | Run database-free unit tests                 |
| npm run test:integration   | Run explicitly enabled database tests        |
| npm run admin:bootstrap    | Intentionally create a development Admin     |
| npm run prisma:generate    | Generate the Prisma client                   |
| npm run prisma:migrate:dev | Create/apply a development migration         |
| npm run prisma:validate    | Validate the Prisma configuration and schema |
| npm run prisma:studio      | Open Prisma Studio after database setup      |

## Public routes

| Route                                   | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| /                                       | Product landing page with featured Jobs        |
| /jobs                                   | Published Job discovery, search, and filters   |
| /jobs/[slug]                            | Published Job public detail with apply state   |
| /jobs/[slug]/apply                      | Candidate-only application form                |
| /companies                              | Published Company discovery and search         |
| /companies/[slug]                       | Published Company public profile               |
| /login                                  | Email/password sign-in                         |
| /register                               | Candidate and Recruiter account registration   |
| /candidate/dashboard                    | Protected Candidate workspace and summary      |
| /candidate/applications                 | Candidate's own applications and filters       |
| /candidate/applications/[applicationId] | Candidate application detail and withdrawal    |
| /candidate/interviews                   | Candidate's own interview agenda and filters   |
| /candidate/interviews/[interviewId]     | Candidate interview detail and accept/decline  |
| /candidate/saved-jobs                   | Candidate's private saved Job list and filters |
| /candidate/profile                      | Protected Candidate profile overview           |
| /candidate/profile/edit                 | Edit Candidate professional information        |
| /candidate/profile/education/new        | Add an education record                        |
| /candidate/profile/education/[id]/edit  | Edit owned education                           |
| /candidate/profile/experience/new       | Add an experience record                       |
| /candidate/profile/experience/[id]/edit | Edit owned experience                          |
| /recruiter/dashboard                    | Protected Recruiter workspace summary          |
| /recruiter/profile                      | Protected Recruiter profile overview           |
| /recruiter/profile/edit                 | Edit Recruiter professional information        |
| /recruiter/companies                    | Recruiter's Company memberships                |
| /recruiter/companies/new                | Create a private Company as OWNER              |
| /recruiter/companies/[companyId]        | Private member Company workspace               |
| /recruiter/companies/[companyId]/edit   | OWNER-only Company editing                     |
| /recruiter/companies/[companyId]/team   | OWNER-only team administration and audit       |
| /recruiter/invitations                  | Recruiter's own incoming Company invitations   |
| /recruiter/jobs                         | Owned Jobs with status/company/title filters   |
| /recruiter/jobs/new                     | Create a draft Job for an owned Company        |
| /recruiter/jobs/[jobId]                 | Private Job workspace and lifecycle actions    |
| /recruiter/jobs/[jobId]/edit            | OWNER-only Job editing                         |
| /recruiter/jobs/[jobId]/applications    | OWNER-only applicant pipeline for one Job      |
| /recruiter/applications                 | Applications across owned Companies            |
| /recruiter/applications/[applicationId] | OWNER-only candidate review and status         |
| /recruiter/interviews                   | OWNER-only interview agenda across Companies   |
| /recruiter/interviews/[interviewId]     | OWNER-only interview management and history    |
| /notifications                          | Candidate/Recruiter private Activity Center    |
| /settings/notifications                 | Candidate/Recruiter email delivery settings    |
| /admin                                  | Protected Admin access confirmation            |

## Project structure

```text
src/
├── app/                    # Routes, metadata, and global styles
├── components/
│   ├── layout/             # Shared site navigation and footer
│   ├── shared/             # Reusable cross-feature components
│   └── ui/                 # Owned shadcn/ui primitives
├── config/                 # Stable site navigation and configuration
├── features/               # Domain-oriented UI modules
├── lib/                    # Shared utilities and infrastructure clients
└── types/                  # Shared TypeScript contracts
```

No empty placeholder directories are committed; new boundaries should be added when a real implementation needs them.

Identity code is grouped under `src/features/auth`: shared schemas and role rules are usable by forms and tests, while session and action modules are explicitly server-only. The Better Auth server and Prisma client live in `src/lib` and initialize lazily at request time.

Candidate profile code is grouped under `src/features/candidate-profile`. Shared Zod schemas and the completion calculator remain database-free; interactive React Hook Form components are isolated client boundaries; queries, ownership-scoped commands, and Server Actions remain server-only. Migration `20260710172118_candidate_profile_foundation` adds the profile aggregate without changing identity behavior.

Recruiter and Company code is grouped under `src/features/recruiter-company`. Database-free schemas, slug allocation, publication readiness, and ownership helpers are separated from server-only queries, commands, and Server Actions. Migration `20260710191654_recruiter_company_workspace` adds the Recruiter profile, Company, and explicit membership domain without changing Better Auth identity tables or public endpoint allow-lists.

Job code is grouped under `src/features/jobs`. Database-free schemas, slug allocation, lifecycle transitions, publication readiness, and public search mapping are separated from server-only queries, OWNER-scoped commands, and Server Actions. Jobs reuse the shared `Skill` catalog through an explicit `JobSkill` relation rather than a second catalog. Migration `20260710224143_job_lifecycle_discovery` adds the `Job` and `JobSkill` tables and the `JobStatus`, `WorkplaceType`, and `ExperienceLevel` enums without changing identity, Candidate, or Company tables.

Application code is grouped under `src/features/applications`. Database-free lifecycle transitions, eligibility rules, cover-letter and search schemas, and search-filter mapping are separated from server-only queries, candidate- and OWNER-scoped commands, and Server Actions. Candidate identity always comes from the session, status changes flow through the centralized transition table, and every status change writes an `ApplicationStatusHistory` row atomically. Migration `20260711001124_job_applications_pipeline` adds the `JobApplication` and `ApplicationStatusHistory` tables and the `ApplicationStatus` enum, with a database-level unique `(jobId, candidateId)` constraint, without changing existing tables.

Saved Job code is grouped under `src/features/saved-jobs`. Shared Zod search/filter schemas, availability classification, save eligibility, and dashboard recommendation logic remain database-free; Candidate-scoped reads, commands, and Server Actions remain server-only. Migration `20260711023016_saved_jobs` adds the `SavedJob` join with unique `(candidateId, jobId)`, candidate/recent-order and Job indexes, and cascade relations without duplicating Job, Company, or Candidate data.

Candidate document code is grouped under `src/features/candidate-documents`, with a provider-agnostic private storage abstraction in `src/lib/storage`. Database-free PDF validation, filename sanitization, Content-Disposition safety, download-authorization helpers, and retention classification are separated from server-only reads, commands, and Server Actions. Uploads write an immutable `CandidateDocument` version and move a one-to-one `CandidateResume` pointer; a new application snapshots the current pointer into `JobApplication.resumeDocumentId`. A Node-runtime route at `/api/documents/[documentId]/download` re-authorizes every request and streams private bytes as a forced download. Migration `20260711222126_secure_candidate_documents` adds the `CandidateDocument`, `CandidateResume`, and `CandidateDocumentAccessLog` tables, the `CandidateDocumentKind` and `CandidateDocumentAccessType` enums, and the nullable `JobApplication.resumeDocumentId` snapshot column.

Recruiter application note code is grouped under `src/features/application-notes`. Database-free note-body validation, ownership/visibility helpers, deleted-note classification, optimistic-concurrency, and revision-action labels are separated from server-only OWNER-scoped reads, transactional commands, and Server Actions. Each note keeps an immutable `ApplicationNoteRevision` audit trail, and the protected `/recruiter/applications/[applicationId]/notes/[noteId]/history` route renders it. Migration `20260712011236_recruiter_application_notes` adds the `ApplicationNote` and `ApplicationNoteRevision` tables, the `ApplicationNoteRevisionAction` enum, and a unique `(noteId, version)` constraint without changing existing application or document tables.

Notification code is grouped under `src/features/notifications`. Database-free notification copy, deterministic dedupe keys, recipient de-duplication, safe-destination generation, type labels/icon keys, unread-badge formatting, and Notification Center role rules are separated from server-only recipient-scoped reads, mark-as-read commands, transactional emit helpers, and Server Actions. Notifications are created inside the existing application submission, status-transition, and withdrawal transactions — never in a separate write after commit — so a notification is always atomic with its `JobApplication` and `ApplicationStatusHistory`. Recipients are resolved from fresh database state (Company OWNER Recruiters, or the owning Candidate), and a unique `dedupeKey` makes retries and concurrent duplicate events idempotent. The protected `/notifications` Activity Center and the header bell serve Candidates and Recruiters only. Migration `20260712211930_notifications_activity_center` adds the `notification` table and the `NotificationType` enum with recipient/read-state/application indexes, without changing existing tables.

Company team code is grouped under `src/features/company-team`. Database-free invitation lifecycle transitions, expiry classification, active-key generation, last-owner and eligibility decisions, and audit labels are separated from server-only OWNER-scoped reads, transactional commands, and Server Actions. Invitation creation, acceptance, decline, revocation, every role change, ownership transfer, and leave each commit atomically with an append-only `CompanyMembershipEvent`; owner-count-reducing changes run under Serializable isolation. The OWNER-only `/recruiter/companies/[companyId]/team` and invitee-scoped `/recruiter/invitations` routes render it. Migration `20260712232412_company_team_membership` adds the `CompanyInvitation` and `CompanyMembershipEvent` tables, their enums, and the `COMPANY_INVITATION_RECEIVED` notification type without changing existing tables.

Transactional email code is grouped under `src/features/email`. Database-free templates, dedupe keys, role/event rules, and preference resolution are separated from server-only outbox emit helpers (called inside the existing application and invitation transactions), the queue dispatcher, the provider abstraction, and preference reads/writes. The bearer-protected Node route `/api/internal/email/dispatch` drains a bounded batch with PostgreSQL `SKIP LOCKED` claiming and lock-token finalization, and `/settings/notifications` renders role-relevant preferences. Migration `20260713010934_transactional_email_delivery` adds the `EmailOutbox`, `EmailDeliveryAttempt`, and `UserEmailPreference` tables and their enums without changing existing tables.

Interview code is grouped under `src/features/interviews`. Database-free lifecycle rules, schedule/timezone validation (UTC instants plus an independently validated IANA zone), overlap detection, optimistic-version helpers, and display formatting are separated from server-only Candidate-/OWNER-scoped reads, transactional commands, and Server Actions. Creation and rescheduling run under Serializable isolation with the repository's bounded retry so overlapping active interviews for a Candidate or organizer cannot double-book; every transition appends an immutable `InterviewEvent` and emits the Candidate/OWNER notification and outbox rows atomically. Interview scheduling and Application status remain separate controlled workflows — scheduling never mutates `ApplicationStatus` or writes `ApplicationStatusHistory`. Migration `20260713130051_interview_scheduling_workflow` adds the `Interview` and `InterviewEvent` tables, the `InterviewFormat`/`InterviewStatus`/`InterviewEventType` enums, and the four interview values on `NotificationType` and `EmailEventType` without changing existing tables.

Database integration tests never use `DATABASE_URL`. To run them, configure a separate `TEST_DATABASE_URL`, confirm it targets an isolated test database, set `RUN_DATABASE_INTEGRATION_TESTS=true`, and run `npm run test:integration`. The command skips clearly unless both values are present and refuses a test URL matching either application database URL. Regular `npm test` remains database-free.

## Identity security boundaries

- Public registration accepts only `CANDIDATE` and `RECRUITER`; `ADMIN` is rejected by both the registration schema and the Better Auth user-creation hook.
- Mounted Better Auth routes use an explicit allow-list for session retrieval, sign-in, and sign-out. Registration remains available only through the validated Server Action, and the unused user-update endpoint is not publicly reachable.
- Better Auth user-update hooks reject every payload containing `role`, so Candidate, Recruiter, and Admin role assignment cannot be changed through auth APIs. The gated bootstrap uses direct Prisma access after validation.
- Password hashing, credential verification, session creation, and cookie signing are owned by Better Auth. Passwords and tokens are never logged.
- Validated credential Server Actions execute through Better Auth's HTTP handler so origin checks and configured per-endpoint rate limits are enforced; only the resulting session cookies are forwarded through Next.js's cookie API.
- Next.js development Server Function invocation logging is disabled because it serializes action arguments by default.
- Authentication failures emit prefixed server diagnostics containing only safe event, category, status, and error-code metadata. Rate limits receive a distinct user-facing retry message without exposing account existence.
- Page authorization re-validates the database-backed session and role on the server. Navigation visibility is presentation only, never the security boundary.
- Callback paths are normalized as same-origin internal paths and must match the signed-in role's dashboard.
- Email verification, password reset, social authentication, and membership invitations are deferred.

## Candidate profile boundaries

- Only an authenticated `CANDIDATE` session can render or mutate Candidate profile routes. Recruiters and Admins follow the existing exact-role redirect policy; Admin access is not implicitly granted.
- Server Actions validate the role again and derive the owning user from the session. Forms never submit a user ID, profile ID, or role.
- Education, experience, and skill removals use ownership-scoped database predicates. A record ID alone is never sufficient to mutate data.
- Skill catalog names use Unicode and whitespace normalization plus a unique lookup name. Candidate assignments use a composite primary key and a transaction with duplicate-safe creation.
- Professional links accept only valid `http` or `https` URLs. Profile text is rendered as text, never user-authored HTML.
- Completion is calculated on read: headline, location, bio, skills, education, and experience are worth 15 points each; at least one professional link is worth 10 points. It is never stored or described as verification.
- Avatar upload, public Candidate profiles, messaging, notifications, AI, and payments remain deferred. Private CV documents are managed under `/candidate/documents` (see Candidate document boundaries).

## Recruiter and Company boundaries

- Only an authenticated `RECRUITER` session can render or mutate Recruiter workspace routes. Candidate and Admin roles receive no implicit Recruiter profile or Company access.
- Recruiter profile identity comes from `User`; the one-to-one `RecruiterProfile` stores only job title, bio, and a safe LinkedIn URL.
- Company creation generates the slug on the server and creates the Company plus `OWNER` membership atomically. Duplicate names receive deterministic `-2`, `-3`, and later suffixes without overwriting an existing Company.
- `CompanyMembership` has unique `(userId, companyId)` membership and explicit `OWNER`/`MEMBER` roles. Every private read checks membership; every edit and publication mutation scopes through an authenticated OWNER relation.
- Companies start unpublished. Publishing requires name, description, industry, headquarters, and a safe `http`/`https` website. Publication is visibility, not verification.
- Public directory and detail queries always include `isPublished = true`. Unknown and unpublished slugs share the same not-found behavior, and public results never include membership or owner identity data.
- Company names do not automatically rewrite an existing slug during editing, preserving stable public URLs.
- Company verification, logo/document uploads, candidate search, messaging, AI, and billing remain deferred. Team invitations and membership administration shipped in Phase 4B (see Company team membership boundaries); in-app notifications shipped in Phase 4A.

## Job domain boundaries

- Only an authenticated `RECRUITER` session can render or mutate Job workspace routes. Every Job mutation additionally requires OWNER membership of the Job's Company; Candidate, Admin, and MEMBER users cannot create, edit, publish, close, or archive Jobs.
- Job identity comes from the server. Slugs are generated from the validated title with deterministic `-2`, `-3` suffixes, and browser input never supplies a trusted `companyId`, status, slug, `publishedAt`, or ownership field.
- Every Job command scopes its database predicate through the authenticated user's OWNER membership, so absent, foreign, and unauthorized Job IDs produce the same unavailable result. Recruiter A cannot view or edit Recruiter B's private drafts.
- The lifecycle is DRAFT → PUBLISHED → CLOSED → ARCHIVED with explicit, centralized transitions. Status, `publishedAt`, and `closedAt` are set only by the server; archived Jobs are read-only in this phase.
- Publishing is an OWNER command that re-checks readiness against fresh database data: the Company must be published and the Job must have a title, summary, description, responsibilities, requirements, location, employment type, workplace type, experience level, and at least one required skill. A deadline in the past blocks publishing.
- Salary is stored as whole non-negative integer currency units with a normalized uppercase 3-letter currency code, and the salary minimum can never exceed the maximum. Deadlines are date-only and compared in UTC.
- Required skills reuse the shared normalized `Skill` catalog through `JobSkill`, whose composite primary key prevents duplicate assignment even under concurrent requests.
- Public directory and detail queries always constrain `status = PUBLISHED` and `Company.isPublished = true`. Draft, closed, archived, and unpublished-Company Jobs return the same not-found behavior, and public results never include internal IDs or membership identity.
- Candidate matching, recommendations, alerts, and Job analytics remain deferred.

## Saved Job boundaries

- `SavedJob` belongs to one Candidate `User` and one `Job`; deleting either parent cascades the relation. The database unique `(candidateId, jobId)` constraint is authoritative for duplicate and concurrent saves.
- Save and remove Server Actions require an authenticated `CANDIDATE` and derive `candidateId` only from the session. Recruiter and Admin accounts receive no Candidate behavior, and removal is scoped by Candidate plus Job so it cannot reveal or delete another Candidate's relation.
- A new save re-checks that the Job is `PUBLISHED` and its Company is published. Duplicate saves and repeated removals are idempotent, and raw Prisma failures are never returned to the browser.
- Existing saves remain after a Job closes, archives, or its Company becomes unpublished. `/candidate/saved-jobs` marks those rows unavailable, removes the public link, keeps remove access, and never republishes private Job data.
- `/jobs` performs one Candidate saved-slug query for the visible result set rather than a query per card. Public Job projections contain no SavedJob relation, Candidate identity, or save count.
- Search is trimmed and bounded to 100 characters across Job title, Company name, location, and skill. Availability accepts only `ALL`, `OPEN`, or `UNAVAILABLE`; results are bounded and ordered by saved date then ID for deterministic newest-first output.

## Application domain boundaries

- A Candidate may apply only to a `PUBLISHED` Job under a published Company, before any deadline, with a minimum profile (headline, location, at least one skill), and only once. Every condition is re-checked against fresh database state inside the mutation, never trusted from earlier browser render.
- `candidateId` always comes from the authenticated session; a database-level unique `(jobId, candidateId)` constraint plus safe P2002 handling turns duplicate and concurrent submissions into a clean already-applied result.
- The recruiter pipeline is SUBMITTED → UNDER_REVIEW → INTERVIEW → OFFER → HIRED, with REJECTED reachable from any active state; HIRED, REJECTED, and WITHDRAWN are terminal. A recruiter can never set WITHDRAWN, a candidate can never set a recruiter status, and no backward or terminal transition is allowed.
- Only the Candidate can withdraw, and only from an active state (SUBMITTED, UNDER_REVIEW, INTERVIEW, OFFER). Withdrawal is retained, never deleted.
- Every status change — including the initial SUBMITTED event (with a null `fromStatus`) and withdrawal — writes an `ApplicationStatusHistory` row atomically in the same transaction. Applications are never hard-deleted in normal workflow.
- Candidate ownership scopes every candidate read and mutation by `candidateId`; recruiter access scopes every read and mutation through OWNER membership of the Job's Company. Absent, foreign, and MEMBER-only IDs return the same not-found, so cross-candidate, cross-company, and MEMBER access all fail identically.
- A recruiter sees a candidate's private profile (email, headline, location, bio, skills, education, experience) only because the candidate applied to their job, and only as an OWNER. This data never appears on public pages or in unrelated Company workspaces. Candidate-facing history omits the acting user.
- Cover letters are optional, trimmed, length-bounded plain text, normalized to null when empty, validated on both client and server, and never rendered as HTML.
- Application submission, recruiter status changes, and Candidate withdrawal emit both in-app notifications and private transactional email intents inside the same transaction (see the notification and email boundaries). Messaging, bulk actions, and push delivery remain deferred.

## Candidate document boundaries

- A Candidate has at most one current CV. Each upload creates a new immutable `CandidateDocument` version and atomically moves the one-to-one `CandidateResume` pointer; previous versions are never overwritten, so applications they are attached to keep working. `candidateId` always comes from the session.
- Uploads accept only PDFs and must pass every check together: non-empty, at most 5 MB, `application/pdf` MIME, a `.pdf` extension, and a `%PDF-` magic-byte signature. The storage key is generated server-side, the SHA-256 is computed server-side, and the original filename is sanitized for safe display and Content-Disposition. File bytes are never stored in PostgreSQL.
- Applying snapshots the Candidate's current CV inside the application transaction into `JobApplication.resumeDocumentId`; that exact version stays pinned even after the Candidate replaces or removes their CV. Applying without a CV is allowed, and the browser never supplies a document ID. A Candidate may attach their current CV to an eligible existing active application once; an existing snapshot is never replaced and terminal applications never receive a late CV.
- Downloads go only through the authenticated `/api/documents/[documentId]/download` route, which re-authorizes from the session on every request. A Candidate may download their own documents; a Recruiter may download a document only when it is attached to an application whose Job Company they OWN. MEMBER, other-company, cross-Candidate, signed-out, and Admin requests are all denied identically, and unknown or unauthorized IDs never reveal existence.
- Responses force a download: `Content-Type: application/pdf`, a safe `Content-Disposition` attachment filename, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`. Storage keys, bucket names, endpoints, filesystem paths, and credentials are never exposed, and no public object URL is ever created. Successful authorized downloads write a `CandidateDocumentAccessLog` row; denied attempts never do.
- Private object storage is a pluggable abstraction: a local filesystem driver (development and test only, under the git-ignored `.careerbridge-private-storage`, with path-traversal protection) and an S3-compatible driver for production. Production refuses the local driver and fails loudly when S3 configuration is incomplete. Dedicated malware scanning and AI resume parsing are explicitly deferred.

## Recruiter application notes boundaries

- Internal `ApplicationNote` records are private to the hiring team: only an authenticated `RECRUITER` who is an OWNER of the application's Job Company can read, create, edit, delete, or view the history of a note. Candidates (even on their own application), Company MEMBER users, other-company Recruiters, Admins, and signed-out users are all denied identically, and unknown or unauthorized application/note IDs never reveal existence.
- Author identity always comes from the session (`authorUserId` is never accepted from the browser). Any OWNER may add a note and read every note plus its history, but only the original author may edit or soft-delete their own note; author attribution can never be changed.
- Note bodies are required, trimmed, line-ending-normalized, plain-text-only, at least one meaningful character, and at most 5,000 characters. They are rendered as escaped React text with preserved line breaks — never HTML, never Markdown, never `dangerouslySetInnerHTML`.
- Each note keeps a monotonic `revision` and an immutable `ApplicationNoteRevision` audit trail: creation writes version 1 (`CREATED`), each edit and each soft delete writes the next version (`EDITED` / `DELETED`) preserving the body at that version. A database-level `unique(noteId, version)` constraint is authoritative; the note and its revision are always written together in one transaction.
- Editing and deletion use optimistic concurrency: the client sends an `expectedRevision` concurrency token (never an authorization value) and a compare-and-set update only succeeds at the matching revision on an undeleted note the actor authored. A stale attempt is rejected with a safe conflict message, so two concurrent edits can never both win and no duplicate revision is created. Notes are soft-deleted, never hard-deleted, and there is no restore in this phase.
- Recruiter list and pipeline views show only an OWNER-scoped active-note count (bodies are never projected into lists). Candidate application pages and lists, the Candidate dashboard, and every public Job/Company projection expose no note record, count, body, author, timestamp, or existence signal. Deferred: @mentions, note notifications, rich-text/Markdown, attachments, and AI summarization.

## In-app notification boundaries

- A `Notification` belongs to exactly one recipient `User`. A Candidate is notified when a Recruiter changes their application's status; every current Company OWNER Recruiter is notified when a Candidate submits or withdraws an application to a Job their Company owns. MEMBER users, the acting Candidate, Admins, and unrelated Recruiters are never notified — recipients are resolved server-side from fresh database state (OWNER membership with a `RECRUITER` user role), never from browser input.
- Notifications are created inside the existing application submission, status-transition, and withdrawal transactions, so they are atomic with the `JobApplication` and `ApplicationStatusHistory` writes. A failed or rolled-back mutation, an invalid or terminal transition, and a repeated withdrawal all create no notification.
- A deterministic, server-generated `dedupeKey` with a database unique constraint makes transactional retries and concurrent duplicate submissions idempotent: each Company OWNER receives exactly one notification per event. The browser never supplies the key.
- Title, message, and destination are bounded, server-generated event snapshots rendered as escaped React text — never HTML or Markdown. Copy never includes Candidate email, CV filenames, internal note bodies, document metadata, or raw database IDs. Destinations are validated through the shared safe-internal-path logic (no external, protocol-relative, or open-redirect targets).
- Every read is scoped to `recipientUserId = session user`. No Candidate, Recruiter, Admin, or Company OWNER can read another user's notifications, and browser-facing projections expose only `id`, `type`, `title`, `message`, `href`, `readAt`, and `createdAt` — never `dedupeKey`, recipient/actor IDs, or relation IDs. Mark-one and mark-all are IDOR-safe `updateMany`s scoped to the recipient and are idempotent; they never reveal whether another user's notification exists.
- The `/notifications` Activity Center serves Candidates and Recruiters only (Admins are redirected, signed-out users are sent to sign-in). It offers `ALL`/`UNREAD`/`READ` filters, a bounded page size of 20 with deterministic `createdAt DESC, id DESC` ordering, an empty state, and mark-as-read actions. The header bell shows an unread badge (exact 1–99, then `99+`) that refreshes on navigation and after mark-read — there is no polling and no real-time claim.
- A notification is retained with its original recipient even after the recipient loses Company ownership; possession of a notification never grants access to the underlying entity. Its destination route re-authorizes independently, so a removed OWNER keeps the historical notification text but is denied the application it references. Application/Job/Company links are nullable and set null (not cascaded) on entity deletion, so history survives without exposing an inaccessible record. SMS, mobile/browser push, WebSockets/SSE, digests, and recruiter-note/CV/saved-job/marketing notifications remain deferred.

## Company team membership boundaries

- A Company OWNER invites existing CareerBridge Recruiter accounts by email. The server normalizes the address and resolves the account itself: no-account, Candidate-account, and Admin-account lookups all return the same safe "no eligible recruiter account" message, self-invites and current members are rejected, and an `inviteeUserId` is never accepted from the browser. There are no public invitation links, tokens, or unregistered-user invitations.
- Invitations follow an explicit lifecycle — `PENDING`, then terminal `ACCEPTED`, `DECLINED`, `REVOKED`, or `EXPIRED` after a fixed 14 days — driven by compare-and-set transitions, so repeated or concurrent responses produce exactly one outcome and one audit event. A nullable unique `activeKey` makes "one active invitation per Company and invitee" a database guarantee, and historical rows are retained.
- Acceptance re-validates everything inside one transaction (invitee identity, `PENDING` status, expiry, a still-`RECRUITER` account role, no existing membership) and always creates a `MEMBER` membership; the browser can never choose a role, and OWNER arrives only through later explicit promotion or ownership transfer. Invitation creation writes the invitation, its audit event, and the invitee's in-app notification (plus the Phase 4C email intent) atomically.
- Promote, demote, remove, ownership transfer, and leave are explicit actions — OWNER-only, except session-scoped leave — that re-authorize inside their transactions and never accept a role, actor, or audit value from the browser. The last-owner invariant ("A company must keep at least one owner.") is enforced under Serializable isolation, so concurrent demotions, removals, and leaves cannot strand a Company; transfer promotes the target before demoting the actor.
- Every invitation and membership change writes an append-only `CompanyMembershipEvent` with nullable actor/subject retention and no free-text metadata; there is no edit or delete surface, and only Company OWNERs can read it.
- `/recruiter/companies/[companyId]/team` is OWNER-only and is the only surface that projects member emails; `/recruiter/invitations` is strictly invitee-scoped. MEMBER users see just their own membership on the Company workspace, and unknown, foreign, and MEMBER access share the same not-found behavior. Public Company and Job pages, Candidate surfaces, and search metadata expose no memberships, emails, invitations, counts, or audit events, and possessing an invitation notification grants no access — destination routes re-authorize the session. Custom organization roles, fine-grained permissions, and billing seats remain deferred.

## Transactional email boundaries

- Four explicit events are supported: company invitation received, application submitted, application status changed, and application withdrawn. Recipients come from fresh server-side state: the existing invited Recruiter, the owning Candidate, or current Recruiter OWNERs. Browser input never supplies email intent, recipient, snapshot content, destination, status, attempts, or dedupe data.
- The authoritative domain transaction writes an immutable `EmailOutbox` snapshot alongside the domain change and in-app notification. Provider I/O never runs in that transaction. Missing preferences default enabled; a disabled event writes `SUPPRESSED` with `USER_PREFERENCE`, preserving audit and dedupe history. Preferences are evaluated only when the event occurs and never alter in-app notifications.
- `/settings/notifications` is limited to Candidate and Recruiter sessions and shows only role-relevant email toggles. Admin has no implicit settings access. Candidate controls status-change email; Recruiter controls invitations, submissions, and withdrawals.
- Central templates create bounded subjects, plain text, and escaped HTML from server-resolved values. They contain no Candidate email, CV metadata, internal notes, member lists, invitation keys, user HTML, tracking pixels, or external resources. The outbox stores a validated internal path; delivery combines it with `EMAIL_APP_BASE_URL`, and every destination independently re-authorizes the signed-in user.
- The internal Node dispatcher is POST-only at `/api/internal/email/dispatch`, uses a constant-time bearer-secret comparison, returns aggregate counts only, and processes a bounded batch. PostgreSQL `FOR UPDATE SKIP LOCKED` claiming sets a per-row lock token, releases the transaction before network I/O, requires that token to finalize, and recovers locks older than ten minutes.
- Delivery attempts are append-only and body/recipient-free. Retryable network, 429, and 5xx failures follow 1 minute, 5 minute, 30 minute, 2 hour, then 12 hour bounded delays; permanent or exhausted work becomes `DEAD_LETTER`. Resend receives the database dedupe key as its idempotency key. There is no public outbox, attempt, retry, or delivery-status API.
- Development and automated tests use non-network or injected fake drivers. Production rejects `log`, requires explicit Resend configuration at delivery time, and never silently simulates. Logs contain only safe aggregate counts, driver names, and stable categories—never recipient snapshots, subjects, bodies, credentials, authorization values, provider bodies, cookies, or database URLs.

| Event                       | Recipient                        | Candidate setting          | Recruiter setting       |
| --------------------------- | -------------------------------- | -------------------------- | ----------------------- |
| Company invitation received | Existing invited Recruiter       | Not shown                  | Company invitations     |
| Application submitted       | Current Company Recruiter OWNERs | Not shown                  | New applications        |
| Application status changed  | Application Candidate            | Application status updates | Not shown               |
| Application withdrawn       | Current Company Recruiter OWNERs | Not shown                  | Application withdrawals |
| Interview scheduled         | Application Candidate            | Interview scheduled        | Not shown               |
| Interview rescheduled       | Application Candidate            | Interview rescheduled      | Not shown               |
| Interview canceled          | Application Candidate            | Interview canceled         | Not shown               |
| Interview response received | Current Company Recruiter OWNERs | Not shown                  | Interview responses     |

| Outbox state      | Meaning                                          |
| ----------------- | ------------------------------------------------ |
| `PENDING`         | New eligible intent waiting for claim            |
| `PROCESSING`      | Claimed by one lock-token owner                  |
| `RETRY_SCHEDULED` | Temporary failure waiting for its bounded delay  |
| `SENT`            | Provider accepted the idempotent request         |
| `DEAD_LETTER`     | Permanent failure or retry limit reached         |
| `SUPPRESSED`      | Disabled at event time; never sent retroactively |

## Interview scheduling boundaries

- An `Interview` belongs to exactly one `JobApplication`; an Application may hold many over time. Only a `RECRUITER` who is a current OWNER of the Application's Job Company can schedule, reschedule, cancel, or complete; only the owning Candidate can accept or decline. MEMBER users, cross-Company Recruiters, other Candidates, and Admins are denied with the same not-found behavior as a nonexistent id — Interview and event IDs never reveal existence.
- Creation and rescheduling require an active Application (`SUBMITTED`, `UNDER_REVIEW`, `INTERVIEW`, `OFFER`), re-checked inside the transaction. Candidate withdrawal blocks new scheduling but never deletes existing interview history, and interview transitions never mutate the Application status or write `ApplicationStatusHistory` — the two workflows stay separate.
- Times are stored as UTC instants plus the independently validated IANA timezone that scheduled them. Rendering always uses the stored zone with a DST-aware abbreviation from the IANA database; the browser's ISO instant and zone are validated separately and a formatted display string is never trusted. Schedules must start 10+ minutes out, within 365 days, last 15 minutes to 8 hours, and satisfy format rules (VIDEO needs an HTTPS link, ONSITE a location, PHONE forbids a link, OTHER needs at least one attendance detail). Meeting links are HTTPS-only — `javascript:`, `data:`, `mailto:`, protocol-relative, and credentialed URLs are rejected — and open with `target="_blank" rel="noopener noreferrer"`; instructions render as plain text.
- Active interviews (`PENDING_RESPONSE`, `ACCEPTED`) cannot overlap for the same Candidate or the same organizer (`existing.startAt < proposed.endAt AND existing.endAt > proposed.startAt`; adjacency allowed). Checks re-run inside a Serializable transaction with the repository's bounded retry, so concurrent overlapping schedules resolve to exactly one winner, and the fixed conflict copy reveals nothing about the conflicting interview. `CANCELED`, `DECLINED`, and `COMPLETED` interviews never block a slot.
- Every mutation is an explicit operation (accept, decline, reschedule, cancel, complete) guarded by an `expectedVersion` compare-and-set on id + version + allowed status — a concurrency token, never authorization. Stale writers get "This interview changed. Refresh and try again." Rescheduling returns the status to `PENDING_RESPONSE`, clears the response, and makes the acting OWNER the organizer; cancel and complete are terminal with server-set timestamps.
- Each transition appends an immutable `InterviewEvent` (actor retained as nullable, schedule snapshots for creation/reschedule) in the same transaction — there is no edit, delete, or rewrite surface. The timeline is visible only to the owning Candidate and Company OWNERs.
- Scheduling, rescheduling, and cancellation notify the Candidate; accept/decline notifies every current Recruiter OWNER — in-app and through the transactional email outbox (or a `SUPPRESSED` row per preference), atomically with the interview write and with deterministic dedupe keys. Copy carries only the Job title and Candidate display name: never the meeting URL, location, instructions, schedule, or Candidate email. Notifications and email grant no access — destination routes re-authorize the session.
- Public Jobs, public Companies, and search metadata expose no interview data. Candidate projections expose no membership records or internal notes; Recruiter projections expose no email infrastructure or dedupe keys. Calendar provider sync (Google/Outlook/Apple), Meet/Zoom/Teams link generation, ICS files, reminders, self-scheduling links, recurring interviews, interviewer availability, panels, and scorecards remain deferred.

| Interview status   | Candidate may   | Recruiter OWNER may          |
| ------------------ | --------------- | ---------------------------- |
| `PENDING_RESPONSE` | Accept, Decline | Reschedule, Cancel           |
| `ACCEPTED`         | —               | Reschedule, Cancel, Complete |
| `DECLINED`         | —               | Reschedule, Cancel           |
| `CANCELED`         | — (terminal)    | — (terminal)                 |
| `COMPLETED`        | — (terminal)    | — (terminal)                 |

## Documentation

- [Product specification](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)

## Project principles

- Server Components by default; client boundaries only for real interactivity
- Accessible, responsive interfaces built from theme tokens
- Explicit validation at application boundaries
- Authorization enforced close to protected data and mutations
- AI augments decisions and must remain explainable; it does not make hiring decisions
- Small, reviewable phases with lint, type, and production-build validation

## Contributing

Use focused branches, keep scope aligned with the active roadmap phase, and run the lint, typecheck, and build commands before opening a pull request. Do not commit **.env** files or secrets.
