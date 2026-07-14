# Production operations runbook

This runbook assumes an approved CareerBridge production deployment. It never authorizes creating infrastructure, changing paid plans, mutating production data, sending real email, or rotating credentials without the responsible operator's approval.

## Pre-deployment checklist

- [ ] Full reviewed commit SHA selected; no uncommitted deployment-only changes.
- [ ] GitHub `production` Environment approval and branch/tag rules active.
- [ ] CI quality and isolated integration jobs passed remotely for the commit.
- [ ] Vercel project, production branch, canonical domain, and project IDs verified.
- [ ] Vercel Preview values are isolated from Production.
- [ ] Dedicated Neon production runtime/direct connections configured and recovery availability confirmed.
- [ ] Pending migrations reviewed for backward-compatible expand-and-contract behavior.
- [ ] Production environment validation passes without printing values.
- [ ] Private S3-compatible bucket policy/IAM and retention reviewed.
- [ ] Resend sender is verified; real-email testing has explicit approval.
- [ ] `EMAIL_DISPATCH_SECRET` and `CRON_SECRET` are distinct and protected.
- [ ] Cron frequency is valid for the actual Vercel plan or remains disabled.
- [ ] Current production health and last-known-good Vercel deployment recorded in the incident system.

Start `.github/workflows/deploy-production.yml` with the full commit SHA. Do not start a second run; workflow concurrency is intentionally non-canceling.

## Post-deployment checklist

- [ ] Workflow reports prebuilt deployment success.
- [ ] Migration step completed before deploy and after artifact build.
- [ ] Read-only smoke script passed root redirect, four locale roots, robots, sitemap, health, and headers.
- [ ] Canonical production alias/domain points to the new deployment.
- [ ] `/api/health` returns 200 without internal detail.
- [ ] Vercel runtime error logs show no new stable error events.
- [ ] Signed-out protected-route denial remains correct.
- [ ] With approved synthetic accounts, Candidate/Recruiter/Admin role and suspension checks pass.
- [ ] With an approved synthetic PDF, private storage authorization passes and the fixture is removed.
- [ ] Queue aggregate status is stable; no unexpected retry/dead-letter surge.
- [ ] Cron invocation is confirmed only if a schedule was intentionally activated.
- [ ] Desktop and 390px mobile, light/dark, and all four locales receive a manual QA pass.

## Routine health checks

1. Request `GET /api/health` with a short monitoring timeout.
2. Treat 200 as ready and 503/timeout as an incident signal. Do not scrape or expect internal dependency names.
3. Correlate failure time with Vercel runtime events and Neon provider status.
4. Confirm public localized pages still respond; health alone does not prove the complete product flow.
5. After recovery, repeat the public smoke script and the smallest relevant authenticated synthetic flow.

## Email queue and dead-letter checks

Use a restricted read-only administrative database view/tool. Inspect aggregate counts and oldest timestamps by queue state; do not select recipient, subject, text/HTML bodies, destinations, dedupe keys, or provider payloads into logs/tickets.

- Rising `PENDING`: Cron may be disabled/unauthorized or dispatch capacity is too low.
- Long-lived `PROCESSING`: stale recovery should return rows to retry after its bounded lock window; investigate repeated worker termination.
- Rising `RETRY_SCHEDULED`: inspect stable attempt error codes and Resend/provider status.
- Any new `DEAD_LETTER`: classify the stable code, correct configuration/provider cause, and define an approved replay procedure. Never mutate immutable delivery attempts or send directly around the outbox.
- Unexpected `SUPPRESSED`: verify event-time user preference behavior; do not retroactively send suppressed intent.

Queue checks must preserve `SKIP LOCKED`, lock-token ownership, idempotency, retry limits, localized snapshots, preference suppression, and append-only attempts.

## Authentication checks

- Confirm production origin and Better Auth base match exactly and use HTTPS.
- Confirm production cookies are Secure, HttpOnly, and SameSite Lax.
- Verify registration offers only Candidate/Recruiter roles and cannot create Admin.
- Verify signed-out denial, cross-role denial, MEMBER limitations, and suspended-account session revocation.
- Verify redirects remain same-origin and locale-safe.
- Never log cookies, session records, auth headers, passwords, hashes, or full auth errors.

## Storage checks

- Confirm the configured driver is S3-compatible, bucket/object access is private, and no object URL is public.
- Test Candidate-owner download and authorized Company OWNER download against an approved synthetic Application snapshot.
- Verify unrelated Recruiter, MEMBER, Admin, Candidate, and signed-out denial remain indistinguishable from not found.
- Confirm responses remain attachment-only, PDF content type, `private, no-store`, `nosniff`, sandboxed, and re-authorized per request.
- Remove synthetic database/object fixtures after the check. Never use a real Candidate CV.

