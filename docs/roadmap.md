# CareerBridge roadmap

The roadmap is deliberately phased so each release leaves the product in a coherent and verifiable state.

## Phase 0 — Project foundation

Status: complete.

- Next.js, TypeScript, Tailwind CSS, and ESLint
- shadcn/ui and Lucide icon foundation
- Responsive light and dark public interface
- Public route placeholders
- Prisma and PostgreSQL configuration
- Environment template, documentation, and developer scripts
- Lint, type, build, and visual validation

## Phase 1 — Identity and access

Status: complete on `feat/identity-access`.

- Finalized the single-role `CANDIDATE`, `RECRUITER`, and `ADMIN` model
- Added the Better Auth identity schema and `identity_foundation` migration
- Implemented Better Auth email/password identity and persistent database sessions
- Added server-validated Candidate and Recruiter registration
- Added sign-in, sign-out, session-aware navigation, and protected dashboards
- Centralized page, Server Action, redirect, and role authorization helpers
- Added Zod, React Hook Form, and focused custom-logic tests
- Added an explicit development-only Admin bootstrap

Exit criteria: secure role-aware access with tested authorization boundaries.

Deferred from identity: email verification, password reset/recovery, social login, production Admin provisioning, and complete role profiles.

## Phase 2A — Candidate Profile Foundation

Status: implemented on `feat/candidate-profile-foundation`.

- Candidate-owned basic professional profile
- Education and work-experience create, edit, and safe delete flows
- Normalized skill catalog with duplicate-safe Candidate assignment
- Server-rendered protected routes and accessible React Hook Form workflows
- Centralized 0–100 profile-completion calculation and recommendations
- Candidate dashboard completion summary and honest later-feature placeholders
- Unit coverage plus isolated, explicitly opted-in database integration coverage

Exit criteria: a Candidate can securely maintain the structured foundation of a professional profile.

Deferred from Phase 2A: CV/avatar upload, public Candidate sharing, jobs, applications, saved jobs, messaging, notifications, and AI.

## Phase 2B — Recruiter and Company Workspace

Status: implemented on `feat/company-recruiter-workspace`.

- Recruiter-owned professional profile extension without duplicated identity
- Private-by-default Company profiles with deterministic server-generated slugs
- Atomic Company creation and OWNER membership
- Explicit OWNER/MEMBER membership domain and OWNER-only mutations
- Completeness-gated publishing and immediate unpublishing
- Database-backed public Company directory, bounded search, and published-only detail
- Recruiter dashboard setup state and honest deferred hiring placeholders
- Unit coverage plus isolated database authorization/integrity coverage

Exit criteria: a Recruiter can securely represent and publish a Company while unpublished and foreign Company data remains protected.

Deferred from Phase 2B: invitations, membership administration, Company verification, uploads, jobs, applications, Candidate search/CV access, messaging, notifications, AI, and billing. Invitations and membership administration later shipped in Phase 4B.

## Phase 2C — Job lifecycle and discovery

Status: implemented on `feat/job-lifecycle-discovery`.

- Company-owned `Job` model and `JobSkill` relation reusing the shared Skill catalog
- OWNER-authorized creation, editing, and required-skill management
- Draft, published, closed, and archived lifecycle with centralized, testable transitions
- Server-enforced publication readiness checked against fresh database data
- Whole-integer salary range with an ISO currency code and UTC-safe deadline handling
- Database-backed public Job directory with URL-backed search and employment/workplace/experience filters
- Database-backed public Job detail with an honest deferred application action
- Recruiter Job workspace plus real Job counts on the dashboard and Company workspace
- Landing page featured Jobs sourced from published listings; typed mock opportunities removed
- Unit coverage plus isolated database lifecycle, ownership, and visibility coverage

Exit criteria: an authorized Company owner can manage real Job listings and public visitors can discover only published opportunities.

Deferred from Phase 2C: applications, saved jobs, candidate matching, recruiter invitations, notifications, messaging, AI, and billing.

## Phase 2D — Secure Candidate documents

Status: delivered as part of Phase 3C on `feat/secure-cv-documents` (see Phase 3C below).

- Private CV object storage and metadata model
- Strict content-type and size validation
- Malware-scanning and quarantine design (dedicated scanning deferred and documented, not claimed)
- Authorized, per-request re-authorized access route (streamed download instead of public URLs)
- Candidate replace/remove flow and retention rules
- Audit-safe document access tests

Exit criteria: a Candidate can privately manage a CV without exposing raw storage objects or weakening profile ownership.

## Phase 3A — Job applications and applicant pipeline

Status: implemented on `feat/job-applications-pipeline`.

