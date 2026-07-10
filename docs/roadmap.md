# CareerBridge roadmap

The roadmap is deliberately phased so each release leaves the product in a coherent and verifiable state.

## Phase 0 — Project foundation

Status: complete in this branch.

- Next.js, TypeScript, Tailwind CSS, and ESLint
- shadcn/ui and Lucide icon foundation
- Responsive light and dark public interface
- Public route placeholders
- Prisma and PostgreSQL configuration
- Environment template, documentation, and developer scripts
- Lint, type, build, and visual validation

## Phase 1 — Identity and access

- Finalize user and role model
- Add the smallest required Prisma identity schema and first migration
- Implement Auth.js sessions
- Add candidate and recruiter registration paths
- Add login, logout, recovery, and protected-route behavior
- Establish authorization helpers and audit conventions
- Add Zod schemas and React Hook Form where interactive forms begin

Exit criteria: secure role-aware access with tested authorization boundaries.

## Phase 2 — Candidate profiles and job discovery

- Candidate profile basics
- Education, experience, and skills
- Secure CV upload and access design
- Job listing read model
- Search, filtering, pagination, and saved jobs
- Candidate profile completion states

Exit criteria: a candidate can build a profile, discover jobs, and save relevant opportunities.

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
