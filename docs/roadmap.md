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

Deferred from Phase 2A: CV/avatar upload, public sharing, jobs, applications, saved jobs, messaging, notifications, AI, and Recruiter/company profiles.

## Phase 2B — Secure Candidate documents

Recommended next phase.

- Private CV object storage and metadata model
- Strict content-type and size validation
- Malware-scanning and quarantine design
- Short-lived authorized access URLs
- Candidate replace/delete flow and retention rules
- Audit-safe document access tests

Exit criteria: a Candidate can privately manage a CV without exposing raw storage objects or weakening profile ownership.

## Phase 2C — Job discovery foundation

- Job listing read model
- Search, filtering, and pagination
- Saved jobs with Candidate ownership
- Clear public and authenticated discovery states

Exit criteria: a Candidate can discover and save relevant database-backed opportunities.

## Phase 3 — Companies and recruiter workflows

- Company profiles
- Recruiter company membership and permissions
- Create, edit, publish, close, and archive job listings
- Recruiter job management workspace
- Public company pages and job details

Exit criteria: an authorized recruiter can represent a company and manage the complete job lifecycle.

## Phase 4 — Applications

- Application submission and candidate confirmation
- Application status model and status history
- Candidate application tracking
- Recruiter applicant review and authorized CV access
- Notes, structured review, and workflow filters
- Candidate-facing status transparency

Exit criteria: both sides can complete and understand the end-to-end application workflow.

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