- `JobApplication` and `ApplicationStatusHistory` models with a database-level unique `(jobId, candidateId)` constraint
- Explicit `ApplicationStatus` enum (SUBMITTED, UNDER_REVIEW, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN)
- Candidate apply flow with fresh eligibility re-checks, optional cover letter, and duplicate/concurrency protection
- Candidate application list, detail, candidate-safe status timeline, and eligible withdrawal
- Recruiter applicant pipeline, application search/filter, candidate detail, and OWNER-only status transitions
- Centralized, database-free lifecycle transitions with atomic status-history writes
- Real application counts on the candidate dashboard, recruiter dashboard, job workspace, and company workspace
- Unit coverage plus isolated database eligibility, ownership, lifecycle, and privacy coverage

Exit criteria: a Candidate can apply to and track eligible jobs, and an authorized Company owner can review and advance applicants, while private application data stays protected.

Deferred from Phase 3A: saved jobs, recruiter-only candidate notes, CV upload/access, bulk actions, notifications, and messaging.

## Phase 3B — Saved Jobs

Status: implemented on `feat/saved-jobs`.

- Candidate-owned `SavedJob` relation with unique duplicate prevention and cascade cleanup
- Save/remove Server Actions with session-derived ownership and fresh publication eligibility checks
- Idempotent sequential and concurrent duplicate saves plus idempotent removal
- Session-aware public Job controls with one saved-ID lookup for Job-card result sets
- Private `/candidate/saved-jobs` route with bounded search, availability filters, stable newest-first ordering, and application status
- Retained unavailable history after Job close/archive or Company unpublication without public links or leakage
- Real saved count, recent saves, recommended next action, and Candidate-only desktop/mobile navigation
- Unit coverage plus isolated database authorization, concurrency, privacy, and retention coverage

Exit criteria: Candidates can securely save and revisit eligible Jobs while unavailable history remains truthful and private.

Deferred from Phase 3B: recommendations, matching, saved-search alerts, notifications, CV storage, recruiter notes, messaging, AI, and billing.

## Phase 3C — Candidate documents and recruiter workflow context

Status: secure Candidate CV documents implemented on `feat/secure-cv-documents` (this also delivers the Phase 2D "Secure Candidate documents" scope).

- Immutable `CandidateDocument` versions, a one-to-one `CandidateResume` current pointer, and a nullable `JobApplication.resumeDocumentId` snapshot pinned across CV replacement
- PDF-only upload validation (size, MIME, extension, and `%PDF-` signature), server-generated storage keys, and server-computed SHA-256
- A pluggable private storage abstraction: local filesystem for development/test and an S3-compatible private-bucket driver for production, with production refusing the local driver
- Server-side upload-then-commit coordination with best-effort object cleanup on database failure, immutable versions, and retention that keeps historically attached CVs downloadable
- A Node-runtime `/api/documents/[documentId]/download` route that re-authorizes every request, forces an attachment with `private, no-store` and `nosniff`, and audit-logs successful authorized downloads
- Candidate ownership plus OWNER-scoped Recruiter access to only the exact CV attached to an owned-Company application, with `/candidate/documents`, apply-flow, dashboard, profile, and recruiter/candidate application integration
- Unit coverage plus isolated database upload, access, snapshot, attachment, removal, audit, privacy, and storage-consistency coverage

Deferred to Phase 3D (below): recruiter-only application notes and workflow annotations. Still deferred: dedicated malware scanning and AI resume parsing.

Exit criteria: Candidates can privately manage a CV without exposing raw storage objects or weakening profile ownership, and authorized Recruiters can review only the CV attached to their applications.

## Phase 3D — Recruiter application notes and internal annotations

Status: implemented on `feat/recruiter-application-notes`.

- `ApplicationNote` and immutable `ApplicationNoteRevision` models with an `ApplicationNoteRevisionAction` enum and a database `unique(noteId, version)` constraint
- Internal notes visible only to Recruiter Company OWNERs of the application's Job; never to Candidates (including on their own application), MEMBER users, other companies, Admins, or any public/search surface
- Session-derived author identity, author-only editing and soft deletion, and read/add access for any OWNER without changing author attribution
- Optimistic concurrency (`expectedRevision` compare-and-set plus the unique version constraint) so concurrent edits cannot both win, with atomic note-plus-revision writes and a safe conflict message
- Soft-delete retention with no hard delete and no restore, and a protected immutable history route
- OWNER-scoped active note counts on the applications list, Job applicant pipeline, and Job workspace, with no note bodies in list projections
- Unit coverage plus isolated database authorization, creation, editing, deletion, history, and privacy coverage

