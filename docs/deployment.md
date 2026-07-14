# Production deployment

CareerBridge is repository-ready for a controlled Vercel deployment, but this document does not claim that a Vercel project, production domain, Neon database, private bucket, Resend sender, GitHub Environment, or Cron schedule currently exists. Creating or changing those external resources requires an authorized operator.

## Architecture and topology

- Vercel runs the Next.js 16 App Router application and auto-detects the framework. Use the repository `npm run build` command, `npm ci`, and the normal Vercel output adapter; no custom output directory is configured.
- A dedicated Neon production project or production branch provides two connections to the same production database: `DATABASE_URL` is the pooled application connection and `DIRECT_URL` is the direct Prisma CLI/migration connection.
- Better Auth, Prisma, Resend, and document storage are initialized lazily. Vercel production startup validates the complete server environment before accepting traffic.
- Candidate CV objects live in a private S3-compatible bucket. The application is the only access path; object URLs are never public.
- Transactional intent is committed to `EmailOutbox` with the business transaction. A bearer-authenticated Vercel Cron GET adapter calls the existing dispatcher service directly; the existing separately protected POST route remains available for controlled operations.
- `GET /api/health` is an unprefixed, uncached readiness endpoint. It performs one bounded, read-only database probe and returns only `{"status":"ok"}` or `{"status":"unavailable"}`.
- GitHub Actions CI validates every pull request and push to `main`. Production deployment is manual and protected by the GitHub `production` Environment.

## Required external accounts

An authorized operator needs:

1. The GitHub repository with permission to configure Actions secrets and Environments.
2. A Vercel account/team and a project linked to this repository.
3. A dedicated Neon production project or production branch.
4. A private S3-compatible object-storage account and bucket.
5. A Resend account with an approved sending domain/address.
6. DNS access for the canonical production domain, when a custom domain is used.

Do not reuse the development or isolated integration-test database, bucket, credentials, or sender in production.

## Vercel project setup

1. Import the GitHub repository into Vercel.
2. Confirm Framework Preset is Next.js and the project root is the repository root.
3. Leave Install Command, Build Command, and Output Directory at framework defaults (`npm ci`/detected install, `npm run build`, Vercel-managed output).
4. Set the Production Branch to `main`.
5. Keep Vercel Git production deploys disabled if the controlled GitHub workflow is authoritative. Avoid two systems racing to deploy the same branch.
6. Keep Preview deployments enabled for non-production branches only after Preview environment isolation is complete.
7. Add the canonical domain and HTTPS, then set all three canonical-origin variables to that exact origin.
8. Link the local/CI project only through Vercel tooling. `.vercel/` is git-ignored and must not be committed.

No `vercel.json` is currently required. Framework detection, build output, headers, and functions use supported Next.js/Vercel defaults. Cron activation is deliberately deferred until the Vercel plan and desired delivery latency are confirmed.

## Environment separation

| Variable group      | Local development                  | GitHub CI                         | Vercel Preview                                      | Vercel Production                          |
| ------------------- | ---------------------------------- | --------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Application origin  | Localhost is allowed               | Non-secret CI placeholder         | Canonical public origin for metadata                | Canonical HTTPS origin                     |
| Database            | Development only                   | No application DB in static job   | Dedicated Preview DB                                | Dedicated production Neon DB               |
| Auth                | Local secret/origin                | Non-secret build-only placeholder | Preview secret; exact `VERCEL_URL` is the auth base | Production secret and canonical base       |
| CV storage          | Local or isolated S3 test          | Not used by static job            | Dedicated private S3-compatible bucket/prefix       | Dedicated private production bucket/prefix |
| Email               | `log`, no network                  | `log`, no network                 | No real delivery unless explicitly configured       | `resend` with verified sender              |
| Dispatcher/Cron     | Optional local synthetic values    | Not used                          | Cron inactive                                       | Separate strong POST and Cron secrets      |
| Integration testing | Dedicated `TEST_DATABASE_URL` only | GitHub `TEST_DATABASE_URL` secret | Never configured                                    | Never configured                           |

