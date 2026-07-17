# CareerBridge — Final Release-Readiness and Portfolio-Quality Audit

Audit date: 2026-07-17
Auditor scope: read-only static audit plus safe local checks
Canonical production: <https://careerbridge-puce.vercel.app>
Repository branch at audit time: `docs/final-portfolio-readiness`

This audit records no secret values, no production data, and no private
evidence. It does not connect to any production database, provider, or hosting
service. It distinguishes four evidence classes throughout: **Implemented**
(source exists), **Automated-tested** (unit and/or isolated integration
coverage exists), **Manually verified in production** (a named behavior was
directly exercised against the live deployment), and **Production-unverified**
(implemented and/or documented, but not exercised in the current production
audit).

---

## 1. Executive summary

CareerBridge is a substantial, server-first Next.js 16 hiring platform covering
three roles (Candidate, Recruiter, Admin) with job discovery, structured
applications, private company workspaces, interviews, notifications, a
transactional email outbox, moderation with an immutable audit trail, private CV
storage, analytics, and four-locale delivery. The codebase is well-structured
along explicit domain boundaries, is broadly unit- and integration-tested (66
test files), ships source-controlled Prisma migrations (15), and is deployed to
a live production URL behind a controlled CI/CD pipeline with a read-only public
smoke suite.

The gap between **what is built** and **what is verified in production** is the
defining fact of this release. The public surface and the entire Candidate
authentication and dashboard path are manually verified and pass the public
smoke suite. The two-sided core of the product — Recruiter → Company → Job →
Application → Interview → Offer — is implemented and automated-tested but
**intentionally never exercised in production**, and must remain marked
UNVERIFIED. Email ownership (verification and recovery) is disabled/deferred,
arbitrary-recipient delivery is unproven, the recurring email dispatcher has an
endpoint but no committed schedule or assigned owner, and there is no
authenticated browser E2E suite.

As a **portfolio artifact**, CareerBridge is strong: the technical depth,
documentation, honest self-assessment, and live Candidate demo are all
above the bar for a job-application project. As a **launchable product**, it is
not yet ready: the core hiring workflow is production-unverified, account
ownership is absent, and the public legal surface (Terms/Privacy routes) is
missing despite registration requiring their acceptance.

Recommended framing for external use: **"a production-oriented portfolio
platform with a live, manually verified Candidate path."** Do not describe
Recruiter, Application, Interview, Admin, email-delivery, or Cron workflows as
production-verified.

---

## 2. Scores

### Release-readiness score: 61 / 100

| Dimension                               | Score | Basis                                                                                                                                                                     |
| --------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture & domain boundaries        | 14/15 | Clear server-first feature boundaries, centralized authorization, explicit lifecycle rules, atomic history/outbox patterns, lazy provider init                            |
| Automated tests & CI                    | 13/15 | 66 unit/integration files across every domain; quality + build gates in CI; but no authenticated browser E2E and no coverage threshold                                    |
| Security & privacy foundations          | 12/15 | Server authorization on protected surfaces, safe cookies/headers, redacted logging, private CV design, placeholder-secret detection; no tested CSP, legal surface missing |
| Public deployment & smoke               |  9/10 | Canonical deployment live; locale/robots/sitemap/readiness/header smoke checks pass                                                                                       |
| Manual production workflow coverage     |  4/15 | Candidate auth/dashboard + signed-out denial verified; Recruiter/Company/Job/Application/Interview/Admin all unverified                                                   |
| Identity & email reliability            |  3/15 | Email verification and account recovery absent; recipient delivery, recurring Cron ownership, and operator UI unverified or absent                                        |
| Accessibility, performance & ops drills |  6/15 | Strong source foundations and runbooks; no browser a11y pass, no Web Vitals baseline, no restore/rotation drill evidence                                                  |

Release readiness is gated by verification and identity, not by
implementation breadth. The score is deliberately conservative because the
core two-sided workflow that defines the product is unproven in production.

### Portfolio-readiness score: 84 / 100

