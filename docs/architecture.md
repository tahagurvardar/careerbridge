# CareerBridge architecture

## Architecture goals

CareerBridge should support incremental delivery without locking the product into premature abstractions. The foundation favors framework conventions, typed boundaries, server-first rendering, and a relational domain that can grow alongside real workflows.

## Current system

CareerBridge is a single Next.js App Router application:

```mermaid
flowchart LR
  Browser["Browser"]
  App["Next.js App Router"]
  UI["Server Components and Server Actions"]
  Client["Interactive form boundaries"]
  Auth["Lazy Better Auth server"]
  Prisma["Lazy Prisma 7 client"]
  Postgres[("PostgreSQL")]

  Browser --> App
  App --> UI
  App --> Client
  UI --> Auth
  Auth --> Prisma
  Prisma --> Postgres
```

Phase 4A keeps the completed identity, profile, Company, Job, application, Saved Job, secure CV document, and Recruiter note experiences intact while adding in-app notifications: application submission, recruiter status changes, and Candidate withdrawal each create recipient-scoped notifications inside the existing domain transaction, and every Candidate and Recruiter gets a private Activity Center, an unread header badge, filters, and mark-as-read actions. The Prisma, Better Auth, and document storage instances are created only from lazy getters, so importing a route or component does not create a connection pool or storage client. Personalized profile, dashboard, Company workspace, Job workspace, application, Saved Job, document, note, and notification rendering retrieves the current session and fresh data on the server.

## Source boundaries

- **src/app:** route composition, metadata, layouts, and route-specific entry points
- **src/components/ui:** shadcn/ui source owned by the repository
- **src/components/layout:** cross-route site chrome
- **src/components/shared:** reusable presentational components
- **src/features/auth:** role rules, Zod boundaries, forms, Server Actions, and session authorization
- **src/features/admin:** database-free moderation/visibility rules, validated Admin filters, active-Admin guard, safe bounded data projections, compare-and-set moderation commands, immutable audit rendering, and accessible action forms
- **src/features/candidate-profile:** profile schemas, completion logic, form UI, server queries, ownership-scoped commands, and Server Actions
- **src/features/recruiter-company:** Recruiter/Company schemas, slug and publication rules, form UI, membership-scoped queries, commands, and Server Actions
- **src/features/jobs:** Job schemas, slug, lifecycle, publication readiness, and public search rules, plus form UI, OWNER-scoped queries, commands, and Server Actions
- **src/features/applications:** application lifecycle, eligibility, cover-letter and search schemas, and search mapping, plus form UI, candidate- and OWNER-scoped queries, commands, and Server Actions
- **src/features/saved-jobs:** save eligibility, availability, validation, dashboard recommendation logic, interactive controls, and Candidate-scoped server reads and mutations
- **src/features/candidate-documents:** PDF validation, filename/Content-Disposition safety, download-authorization and retention helpers, upload/remove/attach commands, the download authorizer, and Candidate document UI
- **src/features/application-notes:** internal note validation, ownership/visibility/concurrency helpers, OWNER-scoped reads, transactional create/edit/soft-delete commands with immutable revision history, Server Actions, and the Recruiter notes UI
- **src/features/notifications:** notification copy/dedupe-key/recipient-dedupe/safe-destination/badge helpers, recipient-scoped reads, mark-as-read commands, transactional emit helpers used inside application mutations, Server Actions, the Notification Center route UI, and the header bell
- **src/features:** domain-oriented UI, actions, schemas, and queries
- **src/config:** stable site navigation and configuration
- **src/lib:** infrastructure clients and low-level utilities, including the private document storage abstraction (`src/lib/storage`)
- **src/types:** genuinely shared TypeScript contracts
- **prisma:** Prisma 7 schema and reviewed migrations
- **scripts:** explicit operational commands such as development Admin bootstrap
- **tests:** focused custom validation and authorization tests

New folders should be created only when they have an implementation to hold.

Unit tests run without PostgreSQL through `npm test`. Database-backed auth integration tests are isolated in a separate Vitest configuration and require both `RUN_DATABASE_INTEGRATION_TESTS=true` and a dedicated `TEST_DATABASE_URL`; they never fall back to the application `DATABASE_URL` and refuse an exact match with either application database URL.

## Rendering model

- Pages and layouts are React Server Components by default.
- Client Components are limited to browser state or event-driven interaction.
- Current client boundaries are theme switching, the theme provider, Radix primitives, mobile navigation, and React Hook Form authentication/profile forms.
- Public Company and Job routes are server-rendered only from published, moderation-visible database records; the landing page renders newest eligible Jobs. The session-aware shared header makes route rendering request-aware.
- Protected dashboards, Candidate profile routes, Recruiter Company routes, and Recruiter Job routes validate the database session and exact role before rendering.

## Planned application layers

Feature modules will evolve toward a consistent shape without requiring every feature to use every layer:

```text
features/<feature>/
├── components/     # Feature UI
├── schemas/        # Zod input and output contracts
├── server/         # Queries, commands, and authorization
└── types.ts        # Feature-local contracts when needed
```

Route files should compose feature modules rather than accumulating domain logic.

## Data architecture

- PostgreSQL is the system of record.
- Prisma 7 provides type-safe access through the PostgreSQL driver adapter.
- The identity schema contains Better Auth's `User`, `Account`, `Session`, and `Verification` models plus the Prisma `Role` enum.
- The `Role` enum contains `CANDIDATE`, `RECRUITER`, and `ADMIN`; `CANDIDATE` is the least-privileged database default.
- The official Better Auth CLI generated the compatible Prisma core models. The strongly typed Prisma role enum was then applied through migration `20260710020153_identity_foundation`.
- Phase 2A adds only `CandidateProfile`, `Education`, `Experience`, `Skill`, and `CandidateSkill`, plus the constrained `EmploymentType` enum.
- Phase 2B adds only `RecruiterProfile`, `Company`, and `CompanyMembership`, plus `CompanySize` and `CompanyMembershipRole` enums.
- Phase 2C adds only `Job` and `JobSkill`, plus the `JobStatus`, `WorkplaceType`, and `ExperienceLevel` enums, and reuses the existing `EmploymentType` enum and `Skill` catalog.
- Phase 3A adds only `JobApplication` and `ApplicationStatusHistory`, plus the `ApplicationStatus` enum, and reads authorized current `User` and `CandidateProfile` data rather than duplicating candidate name or email.
- Phase 3B adds only `SavedJob`, reads current Job/Company/Application data through authorized projections, and duplicates no Candidate, Job, Company, skill, or application fields.
- Phase 3C adds only `CandidateDocument`, `CandidateResume`, and `CandidateDocumentAccessLog`, plus the `CandidateDocumentKind` and `CandidateDocumentAccessType` enums and a nullable `JobApplication.resumeDocumentId` snapshot column; file bytes live in private object storage, not in PostgreSQL.
- Phase 3D adds only `ApplicationNote` and `ApplicationNoteRevision`, plus the `ApplicationNoteRevisionAction` enum and a unique `(noteId, version)` constraint; notes are internal Recruiter data read through authorized relations, never duplicating Candidate, Recruiter, Job, or Company fields.
- Phase 4A adds only `Notification`, plus the `NotificationType` enum and a unique `dedupeKey` constraint; notifications store bounded event snapshots and nullable Application/Job/Company links (`onDelete: SetNull`) for retention, never duplicating private Candidate, CV, or note data.
- Database access remains server-only and is acquired through the lazy singleton helper.

In-app notifications, transactional email, and authorized aggregate analytics now exist for the documented workflows. Push and real-time delivery remain deferred. Future domain areas include recommendations, alerts, reports, appeals, localization, exports, and predictive analytics. This list is directional, not a committed schema.

### Candidate profile domain

`User` has an optional one-to-one `CandidateProfile` through a unique `userId`. The profile owns zero or more `Education` and `Experience` rows; deleting the user or profile cascades through those private records. `Skill` is a shared normalized catalog. `CandidateSkill` is an explicit join with a composite `(candidateProfileId, skillId)` primary key, preventing repeat assignment even under concurrent requests.

Names and email stay on `User` rather than being duplicated. Optional profile fields remain nullable. Database-native lengths bound headlines, locations, URLs, descriptions, and skill names. Education years use small integers; experience dates use PostgreSQL `DATE`; employment type is an enum. The additive `20260710172118_candidate_profile_foundation` migration creates these tables, indexes, enum, foreign keys, and cascade behavior without resetting identity data.

Candidate profile routes are:

- `/candidate/profile` for the server-rendered overview and completion guidance
- `/candidate/profile/edit` for basic professional information
- `/candidate/profile/education/new` and `/candidate/profile/education/[id]/edit`
- `/candidate/profile/experience/new` and `/candidate/profile/experience/[id]/edit`

Profile completion is computed rather than persisted. Headline, location, bio, at least one skill, at least one education record, and at least one experience record each contribute 15 points. At least one professional link contributes 10 points. The calculator returns both the 0–100 percentage and deterministic missing-section recommendations.

### Recruiter and Company domain

`User` has an optional one-to-one `RecruiterProfile` through unique `userId`; account name and email remain solely on `User`. `CompanyMembership` is an explicit join from `User` to `Company` with unique `(userId, companyId)`, indexed actor/company roles, and the narrow `OWNER`/`MEMBER` enum. The schema permits multiple Company memberships per Recruiter. Company creation writes the private Company and its OWNER membership in one serializable transaction, so a successful Company cannot be ownerless through this workflow.

