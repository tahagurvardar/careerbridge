# Portfolio screenshots

These images show actual pages from a local production build with a fresh,
disposable PostgreSQL database containing only synthetic portfolio data.
They demonstrate local rendering, not production verification. Existing
**UNVERIFIED** production-flow caveats remain in effect.

| File in `docs/assets/screenshots/`  | View                                     |
| ----------------------------------- | ---------------------------------------- |
| `landing-en-light.png`              | Localized English landing                |
| `job-discovery-en-light.png`        | Job discovery, scrolled to listing cards |
| `candidate-dashboard-en-light.png`  | Candidate dashboard                      |
| `recruiter-company-en-light.png`    | Recruiter company and job workspace      |
| `admin-moderation-en-light.png`     | Admin company moderation                 |
| `job-discovery-en-light-mobile.png` | Responsive discovery listing             |

Desktop captures are 1440×900; mobile is 390×844. All use English and light mode.
The dataset has three fixture users, three Demo companies, six jobs, four
applications, and two saved jobs. Counts represent local fixtures, not usage.
There is no production account, CV, meeting, email delivery, token, or machine
path in the screenshots. Synthetic addresses use `example.test` and are not
visible in the selected captures.

Registration goes through the actual UI/server action and creates valid local
sessions. Only the newly created local admin fixture is promoted through Prisma;
no authentication boundary or application behavior is changed.

## Reproduce

1. Create a fresh loopback PostgreSQL database named
   `careerbridge_portfolio_test` or that name plus a numeric suffix.
2. Set `DATABASE_URL` and `DIRECT_URL` to that disposable database. Run `npm ci`
   and apply the existing migrations using `npx prisma migrate deploy`.
3. Build with `npm run build` using local configuration, a temporary auth secret,
   and `APP_BASE_URL`/`BETTER_AUTH_URL` set to `https://127.0.0.1:3143`.
4. Create a disposable local TLS certificate and key for loopback, kept outside
   Git or in ignored `.portfolio-capture/`. Set `PORTFOLIO_TLS_CERT` and
   `PORTFOLIO_TLS_KEY` to those files. Never use a production private key.
5. Supply Playwright externally through `PORTFOLIO_PLAYWRIGHT_MODULE` if it is
   not installed, and use installed Chrome. Run
   `node --import tsx scripts/capture-portfolio.mjs`.

The tool refuses remote databases, names outside the portfolio pattern, existing
users, and occupied capture ports. It owns loopback servers on ports 3141/3143
and closes its servers/browser after capture. The local TLS proxy preserves
secure-cookie authentication. The fixture database is retained for inspection;
use a fresh database for each run.

`capture-manifest.json` records routes, dimensions, fixture counts, verification
boundaries, and SHA-256 hashes. Do not commit traces, videos, storage state,
browser profiles, TLS keys, database dumps, or production data.
