# CareerBridge product specification

## Product vision

CareerBridge is a job and internship platform that gives candidates a clearer route to meaningful work and gives hiring teams a more structured way to find, evaluate, and support talent.

The product should feel trustworthy, focused, and useful before any AI capability is introduced. AI will later improve relevance and drafting assistance, but the core experience must remain complete, understandable, and operable without it.

## Problem statement

Candidates often split their career information, opportunity discovery, and application tracking across disconnected tools. Recruiters face inconsistent candidate information, noisy pipelines, and limited visibility into process health. Platform operators need reliable moderation and analytics without resorting to opaque workflows.

CareerBridge brings these activities into one role-aware system with shared domain concepts and explicit status transitions.

## User roles

### Candidate

- Create and maintain a professional profile
- Add education, experience, and skills
- Upload and manage a CV
- Search and filter jobs and internships
- Save opportunities
- Apply for roles
- Track application status and history
- Receive in-app notifications when an application's status changes

### Recruiter

- Create and maintain a company profile
- Create, edit, publish, and close job listings
- Review applicants and candidate profiles
- Access candidate CVs when authorized
- Keep private internal notes on applications with the hiring team
- Update application statuses
- Receive in-app notifications when candidates apply to or withdraw from owned-Company Jobs
- View recruitment workflow analytics

### Admin

- Manage users, companies, listings, and reports
- Review platform-level analytics
- Moderate content and respond to trust and safety concerns
- Audit important platform actions

## MVP scope

The initial product MVP is expected to include:

1. Role-based account creation and secure sessions
2. Candidate profile, education, experience, skill, and CV management
3. Company profiles and recruiter membership
4. Job listing lifecycle and public discovery
5. Saved jobs and application submission
6. Candidate and recruiter application tracking
7. Interview scheduling with candidate responses
8. Basic admin moderation and operational views
9. Essential product analytics and audit records

## In-app notifications and activity center (Phase 4A)

Phase 4A adds in-app notifications on the completed identity, profile, Company, Job, application, saved-job, CV-document, and Recruiter-note foundations:

- Notify a Candidate when a Recruiter changes their application's status, and notify every current Company OWNER Recruiter when a Candidate submits or withdraws an application to a Job the Company owns
- Resolve recipients server-side from fresh database state, excluding MEMBER users, Admins, the acting Candidate, and unrelated Companies; never trust a recipient supplied by the browser
- Create each notification inside the existing application submission, status-transition, and withdrawal transaction, so it is atomic with the status change and its history — a failed, invalid, or repeated action creates nothing
- Prevent duplicates with a deterministic, server-generated dedupe key and a database unique constraint, so transaction retries and concurrent duplicate submissions produce exactly one notification per recipient per event
- Generate bounded, escaped-text titles, messages, and safe internal destinations that contain no Candidate email, CV filename, note body, or private metadata
- Give each Candidate and Recruiter a private `/notifications` Activity Center with all/unread/read filters, bounded pagination, an unread count, an empty state, and mark-one/mark-all-as-read actions
- Show a recipient-scoped unread bell in the desktop and mobile header (exact 1–99, then `99+`) that refreshes on navigation and after mark-read, with no polling and no real-time claim
- Surface unread counts and recent notifications on the Candidate and Recruiter dashboards

Notifications are private to their recipient. A notification is retained with its original recipient after a role change and never grants access to the entity it references — the destination route re-authorizes independently. No public, cross-user, MEMBER, Admin, or search surface exposes a notification record, count, title, message, read state, recipient, or dedupe key. Every prior authorization, privacy, CV-access, and note-privacy boundary remains unchanged.

Email address ownership is still not verified, and no SMS, push, or real-time delivery exists. Transactional email arrives in Phase 4C as an explicitly asynchronous queue; the product must not claim real-time delivery or that an address has been verified until that infrastructure is implemented.

## Candidate profile access matrix

| Actor      | View/edit profile         | Mutate owned child record | Mutate another Candidate |
| ---------- | ------------------------- | ------------------------- | ------------------------ |
| Signed out | Redirect to sign-in       | Redirect to sign-in       | Denied                   |
| Candidate  | Allowed                   | Allowed                   | Denied by ownership      |
| Recruiter  | Redirect to own dashboard | Denied                    | Denied                   |
| Admin      | Redirect to Admin         | Denied by current policy  | Denied by current policy |

