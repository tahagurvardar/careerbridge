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

Deferred from Phase 2B: invitations, membership administration, Company verification, uploads, jobs, applications, Candidate search/CV access, messaging, notifications, AI, and billing.

## Phase 2C — Job lifecycle and discovery

Recommended next phase.

- Company-owned Job model and OWNER-authorized creation/editing
- Draft, published, closed, and archived lifecycle with explicit transitions
- Public Job detail and URL-backed search/filtering/pagination
- Recruiter Job management workspace
- No applications or fabricated activity metrics

Exit criteria: an authorized Company owner can manage real Job listings and public visitors can discover published opportunities.

## Phase 2D — Secure Candidate documents

- Private CV object storage and metadata model
- Strict content-type and size validation
- Malware-scanning and quarantine design
- Short-lived authorized access URLs
- Candidate replace/delete flow and retention rules
- Audit-safe document access tests

Exit criteria: a Candidate can privately manage a CV without exposing raw storage objects or weakening profile ownership.

## Phase 3 — Applications and saved opportunities

- Saved jobs with Candidate ownership
- Application submission and Candidate confirmation
- Candidate application tracking
- Recruiter applicant review and authorized CV access
- Application status model, history, notes, and workflow filters

Exit criteria: Candidates and Recruiters can complete and understand the application workflow.

## Phase 4 — Membership administration

- Recruiter invitations and email delivery
- OWNER-managed membership changes
- Ownership-transfer and last-owner invariants
- Auditable membership events

Exit criteria: Company owners can safely manage team access without leaving a Company ownerless.

## Phase 5 — Admin, trust, and analytics

- User, company, job, and report moderation
- Admin authorization and audit events
- Operational dashboards
- Recruitment funnel analytics
- Trust, safety, and abuse workflows

Exit criteria: platform operators can safely manage and understand production activity.

## Phase 6 — Communication

- In-product notifications
- Email notification infrastructure and preferences
- Candidate-recruiter messaging if validated by product needs
- Delivery, read, and retry behavior

## Phase 7 — Responsible AI assistance

- Evaluation datasets and safety criteria
- Explainable job-match assistance
- CV analysis with user control
- Grounded cover-letter drafting
- Recruiter summarization aids
- AI usage disclosure, feedback, observability, and cost controls

AI does not autonomously accept, reject, rank, or make hiring decisions.

## Phase 8 — Launch hardening and expansion

- CI/CD and preview environment policy
- Observability, alerting, backups, and recovery exercises
- Performance and accessibility audits
- Security review, rate limiting, and abuse testing
- Data export, deletion, and retention workflows
- Multilingual architecture and localization
- Advanced analytics informed by real product usage