Deferred from Phase 3D: note @mentions, note notifications, rich-text/Markdown notes, note attachments, and AI note summarization.

Exit criteria: authorized Recruiters can keep private, revision-audited internal notes on applications while Candidates and the public never see them.

## Phase 4A — In-app notifications and activity center

Status: implemented on `feat/notifications-activity-center`. This delivers the in-product-notification portion of the original Phase 6 communication scope ahead of schedule.

- `Notification` model and `NotificationType` enum with a unique `dedupeKey`, recipient/read-state/application indexes, and nullable `SetNull` Application/Job/Company links for retention
- Transactional creation inside the existing application submission, status-transition, and withdrawal commands, so a notification is atomic with the `JobApplication` and `ApplicationStatusHistory` writes
- Server-side recipient resolution — Company OWNER Recruiters on submission/withdrawal, the owning Candidate on status change — excluding MEMBER users, Admins, the acting Candidate, and unrelated Companies
- Deterministic dedupe keys plus a unique constraint that make transaction retries and concurrent duplicate submissions idempotent
- Bounded, escaped-text event snapshots with safe internal destinations, carrying no Candidate email, CV, or note data
- A private `/notifications` Activity Center for Candidates and Recruiters with `ALL`/`UNREAD`/`READ` filters, bounded pagination, deterministic ordering, an empty state, and mark-one/mark-all actions
- A recipient-scoped unread header bell (desktop and mobile) with an exact 1–99 then `99+` badge, refreshed on navigation and after mark-read without polling
- Candidate and Recruiter dashboard unread counts and recent-notification summaries
- Retention with independent destination re-authorization, so a notification never grants access to its underlying entity
- Unit coverage plus isolated database event, ownership, read-state, privacy, and retention coverage

Deferred from Phase 4A: SMS/mobile/browser push, WebSocket/SSE real-time delivery, in-app muting, digest and scheduled notifications, and recruiter-note/CV/saved-job/marketing notifications. Transactional email and its email-only preferences ship in Phase 4C.

Exit criteria: Candidates and Recruiters receive private, in-app notifications for the application events that concern them, with a secure Activity Center and unread badge, while public and cross-user boundaries stay intact.

## Phase 4B — Company team membership

Status: implemented on `feat/company-team-membership`.

- Company invitations for existing Recruiter accounts, entered as a normalized email and resolved entirely server-side — no public invitation links, tokens, or unregistered-user invitations
- Explicit PENDING → ACCEPTED / DECLINED / REVOKED / EXPIRED lifecycle with a fixed 14-day expiry and a database-backed single-active-invitation key
- Invitee-scoped `/recruiter/invitations` accept/decline flow, with the in-app invitation notification created in the same transaction as the invitation
- OWNER-only `/recruiter/companies/[companyId]/team` administration: roster with private member emails, invite, revoke, promote, demote, remove, and ownership transfer
- Serializable last-owner enforcement so demotion, removal, leave, and transfer can never leave a Company without an OWNER
- Append-only, OWNER-visible `CompanyMembershipEvent` audit history for every invitation and membership change
- Unit coverage plus isolated database lifecycle, authorization, concurrency, and privacy coverage

Deferred from Phase 4B: external invitation email (shipped in Phase 4C), unregistered-user invitations, public invitation URLs, custom organization roles, fine-grained permissions, billing seats, and Admin membership moderation.

Exit criteria: Company owners safely manage team access, invited Recruiters join only through explicit acceptance, and no operation can leave a Company ownerless.

## Phase 4C — Transactional email delivery

Status: implemented on `feat/transactional-email-delivery`.

- Transactional `EmailOutbox` intent for company invitations and application submission, status-change, and withdrawal events
- Role-relevant email-only preferences with enabled-by-default absence and auditable event-time `SUPPRESSED` snapshots
- Central bounded plain-text/escaped-HTML templates and safe internal destinations whose routes re-authorize independently
- Development/test no-send driver and lazy production Resend adapter with provider idempotency keys
- Bearer-protected bounded dispatcher, PostgreSQL `SKIP LOCKED` claiming, per-row lock tokens, and ten-minute stale recovery
- Bounded exponential retry, terminal dead letters, and append-only privacy-safe attempt history
- Unit and isolated integration coverage for event creation, preferences, claiming, delivery, retry, and privacy boundaries

Deferred from Phase 4C: unregistered-user email invitations, marketing/bulk email, analytics/tracking, custom templates, attachments, public retries, and an Admin delivery dashboard.

Exit criteria: application and invitation events durably create independently configurable email intent without provider work inside business transactions or exposure of delivery infrastructure.

## Phase 5A — Interview scheduling and calendar workflow