Hidden navigation is not authorization. Every protected page validates the database-backed session and exact role on the server.

## Recruiter and Company access matrix

| Actor               | Recruiter profile  | Private Company workspace | Edit/publish Company | Public published profile |
| ------------------- | ------------------ | ------------------------- | -------------------- | ------------------------ |
| Signed out          | Redirect           | Redirect                  | Redirect             | Allowed                  |
| Candidate           | Denied             | Denied                    | Denied               | Allowed                  |
| Recruiter nonmember | Allowed for self   | Not found                 | Not found            | Allowed                  |
| Recruiter MEMBER    | Allowed for self   | Allowed                   | Denied               | Allowed                  |
| Recruiter OWNER     | Allowed for self   | Allowed                   | Allowed              | Allowed                  |
| Admin               | No implicit access | No implicit access        | No implicit access   | Allowed                  |

Companies are private until an OWNER explicitly publishes them. Publication requires name, description, industry, headquarters, and a safe website URL. Public search accepts bounded name, industry, and headquarters query parameters and returns only published rows. Public detail exposes Company profile fields only—never owner email, Recruiter profile, or membership data.

## Job access matrix

| Actor               | View own Company Jobs | Create/edit Job    | Publish/close/archive | Public published Job |
| ------------------- | --------------------- | ------------------ | --------------------- | -------------------- |
| Signed out          | Redirect              | Redirect           | Redirect              | Allowed              |
| Candidate           | Denied                | Denied             | Denied                | Allowed              |
| Recruiter nonmember | Not found             | Not found          | Not found             | Allowed              |
| Recruiter MEMBER    | Not found             | Denied             | Denied                | Allowed              |
| Recruiter OWNER     | Allowed               | Allowed            | Allowed               | Allowed              |
| Admin               | No implicit access    | No implicit access | No implicit access    | Allowed              |

Jobs are private drafts until an OWNER publishes a complete Job under a published Company. Lifecycle transitions are server-controlled: no status value is accepted from form input, and archived Jobs are read-only in this phase. Public search accepts a bounded keyword plus employment-type, workplace-type, and experience-level filters and returns only PUBLISHED Jobs from published Companies. Public detail exposes Job and Company presentational fields only—never internal identifiers, private timestamps, or membership data. Closing or archiving a Job removes it from public discovery immediately.

## Application access matrix

| Actor               | Apply to Job      | View own applications | View owned-Company applicants | Change application status |
| ------------------- | ----------------- | --------------------- | ----------------------------- | ------------------------- |
| Signed out          | Sign in to apply  | Redirect              | Redirect                      | Redirect                  |
| Candidate           | If eligible, once | Own only              | Denied                        | Withdraw own active only  |
| Recruiter nonmember | Cannot apply      | None                  | Not found                     | Not found                 |
| Recruiter MEMBER    | Cannot apply      | None                  | Denied                        | Denied                    |
| Recruiter OWNER     | Cannot apply      | None                  | Allowed (owned Company Jobs)  | Allowed pipeline moves    |
| Admin               | Cannot apply      | None                  | No implicit access            | No implicit access        |

A Candidate applies at most once per Job (enforced by a database unique constraint) and only when eligible: authenticated candidate, published Job under a published Company, open deadline, and a minimum profile (headline, location, at least one skill). Candidates may withdraw only from active states and may never set recruiter statuses; recruiters advance applications through the controlled pipeline and may never set WITHDRAWN. Recruiter access to an applicant's private profile exists only because the Candidate applied to a Job at a Company the Recruiter OWNs; it never appears on public pages or in unrelated Company workspaces. Foreign, MEMBER-only, and cross-Company identifiers return the same not-found result and never reveal application existence.

## Saved Jobs access matrix