| Dimension                        | Score | Basis                                                                                                                                                |
| -------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical depth                  | 20/20 | Multi-role relational workflows, concurrency-safe status history, authorization, localization, moderation, analytics, private storage, outbox design |
| Architecture & explainability    | 18/20 | Detailed product/architecture/deployment/ops docs and clean feature boundaries; some phase-era strings remain                                        |
| Testing & delivery engineering   | 17/20 | Broad unit/integration coverage, CI gates, controlled deploy, env validation, smoke + operations tooling                                             |
| UX, accessibility & localization | 15/20 | Responsive theme-aware UI in four locales; production browser/a11y evidence incomplete; one stale public "coming soon" card                          |
| GitHub presentation              | 14/20 | Honest, accurate README and live demo; missing screenshots, no license, one broken doc link, stale placeholder card                                  |

CareerBridge is suitable to present in job applications today, provided it is
described honestly per the framing above.

---

## 3. Verified production functionality

These items were directly exercised against the live deployment (per the
verification record provided for this audit) and pass:

- Candidate registration — **Manually verified**
- Candidate login — **Manually verified**
- Candidate Dashboard access — **Manually verified**
- Unauthenticated Candidate protected-route redirect/denial — **Manually verified**
- Public production smoke suite (locale redirect, four locale roots, robots,
  sitemap, readiness, security headers) — **PASS**
- Synthetic production-data cleanup — **Completed**; former synthetic company and
  job public URLs now return 404 — **Confirmed by the provided verification record**

No other production flow is verified. The current audit created no replacement
production data.

---

## 4. Automated-tested functionality

Automated coverage exists (unit and/or isolated PostgreSQL integration) for every
major domain. 66 test files were found across the following areas:

- Authentication, roles, and role-security (`tests/auth/*`, incl. an integration
  role-security suite)
- Candidate profile and completion (`tests/candidate-profile/*`)
- Candidate documents / secure CV validation and access (`tests/candidate-documents/*`, `tests/storage/*`)
- Saved jobs and recommendation logic (`tests/saved-jobs/*`)
- Jobs domain, schemas, lifecycle, and integration (`tests/jobs/*`)
- Applications: eligibility, lifecycle, search, schemas, integration (`tests/applications/*`)
- Application notes and revisions (`tests/application-notes/*`)
- Recruiter/company workspace and team membership (`tests/recruiter-company/*`, `tests/company-team/*`)
- Interviews: scheduling, messaging, schemas, integration (`tests/interviews/*`)
- Notifications and preferences (`tests/notifications/*`)
- Email: provider, dispatcher, schemas, integration (`tests/email/*`)
- Admin moderation, schemas, integration (`tests/admin/*`)
- Analytics (`tests/analytics/*`)
- Internationalization: config/routing, dictionaries, formatters, validation, delivery (`tests/i18n/*`)
- Operations: cron, environment, health, logging, security headers, smoke, synthetic-data cleanup (`tests/operations/*`)

**Important limitation of automated coverage:** these are unit and isolated
integration tests. They do not prove authenticated multi-role behavior in a real
browser, real provider delivery, real object storage authorization end-to-end, or
production redirect/console/regression behavior. There is **no** Playwright/Cypress
authenticated browser E2E suite and **no** enforced coverage threshold.

---

## 5. Implemented but production-unverified functionality

All of the following have source code and automated coverage but were **not**
exercised in production during verification and must remain UNVERIFIED:

| Area                                               | Implementation evidence                                                                    | Production status                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Recruiter registration & profile                   | Routes under `recruiter/*`, role allow-list, tests                                         | UNVERIFIED                                                        |
| Company creation & multi-company membership        | `recruiter/companies`, `company-team`, invitations, events, tests                          | UNVERIFIED                                                        |
| Job publish / close / archive lifecycle            | `jobs` domain, `JobStatus` enum, tests                                                     | UNVERIFIED                                                        |
| Candidate Application → Recruiter pipeline         | `applications`, status history, notes, tests                                               | UNVERIFIED                                                        |
| Interview scheduling & responses                   | `interviews`, events, messaging, tests                                                     | UNVERIFIED                                                        |
| Notifications & preferences                        | `notifications`, `UserEmailPreference`, tests                                              | UNVERIFIED                                                        |
| Email outbox & dispatcher                          | `EmailOutbox`, `EmailDeliveryAttempt`, provider, dispatcher, cron endpoint, tests          | Recipient delivery + recurring Cron UNVERIFIED                    |
| Admin moderation / audit / analytics               | `admin/*` routes, `AdminAuditEvent`, tests                                                 | UNVERIFIED                                                        |
| Private CV storage & re-authorizing download route | `candidate-documents`, `/api/documents/[documentId]`, S3-compatible + local drivers, tests | UNVERIFIED end-to-end in production                               |
| Full four-locale product surface                   | dictionaries, routing, formatting, delivery, tests                                         | Locale roots smoke PASS; full browser/editorial matrix UNVERIFIED |