Preview must never receive production `DATABASE_URL`, `DIRECT_URL`, storage credentials, Resend key, dispatcher secret, or Cron secret. Vercel branch-scoped Preview variables may be used for a shared non-production environment, but it must remain distinct from production.

## Production environment variables

Set these in Vercel Production. Values are intentionally omitted:

- Application: `APP_BASE_URL`
- Database: `DATABASE_URL`, `DIRECT_URL`
- Authentication: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, optionally `BETTER_AUTH_TRUSTED_ORIGINS`
- Storage: `DOCUMENT_STORAGE_DRIVER=s3`, `DOCUMENT_STORAGE_S3_ENDPOINT` when using a custom provider, `DOCUMENT_STORAGE_S3_REGION`, `DOCUMENT_STORAGE_S3_BUCKET`, `DOCUMENT_STORAGE_S3_ACCESS_KEY_ID`, `DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY`, `DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE`
- Email: `EMAIL_DELIVERY_DRIVER=resend`, `EMAIL_FROM_ADDRESS`, optional `EMAIL_FROM_NAME`, optional `EMAIL_REPLY_TO`, `EMAIL_RESEND_API_KEY`, `EMAIL_APP_BASE_URL`, optional bounded `EMAIL_BATCH_SIZE`, optional bounded `EMAIL_MAX_ATTEMPTS`
- Dispatcher/Cron: `EMAIL_DISPATCH_SECRET`, `CRON_SECRET`
- Deployment metadata: Vercel supplies `VERCEL_ENV` and `VERCEL_URL`

`APP_BASE_URL`, `BETTER_AUTH_URL`, and `EMAIL_APP_BASE_URL` must resolve to the same canonical HTTPS origin in production. Localhost, credentialed URLs, query/hash components, unsafe placeholders, local document storage, the email log driver, missing migration/runtime connections, and missing production secrets fail validation by variable name only. Secret values are never included in the error.

For Preview, set a non-production `APP_BASE_URL` for canonical metadata, a Preview auth secret, and isolated data/provider values. Better Auth derives the exact preview base from Vercel's `VERCEL_URL`; optional trusted origins are comma-separated exact origins. Wildcards are rejected.

## Dedicated Neon production database checklist

- Create a dedicated Neon project or production branch; do not clone credentials from development or test.
- Select a region close to the chosen Vercel function region and expected users.
- Use Neon's pooled connection for `DATABASE_URL` and a distinct direct connection for `DIRECT_URL`/`PRODUCTION_DIRECT_URL`.
- Require TLS. Production validation rejects missing or disabled `sslmode`; `verify-full` is preferred.
- Confirm current connection limits and size the application pool for Vercel concurrency.
- Restrict production access to the smallest operator/service set and enable MFA where available.
- Confirm backup/restore or point-in-time recovery availability and retention before launch.
- Record and rehearse the provider restore procedure. Application rollback does not reverse a schema migration.
- Establish credential rotation ownership and a maintenance window/process.
- Never run `prisma db push`, `prisma migrate dev`, `prisma migrate reset`, or development fixture seeding against production.

After configuration, run `npm run env:validate:production` in a context containing the pulled production values. The command prints only success or invalid variable names.

## Prisma migration strategy

Migration history in `prisma/migrations` is the source of truth. Production uses only:

```text
npm run prisma:migrate:deploy
```

The controlled order is:

1. Check out an exact reviewed commit.
2. Install from `package-lock.json` with `npm ci`.
3. Pull and validate production configuration.
4. Generate Prisma Client and validate the schema.
5. Run unit, lint, type, formatting, and build gates.
6. Build the Vercel production artifact.
7. Apply pending migrations with the direct production migration connection.
8. Deploy that already-built artifact with `vercel deploy --prebuilt --prod`.
9. Run public smoke checks against the returned deployment URL.

