# Production synthetic data cleanup

This runbook covers only the two reviewed synthetic roots:

- `cb-browser-p6a-20260713-001` (display marker `Phase 6A Browser`)
- `cb-verify-1783989194946-mrjx3sn6`

The utility is intentionally fail closed. Its approved footprint is exactly 6
Users, 6 Accounts, 5 Sessions, 1 CandidateProfile, 1 RecruiterProfile, 2
Companies, 2 CompanyMemberships, and 2 Jobs. A completely absent footprint is
reported as `no_matches`; any partial footprint, changed count, unknown role,
changed relationship, or forbidden dependency aborts.

The script never reads or prints emails, password hashes, auth/session tokens,
connection strings, document contents, storage credentials, notification/email
bodies, note bodies, or invitation data. Record IDs are written only to the
gitignored local plan file. There is no runtime route or admin UI.

## Prerequisites

1. Work from a reviewed commit on the dedicated cleanup branch with no local
   edits to the utility, schema, migrations, or plan.
2. Use a trusted administrative workstation and a direct PostgreSQL connection
   with TLS certificate verification. Do not paste the URL into chat, tickets,
   shell history, screenshots, or the runbook.
3. Confirm the operator has the minimum database permissions needed for the
   preview. Grant delete access only for the separately approved execute window.
4. Confirm no schema migration or synthetic verification is running.
5. Have a second reviewer present for plan review and execution approval.
6. Verify the deployment commit and Prisma migrations match the reviewed
   checkout. The utility rejects any foreign-key graph drift.

## Backup and PITR verification

Before preview and again immediately before execute:

1. Confirm automated backups and point-in-time recovery are enabled for the
   production database.
2. Record the provider-side backup/PITR status and latest restorable timestamp
   in the private change record. Do not copy credentials or database URLs.
3. Confirm the retention window covers the entire change window.
4. Confirm an authorized operator knows the restore procedure and target. Do
   not test a production restore as part of this cleanup; use the provider's
   isolated restore verification process.
5. Stop if PITR health, retention, ownership, or restore readiness is unclear.

## Preview procedure

Preview is the default and the only mode permitted before final human approval.
It starts a PostgreSQL `SERIALIZABLE READ ONLY DEFERRABLE` transaction, verifies
`transaction_read_only=on`, audits the full reviewed foreign-key graph, writes
a redacted plan, and explicitly ends the database transaction with `ROLLBACK`.

From the repository root, inject `DATABASE_URL` from the approved secret manager
without echoing it, then run either command:

```powershell
npm run ops:synthetic-data:preview
```

```powershell
node --import tsx scripts/production-synthetic-data-cleanup.ts --mode preview
```

The second form makes the default mode visible in a recorded direct command.
Do not use command-line connection-string arguments. The plan is created under
`.careerbridge-operations/production-synthetic-data-cleanup/`, which is
gitignored. It contains exact internal IDs and must remain on the trusted
workstation.

Expected preview characteristics:

- plan status `ready` before cleanup, or `no_matches` after a successful cleanup;
- the exact approved counts listed above;
- one Candidate, Recruiter, and Admin User per root;
- one OWNER Recruiter membership and one Job per Company;
- zero forbidden dependencies;
- a SHA-256 plan digest;
- final database result `ROLLBACK`;
- no document/storage records and no S3 operation.

Stop if any expectation differs. Do not edit a plan to make it pass.

## Human plan review

Two people must review the newly generated plan before execute:

1. Confirm the branch, commit, schema, and generated timestamp.
2. Confirm both exact root slugs and all expected counts.
3. Confirm every forbidden dependency count is zero.
4. Confirm roles, statuses, membership roles, and safe slugs are plausible.
5. Review the exact internal IDs in the local plan against the separately
   approved audit evidence. Never copy IDs together with emails or other PII.
6. Independently recompute or verify the displayed digest using the reviewed
   utility. Never modify the JSON or its digest field.
7. Record only the plan filename, digest, approval identities, and timestamp in
   the private change record.