---

## 6. Missing or deferred functionality

- **Email ownership verification** — `requireEmailVerification: false` in
  `src/lib/auth-config.ts`. Registration accepts unowned addresses.
- **Password reset / account recovery** — no recovery flow present.
- **Job reopening** — `JobStatus` is `DRAFT | PUBLISHED | CLOSED | ARCHIVED`; no
  reopen transition or code path exists.
- **Email outbox operational UI** — Admin routes are `analytics`, `audit`,
  `companies`, `jobs`, `users`; there is no queue/dead-letter health view.
- **Committed recurring dispatcher schedule** — a cron endpoint exists
  (`/api/internal/email-dispatch/cron`, guarded by `createCronDispatchHandler`),
  but there is no `vercel.json` cron entry or other committed schedule, and no
  assigned operator/alert owner.
- **Public legal surface** — registration requires `termsAccepted`
  (`src/features/auth/schemas.ts`) but there are no `/terms` or `/privacy` routes
  and no repository policy documents.
- **Authenticated browser E2E** — no Playwright/Cypress config or first-party
  browser tests.
- **Job recommendations / AI assistance** — intentionally deferred; the Candidate
  dashboard shows a "recommendations deferred" card by design.
- **Public license** — no `LICENSE` file and no `license` field in
  `package.json`; default copyright applies.

---

## 7. Prioritized findings

Effort estimates assume a single experienced full-stack developer and are ranges,
not commitments. Every item states whether it requires **code**,
**infrastructure**, **documentation**, or **manual QA** (often several).

### P0 — release blockers before any broad public launch

| #    | Gap                                                                                                            | Impact                                                                                           | Recommended action                                                                                                                                                                                   |                       Effort | Work type                                |
| ---- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------: | ---------------------------------------- |
| P0-1 | Core two-sided workflow (Recruiter → Company → Job → Application → Interview → Offer) is production-unverified | The product's central value could fail in production despite green unit/integration tests        | With explicit approval and non-production synthetic data, exercise the full journey against production once, capture only PII-free route/status evidence, then clean up under the approved procedure |      1–2 days + defect fixes | Manual QA (+ code if defects)            |
| P0-2 | Email ownership & account recovery absent (`requireEmailVerification: false`, no reset)                        | Accounts can use unowned addresses; users cannot recover access; weak trust and security posture | Implement verified-email registration (resend, expiry, rate-limit, enumeration-resistant copy), password reset/recovery, and regression + browser tests                                              |                     4–7 days | Code, infrastructure, QA                 |
| P0-3 | Public legal surface missing while registration requires accepting Terms/Privacy                               | Launch-compliance and trust risk for personal data, CVs, applications, and email                 | Obtain legal review; publish `/terms` and `/privacy` routes + policy docs; link from registration and footer; test locale + a11y                                                                     |      1–3 days + legal review | Code, documentation, manual QA           |
| P0-4 | Transactional email operating path not production-proven                                                       | Invitations and workflow notifications may queue but never deliver                               | Confirm sender/domain approval, run approved arbitrary-recipient delivery tests, assign an operator and alert policy, and verify queue movement/idempotency without exposing content                 | 1–3 days + provider approval | Infrastructure, manual QA, documentation |

### P1 — required before calling the product production-ready

