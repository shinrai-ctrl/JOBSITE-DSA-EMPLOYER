# JobPath

JobPath is a student-focused job discovery and career matching web application built with Node.js, Express, SQLite, and vanilla HTML/CSS/JavaScript. Its DSA-focused matching flow connects user skills to job-required skills and supports career-path and skill-gap features.

## Current baseline

The repository currently contains the job-seeker experience: account registration/login, profiles, job search and matching, saved jobs, resume tools, learning resources, reference data, and seeded job/company data.

The next scoped milestone is the **Employer Posting Flow**. It will add employer registration/login, an employer dashboard, and job posting while preserving the existing seeker experience and feeding employer-created jobs into the existing `jobs` / `job_skills` matching pipeline.

## Run locally

Requirements:
- Node.js 20+ recommended
- npm

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

Do not open `index.html` through `file://` when testing API-backed features.

## Verification

```bash
npm run verify
```

This performs syntax checks and baseline repository checks without modifying application data.

## Project documentation

- `docs/PROJECT_STATE.md` — current implemented state and known gaps
- `docs/ARCHITECTURE.md` — runtime, data, and matching architecture
- `docs/IMPLEMENTATION_PLAN.md` — controlled employer milestone plan
- `docs/SECURITY.md` — current controls and production risks
- `docs/TESTING.md` — verification and presentation acceptance checks
- `docs/DECISIONS.md` — architecture decision log
- `docs/CHANGELOG.md` — project changes from this engineering baseline onward

## Engineering rule

Preserve existing behavior unless a change is required by an accepted feature or confirmed defect. Prefer additive, scoped changes over rewrites, dependency churn, or unrelated refactoring.
