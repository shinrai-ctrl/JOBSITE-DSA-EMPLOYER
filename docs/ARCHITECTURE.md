# Architecture

## Runtime

```text
Browser
  |
  | HTTP / JSON / static assets
  v
Express 5 (`server.js`)
  |-- /api/auth       -> authRoutes.js
  |-- /api/jobs       -> jobRoutes.js
  |-- /api/resume     -> resumeRoutes.js
  |-- /api/reference  -> referenceRoutes.js
  |-- /api/learning   -> learningRoutes.js
  |
  +-> services / DSA modules
  |
  v
better-sqlite3 -> jobpath.db
```

The same Express process serves both static frontend files and API endpoints.

## Existing matching data model

```text
users ----< user_skills >---- skills ----< job_skills >---- jobs
                                                        |
                                                        +---- company name
                                                               |
                                                               v
                                                       company_profiles
```

`JobMatchingService` loads job-required skills and user skills. `SkillGapService` determines present/missing skills, and job routes expose match percentages to authenticated users.

## DSA-oriented modules

The repository includes explicit data-structure/algorithm modules including:
- `Graph.js`
- `HashTable.js`
- `MaxHeap.js`
- `Sorting.js`
- `Tree.js`
- `JobMatcher.js`

Career/matching services build application behavior around these structures and the relational skill data.

## Employer milestone extension

Employer support should be additive:

```text
employers ----> company_profiles
    |
    +----------< jobs ----< job_skills >---- skills
```

Recommended ownership rule: each employer-created job stores the authenticated employer ID. The server must derive ownership from the session, never from a client-supplied employer ID.

Employer-created jobs must remain ordinary rows in the existing `jobs` table so existing search, detail, recommendation, and skill-gap behavior continues to work.

## Session separation

Existing seeker sessions use `req.session.userId`.

Employer authentication should use a distinct session property such as `req.session.employerId`. This prevents employer routes from accidentally satisfying seeker-only `requireAuth` checks and avoids modifying the existing seeker authentication contract.

## Migration requirement

`database.js` reapplies `schema.sql` at startup, but `CREATE TABLE IF NOT EXISTS` does not add new columns to an existing table. Any employer milestone that extends `jobs` must include an idempotent migration step that:
- detects missing columns/tables,
- adds only what is absent,
- preserves all existing rows,
- can safely run on every boot.

Do not solve this by deleting `jobpath.db` during normal development or presentation setup.
