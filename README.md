# CareerBridge

CareerBridge is a production-oriented job and internship platform designed to connect ambitious candidates with thoughtful employers. The long-term product combines structured hiring workflows with responsible AI assistance while keeping transparency, accessibility, and human decision-making at the center.

> **Project status:** Phase 0 foundation is complete on **chore/initial-foundation**. Authentication, domain workflows, and AI functionality are intentionally not part of this phase.

## Foundation preview

The current application provides:

- A responsive, theme-aware CareerBridge marketing experience
- Presentable public routes for jobs, companies, sign-in, and registration
- Typed mock opportunities with URL-backed filtering and detail previews
- A scalable App Router structure with shared layout and feature boundaries
- A PostgreSQL-ready Prisma 7 setup with a lazy, build-safe client helper
- Product, architecture, and delivery documentation

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- shadcn/ui with Radix UI primitives
- PostgreSQL and Prisma ORM
- Zod
- Lucide icons
- npm

Auth.js and React Hook Form are planned for later feature phases when real account and form workflows are introduced.

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- PostgreSQL for database work (the public foundation runs without an active database)

### Installation

```bash
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Update **DATABASE_URL** in **.env** when you are ready to connect PostgreSQL, then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command                 | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| npm run dev             | Start the local Next.js development server   |
| npm run build           | Create a production build                    |
| npm run start           | Serve the production build                   |
| npm run lint            | Run ESLint                                   |
| npm run typecheck       | Run TypeScript without emitting files        |
| npm run format          | Format the repository with Prettier          |
| npm run format:check    | Verify formatting                            |
| npm run prisma:generate | Generate the Prisma client                   |
| npm run prisma:validate | Validate the Prisma configuration and schema |
| npm run prisma:studio   | Open Prisma Studio after database setup      |

## Public routes

| Route        | Purpose                                        |
| ------------ | ---------------------------------------------- |
| /            | Product landing page                           |
| /jobs        | URL-backed mock opportunity discovery          |
| /jobs/[slug] | Mock opportunity detail preview                |
| /companies   | Company directory preview                      |
| /login       | Account access placeholder                     |
| /register    | Candidate and recruiter onboarding placeholder |

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
