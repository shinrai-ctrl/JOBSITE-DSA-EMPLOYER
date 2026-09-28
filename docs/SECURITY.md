# Security

## Current controls

- Passwords are hashed with `bcryptjs`.
- Authentication state is held in server-side Express sessions.
- Session cookie is `httpOnly`.
- SQLite foreign keys are enabled.
- Existing authenticated seeker endpoints use `requireAuth`.

## Employer milestone requirements

- Hash employer passwords using the same established bcrypt approach.
- Normalize employer emails before lookup/storage.
- Reject duplicate employer emails.
- Keep employer session identity separate from seeker session identity.
- Protect employer dashboard/job-management API routes with employer-specific middleware.
- Never trust a client-provided employer ID for job ownership.
- Validate and normalize all posting inputs server-side.
- Validate skill references before linking them to a job.
- Create the job and `job_skills` links inside one SQLite transaction.
- Do not expose password hashes in API responses.
- Return sanitized client errors; log internal failures server-side.

## Current production gaps

The repository is suitable for local/demo development but is not yet hardened for public Internet deployment:
- Express default `MemoryStore` is not a production session store.
- `SESSION_SECRET` currently has a development fallback.
- Secure-cookie/HTTPS deployment behavior is not configured.
- No CSRF defense is present for state-changing browser requests.
- No rate limiting is present for authentication endpoints.
- No explicit security headers middleware is present.
- No account verification/recovery workflow is present.

These gaps should not be silently represented as production-hardened behavior. They are separate hardening work from the presentation-focused E1 milestone.