| Actor      | Public Job save control | Save eligible Job             | View saved list | Remove saved Job  | See Candidate save data |
| ---------- | ----------------------- | ----------------------------- | --------------- | ----------------- | ----------------------- |
| Signed out | Sign in to save         | Redirect to sign-in           | Redirect        | Redirect          | No                      |
| Candidate  | Yes                     | If Job and Company are public | Own only        | Own relation only | Own only                |
| Recruiter  | No                      | Denied                        | Denied          | Denied            | No                      |
| Admin      | No                      | Denied                        | Denied          | Denied            | No implicit access      |

New saves require a PUBLISHED Job under a published Company and are re-checked against current database state. Unique `(candidateId, jobId)` prevents sequential and concurrent duplicates. Existing rows remain when publication changes; the Candidate list marks them unavailable, removes the public link, and still permits removal. Search spans title, Company name, location, and skill, is bounded to 100 characters, and never weakens Candidate ownership. No public surface displays save counts or saver identity.

## Candidate Document access matrix

| Actor               | Upload / replace / remove own CV | Download own CV     | Download CV attached to an application       | See another Candidate's document |
| ------------------- | -------------------------------- | ------------------- | -------------------------------------------- | -------------------------------- |
| Signed out          | Redirect to sign-in              | Denied (uniform)    | Denied (uniform)                             | No                               |
| Candidate           | Own only                         | Own current + prior | Own applications only                        | Denied by ownership              |
| Recruiter nonmember | Denied                           | No                  | Not found                                    | No                               |
| Recruiter MEMBER    | Denied                           | No                  | Denied                                       | No                               |
| Recruiter OWNER     | Denied                           | No                  | Only the CV attached to an owned-Company Job | No                               |
| Admin               | Denied                           | No                  | No implicit access                           | No implicit access               |

Each upload creates an immutable version and moves a one-to-one current-CV pointer; applying pins that exact version onto the application so replacing or removing the current CV never changes historical attachments. Downloads are re-authorized on every request from the session: a Candidate reaches only their own documents and a Recruiter reaches only the exact document attached to an application for a Job at a Company they OWN. MEMBER, nonmember, cross-Candidate, Admin, and signed-out requests are denied identically, and unknown or unauthorized document IDs return the same not-found without revealing existence. Responses force a download with `application/pdf`, a safe filename, `private, no-store`, and `nosniff`; storage keys, buckets, endpoints, paths, and credentials are never exposed. Successful authorized downloads are audit-logged; denials are not.

## Internal Application Notes access matrix

| Actor               | Read notes & history         | Add note             | Edit / delete a note                |
| ------------------- | ---------------------------- | -------------------- | ----------------------------------- |
| Signed out          | Redirect / not found         | Redirect / not found | Redirect / not found                |
| Candidate           | No (even on own application) | No                   | No                                  |
| Recruiter nonmember | Not found                    | Not found            | Not found                           |
| Recruiter MEMBER    | No                           | No                   | No                                  |
| Recruiter OWNER     | Yes (all notes on the app)   | Yes                  | Only notes they originally authored |
| Admin               | No implicit access           | No implicit access   | No implicit access                  |

Notes are internal to the hiring team: only a Recruiter who OWNs the application's Job Company can read, add, edit, delete, or view the history of a note, and every request re-authorizes that OWNER relationship from the session. Any OWNER may add notes and read all notes plus history, but only the original author may edit or soft-delete their own note and author attribution never changes. Editing and deletion use an `expectedRevision` concurrency token (never authorization) so concurrent edits cannot both win; a stale attempt returns a safe conflict. Every note keeps an immutable `(noteId, version)` revision history and is soft-deleted, never hard-deleted. Candidates (including on their own application), MEMBER users, other-company Recruiters, Admins, the public, and search metadata never see a note, its count, body, author, timestamps, or whether any note exists.

## Notification access matrix

| Actor               | Submission notification | Status-change notification | Withdrawal notification | Read own Activity Center | Read another user's | Mark own read | Unread bell |
| ------------------- | ----------------------- | -------------------------- | ----------------------- | ------------------------ | ------------------- | ------------- | ----------- |
| Signed out          | n/a                     | n/a                        | n/a                     | Redirect to sign-in      | Denied              | Redirect      | None        |
| Candidate (owner)   | Not notified (actor)    | Notified                   | Not notified (actor)    | Own only                 | Denied              | Own only      | Yes         |
| Recruiter OWNER     | Notified                | Not notified               | Notified                | Own only                 | Denied              | Own only      | Yes         |
| Recruiter MEMBER    | No                      | No                         | No                      | Own only                 | Denied              | Own only      | Yes         |
| Other-Company Recr. | No                      | No                         | No                      | Own only                 | Denied              | Own only      | Yes         |
| Admin               | No                      | No                         | No                      | Redirect to Admin        | Denied              | n/a           | None        |

