# Project State

Last audited: 2026-09-28

## Status

JobPath is a Node.js/Express + SQLite application with a vanilla HTML/CSS/JavaScript frontend. E1 employer posting is implemented alongside the existing seeker experience. Startup applies `schema.sql`, runs the additive employer migration, and runs the existing seed synchronization. The frontend and API share one Express process.

## Implemented baseline

### Authentication and profile
- Job-seeker registration and login using `bcryptjs` password hashes.
- Express session-based authentication.
- User profile data and skills.

### Jobs and DSA matching
- Job records stored in SQLite.
- Skills stored independently and linked to jobs through `job_skills`.
- User skills linked through `user_skills`.
- Search/filtering through `JobMatchingService`.
- Skill-gap calculation and percentage matching for authenticated users.
- Recommended jobs and saved jobs.
- Career-path data and category tree support.

### Career tooling
- Resume upload/scanning functionality.
- Resume builder.
- Learning resources and learning progress.
- Region/school reference data and autocomplete support.

### Frontend
- Existing JobSite visual system in `index.html` + `style.css`.
- Main navigation links **For Employers** to `/employer.html`.
- Existing frontend is vanilla HTML/CSS/JS; no frontend framework is present.

## Implemented milestone E1: Employer Posting Flow

- Dedicated employer registration/login/logout/session API under `/api/employers`.
- Independent employer session cookie/store; seeker authentication remains unchanged.
- Employer dashboard, full posting form, searchable selection from `/api/auth/skills`, and owned listings.
- Job ownership and company name derived from the authenticated employer account.
- Job and required `job_skills` rows saved atomically in the existing job model.
- Existing search, job details, saved jobs and DSA recommendations consume employer postings. Identical employer postings retain separate identities.
- Additional posting details are displayed safely in seeker job details and the employer dashboard.
- Startup migration is additive and idempotent; no database deletion/reset is required.
- Node built-in integration tests use disposable databases; migration preservation also checks a copy of the supplied database.

Target user flow:

`For Employers -> Register/Login -> Employer Dashboard -> Post Job -> Save Job + Skills -> Job appears in seeker job system -> Existing matching can score it`

Required posting data:
- Job title
- Company name
- Description
- Responsibilities
- Qualifications
- Required skills
- Employment type
- Salary/pay range
- Work location
- Work schedule
- Benefits
- Application requirements
- Application deadline
- How to apply
- Contact information

## Preservation constraints

- Do not rewrite working seeker authentication.
- Do not replace the existing `jobs`, `skills`, or `job_skills` matching model.
- Do not migrate frontend frameworks.
- Do not perform unrelated refactors or dependency upgrades during this milestone.
- Database changes must be additive and preserve existing seeded/user data.
- Employer UI must reuse the existing JobSite visual language.

## Known engineering gaps / risks

1. `npm test` now covers E1 backend and key seeker regressions. Full resume/learning/browser acceptance remains a separate smoke check.
2. Session storage uses Express's default in-memory store, which is development-only.
3. `SESSION_SECRET` has a development fallback and must be explicitly configured for deployment.
4. Session cookie security settings are not yet hardened for HTTPS production deployment.
5. `jobpath.db` exists at repository root while `.gitignore` currently ignores `database/jobpath.db`; repository hygiene should be corrected deliberately after confirming whether the current DB is intentionally versioned for demonstration data.
6. The schema bootstrap uses `CREATE TABLE IF NOT EXISTS`; adding columns to existing tables requires an explicit migration strategy because changing the original `CREATE TABLE` statement alone will not alter an existing database.
7. Several navigation links are placeholders (`href="#"`).
8. Employer accounts declare their own company names; company verification and editing are outside E1. A matching name does not grant access to legacy `company_profiles`.
9. The supplied `package-lock.json` is out of sync with `package.json` (including Express 4 versus 5). E1 does not change dependency versions or regenerate the lockfile. See `docs/TESTING.md` for exact-version installation.
10. Existing `CareerPathService.getCategoryTree()` references a missing `../algorithms/Tree` module. This pre-existing category-tree endpoint issue is outside E1; ordinary search and matching use separate code paths.

## Presentation-critical acceptance target

For the employer milestone to be considered complete, a presenter must be able to:
1. Start the application normally.
2. Open the employer entry point from the existing navigation.
3. Register or log in as an employer.
4. Create a job with required skills.
5. See the created job in the employer dashboard.
6. See the same job through the seeker-side job API/UI.
7. Demonstrate that its required skills participate in the existing match calculation.
8. Restart the server and confirm the posting persists in SQLite.