A `no_matches` plan cannot authorize execute. Any new session or other graph
change requires a new preview and another review.

## Execute procedure

Execute requires all five gates: execute mode, the reviewed plan file, the exact
digest, the authorization environment variable, and the explicit confirmation
phrase. Schedule a quiet change window and pause synthetic test activity.

Inject `DATABASE_URL` and the authorization flag without logging their values,
then run:

```powershell
$env:ALLOW_PRODUCTION_SYNTHETIC_CLEANUP = "true"
npm run ops:synthetic-data:execute -- --plan-file ".careerbridge-operations/production-synthetic-data-cleanup/<reviewed-plan>.json" --confirm-digest "<reviewed-lowercase-sha256>" --confirm DELETE_APPROVED_SYNTHETIC_PRODUCTION_DATA
```

The script accepts only a regular, non-symlink JSON plan inside the gitignored
operations directory. It verifies both digests before connecting, starts a
serializable transaction, locks the exact planned IDs, and re-audits the graph.
It aborts if the graph differs by even one record.

Deletion uses only plan IDs, in this order: Session, Account,
CandidateProfile, RecruiterProfile, CompanyMembership, Job, Company, User.
Sessions are therefore revoked before Users. There is no prefix-based delete,
no database-wide reset, no S3 client, and no storage deletion. If any document,
resume, access log, or storage key is detected, the database operation aborts;
storage cleanup must be separately designed, approved, and performed.

Unset the authorization flag and remove the database URL from the process
environment when the window closes.

## Rollback behavior

Preview always issues `ROLLBACK`, including after a successful audit. Execute
issues `COMMIT` only after every planned row and both root locators verify as
zero. Argument, digest, schema, count, relationship, lock, delete, or final
verification failure issues `ROLLBACK`.

If the database reports `COMMIT` but later business verification finds a
problem, stop writes, open an incident, and follow the provider-approved PITR
restore process. Do not improvise inverse inserts from the cleanup plan.

## Post-cleanup verification

1. Run preview again. It must return `no_matches`, all approved counts zero, all
   forbidden counts zero, and `ROLLBACK`.
2. Verify the two Company and Job public slugs return the normal not-found
   behavior and do not redirect to unrelated content.
3. Verify the synthetic accounts cannot establish authenticated sessions.
4. Check aggregate platform counts changed only by the reviewed footprint.
5. Review database/application logs for success/failure categories only. Do not
   search logs using emails, tokens, or document metadata.
6. Preserve the private change record and digest per retention policy, then
   securely remove the local plan when evidence retention permits.

## Public URL verification

Run the existing read-only public smoke suite against the canonical HTTPS origin:

```powershell
npm run smoke:production -- https://<canonical-production-host>
```

Then manually verify the home page, locale roots, job discovery, Company
discovery, login page, `robots.txt`, `sitemap.xml`, and `/api/health`. Use only
public URLs and status categories in evidence. Do not register replacement test
accounts or create new synthetic data during this verification.

## Secret-handling rules

- Source database URLs and approvals from the approved secret manager.
- Never put secrets in plan JSON, shell arguments, screenshots, clipboard notes,
  tickets, chat, CI artifacts, or terminal transcripts.
- Never print or query-select emails, passwords, account tokens, session tokens,
  connection strings, storage credentials, document content, notification/email
  bodies, or note bodies.
- Treat internal IDs and the plan digest as private operational metadata.
- Do not commit, upload, or attach `.careerbridge-operations/` contents.
- Rotate credentials and open an incident if any sensitive value is exposed.

## Why Prisma Studio must not be used

Prisma Studio is an interactive, broad database editor. It does not enforce this
operation's exact roots, reviewed plan digest, read-only preview transaction,
foreign-key graph assertions, dependency-safe order, session-first deletion,
pre-commit zero verification, or automatic rollback on assertion failure. It
also exposes sensitive columns that this utility deliberately never selects.
Manual Studio deletion is therefore unauditable and unsafe for this cleanup.