Recipients are resolved server-side from fresh OWNER membership (with a `RECRUITER` user role) or the owning Candidate; the browser never supplies a recipient, actor, type, title, message, destination, read time, or dedupe key. Every read and mark-read is scoped to the session user's own rows, so no Candidate, Recruiter, Company OWNER, or Admin can read or modify another user's notifications, and browser-facing projections omit the dedupe key, recipient/actor ids, and relation ids. The `/notifications` Activity Center serves Candidates and Recruiters only; Admins have no implicit Notification Center. A notification is retained with its original recipient after a role change and never authorizes the underlying application — the destination route re-authorizes independently. No public Job, Company, or search surface exposes any notification data. Phase 4B adds the company-invitation notification and Phase 5A adds the four interview events under these same ownership, atomicity, and dedupe rules: scheduled/rescheduled/canceled notify the owning Candidate, and interview responses notify every current Company OWNER.

## Company team membership (Phase 4B)

A Company OWNER builds a hiring team by inviting existing CareerBridge Recruiter accounts by email. The server normalizes the address and resolves the account itself: missing accounts, Candidate accounts, and Admin accounts all receive the same safe "no eligible recruiter account" response, the inviter cannot invite themselves or a current member, and there are no public invitation links, tokens, or unregistered-user invitations. Each invitation stays PENDING until the invitee accepts or declines it, an OWNER revokes it, or its fixed 14-day expiry passes; all four outcomes are terminal, historical rows are retained, and a database-backed key allows at most one active invitation per Company and invitee. Creating an invitation writes the invitation, its audit event, and the invitee's in-app notification in one transaction.

Acceptance re-checks everything server-side — invitee identity, PENDING status, expiry, a still-RECRUITER account role, and no existing membership — and always creates a MEMBER membership. The browser can never choose a role; OWNER is granted only later through explicit promotion or ownership transfer. Every administration action (promote, demote, remove, transfer, leave) re-authorizes the acting OWNER inside its transaction, writes an immutable `CompanyMembershipEvent`, and respects the last-owner invariant — "A company must keep at least one owner." — enforced with Serializable transactions so even concurrent demotions, removals, or leaves cannot strand a Company. Ownership transfer promotes the target MEMBER before demoting the acting OWNER, so the Company holds an OWNER at every instant.

## Company Team access matrix

| Actor               | Team page + member emails | Invite / revoke     | Promote / demote / remove / transfer | Audit history       | Leave own membership         |
| ------------------- | ------------------------- | ------------------- | ------------------------------------ | ------------------- | ---------------------------- |
| Signed out          | Redirect to sign-in       | Redirect to sign-in | Redirect to sign-in                  | Redirect to sign-in | Redirect to sign-in          |
| Candidate           | Redirect to own dashboard | Denied              | Denied                               | Denied              | n/a (no membership)          |
| Recruiter OWNER     | Own Company only          | Own Company only    | Own Company only                     | Own Company only    | Only while another OWNER     |
| Recruiter MEMBER    | Not found                 | Denied              | Denied                               | Denied              | Allowed                      |
| Other-Company Recr. | Not found                 | Denied              | Denied                               | Denied              | n/a (no membership)          |
| Admin               | Redirect to Admin         | Denied              | Denied                               | Denied              | n/a (no implicit membership) |

## Invitation access matrix