Status: implemented on `feat/interview-scheduling`.

- `Interview` and append-only `InterviewEvent` domain with explicit format/status/event enums and OWNER-derived organizers
- Explicit lifecycle operations — schedule, candidate accept/decline, reschedule, cancel, complete — with optimistic `expectedVersion` compare-and-set and terminal-state protection
- UTC instants plus independently validated IANA timezone storage, DST-aware display, and format-specific schedule validation (HTTPS-only meeting links)
- Candidate and organizer overlap prevention for active interviews under Serializable isolation with bounded retry; adjacent slots allowed and terminal statuses non-blocking
- Active-Application eligibility re-checked in-transaction; interview scheduling and Application status remain separate controlled workflows
- Atomic in-app notifications and email outbox (or `SUPPRESSED`) rows for scheduled/rescheduled/canceled (Candidate) and responses (Recruiter OWNERs), with role-scoped email preferences
- Candidate and Recruiter agenda routes, interview detail/management routes, application-detail sections, dashboard cards, and navigation
- Unit and isolated integration coverage for lifecycle, validation, conflicts, concurrency, atomicity, privacy, and retention

Deferred from Phase 5A: Google/Outlook/Apple calendar sync, OAuth calendar connections, Meet/Zoom/Teams link generation, calendar webhooks, drag-and-drop/FullCalendar UI, recurring interviews, interviewer availability and panels, candidate self-scheduling and public booking links, ICS attachments/download, automated/SMS/push reminders, scorecards, feedback forms, video calling, recording, transcription, and AI interview summaries or scoring.

Exit criteria: Company OWNERs can safely schedule and manage conflict-free interviews that Candidates can answer, with immutable history and transactional notification/email intent, without weakening any existing authorization or privacy boundary.

## Phase 6A — Admin, trust, moderation, and immutable Admin audit

Status: implemented on `feat/admin-trust-moderation`.

- Independent User `ACTIVE`/`SUSPENDED` state with monotonic optimistic concurrency
- Independent Company and Job `VISIBLE`/`HIDDEN` moderation state that never rewrites publication or lifecycle
- Required enumerated reasons, optional bounded Admin-only plain-text notes, and accessible confirmation flows
- Atomic suspension plus Better Auth session revocation, new-session denial, and central stale-cookie enforcement
- Public Company/Job discovery, detail, featured, metadata-source, save, and application predicates hardened for moderation
- Existing private workspaces and historical Applications, Interviews, CV snapshots, notes, memberships, notifications, and email history retained
- Active-Admin-only dashboard, User/Company/Job directories and detail actions, filters, stable pagination, and responsive navigation
- Append-only `AdminAuditEvent` with action/target database checks, retention-oriented relations, and newest-first filters
- Explicit privacy boundary: no implicit Admin CV, internal-note, private Interview, Application, Notification, auth-token/session, or EmailOutbox access
- Additive `20260713194410_admin_trust_moderation` migration plus database-free and isolated integration coverage

Deferred from Phase 6A: User reports, automated/AI moderation and fraud scoring, content scanning, KYC/identity verification, Company verification, appeals, legal takedowns, custom Admin permissions, impersonation, Admin messaging, production provisioning changes, billing, and analytics beyond truthful platform counts.

Exit criteria: active platform Admins can make reasoned, concurrency-safe, auditable account and visibility decisions without destroying history or crossing Candidate/Recruiter privacy boundaries.

## Phase 6B — Analytics, platform metrics, and recruiting insights

Status: implemented on `feat/analytics-platform-metrics`.

- Central `30D`/`90D`/`180D`/`365D`/`ALL` UTC range domain with half-open server boundaries
- Bounded daily/weekly/monthly trend windows, zero filling, stable ordering, and at most 120 chart points
- Explicit current-state, created-in-range, and ever-reached-stage metric semantics
- Unique-Application `SUBMITTED → UNDER_REVIEW → INTERVIEW → OFFER → HIRED` cohort funnel, separate exits, and null-safe one-decimal conversions
- Active-Admin platform User, Company, Job, Application, Interview, moderation-aware, funnel, and trend analytics
- Current-OWNER-only Recruiter Company/Job filters, status distribution, funnel, Interview outcomes, and bounded Job performance comparison
- Candidate-only personal Application status/trend/outcome, Interview, and Saved Job statistics
- Server-only minimal aggregate DTOs with no Candidate identity, CV, note, private Interview, EmailOutbox, Notification, session, or moderation-note payloads
- Accessible server-rendered charts with visible values, summaries, zero states, and table fallbacks; no third-party chart/tracking dependency
- Additive `20260714021140_analytics_query_indexes` migration plus database-free and isolated integration coverage