`Company` stores a unique stable slug, bounded descriptive fields, optional `CompanySize`, realistic small-integer founded year, and `isPublished = false` by default. Slugs are derived only from the validated Company name on the server. The allocator NFKD-normalizes to a bounded ASCII slug, uses `company` as a non-Latin fallback, and chooses the first free deterministic suffix (`name`, `name-2`, `name-3`). Serializable creation plus retry on unique/write conflicts protects concurrent collision handling. Editing a Company name does not rotate its established URL.

Private workspace reads require an authenticated Recruiter membership. `MEMBER` can read the private workspace but cannot mutate in Phase 2B. Edit and publish commands include the authenticated user's OWNER membership in their database predicate; absent, foreign, and unauthorized IDs produce the same unavailable result. Admin is not an implicit owner. Browser input never supplies a trusted user ID, membership ID, owner role, slug, or publication flag.

Publishing is an explicit OWNER command. The server requires name, description, industry, headquarters, and a validated HTTP(S) website before setting `isPublished`. Unpublishing is a separate OWNER command. Public list and detail queries always constrain `isPublished: true` and `moderationStatus: VISIBLE`, return no membership identity, and treat an unknown, unpublished, or hidden slug identically. Publication is a business visibility state, moderation is a separate platform decision, and neither is Company verification.

Recruiter routes are `/recruiter/profile`, `/recruiter/profile/edit`, `/recruiter/companies`, `/recruiter/companies/new`, `/recruiter/companies/[companyId]`, and `/recruiter/companies/[companyId]/edit`; Phase 4B adds `/recruiter/companies/[companyId]/team` and `/recruiter/invitations` (see the Company team membership domain). Public discovery uses `/companies` with bounded URL filters and `/companies/[slug]` for published detail. Company verification and uploads remain deferred.

### Job domain

`Company` owns zero or more `Job` rows; deleting a Company cascades to its Jobs and their `JobSkill` links. `Job` stores a globally unique server-generated slug, bounded plain-text content fields, the reused `EmploymentType` enum plus the new `WorkplaceType` and `ExperienceLevel` enums, an integer salary range with a `CHAR(3)` currency code, an optional `DATE` application deadline, and the `JobStatus` lifecycle with server-only `publishedAt`/`closedAt` timestamps. `JobSkill` is an explicit join to the shared `Skill` catalog with a composite `(jobId, skillId)` primary key, preventing duplicate assignment. Indexes cover Company workspace queries (`companyId, status, createdAt`) and public discovery (`status, publishedAt, id`). The additive `20260710224143_job_lifecycle_discovery` migration creates these tables, enums, indexes, and cascade behavior without touching existing data.

Salary is persisted as whole non-negative integer currency units rather than a floating-point or minor-unit representation, and the minimum can never exceed the maximum. The currency code is normalized to an uppercase 3-letter form and is required whenever any salary value is present. Application deadlines are date-only and compared in UTC so a timezone offset never shifts the day; a past deadline blocks publication.

The lifecycle is centralized and testable: DRAFT permits edit, publish, and archive; PUBLISHED permits edit, close, and archive; CLOSED permits archive; ARCHIVED is read-only. Transitions, the resulting status, and editability all derive from a single table, so no status value is ever accepted from form input. Publishing is an OWNER command that re-evaluates readiness against freshly read database rows: the Company must be published and the Job must have a title, summary, description, responsibilities, requirements, location, employment type, workplace type, experience level, and at least one required skill. Publishing sets `PUBLISHED` and `publishedAt`; closing sets `CLOSED` and `closedAt` and immediately removes the Job from public discovery; archiving sets `ARCHIVED` and removes it from discovery. Editing a published Job re-checks readiness so a live listing cannot become incomplete.

Every Job command asserts the RECRUITER role, derives identity from the session, and scopes its database predicate through the authenticated user's OWNER membership of the Job's Company. Absent, foreign, and unauthorized Job IDs produce the same unavailable result, so a Recruiter cannot view or edit another Company's private drafts, and a MEMBER cannot mutate Jobs. Public list and detail queries always constrain `status = PUBLISHED`, `Job.moderationStatus = VISIBLE`, `Company.isPublished = true`, and `Company.moderationStatus = VISIBLE`, select only presentational fields with no internal IDs or membership identity, and order by newest `publishedAt` with a deterministic `id` tiebreaker. Recruiter Job routes are `/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/[jobId]`, and `/recruiter/jobs/[jobId]/edit`; public discovery uses `/jobs` with bounded URL filters and `/jobs/[slug]` for published detail. Candidate matching, recommendations, alerts, and Job page-view analytics remain deferred.

### Application domain

`JobApplication` belongs to exactly one `Job` and one Candidate `User` (`candidateId`), stores an optional bounded-plain-text cover letter, an `ApplicationStatus`, and server-set `submittedAt`/`withdrawnAt` timestamps. A database-level unique `(jobId, candidateId)` constraint enforces one application per Candidate per Job; indexes cover candidate lists (`candidateId, status, submittedAt`) and recruiter job lists (`jobId, status, submittedAt`). `ApplicationStatusHistory` records `fromStatus` (nullable for the initial SUBMITTED event), `toStatus`, and a nullable `changedByUserId` (`onDelete: SetNull` so history survives account removal), indexed by `applicationId, createdAt`. Deleting a Job or Candidate cascades to their applications and history. The additive `20260711001124_job_applications_pipeline` migration creates these tables and the enum without touching existing data. Candidate name and email are read from authorized live `User`/`CandidateProfile` data, never duplicated onto the application.

Eligibility is re-evaluated against fresh database rows inside the create mutation: the Candidate role, a `PUBLISHED` Job under a published Company, an absent or future deadline (date-only, UTC), no existing application, and a minimum profile of headline, location, and at least one skill. Incomplete profiles return a safe message listing the missing fields and never create a row. The unique constraint plus P2002 handling makes duplicate and concurrent submissions resolve to a clean already-applied result without a second history row.

The lifecycle is centralized and database-free. Recruiter-controlled forward transitions are SUBMITTED → UNDER_REVIEW → INTERVIEW → OFFER → HIRED, with REJECTED reachable from any active state; HIRED, REJECTED, and WITHDRAWN are terminal. A recruiter can never set WITHDRAWN, only the Candidate can withdraw (and only from an active state), and no backward or terminal transition is accepted. Each accepted change updates the status and appends an `ApplicationStatusHistory` row in the same transaction, using a compare-and-set on the prior status so a concurrent change cannot double-apply. Applications are retained after withdrawal or rejection and are never hard-deleted in normal workflow.

Candidate reads and mutations are scoped by `candidateId` from the session; recruiter reads and mutations are scoped through OWNER membership of the Job's Company. Absent, foreign, and MEMBER-only IDs return the same not-found, so cross-candidate, cross-company, and MEMBER access fail identically and foreign application existence is never leaked. A recruiter sees a candidate's private profile only because the candidate applied to their job and only as an OWNER; candidate-facing history omits the acting user. Candidate routes are `/candidate/applications` and `/candidate/applications/[applicationId]`; the apply form is `/jobs/[slug]/apply`; recruiter routes are `/recruiter/applications`, `/recruiter/applications/[applicationId]`, and `/recruiter/jobs/[jobId]/applications`. Each application now carries a nullable CV snapshot (`resumeDocumentId`); see the Candidate document domain. Application submission, recruiter status changes, and withdrawal now emit in-app notifications within the same transaction (see the Notification domain); messaging remains deferred.

### Saved Job domain

`SavedJob` is an explicit join from Candidate `User` to `Job` with server-set `createdAt`. Unique `(candidateId, jobId)` is the database authority for one save per Candidate per Job. Indexes on `(candidateId, createdAt, id)` and `jobId` support deterministic newest-first Candidate lists and relation maintenance. Both foreign keys cascade, matching existing Candidate and Job ownership cleanup. The additive `20260711023016_saved_jobs` migration creates only this table, indexes, and constraints.

New saves require an authenticated Candidate and re-read the Job with `status = PUBLISHED` plus `Company.isPublished = true` inside the mutation. Candidate identity is never accepted from input. P2002 duplicate handling makes sequential or concurrent duplicate saves idempotent; Candidate-and-Job-scoped `deleteMany` makes removal idempotent and unable to reveal another Candidate's save.

Saved rows intentionally survive Job close/archive, Company unpublication, and Company/Job hiding. Candidate reads classify a row as OPEN only while the Job and parent Company satisfy the full public lifecycle, publication, and moderation predicate; every other row is UNAVAILABLE. Unavailable cards retain only Candidate-authorized presentational history, offer removal, never link to a private route, and never reveal the moderation reason or cause a Job to reappear publicly. Public Job queries keep their existing explicit projections and expose no SavedJob rows, Candidate identity, or save counts. `/jobs` loads saved slugs in one bounded query for Candidate sessions; `/candidate/saved-jobs` validates bounded title/Company/location/skill search and `ALL`/`OPEN`/`UNAVAILABLE` filters, then returns at most 100 rows in stable newest-saved order.

### Candidate document domain

`CandidateDocument` is an immutable version record: it belongs to one Candidate `User` (`candidateId`), carries a `CandidateDocumentKind` (`RESUME`), a unique server-generated `storageKey`, a sanitized `originalFilename`, `mimeType`, `sizeBytes`, `sha256`, `uploadedAt`, and a nullable `removedFromProfileAt`. File bytes live in private object storage, never in PostgreSQL, and no row field except `removedFromProfileAt` is ever mutated after creation. Indexes cover `(candidateId, kind, uploadedAt)` and `(candidateId, createdAt)`. `CandidateResume` is the one-to-one current-CV pointer keyed by `candidateId` (primary key) with a unique `documentId`, so at most one current CV exists per Candidate and a document is current for at most one Candidate. `CandidateDocumentAccessLog` records successful authorized downloads with `documentId`, `actorUserId`, a nullable `applicationId`, a `CandidateDocumentAccessType`, and `createdAt`, indexed by `(documentId, createdAt)` and `(actorUserId, createdAt)`. `JobApplication` gains a nullable `resumeDocumentId` (`onDelete: SetNull`) so pre-existing applications stay valid and a snapshot survives Candidate changes. The additive `20260711222126_secure_candidate_documents` migration creates these tables, the two enums, and the snapshot column and index.