| Actor             | Create                            | View incoming        | Accept                 | Decline                | Revoke                   |
| ----------------- | --------------------------------- | -------------------- | ---------------------- | ---------------------- | ------------------------ |
| Company OWNER     | Own Company only                  | Own invitations only | n/a                    | n/a                    | Own Company PENDING only |
| Company MEMBER    | Denied                            | Own invitations only | n/a                    | n/a                    | Denied                   |
| Invited Recruiter | n/a                               | Own invitations only | Own PENDING, unexpired | Own PENDING, unexpired | n/a                      |
| Other Recruiter   | Denied (unless OWNER elsewhere)   | Own invitations only | Denied                 | Denied                 | Denied                   |
| Candidate / Admin | Denied (cannot be invited either) | No access            | Denied                 | Denied                 | Denied                   |

## Membership action matrix

| Action             | Allowed actor | Target requirement                                     | Last-owner rule             | Audit event                                            |
| ------------------ | ------------- | ------------------------------------------------------ | --------------------------- | ------------------------------------------------------ |
| Promote            | Company OWNER | Same-Company MEMBER with a Recruiter account           | n/a                         | `MEMBER_PROMOTED_TO_OWNER`                             |
| Demote             | Company OWNER | Same-Company OWNER                                     | Blocked for the final OWNER | `OWNER_DEMOTED_TO_MEMBER`                              |
| Remove             | Company OWNER | Same-Company member, not self                          | Blocked for the final OWNER | `MEMBER_REMOVED` / `OWNER_REMOVED`                     |
| Transfer ownership | Company OWNER | Same-Company MEMBER with a Recruiter account, not self | Never drops below one OWNER | `MEMBER_PROMOTED_TO_OWNER` + `OWNER_DEMOTED_TO_MEMBER` |
| Leave              | Member (self) | Own membership derived from the session                | Final OWNER cannot leave    | `MEMBER_LEFT` / `OWNER_LEFT`                           |

Team data is private: member emails appear only on the OWNER-scoped team page, MEMBER users see only their own membership on the Company workspace, and no public Company or Job surface, Candidate page, or search metadata exposes memberships, emails, invitations, counts, or audit events. Possessing an invitation notification grants nothing — membership exists only after explicit acceptance, and every destination route re-authorizes the session. Custom organization roles, fine-grained permissions, and billing seats remain deferred.

## Transactional email delivery (Phase 4C)

Candidates and Recruiters can manage role-relevant transactional email preferences at `/settings/notifications`; missing rows default enabled, in-app notifications always remain enabled, and preferences are snapshotted when an event occurs. Supported delivery is limited to existing-Recruiter company invitations, OWNER notification of new/withdrawn applications, and Candidate notification of application status changes.

Every email intent is written atomically with its business event and in-app notification, then delivered asynchronously by a private authenticated dispatcher. Bounded templates provide escaped HTML, plain text, and independently authorized CareerBridge destinations. The production provider is Resend behind a server-only interface; development/test cannot send network email. Retry, stale-lock recovery, idempotent claiming, unique event keys, dead letters, and append-only attempts provide durable delivery without exposing infrastructure to users.

## Interview scheduling (Phase 5A)

A Company OWNER Recruiter schedules interviews for active applications to Jobs their Company owns, then reschedules, cancels, or (after an accepted interview starts) marks them completed. The owning Candidate reviews each interview's schedule, format, and attendance details on an authenticated detail page, accepts or declines while it is pending, and must respond again after every reschedule. Both roles get an agenda (`/candidate/interviews`, `/recruiter/interviews`) with upcoming/past/all filters and pending-response counts, interview sections on the application detail pages, dashboard cards for the next upcoming interview, and navigation entries.

Times are stored as UTC instants with the scheduling IANA timezone preserved separately and rendered DST-aware, so both parties always see the same instant. Active interviews (awaiting response or accepted) can never overlap for the same Candidate or the same organizer; back-to-back slots are allowed, and declined/canceled/completed interviews do not block a time. Every change appends an immutable history event with actor and schedule snapshot — visible only to the owning Candidate and Company OWNERs — and stale concurrent edits are rejected with a refresh prompt rather than overwriting newer changes. Scheduling never changes the application's pipeline status; the two workflows stay independent.

The Candidate is notified in-app (and by preference-respecting email) when an interview is scheduled, rescheduled, or canceled; every current Company OWNER is notified when the Candidate responds. Completion sends nothing in this phase. Notification and email copy carry only the Job title and Candidate display name — meeting links, locations, and instructions stay behind the authenticated interview pages, and possessing a notification or email never grants access.