| #    | Gap                                                                                | Impact                                                                         | Recommended action                                                                                                                                                                                         |                     Effort | Work type                                |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------: | ---------------------------------------- |
| P1-1 | No authenticated browser E2E suite                                                 | Role, redirect, form, console, and regression behavior is not repeatable in CI | Add Playwright tests for Candidate, Recruiter, Admin, cross-role denial, Application/Interview, locale, and (once built) email-verification flows, using non-production fixtures                           |                   4–7 days | Code, test infrastructure                |
| P1-2 | Recurring dispatcher ownership unverified (endpoint exists, no committed schedule) | Emails may never dispatch without a manual trigger; no owner/alerting          | Commit a reviewed schedule (e.g. `vercel.json` cron) targeting the guarded endpoint, assign an operator, add alerting, and verify one production cycle moves the queue                                     | 0.5–1 day + infra approval | Infrastructure, documentation, manual QA |
| P1-3 | Email outbox has no operational UI                                                 | Operators cannot see backlog/failures from a first-party surface               | Add an aggregate-only Admin queue-health view (oldest age, failure categories, retry/dead-letter counts) with strict redaction — no bodies or recipients                                                   |                   3–5 days | Code, security review, QA                |
| P1-4 | Sensitive role/storage production matrix incomplete                                | Authorization/provider regressions may escape unit/integration tests           | Run an approved desktop/mobile role-denial matrix with synthetic PDFs/data (Admin, CV authz, Notifications, Analytics, suspension, membership, cross-role denial), retain only PII-free PASS/FAIL evidence |                   2–4 days | Manual QA, infrastructure                |
| P1-5 | No tested Content Security Policy; no Core Web Vitals baseline                     | Weaker defense-in-depth; unmeasured performance                                | Add and test a CSP; capture a Web Vitals baseline for key routes                                                                                                                                           |                   1–2 days | Code, manual QA                          |

### P2 — portfolio quality improvements

| #    | Gap                                                    | Impact                                                                                                                                                                                                                                                                    | Recommended action                                                                                                                                                          |    Effort | Work type           |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | ------------------- |
| P2-1 | Stale public "coming soon" card on Company detail page | `/companies/[slug]` unconditionally renders "Job listings coming next … will arrive with the dedicated Job domain" even though the Job domain is fully implemented; a company's published jobs are not shown on its profile, and the copy contradicts the rest of the app | Replace the placeholder card with the company's published-job list (reusing existing job-query predicates), or, minimally, correct the copy; update the four locale strings | 0.5–1 day | Code, documentation |
| P2-2 | No screenshots; broken README screenshots link         | Weakens GitHub/portfolio first impression                                                                                                                                                                                                                                 | Add a `docs/screenshots/` placeholder README and later add sanitized captures (no PII/production data)                                                                      | 0.5–1 day | Documentation       |
| P2-3 | No public license selected                             | Ambiguous reuse terms for reviewers                                                                                                                                                                                                                                       | Decide and add a `LICENSE` (or explicitly document "all rights reserved")                                                                                                   |   0.5 day | Documentation       |
| P2-4 | No social preview / repo metadata polish               | Minor presentation gap                                                                                                                                                                                                                                                    | Add repo description, topics, and social preview image                                                                                                                      |   0.5 day | Documentation       |

### P3 — optional roadmap

| #    | Item                              | Impact                                    | Recommended action                                                                                                  |    Effort | Work type                     |
| ---- | --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------: | ----------------------------- |
| P3-1 | Job reopening                     | Recruiters cannot reactivate a closed job | Add a guarded `CLOSED → PUBLISHED` reopen transition with history + tests                                           |  1–2 days | Code, QA                      |
| P3-2 | Job recommendations / AI matching | Deferred candidate value                  | Build matching foundations before enabling the deferred dashboard card; keep AI advisory only (no hiring decisions) | 1–3 weeks | Code, infrastructure          |
| P3-3 | Restore & secret-rotation drills  | Operational resilience unproven           | Execute and document a restore drill and a rotation drill                                                           |  1–2 days | Infrastructure, documentation |
| P3-4 | Coverage threshold in CI          | Prevents silent coverage regressions      | Add a coverage gate to the unit job                                                                                 |   0.5 day | Code, CI                      |

---

## 8. Explicit evaluation of the named known gaps

| Known gap                                                | Finding                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No authenticated browser E2E suite                       | Confirmed. No Playwright/Cypress config or browser tests. (P1-1)                                                                                                                                                                                                                     |
| Recruiter production QA unverified                       | Confirmed. Intentionally skipped; remains UNVERIFIED. (P0-1)                                                                                                                                                                                                                         |
| Company and job production QA unverified                 | Confirmed. UNVERIFIED. (P0-1)                                                                                                                                                                                                                                                        |
| Application and interview production QA unverified       | Confirmed. UNVERIFIED. (P0-1)                                                                                                                                                                                                                                                        |
| Email verification disabled                              | Confirmed. `requireEmailVerification: false`. (P0-2)                                                                                                                                                                                                                                 |
| Arbitrary-recipient production email delivery unverified | Confirmed. Provider + outbox tested; real delivery unproven. (P0-4)                                                                                                                                                                                                                  |
| Email outbox operational UI missing or unverified        | Confirmed missing. No Admin outbox route. (P1-3)                                                                                                                                                                                                                                     |
| Recurring dispatcher/cron ownership unverified           | Confirmed. Endpoint exists; no committed schedule or owner. (P1-2)                                                                                                                                                                                                                   |
| Job reopening support missing or unverified              | Confirmed missing. No reopen transition in `JobStatus` or code. (P3-1)                                                                                                                                                                                                               |
| Coming Soon / placeholder functionality                  | Found: stale "Job listings coming next" card on public Company page (P2-1); intentional deferred job-recommendations card on Candidate dashboard (by design).                                                                                                                        |
| README vs implementation mismatch                        | README is largely accurate and honest. Issues: broken `docs/screenshots/README.md` link; Limitations omitted the public Company-page placeholder and the missing Terms/Privacy legal routes; README currently fails `prettier --check`. Addressed in the accompanying README update. |