An upload validates the PDF, uploads the object first, then creates the `CandidateDocument` and upserts the `CandidateResume` pointer in one transaction; if the transaction fails, the just-uploaded object is best-effort deleted so no pointer or metadata ever references a missing object. A failed upload writes no metadata. Because the pointer's primary key is `candidateId`, concurrent replacements converge on exactly one current pointer while every uploaded version persists immutably. Applying reads the current pointer inside the application transaction and pins that exact `CandidateDocument` id; replacing or removing the current CV never rewrites existing application snapshots. Removing the current CV clears the pointer and stamps `removedFromProfileAt` but retains the immutable object so authorized parties keep access to historically attached versions; physical purging of fully unreferenced versions is deferred and documented rather than risking broken application history. The Candidate-facing surface is `/candidate/documents`, and downloads flow only through the Node-runtime `/api/documents/[documentId]/download` route.

### Application note domain

`ApplicationNote` is an internal Recruiter note on one `JobApplication`. It carries a nullable `authorUserId` (`onDelete: SetNull`, so the audit trail survives author account removal), a bounded `body` holding the current active text, a monotonic `revision` starting at 1, `createdAt`/`updatedAt`, and a nullable `deletedAt` soft-delete marker. Indexes cover active-note lists and counts (`applicationId, deletedAt, createdAt`) and author-owned lookups (`authorUserId`). `ApplicationNoteRevision` is the immutable audit history: `noteId`, `version`, an `ApplicationNoteRevisionAction` (`CREATED`/`EDITED`/`DELETED`), the `body` snapshot at that version, a nullable `actorUserId` (`onDelete: SetNull`), and `createdAt`, with a database-level `unique(noteId, version)` plus ordering and actor indexes. No Candidate, Recruiter, Job, or Company field is duplicated; those are read through authorized relations. The additive `20260712011236_recruiter_application_notes` migration creates both tables, the enum, and the unique constraint.

Every note read and mutation re-derives identity from the session and re-scopes through the application's Job Company OWNER membership. Creating a note writes the note and its version-1 `CREATED` revision in one transaction; editing and soft-deleting each write the next `EDITED`/`DELETED` revision (preserving the body) in one transaction. Edits and deletions use optimistic concurrency: a compare-and-set `updateMany` matches only an undeleted, author-owned row still at the client's `expectedRevision`, and the `unique(noteId, version)` constraint is the authoritative backstop, so two concurrent edits never both succeed and no duplicate revision is written. A stale attempt returns a safe conflict. Notes are soft-deleted, never hard-deleted; there is no restore in this phase. The Recruiter surface is the internal notes section on `/recruiter/applications/[applicationId]`, with immutable history at `/recruiter/applications/[applicationId]/notes/[noteId]/history`.

### Notification domain

`Notification` belongs to exactly one recipient `User` (`recipientUserId`, `onDelete: Cascade`) and carries a `NotificationType`, bounded server-generated `title`/`message`/`href` snapshots, a nullable `actorUserId` (`onDelete: SetNull`), nullable `applicationId`/`jobId`/`companyId` context links (`onDelete: SetNull`), a unique `dedupeKey`, a nullable `readAt`, and `createdAt`. Indexes cover the recipient unread count and read-state filtering (`recipientUserId, readAt, createdAt`), the newest-first list (`recipientUserId, createdAt`), and application-scoped lookups (`applicationId`). The additive `20260712211930_notifications_activity_center` migration creates this table and the enum. No Candidate email, CV filename, note body, or private profile field is stored; context is duplicated only as safe snapshot text plus retained id links that never grant access.

The three event types are `APPLICATION_SUBMITTED`, `APPLICATION_STATUS_CHANGED`, and `APPLICATION_WITHDRAWN`. Recipients are resolved server-side from fresh transaction state: submission and withdrawal notify every current Company OWNER whose user role is `RECRUITER` (excluding MEMBER users, any Admin holding a membership row, the acting Candidate, and unrelated Companies); a status change notifies the application's owning Candidate. Recipient ids are de-duplicated and the actor is filtered out before insert. Notifications are created inside the existing submission, status-transition, and withdrawal transactions via `createMany({ skipDuplicates: true })`, so they are atomic with the `JobApplication` and `ApplicationStatusHistory` writes and a rolled-back mutation emits nothing.

Duplicate prevention is a deterministic, server-generated `dedupeKey` (`application-submitted:{applicationId}:{recipientUserId}`, `application-status-changed:{statusHistoryId}:{recipientUserId}`, `application-withdrawn:{statusHistoryId}:{recipientUserId}`) with a database unique constraint. Transactional retries and concurrent duplicate submissions (already bounded by `unique(jobId, candidateId)`) therefore create exactly one notification per recipient per event; the browser never supplies the key. Titles, messages, and destinations are generated server-side, rendered as escaped React text (never HTML or Markdown), and destinations pass through the shared safe-internal-path helper so no external, protocol-relative, or open-redirect target is ever stored.

Every read is scoped to `recipientUserId = session user`. Browser-facing projections select only `id`, `type`, `title`, `message`, `href`, `readAt`, and `createdAt` — never `dedupeKey`, recipient/actor ids, or relation ids. The unread count is a React `cache`d aggregate shared by the header bell and dashboards within a request. Mark-one and mark-all are IDOR-safe `updateMany`s scoped to the recipient and are idempotent; they never reveal another user's notifications. `/notifications` is a server-rendered Activity Center for Candidates and Recruiters only (Admins redirected, signed-out users sent to sign-in) with `ALL`/`UNREAD`/`READ` filters, a bounded page size of 20 clamped to the real page range, deterministic `createdAt DESC, id DESC` ordering, an empty state, and mark-as-read actions. The header bell shows an unread badge (exact 1–99, then `99+`) that refreshes on navigation and after mark-read; there is no polling.

A notification is retained with its original recipient after a role change (ownership removal never transfers it), and possession never authorizes the underlying entity: the destination route re-authorizes independently, so a removed OWNER keeps the historical text but is denied the referenced application. The Notification access matrix:

| Event / capability         | Candidate (owner)    | Company OWNER Recruiter | Company MEMBER | Other-Company Recruiter | Admin | Public |
| -------------------------- | -------------------- | ----------------------- | -------------- | ----------------------- | ----- | ------ |
| APPLICATION_SUBMITTED      | not notified (actor) | notified                | no             | no                      | no    | no     |
| APPLICATION_STATUS_CHANGED | notified             | not notified            | no             | no                      | no    | no     |
| APPLICATION_WITHDRAWN      | not notified (actor) | notified                | no             | no                      | no    | no     |
| Read own Activity Center   | own only             | own only                | own only       | own only                | none  | none   |
| Read another user's        | no                   | no                      | no             | no                      | no    | no     |
| Mark own read / all read   | yes                  | yes                     | yes            | yes                     | n/a   | no     |
| Unread header badge        | yes                  | yes                     | yes            | yes                     | no    | no     |

### Company team membership domain

`CompanyInvitation` joins one `Company` to one invitee `User` (`onDelete: Cascade`) with a nullable `invitedByUserId` (`onDelete: SetNull`) so invitation history survives inviter removal. It carries a `CompanyInvitationStatus` (`PENDING`, then terminal `ACCEPTED`/`DECLINED`/`REVOKED`/`EXPIRED`), a server-set 14-day `expiresAt`, a server-set `respondedAt`, and a nullable unique `activeKey` written as `companyId:inviteeUserId` while PENDING and cleared on every terminal transition — PostgreSQL's many-NULLs unique semantics make "at most one active invitation per Company and invitee" a database constraint rather than an application promise. Indexes cover invitee lists, Company lists, and expiry checks (`status, expiresAt`). Invitations target existing Recruiter accounts only; there are no invitation tokens, public URLs, or unregistered-user invitations, so authorization is always `inviteeUserId = session user` or Company OWNER membership. The additive `20260712232412_company_team_membership` migration creates both tables and enums.

Invitation creation is OWNER-only and fully server-resolved: the email is normalized and looked up on the server, missing/Candidate/Admin accounts share one safe "no eligible recruiter account" result, and self-invites, current members, and duplicate active invitations are rejected. A stale PENDING-but-expired invitation is finalized (`EXPIRED`, key cleared, audit event) before a replacement is created. The invitation row, its `INVITATION_CREATED` audit event, the invitee's in-app notification, and — since Phase 4C — the email intent commit in one transaction. Acceptance re-validates invitee identity, PENDING status, expiry, a still-`RECRUITER` account role, and no existing membership inside the transaction, then compare-and-sets `PENDING → ACCEPTED` and creates a `MEMBER` membership; the browser can never choose a role, and the `unique(userId, companyId)` membership constraint stays authoritative under concurrent accepts. Decline and revoke share the same compare-and-set shape, so repeated or racing responses produce exactly one transition and one audit event.