## Interview access matrix

| Capability                 | Candidate (owner) | Company OWNER Recruiter  | Company MEMBER | Other-Company Recruiter | Admin | Public |
| -------------------------- | ----------------- | ------------------------ | -------------- | ----------------------- | ----- | ------ |
| Schedule / reschedule      | no                | yes (active application) | no             | no                      | no    | no     |
| Cancel / complete          | no                | yes                      | no             | no                      | no    | no     |
| Accept / decline (pending) | yes               | no                       | no             | no                      | no    | no     |
| View schedule + details    | yes               | yes                      | no             | no                      | no    | no     |
| View history timeline      | yes               | yes                      | no             | no                      | no    | no     |
| Agenda list                | own only          | owned Companies only     | none           | none                    | none  | none   |

## Interview email preference matrix

| Email event                 | Candidate setting     | Recruiter setting   | Admin     |
| --------------------------- | --------------------- | ------------------- | --------- |
| Interview scheduled         | Interview scheduled   | Not shown           | Not shown |
| Interview rescheduled       | Interview rescheduled | Not shown           | Not shown |
| Interview canceled          | Interview canceled    | Not shown           | Not shown |
| Interview response received | Not shown             | Interview responses | Not shown |

Missing preferences default to enabled; disabling an event suppresses only email (an auditable `SUPPRESSED` record is kept) while in-app notifications always remain.

## Intentionally deferred after Phase 5A

- Google, Outlook, and Apple calendar synchronization and OAuth calendar connections
- Google Meet, Zoom, and Microsoft Teams link generation and calendar provider webhooks
- FullCalendar-style drag-and-drop calendar UI and recurring interviews
- Interview panels, interviewer availability rules, and candidate self-scheduling or public booking links
- ICS attachments and downloads
- Automated interview reminders (email, SMS, or push)
- Interview scorecards, feedback forms, video calling, recording, transcription, and AI interview summaries or scoring
- Email address ownership verification
- Password reset and account recovery
- Social authentication
- Avatar upload and public Candidate document sharing
- Dedicated CV malware scanning and quarantine
- AI resume parsing, OCR, CV scoring, and match analysis
- Custom organization roles, fine-grained team permissions, and billing seats
- Company verification and logo/document upload
- Recruiter document uploads, offer documents, and identity/certificate documents
- Note @mentions, note notifications, rich-text/Markdown notes, note attachments, and AI note summarization
- SMS, mobile push, browser push, and real-time (WebSocket/SSE) notification delivery
- In-app muting, digests, and scheduled notifications
- Unregistered-user email invitations, marketing/bulk email, delivery analytics, and an Admin delivery dashboard
- Recruiter-note, CV-download, saved-job, job-recommendation, and marketing notifications
- Bulk application actions
- Candidate matching, job recommendations, and saved-search alerts
- Candidate search and messaging
- Public Candidate profile sharing and social feeds
- Production Admin provisioning, moderation, and audit workflows
- AI, billing, and payments

## Future AI scope

Potential AI-assisted capabilities include:

- Candidate-to-job match scoring with explainable factors
- CV structure and content analysis
- Cover-letter drafting grounded in the candidate and job
- Recruiter-facing summarization and comparison aids

AI product requirements:

- No autonomous hiring or rejection decisions
- Clear disclosure whenever AI is used
- User review before generated content is submitted
- Explainable signals rather than unexplained scores
- Data minimization, retention controls, and auditability
- Evaluation for bias, quality, safety, and failure modes before release

## Product quality requirements

- Keyboard-accessible workflows and visible focus treatment
- Responsive layouts across mobile, tablet, and desktop
- Designed empty, loading, validation, error, and success states
- Clear ownership and authorization for every protected action
- Consistent status language and traceable state transitions
- No fabricated production data in public previews

## Success signals

Quantitative targets will be defined once real workflows and analytics exist. Early success should be assessed through:

- Candidate profile completion and application completion
- Search-to-save and search-to-application conversion
- Recruiter time from publication to first qualified review
- Application status freshness and candidate visibility
- Accessibility, reliability, and performance quality gates
