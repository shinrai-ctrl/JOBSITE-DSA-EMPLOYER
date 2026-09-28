# Architecture Decisions

## ADR-001 — Preserve the existing seeker system

**Status:** Accepted  
**Date:** 2026-09-28

Employer support will extend the repository rather than refactor or replace existing seeker authentication, matching, or frontend architecture.

Reason: the application is already implemented and presentation-bound; preserving working behavior minimizes regression risk.

## ADR-002 — Separate employer identity from seeker identity

**Status:** Accepted  
**Date:** 2026-09-28

Employer accounts will use a dedicated employer identity model and a distinct employer session key rather than overloading the current `users` records.

Reason: current users contain seeker-specific profile fields and existing authorization assumes `session.userId` is a seeker.

## ADR-003 — Employer jobs use the existing job/skill pipeline

**Status:** Accepted  
**Date:** 2026-09-28

Employer-created postings will be stored as ordinary `jobs` and required skills will be represented through existing `job_skills` rows.

Reason: this automatically integrates employer postings with existing search, skill-gap, and DSA matching behavior and avoids parallel job models.

## ADR-004 — Additive, idempotent database migration

**Status:** Accepted  
**Date:** 2026-09-28

Existing databases must be upgraded without deletion. New schema elements must be detectable and safely applied more than once.

Reason: `CREATE TABLE IF NOT EXISTS` cannot add new columns to an existing table, and deleting the DB would destroy user/demo state.

## ADR-005 — Keep the current frontend stack and design system

**Status:** Accepted  
**Date:** 2026-09-28

Employer pages will use vanilla HTML/CSS/JS and reuse the visual language already established by `index.html` and `style.css`.

Reason: introducing a frontend framework or separate admin theme would add unnecessary risk and visual inconsistency.

## ADR-006 — Isolate employer sessions and declared company identity

**Status:** Accepted  
**Date:** 2026-09-28

Employer routes use `session.employerId` in a separate session store and the `jobpath.employer.sid` cookie scoped to `/api/employers`. Either role can log out without destroying the other role's session. Successful employer authentication regenerates the employer session.

The employer account stores its declared company name; job creation copies that name server-side. E1 does not claim or mutate existing name-keyed `company_profiles`, and seeker details do not attach a legacy profile by name to employer jobs. Company verification remains out of scope. This avoids treating an unverified text match as company ownership.