The build occurs before the database mutation. Future schema changes should use expand-and-contract: add compatible structures first, deploy code that tolerates both shapes, backfill separately, and remove old structures in a later verified release.

If the build succeeds but migration fails, no new application artifact is deployed. Investigate the migration and leave the existing production application in place. Never silently resolve a failed migration. If migration succeeds but deployment fails, the old application remains live against the new schema; this is why every production migration must be backward-compatible with the currently deployed application.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on every pull request and push to `main` with read-only repository permission and cancellation of superseded branch/PR runs. It pins Node 22.23.1 and uses the npm lockfile.

The quality job runs install, Prisma generate/validate, unit tests, ESLint, TypeScript, formatting, and a production build. It has no production database secret.

The integration job is separate. Configure the repository Actions secret `TEST_DATABASE_URL` with an isolated test database. The job fails visibly when the secret is missing, sets `DIRECT_URL` to the test connection only for schema validation/migration, requires `RUN_DATABASE_INTEGRATION_TESTS=true`, and never sets or falls back to application `DATABASE_URL`.

Remote GitHub Actions status is not verified until the workflows run in GitHub.

## Controlled production workflow

Create a GitHub Environment named `production`. Add required reviewers/manual approval and restrict allowed deployment branches/tags according to repository policy. Add these Environment secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PRODUCTION_DIRECT_URL`

The other runtime/build values remain scoped in Vercel and are pulled by Vercel CLI; they are not duplicated into GitHub. The workflow is manual (`workflow_dispatch`) and requires the full reviewed commit SHA. It uses one non-canceling production concurrency group so a running migration/deployment cannot be interrupted or raced by another production run. Vercel CLI is pinned to 56.1.0.

Enable the workflow only after the Vercel project link, environment values, Neon recovery plan, storage, sender, and GitHub approval rules are reviewed.

## Private S3-compatible CV storage checklist

- Use a dedicated private bucket or a production-only account/prefix.
- Disable public access and anonymous listing/read.
- Grant the application only the object operations it needs for the selected scope.
- Configure region, endpoint, addressing mode, and TLS according to the provider.
- Configure lifecycle/versioning/retention consistently with immutable CV versions and Application snapshots; do not expire attached historical objects prematurely.
- Keep server-side authorization and `/api/documents/[documentId]/download` as the only download path.
- Test only with approved synthetic PDFs, verify authorized/unauthorized behavior, then delete the synthetic object/metadata.
- Document key rotation and provider outage procedures.

Local filesystem storage remains available only for development/test and is rejected on production-like Next.js runtimes. No real CV should be used for deployment testing.

## Resend production checklist

1. Create the provider account without sending application email.
2. Verify the production sending domain/address.
3. Set `EMAIL_FROM_ADDRESS`, optional sender name, and optional reply-to policy.
4. Store the API key only in Vercel Production.
5. Keep Preview on a non-network path or an explicitly approved isolated sender.
6. Configure and authenticate the dispatcher schedule.
7. With explicit approval, send a synthetic `example.test`-style test through an approved provider recipient and verify only delivery status/log categories, never body or recipient in application logs.
8. Rotate the provider key and sender credentials according to policy.

Real email has not been sent as part of repository preparation.

## Cron and dispatcher configuration

The existing protected POST endpoint remains `/api/internal/email/dispatch` and uses `EMAIL_DISPATCH_SECRET`. Vercel Cron calls `GET /api/internal/email-dispatch/cron` with `Authorization: Bearer <CRON_SECRET>`. The adapter rejects a missing or invalid secret with 401, uses constant-time digest comparison, invokes `dispatchEmailBatch` directly, and returns only aggregate counts. It does not trust User-Agent and does not make an HTTP call back into the app.

Queue safety remains in the dispatcher: `FOR UPDATE SKIP LOCKED`, per-row lock tokens, stale recovery, idempotency keys, bounded retries, dead letters, and append-only delivery attempts. Cron overlap and duplicate invocations are expected; these database guarantees remain authoritative.

The plan is not known, so no active schedule is committed. After confirming current Vercel limits, an operator may add one reviewed `vercel.json` entry. A once-daily example is broadly compatible but usually too slow for transactional delivery; a five-minute example requires a plan supporting that frequency:

```json
{
  "crons": [
    {
      "path": "/api/internal/email-dispatch/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Do not claim Cron is active until a production deployment shows successful authenticated invocations in Vercel logs and queue movement.

## Health, logs, and security headers

- Monitor `GET /api/health`. HTTP 200 means the process and bounded database probe are ready; HTTP 503 means a required readiness dependency failed or timed out. The response intentionally omits versions, table/migration names, URLs, stack traces, and provider detail.
- Production logs use stable events and bounded aggregate metadata. Never log request bodies, cookies, sessions, authorization headers, connection strings, secrets, CV metadata/content, internal notes, meeting URLs, EmailOutbox content, recipient addresses, or provider response bodies.
- Global headers include `X-Content-Type-Options`, strict-origin referrer policy, a restricted `Permissions-Policy`, and frame denial. HSTS is emitted only when `VERCEL_ENV=production`.
- A strict CSP is deferred to Phase 7B. Next.js, `next-themes`, auth/forms, and localized rendering need a tested nonce-based policy; a fragile static partial CSP is not enabled.

## Smoke tests

After an actual deployment, the workflow runs:

```text
npm run smoke:production -- https://deployment-origin.example
```

The read-only script verifies root locale redirection, `/en`, `/tr`, `/az`, `/ru`, robots, sitemap, readiness, and production security headers. It does not register users, mutate data, upload a CV, or send email. Authenticated Candidate/Recruiter/Admin, 390px mobile, light/dark, and deep privacy checks remain a manual Phase 7B production QA checklist with synthetic approved data.

## Rollback and database reality

- Application-only incident with compatible schema: promote or roll back to the last known-good Vercel deployment, run health/smoke checks, and monitor errors.
- New schema is backward-compatible with the previous application: application rollback is normally safe.
- New schema is not backward-compatible: prefer an urgent roll-forward. Do not blindly down-migrate.
- Destructive/data incident: stop relevant writes/cron, preserve evidence, and use the reviewed Neon restore/recovery procedure into a separately verified target before cutover.
- Credential compromise: rotate at the provider, update only the affected Vercel/GitHub scopes, redeploy, revoke old access, and audit logs.
- Email incident: remove/disable the Cron schedule or rotate `CRON_SECRET`, keep outbox rows durable, and resume only after provider/configuration verification.

See `docs/operations-runbook.md` for the operator decision tree and incident checklists.

## Common deployment failures

| Symptom                                  | Safe response                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Environment validation lists names       | Configure those names in the correct Vercel/GitHub scope; never paste values into logs/issues                              |
| Prisma validate cannot read `DIRECT_URL` | Restore the direct migration secret in the protected context; do not substitute the pooled/test URL                        |
| Vercel build fails                       | Fix the commit and rebuild; no migration should have run yet                                                               |
| Migration fails                          | Stop; inspect migration/provider state; do not resolve/reset automatically                                                 |
| Deploy fails after migration             | Keep old app live, confirm compatibility, retry deploy or roll forward                                                     |
| Health returns 503                       | Inspect redacted runtime and Neon availability; do not expose dependency detail through health                             |
| CV operations fail                       | Verify private bucket endpoint/IAM/region without making it public or switching production to local disk                   |
| Email accumulates retries/dead letters   | Disable/slow Cron if necessary, verify Resend/sender, preserve rows, and avoid manual duplicate sends                      |
| Preview reaches production data          | Disable Preview deployment immediately, rotate exposed credentials, correct Vercel scoping, and perform an incident review |

## External setup status

Repository implementation is complete for this phase. Vercel authentication/linking, project/domain creation, dedicated Neon production provisioning, production S3 credentials, Resend verification/key, GitHub secrets/Environment approval, Cron activation, real email, production migration, deployment, and production smoke/manual QA remain external user configuration and are not verified.
