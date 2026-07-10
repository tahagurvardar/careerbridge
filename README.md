# CareerBridge

CareerBridge is a production-oriented job and internship platform designed to connect ambitious candidates with thoughtful employers. The long-term product combines structured hiring workflows with responsible AI assistance while keeping transparency, accessibility, and human decision-making at the center.

> **Project status:** Phase 2C Job Lifecycle and Discovery is implemented on **feat/job-lifecycle-discovery**. Company owners can manage the full Job lifecycle while public visitors discover only published Jobs from published Companies.

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

| Route                                   | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| /                                       | Product landing page with featured Jobs      |
| /jobs                                   | Published Job discovery, search, and filters |
| /jobs/[slug]                            | Published Job public detail                  |
| /companies                              | Published Company discovery and search       |
| /companies/[slug]                       | Published Company public profile             |
| /login                                  | Email/password sign-in                       |
| /register                               | Candidate and Recruiter account registration |
| /candidate/dashboard                    | Protected Candidate workspace and summary    |
| /candidate/profile                      | Protected Candidate profile overview         |
| /candidate/profile/edit                 | Edit Candidate professional information      |
| /candidate/profile/education/new        | Add an education record                      |
| /candidate/profile/education/[id]/edit  | Edit owned education                         |
| /candidate/profile/experience/new       | Add an experience record                     |
| /candidate/profile/experience/[id]/edit | Edit owned experience                        |
| /recruiter/dashboard                    | Protected Recruiter workspace summary        |
| /recruiter/profile                      | Protected Recruiter profile overview         |
| /recruiter/profile/edit                 | Edit Recruiter professional information      |
| /recruiter/companies                    | Recruiter's Company memberships              |
| /recruiter/companies/new                | Create a private Company as OWNER            |
| /recruiter/companies/[companyId]        | Private member Company workspace             |
| /recruiter/companies/[companyId]/edit   | OWNER-only Company editing                   |
| /recruiter/jobs                         | Owned Jobs with status/company/title filters |
| /recruiter/jobs/new                     | Create a draft Job for an owned Company      |
| /recruiter/jobs/[jobId]                 | Private Job workspace and lifecycle actions  |
| /recruiter/jobs/[jobId]/edit            | OWNER-only Job editing                       |
| /admin                                  | Protected Admin access confirmation          |

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
- CV/avatar upload, public Candidate profiles, jobs, applications, saved jobs, messaging, notifications, AI, and payments remain deferred.

## Recruiter and Company boundaries

- Only an authenticated `RECRUITER` session can render or mutate Recruiter workspace routes. Candidate and Admin roles receive no implicit Recruiter profile or Company access.
- Recruiter profile identity comes from `User`; the one-to-one `RecruiterProfile` stores only job title, bio, and a safe LinkedIn URL.
- Company creation generates the slug on the server and creates the Company plus `OWNER` membership atomically. Duplicate names receive deterministic `-2`, `-3`, and later suffixes without overwriting an existing Company.
- `CompanyMembership` has unique `(userId, companyId)` membership and explicit `OWNER`/`MEMBER` roles. Every private read checks membership; every edit and publication mutation scopes through an authenticated OWNER relation.
- Companies start unpublished. Publishing requires name, description, industry, headquarters, and a safe `http`/`https` website. Publication is visibility, not verification.
- Public directory and detail queries always include `isPublished = true`. Unknown and unpublished slugs share the same not-found behavior, and public results never include membership or owner identity data.
- Company names do not automatically rewrite an existing slug during editing, preserving stable public URLs.
- Recruiter invitations, membership management, verification, uploads, applications, candidate search, messaging, notifications, AI, and billing remain deferred.

## Job domain boundaries

- Only an authenticated `RECRUITER` session can render or mutate Job workspace routes. Every Job mutation additionally requires OWNER membership of the Job's Company; Candidate, Admin, and MEMBER users cannot create, edit, publish, close, or archive Jobs.
- Job identity comes from the server. Slugs are generated from the validated title with deterministic `-2`, `-3` suffixes, and browser input never supplies a trusted `companyId`, status, slug, `publishedAt`, or ownership field.
- Every Job command scopes its database predicate through the authenticated user's OWNER membership, so absent, foreign, and unauthorized Job IDs produce the same unavailable result. Recruiter A cannot view or edit Recruiter B's private drafts.
- The lifecycle is DRAFT → PUBLISHED → CLOSED → ARCHIVED with explicit, centralized transitions. Status, `publishedAt`, and `closedAt` are set only by the server; archived Jobs are read-only in this phase.
- Publishing is an OWNER command that re-checks readiness against fresh database data: the Company must be published and the Job must have a title, summary, description, responsibilities, requirements, location, employment type, workplace type, experience level, and at least one required skill. A deadline in the past blocks publishing.
- Salary is stored as whole non-negative integer currency units with a normalized uppercase 3-letter currency code, and the salary minimum can never exceed the maximum. Deadlines are date-only and compared in UTC.
- Required skills reuse the shared normalized `Skill` catalog through `JobSkill`, whose composite primary key prevents duplicate assignment even under concurrent requests.
- Public directory and detail queries always constrain `status = PUBLISHED` and `Company.isPublished = true`. Draft, closed, archived, and unpublished-Company Jobs return the same not-found behavior, and public results never include internal IDs or membership identity.
- Applications, saved Jobs, candidate matching, and Job analytics remain honest deferred states.

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