## Database migration checks

- Before: review the exact migration SQL, compatibility, expected duration/locks, and Neon recovery point.
- During: allow only `prisma migrate deploy` using the protected direct production connection. Never use dev/reset/db-push/seed.
- After: confirm the migration step succeeded and health is ready. Do not expose migration names through the public endpoint.
- Failed migration: stop deployment, preserve logs privately, inspect provider/migration state, and choose a reviewed repair/roll-forward. Never mark a migration resolved merely to unblock deployment.

## Rollback decision tree

```text
Production regression
|- No production migration in this release
|  `- Roll back/promote the previous Vercel deployment, then smoke-test
|- Migration is additive and previous app remains compatible
|  `- Roll back application, keep schema, then prepare a roll-forward fix
|- Previous app is not compatible with the new schema
|  `- Keep/restore service safety controls and roll forward urgently
`- Data was corrupted or destructively changed
   `- Stop affected writes/Cron; invoke the reviewed Neon restore/recovery plan
```

Application rollback never automatically reverses Prisma migrations. Do not improvise a down migration. Prefer additive releases and emergency feature/dispatcher disablement while a safe roll-forward is prepared.

## Secret compromise response

1. Declare an incident and identify the affected scope without copying the value.
2. Disable the affected integration/route when feasible.
3. Rotate/revoke at the source provider first.
4. Update the narrowly scoped Vercel or GitHub Environment variable.
5. Redeploy if runtime/build values changed.
6. Verify old credentials no longer work and review access/runtime logs.
7. Check for data/provider misuse and notify owners according to policy.
8. Record timeline and preventive action without including the secret.

Special cases:

- `CRON_SECRET`: disable schedule or rotate immediately; invalid requests return 401.
- `EMAIL_DISPATCH_SECRET`: suspend controlled POST use and rotate separately from Cron.
- Resend key: disable dispatch, rotate, review provider activity, preserve outbox intent.
- S3 key: block uploads/downloads if required, rotate, review object access; never make the bucket public as a workaround.
- Database credential: rotate pooled/direct roles independently where possible, review connections, and verify application/migration paths.
- Better Auth secret: rotate under an approved session-invalidation plan because active sessions may be affected.

## Provider outage response

### Vercel outage

- Confirm provider status and deployment/runtime scope.
- Avoid repeated deploys while the control plane is degraded.
- Keep the last known-good deployment reference and communicate user impact.
- When restored, run health, public smoke, and targeted authenticated checks.

### Neon/database outage

- Expect health 503 and authenticated/database-backed flows to fail safely.
- Do not switch production to development/test or run reset/recovery commands ad hoc.
- Confirm provider status, connection limits, pooled/direct configuration, and recovery options.
- After recovery, check migration state, queue stale-lock recovery, and core auth/application flows.

### Object-storage outage

- CV upload/download should fail with stable safe messages; authorization must remain enforced.
- Do not switch to Vercel filesystem or public object access.
- Confirm endpoint, region, IAM, provider status, and object retention.
- After recovery, use one synthetic authorized/unauthorized check and clean it up.

### Resend/email outage

- Outbox intent remains durable. Retryable failures should schedule bounded retries and exhausted/permanent failures become dead letters.
- Disable or slow Cron if repeated calls add no value; do not delete queue history.
- Confirm provider status, API key, verified sender, rate limits, and stable failure categories.
- Resume under idempotency protection; never bulk-send directly around the dispatcher.

## Cron and dispatcher emergency controls

- Preferred pause: remove/disable the Vercel Cron schedule and retain durable queue rows.
- Immediate authentication cutoff: rotate/remove `CRON_SECRET`; Cron requests then receive 401.
- Controlled POST cutoff: rotate/remove `EMAIL_DISPATCH_SECRET` independently.
- Do not weaken authorization, expose queue contents, delete attempts, or edit lock tokens manually.
- After restoration, confirm one authenticated synthetic invocation, aggregate movement, overlap safety, and no recipient/body data in logs.

## Incident communications and evidence

- Record times, affected deployment/commit, safe event codes, aggregate counts, and provider incident references.
- Do not paste environment files, connection strings, tokens, auth headers, cookies, sessions, private Candidate data, CV metadata/content, notes, meeting URLs, outbox bodies, recipient addresses, or provider bodies.
- Preserve immutable audit/history records and provider logs under the correct access policy.
- Close with root cause, user impact, recovery verification, credential status, and follow-up owner/date.

## Cleanup after synthetic verification

- Remove synthetic Users/sessions, Companies, Jobs, Applications, Interviews, Notifications, queue rows/attempts, and uploaded synthetic CV objects created specifically for the check.
- Remove scratch scripts, temporary logs, screenshots, and temporary environment files.
- Never delete real production data under this checklist.
- Stop local verification servers.