Membership administration (promote, demote, remove, transfer, leave) re-authorizes the acting OWNER and resolves the target membership by `(membershipId, companyId)` inside every transaction; browser input never carries a role, actor, or audit value. Owner-count-reducing operations run under Serializable isolation with a bounded retry on serialization aborts and re-read the OWNER count in-transaction, so concurrent demotions, removals, and leaves cannot write-skew a Company to zero OWNERs — the invariant is "A company must keep at least one owner." Ownership transfer promotes the target before demoting the actor, so an OWNER exists at every instant, and records both role-change events. `CompanyMembershipEvent` is append-only with nullable `SetNull` actor/subject/invitation references, `fromRole`/`toRole`, and Company/date plus actor/date indexes; it has no edit or delete surface and is readable only through the OWNER-scoped team query.

Team routes are `/recruiter/companies/[companyId]/team` (OWNER-only: roster with the only member-email projection in the system, invite form, pending invitations with revoke, role actions, ownership transfer, and recent audit history) and `/recruiter/invitations` (strictly invitee-scoped accept/decline). A MEMBER sees only their own membership on the Company workspace. Unknown, foreign, and MEMBER-accessed team pages share the same not-found behavior; public Company/Job projections and Candidate surfaces expose no membership, email, invitation, count, or audit data; and an invitation notification grants nothing — every destination re-authorizes the session.

### Interview domain

`Interview` belongs to exactly one `JobApplication` (`onDelete: Cascade`); an Application may hold many Interviews over its lifetime. It carries a nullable server-derived `organizerUserId` (`onDelete: SetNull`, so history survives account removal), a bounded `title`, an `InterviewFormat` (`VIDEO`/`PHONE`/`ONSITE`/`OTHER`), an `InterviewStatus`, UTC `startAt`/`endAt` instants plus the separately stored IANA `timeZone` that scheduled them, bounded optional `location`/`meetingUrl`/`instructions`, an optimistic `version` starting at 1, and server-set `candidateRespondedAt`/`canceledAt`/`completedAt` timestamps. Candidate, Job, Company, and Recruiter data are read through authorized relations, never duplicated. Indexes cover the Application list (`applicationId, startAt`), organizer conflict windows and agendas (`organizerUserId, status, startAt`), status-filtered upcoming/past queries (`status, startAt`), and `createdAt`. `InterviewEvent` is the append-only audit trail: `interviewId`, nullable `actorUserId` (`SetNull`), an `InterviewEventType`, `fromStatus` (null for the initial `CREATED`), `toStatus`, a schedule snapshot (`startAt`/`endAt`/`timeZone`, set for `CREATED` and `RESCHEDULED`), and `createdAt`, indexed by `(interviewId, createdAt)` and `(actorUserId, createdAt)`; it has no edit or delete surface. The additive `20260713130051_interview_scheduling_workflow` migration creates both tables, the three enums, and the four interview values on `NotificationType` and `EmailEventType`.

The lifecycle is centralized and database-free, and every mutation is an explicit operation — never a generic status setter:

| Interview status   | Candidate may   | Recruiter OWNER may          |
| ------------------ | --------------- | ---------------------------- |
| `PENDING_RESPONSE` | Accept, Decline | Reschedule, Cancel           |
| `ACCEPTED`         | —               | Reschedule, Cancel, Complete |
| `DECLINED`         | —               | Reschedule, Cancel           |
| `CANCELED`         | — (terminal)    | — (terminal)                 |
| `COMPLETED`        | — (terminal)    | — (terminal)                 |

