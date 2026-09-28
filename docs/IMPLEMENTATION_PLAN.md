# Implementation Plan

## Milestone E1 — Employer Posting Flow

### Goal

Add a complete employer-to-job-posting path without changing existing seeker behavior or replacing the current matching architecture.

### Scope

1. Employer registration and login.
2. Employer session authorization.
3. Employer dashboard showing the authenticated employer's postings.
4. Create-job form using the existing JobSite design language.
5. Persist full posting details in SQLite.
6. Persist required skills through the existing `skills` / `job_skills` relationship.
7. Expose the new job through the existing seeker job endpoints and matching logic.
8. Wire the existing `For Employers` navigation item to the employer entry page.

### Out of scope for E1

- Applicant tracking system.
- Employer analytics.
- Email verification/recovery.
- Company verification workflow.
- Job edit/delete unless required for the presentation.
- Messaging/email delivery.
- Payment/subscription features.
- Framework migration or visual redesign.

## Proposed implementation order

### E1.1 — Persistence and migration
- Add employer identity storage.
- Add employer ownership and extended posting fields.
- Implement idempotent migration for existing databases.
- Preserve all current rows.

### E1.2 — Employer API
- Register.
- Login.
- Logout.
- Current employer/session endpoint.
- List authenticated employer's jobs.
- Create authenticated employer job.
- Validate required fields and skill IDs/names.
- Use a database transaction for job + skill-link creation.

### E1.3 — Employer frontend
- Employer auth/landing page.
- Employer dashboard.
- Post-job form grouped into readable sections.
- Required-skills selector using existing skills data.
- Success/error/loading states.
- Existing visual tokens and responsive behavior.

### E1.4 — Integration
- Connect `For Employers` navigation.
- Confirm posted job is returned by `/api/jobs`.
- Confirm job detail works.
- Confirm matching computes from `job_skills` for an authenticated seeker.

### E1.5 — Verification
- Run `npm run verify`.
- Perform manual acceptance flow in `docs/TESTING.md`.
- Restart server and confirm persistence.
- Review diff for unrelated changes.

## Change discipline

Before modifying an existing file, identify the exact behavior that requires the change. New employer behavior should remain isolated where possible. No opportunistic cleanup during E1.
