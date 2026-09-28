# Testing and Verification

## Automated baseline

Run:

```bash
npm run verify
```

The current verifier checks JavaScript syntax, required project files, and package metadata without starting the server or modifying the database.

## E1 automated acceptance

```bash
npm run verify
npm test
```

`npm test` uses Node's built-in runner, an ephemeral HTTP listener, and disposable SQLite databases under the OS temporary directory. It does not modify `jobpath.db`, call external AI providers, or require a test framework.

Coverage includes additive/idempotent migration on a copy of the supplied database; every pre-existing row/column preserved; employer registration, normalized email, duplicate rejection, password-safe responses, login/logout/session; independent seeker/employer sessions; unauthorized requests; server-derived ownership and company; validation failures; required-skill deduplication and foreign keys; forced transaction rollback; owned listings; discovery of identical independent postings; seeker registration/login, saved jobs, skill-gap scoring and DSA recommendations. Persistence is checked by starting the actual app in a fresh process, logging in again, and retrieving the same posting and skill requirements.

### Dependency discrepancy and exact-version setup (PowerShell)

The supplied lockfile predates the manifest and cannot be used with `npm ci` as-is. E1 deliberately leaves dependency declarations and the lockfile unchanged. To install the exact versions already named by the manifest without upgrading them or rewriting the lockfile:

```powershell
$e1Packages = (Get-Content package.json -Raw | ConvertFrom-Json).dependencies.PSObject.Properties | ForEach-Object { $_.Name + '@' + ($_.Value -replace '^\^', '') }
npm install --no-save --package-lock=false --no-audit --no-fund @e1Packages
npm run verify
npm test
npm start
```

Use a supported Node release with a compatible `better-sqlite3` binary. Normal startup applies the migration automatically; never delete `jobpath.db`. `JOBPATH_DB_PATH` optionally selects a separate database for isolated testing; leave it unset to use the existing database.

### Employer API contract

- `POST /api/employers/register`: `fullName`, `companyName`, `email`, `password`; returns 201 and a public `employer` object.
- `POST /api/employers/login`: `email`, `password`; returns the public employer object.
- `POST /api/employers/logout`: ends only the employer session.
- `GET /api/employers/me`: authenticated employer, or 401.
- `GET /api/employers/jobs`: only the session employer's jobs and required skill names.
- `POST /api/employers/jobs`: returns 201, `{ job }`, and `Location: /api/jobs/:id` after committing the job and skill links.

Writes require JSON. Errors use the existing `{ error }` convention. Posting keys are `title`, `description`, `salary`, `location`, `employment_type`, `responsibilities`, `qualifications`, `work_schedule`, `benefits`, `application_requirements`, `application_deadline`, `how_to_apply`, `contact_information`, and `skillIds`. Title/description/salary/location/type/how-to-apply/contact and 1–100 skill IDs are required. Unknown fields (including browser-supplied ownership/company) are rejected. Skills must be existing positive integer IDs; duplicates are linked once. Employment types: Full-time, Part-time, Contract, Temporary, Internship, Freelance. Optional deadline must be a real ISO date on or after today's UTC date. Text limits are enforced server-side and mirrored in the form.

Employer passwords require 8 characters minimum and 72 UTF-8 bytes maximum. Employer company identity is entered at registration and read-only in the posting form. Application/contact instructions are public plain text; E1 does not send applications or email.

### Recorded E1 verification — 2026-09-28

- `npm run verify`: passed (required files and JavaScript syntax).
- Migration/API integration tests: passed, including a fresh-process restart. Migration on a copy preserved all 16 supplied jobs and every existing table's original rows/columns.
- Renderer regression test: passed; employer-controlled card text is escaped, distinct employer postings remain visible, and legacy seeded-job deduplication remains unchanged. This uses a minimal DOM recorder, not a real browser.
- The intentional SQLite trigger error printed during testing verifies rollback; a passing test confirms no partial job was committed.
- Original `jobpath.db` was not migrated or seeded during verification. Its SHA-256 remained `1a4d928d3ed38168de6507883a7491d05ead2ac040cabd49e816bbf702d3bb63`.
- Independent UI source review completed; HTML injection and focus findings were corrected. Browser/visual/mobile/keyboard acceptance could not be performed because the available in-app browser repeatedly failed to attach. No manual browser verification is claimed.

### Manual checks still required for final acceptance

Use the flow below on desktop and mobile, including keyboard navigation, form errors, empty/loading/retry states, and multiline posting details. In two employer sessions, confirm that each dashboard lists only its own jobs. In the same browser, sign in as both a seeker and employer and verify each role survives the other's logout. Restart the actual server, log in again (sessions are in-memory), and verify the job and skill requirements persist. Smoke-test existing resume, learning, and profile flows; backend E1 tests do not constitute manual verification of those pages.

Pre-existing limitation: `/api/jobs/categories` references a missing module in `CareerPathService.getCategoryTree()`. E1 does not repair this unrelated category-tree issue.

## Manual baseline smoke test

1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`.
4. Confirm `/api/health` returns `{ "status": "ok" }`.
5. Confirm homepage loads from HTTP rather than `file://`.
6. Confirm existing seeker login/registration behavior still works.
7. Confirm jobs load and job details can be opened.

## E1 employer acceptance test

After implementation:

1. Open **For Employers** from the existing homepage navigation.
2. Register a new employer/company with a unique email.
3. Confirm the employer is authenticated and reaches the dashboard.
4. Create a job containing at minimum:
   - title,
   - company,
   - description,
   - employment type,
   - salary,
   - location,
   - required skills.
5. Confirm success is shown only after the server persists the posting.
6. Confirm the job appears in the authenticated employer's own listing.
7. Query/open the normal seeker job experience and confirm the same job appears.
8. Open the job detail and confirm extended posting data does not break existing details.
9. As a seeker with known skills, confirm the posted job receives a match result based on its `job_skills` links.
10. Restart the server and confirm the employer account and job still exist.
11. Attempt to access employer management endpoints while logged out and confirm rejection.
12. Confirm a different employer cannot manage another employer's posting.

## Regression rule

A milestone is not accepted if employer functionality works but existing seeker registration/login, job search, job details, recommendations, saved jobs, resume functionality, or learning pages are broken.