Scheduling starts at `PENDING_RESPONSE` with version 1. Rescheduling validates the full new schedule, re-runs conflict checks (excluding the interview's own slot), returns the status to `PENDING_RESPONSE`, clears `candidateRespondedAt`, makes the acting OWNER the organizer, and appends a `RESCHEDULED` snapshot event — prior events are never modified. Completion requires an `ACCEPTED` interview whose `startAt` is no more than five minutes in the future (a small documented clock-skew tolerance). Creation and rescheduling additionally require the Application to be active (`SUBMITTED`/`UNDER_REVIEW`/`INTERVIEW`/`OFFER`), re-read inside the transaction; Candidate withdrawal therefore blocks new scheduling while existing interview history remains visible. Interview transitions never mutate `ApplicationStatus` or write `ApplicationStatusHistory` — interview scheduling and the application pipeline are separate controlled workflows.

Schedule validation is shared Zod plus database-free helpers: bounded trimmed title; ISO instants that must carry an explicit zone designator; a 10-minute minimum lead and 365-day horizon for new schedules; a 15-minute to 8-hour duration; an IANA `Region/City` (or `UTC`) timezone validated through `Intl` — raw offsets and bare abbreviations are rejected; HTTPS-only meeting links (no `javascript:`, `data:`, `mailto:`, protocol-relative, credentialed, or whitespace-bearing URLs); and format rules (VIDEO requires a link, ONSITE a location, PHONE forbids a link, OTHER needs at least one attendance detail). The browser submits a UTC instant plus the selected zone (converted client-side by a pure, DST-tested wall-clock helper); the server re-validates both independently and never trusts a formatted display string. Rendering always formats the stored instant in the stored zone with a DST-aware abbreviation, so Candidate and Recruiter read the same underlying instant.

Conflict detection treats `PENDING_RESPONSE` and `ACCEPTED` as slot-occupying: the same Candidate (across all Companies, through `application.candidateId`) and the same organizer cannot hold two active interviews whose ranges overlap (`existing.startAt < proposed.endAt AND existing.endAt > proposed.startAt`; exact adjacency is allowed, and `DECLINED`/`CANCELED`/`COMPLETED` never block). Checks run inside a Serializable transaction with the repository's bounded three-attempt retry on serialization aborts, so concurrent overlapping creations or reschedules resolve to exactly one winner and the loser re-checks fresh state into a safe fixed conflict message that reveals nothing about the conflicting interview. Accept/decline/cancel/complete are compare-and-set `updateMany`s on id + `expectedVersion` + allowed current status that increment the version exactly once; `expectedVersion` is a concurrency token only, never authorization, and a stale writer receives a fixed refresh message.

Recruiter reads and mutations scope through OWNER membership of the Application's Job Company; Candidate reads and responses scope through `application.candidateId = session user`. MEMBER users, cross-Company Recruiters, other Candidates, Admins, and unknown ids share the same not-found behavior. Scheduling, rescheduling, and cancellation atomically emit the Candidate's in-app notification and email outbox (or `SUPPRESSED`) row; accept/decline atomically notifies every current Recruiter OWNER; completion emits nothing in this phase. Copy carries only the Job title and Candidate display name — never the meeting URL, location, instructions, schedule, or Candidate email — and meeting details stay behind the authenticated detail routes, which re-authorize independently of any notification or email. Routes are `/candidate/interviews`, `/candidate/interviews/[interviewId]`, `/recruiter/interviews`, and `/recruiter/interviews/[interviewId]`, plus interview sections on both application detail pages and dashboard cards. The Interview access matrix:

| Capability                 | Candidate (owner) | Company OWNER Recruiter  | Company MEMBER | Other-Company Recruiter | Admin | Public |
| -------------------------- | ----------------- | ------------------------ | -------------- | ----------------------- | ----- | ------ |
| Schedule / reschedule      | no                | yes (active Application) | no             | no                      | no    | no     |
| Cancel / complete          | no                | yes                      | no             | no                      | no    | no     |
| Accept / decline           | yes (pending)     | no                       | no             | no                      | no    | no     |
| View detail + meeting link | yes               | yes                      | no             | no                      | no    | no     |
| View history timeline      | yes               | yes                      | no             | no                      | no    | no     |
| Agenda list                | own only          | owned Companies only     | none           | none                    | none  | none   |

The Interview event/recipient matrix (notifications and email intent always share the transaction):

| Event                       | In-app + email recipient         | Actor excluded | MEMBER / Admin / other Company |
| --------------------------- | -------------------------------- | -------------- | ------------------------------ |
| INTERVIEW_SCHEDULED         | Application Candidate            | yes            | never                          |
| INTERVIEW_RESCHEDULED       | Application Candidate            | yes            | never                          |
| INTERVIEW_CANCELED          | Application Candidate            | yes            | never                          |
| INTERVIEW_RESPONSE_RECEIVED | Current Company Recruiter OWNERs | yes            | never                          |
| COMPLETED (this phase)      | none                             | —              | never                          |

## Authentication and authorization

Better Auth 1.6 is the identity and session library. The official Prisma adapter uses the existing Prisma 7 client and `@prisma/adapter-pg` architecture. Runtime queries use pooled `DATABASE_URL`; Prisma CLI validation and migration operations use direct `DIRECT_URL` through `prisma.config.ts`.

Email/password authentication is enabled with Better Auth's password hashing and credential verification. Sessions are stored in PostgreSQL, expire after seven days, and refresh after one day of use. Cookies use an application-specific prefix, HTTP-only/Lax defaults, and the Secure attribute in production. The base URL is explicit, development origins are allow-listed only outside production, and supported per-endpoint rate limits protect sign-in and sign-up. Credential Server Actions invoke Better Auth's HTTP handler rather than its direct server API so the handler's origin and rate-limit middleware runs; successful `Set-Cookie` values are parsed with Better Auth's cookie utilities and written through Next.js's Server Action cookie API.

Public role registration is deliberately narrow:

- The registration Server Action validates and normalizes the complete payload with Zod, including terms acceptance.
- Only `CANDIDATE` and `RECRUITER` pass the shared public role allow-list.
- A Better Auth database hook repeats the allow-list at user creation, while a user-update hook rejects every payload containing `role`.
- Mounted Better Auth routes use an explicit allow-list containing only session retrieval, sign-in, and sign-out. Registration and user updates cannot bypass the application Server Action and authorization boundaries.
- `ADMIN` exists in the database enum but can only be created through the gated development bootstrap workflow.

Authorization is centralized in `getCurrentSession`, `getCurrentUser`, `requireUser`, `requireGuest`, `requireRole`, role-to-dashboard mapping, and safe internal-path helpers. Protected pages call `requireRole` directly. Server Actions call guest/user guards inside the action. Future protected Route Handlers must return 401/403 when redirects are unsuitable and must call the same authoritative session layer. No middleware or proxy is used as the final security boundary.

Candidate profile Server Actions call `requireRole("CANDIDATE")` independently of page rendering. They construct the actor from the authenticated session and do not accept browser-supplied ownership or role fields. Update and delete commands include `candidateProfile.userId` in their database predicates; a miss becomes the same unavailable-record result whether a row is absent or belongs to someone else. Shared command functions repeat the Candidate role assertion, which also makes database integration boundaries directly testable. Admin follows the existing exact-role policy and receives no implicit Candidate-data access.

Recruiter Company Server Actions independently call `requireRole("RECRUITER")`, derive the actor from the server session, and map only validated fields. Company commands repeat the role assertion and scope writes through OWNER membership. Private membership reads and OWNER-only edits are re-authorized on every request; hiding controls is never treated as authorization. Phase 1 still assigns one platform role per user, while Company membership is a separate domain permission. Production Admin elevation/auditing, account recovery, deletion, and retention behavior remain later design work.

Job Server Actions independently call `requireRole("RECRUITER")`, derive the actor from the server session, validate the lifecycle action against a fixed enum, and map only validated content fields. Every Job command repeats the role assertion and scopes reads and writes through the authenticated user's OWNER membership of the Job's Company, re-authorizing each Job ID rather than trusting a browser-supplied `companyId`, status, or ownership field. Lifecycle transitions and publication readiness are re-evaluated inside the authorized command against fresh database data, so a hidden or replayed request cannot force an invalid status or publish an incomplete Job.

Application Server Actions independently call `requireRole("CANDIDATE")` for apply/withdraw and `requireRole("RECRUITER")` for status transitions, and derive identity from the session so `candidateId`, `recruiterId`, Company ownership, `submittedAt`, `withdrawnAt`, and status history are never client-controlled. The recruiter transition action validates the destination against a fixed enum that omits SUBMITTED and WITHDRAWN, then the command re-loads the current status from the database and re-validates the transition through the centralized lifecycle table before a compare-and-set update writes the status and its history row atomically. Every application command re-authorizes the application ID under candidate ownership or OWNER membership, returns safe generic errors, and never exposes Prisma internals or foreign application existence.

Saved Job Server Actions independently call `requireRole("CANDIDATE")`, derive `candidateId` from the session, validate only the bounded Job slug, and re-check Job/Company publication for every new save. Removal scopes the relation by the same session Candidate and Job slug. Recruiter and Admin roles cannot save or remove, foreign relation existence is never disclosed, and action results contain only safe UI state and generic messages.

Candidate document Server Actions independently call `requireRole("CANDIDATE")` and derive `candidateId` from the session; the browser never supplies a document ID, storage key, `candidateId`, or `resumeDocumentId`. Upload/replace validate the PDF (size, MIME, extension, and `%PDF-` magic bytes together), generate the storage key and SHA-256 server-side, and coordinate storage and database as described in the document domain. The existing-application attach action re-authorizes ownership, re-reads the current pointer, refuses to replace an existing snapshot, and uses a compare-and-set bounded to active statuses. The download Route Handler runs on the Node runtime and re-authorizes every request through the same session layer: it resolves the document, computes an owned application relation for Recruiters, and applies a single pure decision — a Candidate reaches only their own documents, a Recruiter reaches only a document attached to an application whose Job Company they OWN, and MEMBER, other-company, cross-Candidate, Admin, and signed-out requests are denied identically with a uniform 404 that never reveals existence. It streams `application/pdf` as a forced attachment with `private, no-store` and `nosniff`, writes a `CandidateDocumentAccessLog` row only on success, and never leaks storage keys, bucket names, endpoints, paths, credentials, or raw provider errors.

Application note Server Actions independently call `requireRole("RECRUITER")`, derive the actor from the session, and validate only the note body plus a `noteId`/`expectedRevision` concurrency token — never `authorUserId`, `candidateId`, `companyId`, ownership, revision actor, or timestamps. Every command re-authorizes the target through the application's Job Company OWNER membership inside the transaction: reads and creates require OWNER; edits and soft-deletes additionally require the actor to be the note's original author on an undeleted note. `expectedRevision` is only a concurrency token, never authorization. The note history page and all list note-counts re-check OWNER scope on every request, and absent, foreign, MEMBER-only, cross-Company, Candidate, Admin, and signed-out requests return the same not-found so note existence is never revealed. Note bodies are rendered as escaped plain text with preserved line breaks, never HTML or Markdown, and never appear in any Candidate or public projection.

Notification creation is never a standalone Server Action: it happens only inside the authoritative application submission, status-transition, and withdrawal commands, which already derive identity from the session and resolve recipients from fresh database state, so a client can never control the recipient, actor, type, title, message, href, or dedupe key. The `/notifications` route and the mark-as-read Server Actions gate through a shared recipient guard that requires an authenticated `CANDIDATE` or `RECRUITER` (Admins are redirected to their dashboard, signed-out users to sign-in with a safe callback). Mark-one validates only a `notificationId` reference and scopes the `updateMany` to `(id, recipientUserId = session user, readAt: null)`; mark-all scopes to the session user's unread rows. Both are idempotent, never touch another recipient's rows, and return safe generic messages with no Prisma internals. Every notification read is recipient-scoped, and the destination route (`/candidate/applications/[applicationId]` or `/recruiter/applications/[applicationId]`) re-authorizes independently, so a notification never bypasses application authorization.

### Admin trust and moderation domain

`UserAccountStatus` (`ACTIVE`, `SUSPENDED`) is an access state separate from `Role`. `User` carries a server-owned `moderationVersion` starting at 1 plus mutually consistent `suspendedAt`/`restoredAt` timestamps. `ContentModerationStatus` (`VISIBLE`, `HIDDEN`) is shared by `Company` and `Job`; each record has its own monotonic moderation version and last `moderatedAt`. These flags never rewrite `Company.isPublished` or `Job.status`, so restore cannot accidentally publish private, Draft, Closed, or Archived content.

`AdminAuditEvent` is the append-only platform moderation ledger. It references one nullable User, Company, or Job target and a nullable Admin actor using `onDelete: SetNull`, carries one `AdminAuditAction`, one `ModerationReasonCode`, an optional `VarChar(500)` plain-text note, and `createdAt`, and has no update/delete application surface. Database checks enforce positive versions, consistent User suspension timestamps, and live target/action compatibility while permitting all-null targets only after a retained target is deleted. Indexes support newest-first global, actor, target, and action timelines. No passwords, sessions, tokens, CV/document metadata, Application/note content, private Interview details, email content/provider responses, stack traces, or arbitrary JSON enter this table.

All `/admin/**` pages pass through the Admin layout and call the centralized `requireActiveAdmin` guard at the route boundary. Every Server Action calls it again because action endpoints are independently reachable, and the mutation domain re-reads the actor's `ADMIN` role and `ACTIVE` account state inside the same transaction as the target change. The actor id, Admin role, current state, target role, audit action, timestamps, and version increments come from the session and fresh database rows, never browser input. Admin list/detail queries explicitly select moderation-minimum fields: safe User identity; Company publication plus owner/member/job counts; Job title, Company, lifecycle and visibility; and audit actor/target labels. Dashboard audit projections omit reason notes; detail/audit projections include them only for active Admins. They never join Candidate profiles/CVs, Applications/cover letters, notes/revisions, private Interview fields, notifications/dedupe keys, auth accounts/sessions, or email delivery data.

The User suspend transaction re-reads the target, rejects self/Admin targets, validates the expected version, compare-and-sets active Candidate/Recruiter state, appends `USER_SUSPENDED`, and deletes every Better Auth session for that User. Restore uses the symmetric compare-and-set and `USER_RESTORED` event but creates no session. Better Auth's session-create hook rejects a suspended User before insertion, and the central session helper independently re-reads the authoritative User row on every cached request boundary; a suspended User is returned as signed out and any surviving sessions are deleted. This is defense in depth against stale cookies and direct auth endpoint use.

Company and Job hide/restore commands use the same target-id plus expected-version compare-and-set. A stale or repeated operation changes nothing and appends no audit row. Public Company reads require published plus `VISIBLE`; public Job reads require lifecycle `PUBLISHED`, Job `VISIBLE`, and parent Company published plus `VISIBLE`. One canonical pair of Prisma predicates covers public list/detail/featured/search/metadata data sources, Job saving, apply-page eligibility, and the fresh transaction read that creates an Application. Public Company queries select presentation fields only and omit moderation versions/timestamps. Hidden detail resolves through normal not-found behavior. Authorized Recruiter membership/OWNER reads deliberately omit moderation from their ownership predicates, preserving private workspace access with a fixed notice and without the Admin reason note.

Moderation controls access and public visibility; it does not destroy or rewrite historical business records. Applications and status history, Saved Jobs, Interviews/events, Candidate documents and application snapshots, internal notes/revisions, Company memberships/invitations/events, notifications, email outbox/attempts, and Admin audit rows remain in place. Candidate Saved Jobs derive `OPEN` only from the full public eligibility predicate and otherwise show `UNAVAILABLE` without revealing moderation reason.

Admin dashboard counts use parallel database aggregates and at most ten recent audit rows. The User, Company, Job, and audit directories validate URL search/filter/page input, use a fixed page size of 20, count separately, and order by `createdAt DESC, id DESC`. The additive `20260713194410_admin_trust_moderation` migration adds the four enums, defaulted moderation columns, indexes, checks, audit table, and retention-oriented foreign keys without deleting or rewriting existing rows.

Deferred from this domain: User reports, automated fraud scoring, automated/AI moderation, content scanning, KYC/identity verification, Company verification badges, appeals, legal takedowns, billing, Admin impersonation, custom Admin permission levels, Admin messaging, production Admin provisioning changes, and analytics beyond the small truthful dashboard counts.

### Analytics read architecture (Phase 6B)

Analytics live under `src/features/analytics`: `analytics.ts` owns database-free date, bucket, status, funnel, and percentage semantics; `schemas.ts` owns stripped URL schemas; `server/admin.ts`, `server/recruiter.ts`, `server/candidate.ts`, and `server/queries.ts` form a `server-only` data-access layer; the components render aggregate DTOs only. Pages await Next.js 16 `searchParams`, call the existing active role guard, create one server `now`, and pass a minimal actor to a read function that independently re-reads current role/account state. No analytics API, mutation, shared cache, browser Prisma access, or public route exists.

The trust model is zero-trust for URL state. Admin accepts only `range`; Candidate accepts only `range` and always derives `candidateId` from the active session; Recruiter accepts `range`, `companyId`, and `jobId`, then loads only current `OWNER` Companies and Jobs belonging to the selected authorized Company. One owned Company is selected automatically; changing Company removes `jobId`; MEMBER-only, removed, unknown, and cross-Company selections share the same unavailable result. Analytics results do not authorize the underlying Job, Application, Interview, or Candidate record.

#### Analytics access matrix

| Surface                | Active authorized User | Additional scope                                      | Denied                                                      |
| ---------------------- | ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `/admin/analytics`     | `ADMIN`                | Platform aggregates only                              | Candidate, Recruiter, suspended, signed out                 |
| `/recruiter/analytics` | `RECRUITER`            | Current Company `OWNER`; optional Job in that Company | MEMBER, removed OWNER, cross-Company/unknown Company or Job |
| `/candidate/analytics` | `CANDIDATE`            | `JobApplication.candidateId = session User id`        | Other Candidate, Recruiter, Admin, suspended, signed out    |
| Public routes/API      | None                   | None                                                  | Everyone                                                    |

#### Metric-definition table

| Semantic                  | Definition                                                                                                                                          | Examples                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Current state             | Evaluated now across the complete authorized Company/Job or Candidate scope; not restricted to cohort creation date                                 | Active Applications, current status distribution, published Jobs, upcoming/completed Interviews, Saved Jobs |
| Created in selected range | Row `createdAt` is within the server-derived UTC half-open interval                                                                                 | New Users/Companies/Jobs/Applications/Interviews                                                            |
| Ever reached stage        | Unique Application belongs to the creation cohort and has the initial stage or an immutable history event for the stage at any time through `endAt` | Reached Interview, Offer, Hired, Rejected, Withdrawn                                                        |
| Application cohort        | Applications whose `createdAt` is in the selected interval; later lifetime transitions remain included                                              | Funnel and outcome cards                                                                                    |

`SUBMITTED` is established from every cohort `JobApplication` row, so legacy rows cannot disappear solely because an initial history record is absent. Later stages come from `ApplicationStatusHistory.toStatus`. SQL `UNION` removes repeated `(applicationId, stage)` pairs before counting; current `JobApplication.status` remains the source for current-state distributions. Interview scheduling is not treated as an Application pipeline transition.

#### Funnel-definition table

| Order | Stage/exit     | Meaning                                                       | Conversion denominator             |
| ----- | -------------- | ------------------------------------------------------------- | ---------------------------------- |
| 1     | `SUBMITTED`    | Every Application in the selected creation cohort             | Cohort marker; no stage percentage |
| 2     | `UNDER_REVIEW` | Unique cohort Applications that ever reached review           | Reached `SUBMITTED`                |
| 3     | `INTERVIEW`    | Unique cohort Applications that ever reached Interview status | Reached `UNDER_REVIEW`             |
| 4     | `OFFER`        | Unique cohort Applications that ever reached Offer            | Reached `INTERVIEW`                |
| 5     | `HIRED`        | Unique cohort Applications that ever reached Hired            | Reached `OFFER`                    |
| Exit  | `REJECTED`     | Unique cohort Applications that ever reached Rejected         | Shown separately                   |
| Exit  | `WITHDRAWN`    | Unique cohort Applications that ever reached Withdrawn        | Shown separately                   |

Overall hire conversion is reached `HIRED / SUBMITTED`. A denominator of zero produces `null` and renders as an em dash; all other rates are finite and rounded to one decimal. Rates describe recorded cohort flow only and never imply causation, quality, ranking, probability, or a forecast.

#### Date-range and trend table

| Preset | Start                                                     | End                               | Base trend bucket                                                            |
| ------ | --------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| `30D`  | UTC midnight 29 calendar days before the current UTC day  | Current server instant, exclusive | Daily                                                                        |
| `90D`  | UTC midnight 89 calendar days before the current UTC day  | Current server instant, exclusive | Daily                                                                        |
| `180D` | UTC midnight 179 calendar days before the current UTC day | Current server instant, exclusive | ISO-style week, first window clipped to range                                |
| `365D` | UTC midnight 364 calendar days before the current UTC day | Current server instant, exclusive | ISO-style week, first window clipped to range                                |
| `ALL`  | Earliest authorized source row                            | Current server instant, exclusive | Calendar month; adjacent months compact when history would exceed 120 points |

The browser never supplies start/end dates. The domain creates at most 120 parameterized UTC `(startAt, endAt)` windows, and raw SQL joins only against those server-built values; all table identifiers and scope joins are static server code. Missing windows are also zero-filled by a database-free helper, output is chronologically stable, and charts expose text/table fallbacks. No untrusted identifier or bucket string enters SQL.

Admin reads use parallel counts, grouped current distributions, one distinct-stage funnel aggregate, and five independently described trends. Recruiter reads return at most 100 safe selector entries and a stable top-25 Job performance list ordered by in-range Application count, title, and id; its aggregate rows contain Job title/lifecycle/moderation plus counts only. Candidate reads return only personal counts. There is no N+1 Application loading and no raw Application list in an analytics DTO.

The additive `20260714021140_analytics_query_indexes` migration adds only indexes exercised by these reads: `company(createdAt)` and `job(createdAt)` for platform creation trends; `job_application(createdAt)`, `(candidateId, createdAt)`, `(jobId, createdAt)`, and `(status, createdAt)` for platform/cohort, personal, Job, and state/time scans; and `interview(applicationId, createdAt)` for scoped Interview creation counts. Existing `user(createdAt)`, User role/account indexes, Company/Job moderation indexes, `job(companyId, status, createdAt)`, Application Candidate/Job status indexes, `application_status_history(applicationId, createdAt)`, Interview status/agenda/created indexes, and `saved_job(candidateId, createdAt, id)` remain sufficient for the other predicates.

#### Analytics privacy matrix

| Viewer          | Returned                                                               | Never returned                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin           | Platform counts, distributions, funnels, trends, visible/hidden totals | Candidate identity/CV/cover letter, notes, private Interview details, EmailOutbox/delivery, Notifications, sessions/accounts, moderation note text |
| Recruiter OWNER | Selected Company/Job labels and aggregate workflow counts              | Candidate name/email/phone/id, CV metadata, note bodies, meeting URL/location, another Company, Admin reason note                                  |
| Candidate       | Own aggregate Application/Interview/Saved Job counts                   | Other Candidate data, membership data, Recruiter private email, internal notes, email/notification infrastructure, moderation reason               |
| Public          | Nothing                                                                | Every analytics metric and payload                                                                                                                 |

Moderation does not erase history: Admin may count hidden records, an authorized OWNER may see a safe Hidden label, and a Candidate's historical Application remains included, while no surface exposes the reason note. Charts are supplemental, non-animated, theme-token based, responsive, visibly titled/described, safe at zero, and paired with numeric summaries and tables. No third-party tracking or chart dependency was added. Page views, unique visitors, clicks, email opens/clicks, exports, scheduled reports, data warehouse/ETL work, materialized views, predictions, rankings, and forecasts remain deferred. Phase 6C localizes labels and display formatting without changing these semantics.

## Internationalization architecture (Phase 6C)

Phase 6C is a presentation and delivery-localization layer over the already completed Phase 6B analytics and product workflows. `src/i18n/config.ts` owns the four route locales (`en`, `tr`, `az`, `ru`), their Prisma `AppLocale` mappings, Intl locale identifiers, the English default, and the locale cookie contract. `src/i18n/routing.ts` owns canonical internal-path parsing and localization; `src/i18n/dictionaries` contains statically known per-locale dictionary modules behind a server loader; `src/i18n/format.ts` owns locale-aware dates, relative time, counts, and percentages. Domain schemas use localized schema factories or stable codes so validation rules are not copied four times.

### Locale resolution matrix

| Context                        | Source of locale                             | Persistence/write behavior                                    | Invalid value behavior                            |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Locale-prefixed page render    | Valid first URL segment                      | No implicit account mutation                                  | Locale catch-all/not found                        |
| Legacy unprefixed page request | Valid locale cookie, otherwise `en`          | Redirects to one prefixed page URL                            | Ignores invalid cookie                            |
| Authenticated language change  | Server-validated requested locale            | Updates dedicated `User.preferredLocale` operation and cookie | Fixed localized error; no write                   |
| Registration                   | Server-validated route locale                | Initializes account preference and cookie                     | Route cannot supply an unsupported locale         |
| Sign-in                        | Stored `User.preferredLocale`                | Mirrors preference to cookie and localizes safe destination   | Stored enum/default is authoritative              |
| Notification/email event       | Recipient preference read inside server flow | Snapshots locale with rendered immutable content              | Database enum/default prevents unsupported values |

The language-switch operation accepts only a supported locale and a safe same-origin internal path. It strips an existing locale prefix before adding exactly one new prefix, preserves query strings and dynamic segments, and rejects protocols, protocol-relative URLs, traversal, encoded bypasses, and external callback destinations. Better Auth generic User updates cannot mutate `preferredLocale`; only the dedicated validated operation can do so. Locale never enters a role, ownership, moderation, or record-visibility predicate.

### Routing boundary matrix

| Request class                                    | Locale behavior                      | Security/compatibility rule                       |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------- |
| `/en`, `/tr`, `/az`, `/ru` and descendants       | Render localized App Router tree     | Exactly one supported prefix                      |
| Legacy page URL                                  | Temporary locale-resolution redirect | Query, filters, pagination, and IDs retained      |
| `/api` including Better Auth/internal dispatcher | Never prefixed or redirected         | Existing API authentication remains authoritative |
| `/_next`, static files, metadata files           | Never prefixed or redirected         | Framework and asset delivery unchanged            |
| Private document download                        | Remains canonical and unprefixed     | Existing session/ownership check unchanged        |
| Unknown localized page                           | Localized safe not-found surface     | No route discovery or authorization detail        |

The root layout remains the only document layout and supplies the validated language to `<html lang>`. Locale layouts/pages await Next.js 16 route parameters. Public Landing, Job list/detail, and Company list/detail metadata use localized titles/descriptions, canonical localized URLs, and `hreflang` alternates for all four locales. User-authored names/titles are not translated; hidden or unpublished content remains unavailable through the same public predicates.

### Translation ownership matrix

| Data                                             | Application-owned presentation                         | User-authored payload                                          |
| ------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------- |
| Candidate profile, education, experience, skills | Headings, fields, actions, completion and validation   | Biography and entered professional/education/experience values |
| Company and Job                                  | Workspace, lifecycle/moderation, filters, statuses     | Company name/description; Job title/description/requirements   |
| Applications and documents                       | State/actions/timeline/CV controls                     | Cover letter and CV content/metadata values                    |
| Notes and Interviews                             | Controls, status, agenda/history labels                | Note text, instructions, location, meeting URL                 |
| Admin                                            | Directories, moderation controls, audit/pagination     | Moderation note text                                           |
| Analytics                                        | Labels, descriptions, accessible summaries, formatters | No user-authored payload is selected for charts                |

Dictionaries are plain typed data: no external translation API, runtime code execution, HTML execution, or Markdown execution exists. English is the source shape. Tests recursively enforce namespace, key, placeholder, plural-family, and nonempty-value parity, plus native Turkish/Azerbaijani characters and Russian Cyrillic. Locale-aware schema factories reuse identical constraints across translations, and Server Actions return localized safe feedback without exposing Zod internals, Prisma errors, stacks, or hidden authorization state.

### Event-time delivery matrix

| Property                             | Notification                                                               | EmailOutbox                                                           |
| ------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Locale source                        | Recipient `preferredLocale`                                                | Recipient `preferredLocale`                                           |
| Snapshot                             | `locale`, localized title/message                                          | `locale`, localized subject/text/escaped HTML                         |
| Destination at rest                  | Canonical locale-neutral internal path                                     | Canonical locale-neutral internal path                                |
| Destination at presentation/delivery | Safe locale prefix from snapshot                                           | Safe locale prefix from snapshot, then server base URL                |
| Immutability                         | Later preference changes do not rewrite history                            | Retry reuses queued subject/body/locale/destination                   |
| Dedupe/atomicity                     | Existing deterministic key and business transaction                        | Existing deterministic key, preference status, and outbox transaction |
| Sensitive exclusions                 | Email, CV metadata, notes, meeting/location/instructions, moderation notes | Same exclusions                                                       |

Mixed-locale recipients are rendered independently in the authoritative business transaction. Provider I/O remains outside it. `PENDING`, `SUPPRESSED`, `PROCESSING`, `RETRY_SCHEDULED`, `SENT`, and `DEAD_LETTER`, skip-locked claiming, lock-token ownership, append-only attempts, and preference behavior are unchanged. The development/test provider performs no real delivery.

Dates and relative time use stored UTC instants with locale-specific presentation. Analytics retains the exact Phase 6B server-created half-open UTC ranges, bucket membership, status/funnel counts, null denominators, and one-decimal numeric semantics; only labels and Intl formatting change. Authorization and privacy DTO tests remain locale-independent by design, while localization tests prove dictionary/formatter/template parity.

## Validation and forms

- Zod will validate data at every untrusted boundary.
- React Hook Form drives accessible client interactions while the same Zod schemas remain authoritative in Server Actions.
- Server-side validation remains authoritative even when client validation exists.
- Form components must provide accessible labels, instructions, errors, and pending states.
- Candidate professional URLs are normalized only after a valid `http` or `https` protocol check.
- Education and experience current/end-date invariants are enforced by shared Zod schemas before every write.
- Skill names are NFKC-normalized, trimmed, whitespace-collapsed, character-limited, and compared by a lower-case lookup name.
- Recruiter and Company optional text is trimmed and explicitly mapped to database nulls; unknown browser fields are stripped and never mass-assigned.
- LinkedIn and Company websites reject malformed, protocol-relative, `javascript:`, `data:`, `file:`, and other unsupported protocols before URL normalization.
- Company size is an explicit enum, founded year is bounded from 1600 through the current UTC year, and public filters are trimmed and limited to 100 characters.
- Saved Job search is trimmed and limited to 100 characters; availability accepts only `ALL`, `OPEN`, or `UNAVAILABLE`, unknown fields are ignored, and server queries remain Candidate-scoped and capped at 100 rows.

## File and document handling

Private Candidate documents use a provider-agnostic storage abstraction in `src/lib/storage`: a `PrivateDocumentStorage` interface (`putObject`, `getObject`, `deleteObject`, `objectExists`) with a local filesystem driver and an S3-compatible driver, chosen at runtime by `DOCUMENT_STORAGE_DRIVER`. The abstraction is injected into document commands so tests use an in-memory fake with no cloud credentials.

- Storage keys are always generated server-side, are opaque, are never derived from the original filename, and are validated against traversal before any filesystem resolution. Objects live outside every public web directory and are never given public URLs.
- The local driver is permitted only in development and test. It writes under the git-ignored `.careerbridge-private-storage` root, re-resolves every key against that root to prevent traversal, and writes objects exclusively so a stored object is immutable. Production rejects the local driver.
- The S3-compatible driver targets a private bucket using server-side credentials and a dependency-free AWS Signature V4 signer (verified against AWS's published derivation vector), supporting a custom endpoint, region, and path-style addressing for non-AWS providers. Missing production configuration fails loudly; credentials are never logged, placed in client bundles, or stored in the database.
- Uploads accept only PDFs and require agreement across a non-zero size up to 5 MB, an `application/pdf` MIME type, a `.pdf` extension, and a `%PDF-` signature. Filenames are sanitized for safe display and Content-Disposition, SHA-256 is computed server-side, and content is never parsed, rendered, or previewed inline.
- Downloads are authenticated, re-authorized per request, forced as attachments, and audit-logged. Dedicated malware scanning and AI resume parsing/OCR/scoring are explicitly deferred and are not claimed to exist.

## Security and privacy

- Secrets live in environment variables and never in tracked files.
- Database and service clients are server-only and initialized lazily.
- Passwords are handled only by Better Auth and are never logged or stored in plaintext.
- Next.js development Server Function logging is disabled so authentication action arguments are never serialized to the terminal.
- Auth failure diagnostics are prefixed and structured, and include only an event name, failure category, HTTP status, and allow-listed error code/type. Request bodies, identifiers, messages, cookies, tokens, secrets, and database URLs are excluded.
- Session tokens and cookies are never exposed to client components or logs.
- Redirect callbacks accept only normalized same-origin paths authorized for the session role.
- Public registration cannot assign `ADMIN`.
- Protected mutations require authentication, authorization, validation, and audit context.
- Sensitive candidate data follows least-privilege access.
- Security headers, rate limiting, CSRF posture, content policy, and abuse controls are hardened before public launch.

## Accessibility and interface system

- shadcn/ui and Radix primitives provide accessible interaction foundations.
- Theme variables are the source of truth for color and surface styling.
- Light and dark themes must both meet contrast expectations.
- Semantic elements, keyboard support, focus visibility, reduced-motion behavior, and responsive layouts are release requirements.

## Technical decisions

| Decision                          | Rationale                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| Next.js App Router                | Server-first rendering, route composition, metadata, and a unified full-stack path            |
| TypeScript strict mode            | Stronger contracts and safer refactoring                                                      |
| Tailwind CSS 4 and theme tokens   | Consistent responsive styling with a small CSS surface                                        |
| shadcn/ui with Radix              | Accessible primitives owned and customizable in-repository                                    |
| PostgreSQL and Prisma 7           | Relational integrity, migrations, and type-safe queries                                       |
| Better Auth and Prisma adapter    | Maintained credential hashing, sessions, cookies, and generated identity models               |
| Single typed platform role        | Minimal Phase 1 authorization model that can evolve with later ownership rules                |
| npm                               | Simple, widely supported package workflow                                                     |
| Server Components by default      | Less client JavaScript and clear server/client boundaries                                     |
| Narrow Phase 2A profile schema    | Adds only reviewed Candidate ownership and lifecycle relationships                            |
| Explicit Company membership       | Separates platform role from extensible Company ownership without implicit access             |
| Private-by-default publication    | Prevents incomplete or unapproved Company and Job records from entering discovery             |
| Centralized Job lifecycle         | A single server-owned transition table blocks arbitrary status changes from forms             |
| DB-unique application constraint  | `unique(jobId, candidateId)` makes duplicate and concurrent applies safe by design            |
| Atomic status + history writes    | Each status change and its history row commit in one transaction, never partially             |
| Integer salary representation     | Stores money as exact whole currency units instead of floats or minor units                   |
| Immutable CV versions + pointer   | Old documents stay valid on historical applications after the current CV changes              |
| Injectable private storage        | Local and S3-compatible drivers behind one interface; production forbids local disk           |
| Revisioned soft-delete for notes  | Immutable `(noteId, version)` history plus `deletedAt` keeps a full internal audit trail      |
| Compare-and-set note edits        | `expectedRevision` + unique version make concurrent edits safe without last-writer-wins loss  |
| Server-side upload then DB commit | Best-effort object cleanup on failure prevents pointers to missing storage objects            |
| In-transaction notification emit  | Notifications commit with the application/history write, so they are never orphaned or lost   |
| Unique `dedupeKey` notifications  | Deterministic server keys make transaction retries and concurrent duplicate events idempotent |
| Nullable unique invitation key    | At most one active invitation per Company and invitee is enforced by the database             |
| Serializable owner-count changes  | Concurrent demotion, removal, leave, and transfer can never leave a Company with zero OWNERs  |
| Append-only membership events     | Every invitation and membership change commits atomically with an immutable audit record      |
| Transactional email outbox        | Domain writes stay atomic while external provider I/O runs after commit                       |
| PostgreSQL skip-locked claiming   | Concurrent dispatchers claim disjoint bounded work without process-local locks                |
| Event-time preference snapshots   | Disabled email remains auditable and never changes independent in-app delivery                |

## Local migration workflow

1. Configure pooled `DATABASE_URL` and direct `DIRECT_URL` in the untracked `.env`.
2. Edit `prisma/schema.prisma` using Prisma 7 conventions; do not add a datasource URL to the schema.
3. Run `npm run prisma:validate` and `npm run prisma:generate`.
4. Run `npm run prisma:migrate:dev -- --name <clear_name>` against the development database.
5. Review the generated SQL before sharing the change. Never reset a populated database without explicit approval.
6. Apply migrations to tests only by temporarily setting Prisma's CLI connection to the distinct `TEST_DATABASE_URL`; never fall back to an application URL.

## Development Admin bootstrap

The `npm run admin:bootstrap` command requires `ADMIN_BOOTSTRAP_ENABLED=true`, a dedicated `ADMIN_BOOTSTRAP_DATABASE_URL`, and validated name, email, password, Better Auth URL, and Better Auth secret variables. It refuses known production environments and never infers database safety from the web origin. Both Better Auth credential creation and Prisma promotion use the dedicated client. The command refuses to elevate an existing non-Admin account, removes the bootstrap-created session, and is idempotent when the Admin already exists. Credentials and connection strings are never hardcoded or printed.

## Production deployment architecture

Phase 7A targets Vercel without changing product-domain trust boundaries. Vercel auto-detects the Next.js framework and serves locale-prefixed pages plus unprefixed API/metadata routes. A dedicated Neon production database supplies a pooled `DATABASE_URL` to lazy Prisma runtime clients and a distinct direct `DIRECT_URL` to Prisma CLI migrations. Development, isolated integration test, Preview, and Production resources must remain separate; Preview is never allowed production database, CV-storage, email, or dispatcher credentials.

The server-only Zod environment boundary is production-aware and reports only invalid variable names. Vercel production startup and the deployment workflow reject missing or placeholder database/auth/origin/storage/email/dispatcher values, localhost or mismatched canonical origins, local CV storage, the email log driver, disabled database TLS, and an enabled Admin bootstrap. `APP_BASE_URL` is the canonical metadata origin; Better Auth and email origins must match it in Production. Preview Better Auth uses the exact Vercel hostname and optional exact trusted origins without a wildcard. Production and Preview cookies remain Secure.

The manual GitHub deployment workflow uses a protected `production` Environment, exact commit SHA, least-privilege permissions, one non-canceling concurrency group, pinned Node/Vercel CLI versions, and Vercel's prebuilt flow. It installs from `package-lock.json`, pulls Production configuration, validates/gates/builds, runs `prisma migrate deploy` only after artifact success, deploys that already-built artifact, and smoke-tests the returned URL. A successful migration followed by deployment failure leaves the old application against the additive schema, so expand-and-contract compatibility is a release invariant. Application rollback never implies a database down migration.

CI has a static/unit/build job and a separate database integration job. The integration job requires the GitHub `TEST_DATABASE_URL` secret and explicit opt-in, maps only that connection to Prisma migration validation, and fails visibly when it cannot run. Superseded PR/branch CI cancels; production work never does.

The existing private S3-compatible provider is mandatory on Vercel-like production runtimes; authorized downloads, immutable CV versions, Application snapshots, and access auditing are unchanged. The Resend provider is mandatory for Production delivery, but no provider call occurs in domain transactions. `GET /api/internal/email-dispatch/cron` uses a separate bearer secret, constant-time comparison, and direct service invocation while the outbox's skip-locked claims, lock tokens, stale recovery, retries, dead letters, attempt history, and idempotency remain authoritative. Schedule activation is external because the Vercel plan is unknown.

`GET /api/health` is uncached, unauthenticated, and minimal. It races one read-only database probe against a bounded timeout and returns 200/503 without infrastructure details. Global headers provide MIME sniffing protection, strict-origin referrers, restrictive browser feature policy, frame denial, and Production-only HSTS. A strict nonce-based CSP is deferred to Phase 7B. Localized metadata resolves against the validated canonical origin; dynamic sitemap queries reuse the public publication/moderation predicates and robots excludes API/auth/private role surfaces.

Structured server logging accepts only bounded safe metadata and redacts sensitive key classes/free-form strings. Existing auth diagnostics and email logs expose stable categories/aggregate counts only. The complete external setup, rollback, provider-outage, credential-rotation, and incident procedures live in `docs/deployment.md` and `docs/operations-runbook.md`. Repository implementation does not claim external infrastructure or a completed production deployment.

## Transactional email outbox

`EmailEventType`, `EmailOutboxStatus`, and `EmailDeliveryAttemptStatus` are independent from `NotificationType`. `UserEmailPreference` is unique by user and event; absence means enabled. The authoritative application, invitation, or interview transaction resolves current recipients, renders a database-free template, evaluates the preference, and creates `PENDING` or `SUPPRESSED` intent with a deterministic unique key. In-app notifications are written independently in the same transaction. Phase 5A adds the four interview events without changing this architecture; the Interview email preference matrix is: Candidate — Interview scheduled, Interview rescheduled, Interview canceled; Recruiter — Interview responses; Admin — none. Interview email bodies never contain the meeting URL, location, instructions, or schedule.

`EmailOutbox` retains the immutable recipient-email snapshot, escaped HTML/plain-text content, safe internal destination, event relations, attempt counter, lock state, and provider result. Context and recipient relations use `SetNull` retention. `EmailDeliveryAttempt` is append-only and contains only the attempt number, status, bounded provider/category data, optional provider id, and timestamps—never the recipient, body, raw response, headers, stack, or secrets.

The dispatcher trust boundary is `POST /api/internal/email/dispatch` on the Node runtime. A constant-time comparison authenticates `Authorization: Bearer` against `EMAIL_DISPATCH_SECRET`; failures reveal no configuration details. The handler returns only `claimed`, `sent`, `retryScheduled`, `deadLettered`, and `skipped`. It never accepts queue fields from the browser and exposes no outbox read route.

Claiming runs in a short PostgreSQL transaction: stale `PROCESSING` rows older than ten minutes return to `RETRY_SCHEDULED`, then due `PENDING`/`RETRY_SCHEDULED` rows are selected with `FOR UPDATE SKIP LOCKED` in a maximum batch of 100. Each receives a fresh lock token. Provider calls run after commit; success/failure finalization and its attempt row are another transaction scoped to `status = PROCESSING` and that token. Resend receives the immutable dedupe key as its idempotency key to cover retries across a crash between provider acceptance and database finalization.

Retry delays are bounded at 1 minute, 5 minutes, 30 minutes, 2 hours, and 12 hours. Network, timeout, HTTP 429, and 5xx categories retry until `maxAttempts`; stable permanent rejection/configuration categories and exhausted work become `DEAD_LETTER`. No public manual retry or Admin delivery dashboard exists.

Templates accept server-resolved display strings only, escape all HTML, require plain text, and store an internal destination validated by the shared same-origin helper. At delivery, a server-only base URL turns that path absolute; production requires HTTPS while localhost is allowed outside production. Email possession never authorizes an application, company, CV, note, invitation, or membership. Destination routes perform their normal session/ownership checks, and company invitations still have no public email token.

The default development/test `log` provider performs no network call and logs only a generic simulation message. Production refuses it and lazily validates the Resend key, sender, and HTTPS base URL during dispatch so static builds do not require production secrets. Unregistered-user invitations, marketing/bulk email, tracking, analytics, Admin delivery UI, attachments, and custom templates remain deferred.
