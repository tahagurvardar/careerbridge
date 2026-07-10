# CareerBridge

CareerBridge is a production-oriented job and internship platform designed to connect ambitious candidates with thoughtful employers. The long-term product combines structured hiring workflows with responsible AI assistance while keeping transparency, accessibility, and human decision-making at the center.

> **Project status:** Phase 1 identity and access is implemented on **feat/identity-access**. Candidate and Recruiter accounts, persistent sessions, role authorization, and the development Admin bootstrap are available; product-domain workflows remain intentionally deferred.

## Foundation preview

The current application provides:

- A responsive, theme-aware CareerBridge marketing experience
- Presentable public routes for jobs, companies, sign-in, and registration
- Typed mock opportunities with URL-backed filtering and detail previews
- A scalable App Router structure with shared layout and feature boundaries
- A PostgreSQL-ready Prisma 7 setup with a lazy, build-safe client helper
- Better Auth email/password identity with database-backed sessions
- Public Candidate and Recruiter registration with server-side role allow-listing
- Server-protected Candidate, Recruiter, and Admin route boundaries
- Session-aware desktop and mobile navigation with secure sign-out
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

| Route                | Purpose                                      |
| -------------------- | -------------------------------------------- |
| /                    | Product landing page                         |
| /jobs                | URL-backed mock opportunity discovery        |
| /jobs/[slug]         | Mock opportunity detail preview              |
| /companies           | Company directory preview                    |
| /login               | Email/password sign-in                       |
| /register            | Candidate and Recruiter account registration |
| /candidate/dashboard | Protected Candidate workspace preview        |
| /recruiter/dashboard | Protected Recruiter workspace preview        |
| /admin               | Protected Admin access confirmation          |

## Project structure

```text
src/
├── app/                    # Routes, metadata, and global styles
├── components/
│   ├── layout/             # Shared site navigation and footer
│   ├── shared/             # Reusable cross-feature components
│   └── ui/                 # Owned shadcn/ui primitives
├── config/                 # Site navigation and typed mock content
├── features/               # Domain-oriented UI modules
├── lib/                    # Shared utilities and infrastructure clients
└── types/                  # Shared TypeScript contracts
```

No empty placeholder directories are committed; new boundaries should be added when a real implementation needs them.

Identity code is grouped under `src/features/auth`: shared schemas and role rules are usable by forms and tests, while session and action modules are explicitly server-only. The Better Auth server and Prisma client live in `src/lib` and initialize lazily at request time.

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
- Email verification, password reset, social authentication, complete profiles, and company membership are deferred.

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