Deferred from Phase 6B: page views, unique visitors, click/email tracking, third-party analytics, public analytics, CSV/PDF export, scheduled reports, warehouse/ETL and materialized views, background aggregation, revenue/billing analytics, Candidate ranking/scoring, forecasts, and predictive analytics.

Exit criteria: each role can read truthful, bounded metrics only for its authorized aggregate scope, with cohort and current-state semantics kept visibly separate and no weakening of existing privacy or moderation boundaries.

## Phase 6C — Internationalization and localization

Status: implemented on `feat/internationalization-localization` after completion of Phase 6B analytics.

- English, Turkish, Azerbaijani, and Russian locale configuration, typed dictionaries, native scripts, and Intl mappings
- Locale-prefixed Next.js App Router pages with safe legacy-page redirects, API/static/private-download exclusions, and query/dynamic-segment preservation
- Guest locale cookie plus dedicated authenticated `User.preferredLocale` persistence protected from generic Better Auth updates
- Localized public, auth, Candidate, Recruiter, Admin, analytics, notification, email-preference, validation, metadata, empty, success, and error presentation
- Locale-aware dates, relative time, plurals, numbers, percentages, and timezone display without changing UTC storage or Phase 6B numeric semantics
- Event-time `Notification.locale` and `EmailOutbox.locale` snapshots with independently rendered mixed-locale recipients, neutral canonical destinations, immutable history/retries, and existing dedupe/atomicity
- Localized public canonical metadata and `en`/`tr`/`az`/`ru` alternates without translating user-authored names/titles or exposing moderated content
- Recursive dictionary/placeholder parity, formatter/routing/validation/delivery unit coverage, isolated database coverage, and cross-locale access/privacy verification

Deferred from Phase 6C: automatic translation, external translation APIs, a content-management translation UI, additional locales, translation of user-authored content, locale-specific slugs, right-to-left layout, and final native-speaker editorial certification. These can be additive without changing the locale/security boundaries.

Exit criteria: all application-owned product surfaces and existing delivery events are available in four locales while authorization, privacy, stored content, delivery guarantees, public visibility, and analytics values remain unchanged.

## Phase 7A — Production deployment and operational hardening

Status: repository implementation complete on `feat/production-deployment-devops`; external production infrastructure and deployment are not yet verified.

- Production-aware server-only environment validation with safe name-only failures
- Dedicated Neon production pooled/runtime and direct/migration policy
- Build-before-migrate `prisma migrate deploy` and expand-and-contract compatibility
- GitHub pull-request/main CI with explicit isolated integration database gating
- Manual protected GitHub `production` Environment workflow using a Vercel prebuilt artifact
- Exact production/Preview Better Auth origins, secure cookies, and no wildcard trust
- Production-only private S3-compatible CV policy and Resend delivery policy
- Separate bearer-authenticated Vercel Cron GET adapter over the existing lock-safe dispatcher
- Bounded database readiness endpoint, production headers, redacted structured logging, and cache review
- Canonical four-locale metadata, moderated sitemap, private-route robots policy, and read-only smoke tooling
- Deployment/operations, rollback, recovery, provider-outage, and incident runbooks

External setup still required: Vercel project/domain, dedicated Neon production database and recovery policy, private object storage, Resend sender/key, GitHub secrets/approval rules, Cron schedule after plan review, production migration/deployment, and launch QA.

## Phase 7B — Final QA, Security, Portfolio Launch

- Full production Candidate, Recruiter, Admin, role-denial, suspension, membership, CV, note, Interview, Notification, EmailOutbox, Analytics, and locale smoke matrix with approved synthetic fixtures
- Desktop, 390px mobile, light/dark, keyboard, screen-reader, hydration, console, and cross-locale editorial verification
- Nonce-based Content Security Policy design/test, rate-limit/abuse verification, dependency/security review, and secret-rotation rehearsal
- Performance/Core Web Vitals and accessibility testing against the production domain
- Backup restore exercise, migration recovery drill, alerting/monitoring ownership, and incident tabletop
- Approved real-email/provider and Cron verification, synthetic CV storage verification, cleanup, and final portfolio launch decision

## Phase 8 — Responsible AI assistance

- Evaluation datasets and safety criteria
- Explainable job-match assistance
- CV analysis with user control
- Grounded cover-letter drafting
- Recruiter summarization aids
- AI usage disclosure, feedback, observability, and cost controls

AI does not autonomously accept, reject, rank, or make hiring decisions.

## Phase 9 — Post-launch expansion

- Data export, deletion, and retention workflows
- Advanced analytics informed by real product usage
