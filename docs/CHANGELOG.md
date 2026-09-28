# Changelog

## 2026-09-28 — E1 Employer Posting Flow

- Added dedicated employer accounts, isolated employer sessions, owned listings, and validated transactional job posting APIs.
- Added employer auth/dashboard/posting UI using the existing JobSite tokens, navbar/logo, and vanilla frontend stack; wired the homepage employer entry.
- Added an idempotent startup migration for `employers`, job ownership, extended posting fields, and an ownership index. Existing rows remain intact; no destructive reseeding.
- Reused existing skills and `job_skills`; employer jobs enter existing seeker search, detail, saved-job and DSA matching paths.
- Preserved distinct employer postings during legacy job deduplication; exposed extended posting details using text-safe rendering.
- Escaped employer-controlled text in existing seeker cards and added a renderer regression check for HTML injection and browser-side deduplication.
- Kept declared employer company names separate from legacy company-profile ownership; blocked static database/schema downloads.
- Added isolated Node integration tests and exact-version acceptance instructions. No dependency declarations, dependency versions, or lockfile changes.

## 2026-09-28 — Engineering baseline

### Added
- Root project README.
- Environment variable example.
- Project-state documentation.
- Architecture documentation.
- Employer milestone implementation plan.
- Security baseline and hardening notes.
- Testing/acceptance plan.
- Architecture decision log.
- Non-destructive repository verification script.

### Changed
- Added `npm run verify` package script.

### Application behavior
- No application runtime behavior changed in this baseline documentation pass.
- No database schema or data was changed.

## 2026-09-28 — Codex skill baseline
- Added a scoped `.codex/skills` pack sourced from the team's provided Codex Skills archive.
- Added Ponytail as the required first orchestration skill.
- Added only the specialist skills relevant to the current JobPath employer milestone: agent skills, API design, least privilege, QA testing, and Impeccable UI guidance.
- Intentionally excluded unrelated skills to keep agent context and usage efficient.