---

## 9. Safe local checks — exact results

Checks were run in a **Linux audit sandbox** against the connected working tree.
Two environmental constraints materially limited what could be executed, and are
reported transparently rather than worked around:

1. The vendored `node_modules` contains **Windows-only native binaries**
   (`@next/swc-win32-x64-msvc`, `@rolldown/binding-win32-x64-msvc`); the Linux
   equivalents are absent. Any tool requiring these native bindings (Vitest via
   rolldown, `next build`, `next typegen`) cannot execute in this Linux sandbox.
2. The sandbox terminates long-running/background processes after a few minutes,
   which prevented completing the slower ESLint run here.

These exact gates are, however, enforced in CI (`.github/workflows/ci.yml`) on
Ubuntu with Node 22.23.1 and a fresh `npm ci`, and gate the live production
deployment. Node modules were **not** reinstalled here to avoid mutating the
user's platform-specific working tree.

| Command                                                 | Result                        | Notes                                                                                                                                                                                             |
| ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prettier --check .` (`npm run format:check`)           | **FAIL → then fixed**         | Originally failed on `README.md` and a prior-session `docs/release-readiness.md`; both were reformatted, and that summary file was later consolidated into this audit and removed. Re-run passes. |
| `tsc --noEmit` (TypeScript half of `npm run typecheck`) | **PASS**                      | Clean, no type errors.                                                                                                                                                                            |
| `npm run typecheck` (full, incl. `next typegen`)        | **NOT EXECUTABLE in sandbox** | `next typegen` needs the Linux `@next/swc` binary (absent). Enforced in CI.                                                                                                                       |
| `npm run lint` (`eslint .`)                             | **NOT COMPLETED in sandbox**  | Exceeded the sandbox process window; partial runs showed no native-binding error. Enforced in CI.                                                                                                 |
| `npm test` (`vitest run`)                               | **NOT EXECUTABLE in sandbox** | Startup error: missing `@rolldown/binding-linux-x64-gnu` (node_modules is Windows-native). Enforced in CI; 66 suites present.                                                                     |
| `npm run build` (`next build`)                          | **NOT EXECUTABLE in sandbox** | Needs the Linux `@next/swc` binary (absent). Enforced in CI and by the production deploy pipeline.                                                                                                |
| `npm run test:integration`                              | **SKIPPED per rules**         | Requires a live isolated `TEST_DATABASE_URL` / `RUN_DATABASE_INTEGRATION_TESTS`; no non-production database is available and connecting is out of scope.                                          |

No environment files were modified. No migrations, seeds, cleanup, or destructive
commands were run.

---

## 10. Honest remaining-work estimate

To reach **"production-ready product"** status (all P0 + P1 cleared), realistic
remaining effort is approximately **3–4 focused weeks** for one experienced
developer, dominated by: email verification + recovery (P0-2), the legal surface
(P0-3), the authenticated E2E suite (P1-1), the outbox operational UI (P1-3), and
the supervised production QA passes for the full two-sided workflow (P0-1, P0-4,
P1-4). Provider/legal approvals may extend the calendar time beyond the
engineering estimate.

To reach **"strong, fully-polished portfolio"** status (P2 cleared on top of the
current base), realistic remaining effort is approximately **2–4 days**: fix the
stale Company-page placeholder (P2-1), add screenshots and repair the doc link
(P2-2), decide the license (P2-3), and polish repo metadata (P2-4).

The current state is already a credible portfolio project when described
honestly;
