# PostgreSQL Progress Persistence + Authentication

## TL;DR

> **Quick Summary**: Replace the localStorage-based progress system with PostgreSQL (Vercel Postgres) persistence, and add username/password authentication via NextAuth v5 so progress is tied to user accounts and survives across sessions, devices, and deployments.
> 
> **Deliverables**:
> - Prisma ORM with PostgreSQL schema (User, CourseProgress, LessonProgress, ScreenResult tables)
> - NextAuth v5 authentication with CredentialsProvider (username + password)
> - Login and Register pages
> - Progress API routes (GET + PUT) with auth protection
> - Rewritten `useProgress` hook backed by server API instead of localStorage
> - `proxy.ts` route protection (Next.js 16 convention)
> - Auth guards on all existing `/api/adapt/*` routes
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 5 → Task 8 → Task 13 → Final Verification

---

## Context

### Original Request
Replace localStorage-based progress tracking with PostgreSQL persistence. Progress must survive across sessions, deployments, and devices. Use Postgres for storage.

### Interview Summary
**Key Discussions**:
- **Auth approach**: Username/password via NextAuth — user explicitly chose this over anonymous tokens or link-based identity
- **Database hosting**: Vercel Postgres — user selected over Docker, Neon, Supabase
- **ORM**: Prisma — user chose over Drizzle (recommended for maturity + migrations)
- **localStorage fate**: Fully replace — no optimistic cache, single source of truth on server
- **Testing**: No unit tests — agent-executed QA scenarios only
- **Existing route protection**: Yes — add auth guards to `/api/adapt/*` routes too

**Research Findings**:
- Only 2 components consume `useProgress`: `LessonPlayer` (writer) and `CourseOverviewClient` (reader) — migration surface is small
- `useStickyState` is only used by `useProgress` — no other localStorage usage in the codebase
- Existing API routes follow a consistent pattern: Zod validation → logic → `NextResponse.json`
- Zod schemas in `src/lib/schemas/progress.ts` already define data shapes that map cleanly to database tables
- 3 unused hook methods exist: `getScreenResult`, `getCourseCompletionPercent`, `resetProgress`
- 3 duplicate `ScreenResult` type definitions exist (out of scope to consolidate)
- Next.js 16 renamed `middleware.ts` to `proxy.ts` — MUST use `proxy.ts` file convention

### Metis Review
**Identified Gaps** (addressed):
- **`proxy.ts` not `middleware.ts`**: Next.js 16.1.6 renamed the file convention. Plan uses `proxy.ts`. Verified via official docs.
- **JWT strategy mandatory**: CredentialsProvider does not trigger database session creation. Must use `session: { strategy: "jwt" }`.
- **`bcryptjs` not `bcrypt`**: Native bindings fail in Vercel serverless. Using pure JS `bcryptjs`.
- **Fire-and-forget for index updates**: `updateCurrentScreenIndex` fires every screen navigation — must not block UI. `markScreenComplete` and `markLessonComplete` should be awaited with error handling.
- **Public vs protected routes**: Homepage `/` stays public. Course pages and lesson pages require auth. Login/register are public.
- **Existing localStorage data**: Abandoned — app is early stage with no production users.

---

## Work Objectives

### Core Objective
Add user authentication and PostgreSQL-backed progress persistence to the Brilliance learning app, replacing the anonymous localStorage approach with a proper server-side data layer.

### Concrete Deliverables
- `prisma/schema.prisma` with User, CourseProgress, LessonProgress, ScreenResult models
- `src/lib/auth.ts` — NextAuth v5 config with CredentialsProvider + JWT
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handlers
- `src/app/api/auth/register/route.ts` — Registration endpoint
- `src/app/api/progress/route.ts` — Progress GET + PUT endpoints
- `src/app/(auth)/login/page.tsx` — Login page
- `src/app/(auth)/register/page.tsx` — Register page
- `src/lib/hooks/use-progress.ts` — Rewritten to use server API
- `proxy.ts` — Route protection (at project root)
- `src/lib/db.ts` — Prisma client singleton
- `.env.local.example` — Required environment variables template

### Definition of Done
- [ ] `bun run build` exits 0 with no type errors
- [ ] Unauthenticated request to `/courses/calendar-trick` redirects to `/login`
- [ ] Register → Login → complete a screen → logout → login → progress persists
- [ ] Two different users have isolated progress
- [ ] `/api/adapt/hint` returns 401 for unauthenticated requests

### Must Have
- Username/password authentication via NextAuth v5 CredentialsProvider
- JWT session strategy (NOT database sessions)
- PostgreSQL via Vercel Postgres with Prisma ORM
- Normalized database tables (not JSONB blob)
- Auth protection on all API routes and course/lesson pages
- Login and Register pages with form validation
- Progress API that reconstructs the nested `CourseProgress` shape consumers expect
- `updateCurrentScreenIndex` as fire-and-forget (no UI blocking)
- `markScreenComplete` and `markLessonComplete` awaited with error feedback via Sonner toast
- `bcryptjs` for password hashing (not native `bcrypt`)

### Must NOT Have (Guardrails)
- ❌ Do NOT use `middleware.ts` — Next.js 16 uses `proxy.ts`
- ❌ Do NOT use database sessions — CredentialsProvider requires JWT strategy
- ❌ Do NOT touch screen components (`*-screen.tsx`) — they produce ScreenResult, interface stays same
- ❌ Do NOT consolidate the duplicate ScreenResult types (3 definitions) — separate effort
- ❌ Do NOT remove unused hook methods (`getScreenResult`, `getCourseCompletionPercent`, `resetProgress`) — keep them working
- ❌ Do NOT change content loading (`loader.ts` reads static JSON from filesystem)
- ❌ Do NOT use Prisma queries inside `proxy.ts` — JWT validation only, no database I/O
- ❌ Do NOT add social login, email verification, password reset, or user profiles
- ❌ Do NOT add loading skeletons or complex loading states — simple indicator sufficient
- ❌ Do NOT use `@auth/nextjs` package — it's `next-auth@beta` for Next.js
- ❌ Do NOT install native `bcrypt` or `argon2` — use `bcryptjs` (pure JS, serverless safe)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None — agent-executed QA only
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Build**: Use Bash — `bun run build`, check exit code

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent, start immediately):
├── Task 1: Prisma + database setup [unspecified-high]
├── Task 2: Auth + progress Zod schemas [quick]
├── Task 3: Login page UI [visual-engineering]
└── Task 4: Register page UI [visual-engineering]

Wave 2 (Auth + API — depends on Wave 1):
├── Task 5: NextAuth v5 config (depends: 1) [deep]
├── Task 6: Register API route (depends: 1, 2) [quick]
└── Task 7: Progress API routes (depends: 1, 2) [unspecified-high]

Wave 3 (Wiring — depends on Wave 2):
├── Task 8: Rewrite useProgress hook (depends: 7) [deep]
├── Task 9: proxy.ts route protection (depends: 5) [quick]
├── Task 10: Wire login page to NextAuth (depends: 3, 5) [quick]
├── Task 11: Wire register page to API (depends: 4, 6) [quick]
└── Task 12: Auth guards on /api/adapt/* (depends: 5) [quick]

Wave 4 (Consumer updates — depends on Task 8):
└── Task 13: Update LessonPlayer + CourseOverviewClient (depends: 8) [unspecified-high]

Wave FINAL (Verification — after ALL tasks, 4 parallel):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high + playwright]
└── F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 5 → Task 8 → Task 13 → Final
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 5, 6, 7 | 1 |
| 2 | — | 6, 7 | 1 |
| 3 | — | 10 | 1 |
| 4 | — | 11 | 1 |
| 5 | 1 | 8, 9, 10, 12 | 2 |
| 6 | 1, 2 | 11 | 2 |
| 7 | 1, 2 | 8 | 2 |
| 8 | 7 | 13 | 3 |
| 9 | 5 | — | 3 |
| 10 | 3, 5 | — | 3 |
| 11 | 4, 6 | — | 3 |
| 12 | 5 | — | 3 |
| 13 | 8 | — | 4 |

### Agent Dispatch Summary

- **Wave 1** (4 tasks): T1 → `unspecified-high`, T2 → `quick`, T3 → `visual-engineering`, T4 → `visual-engineering`
- **Wave 2** (3 tasks): T5 → `deep`, T6 → `quick`, T7 → `unspecified-high`
- **Wave 3** (5 tasks): T8 → `deep`, T9 → `quick`, T10 → `quick`, T11 → `quick`, T12 → `quick`
- **Wave 4** (1 task): T13 → `unspecified-high`
- **FINAL** (4 tasks): F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

- [ ] 1. Prisma + Database Setup

  **What to do**:
  - Install dependencies: `prisma`, `@prisma/client`, `next-auth@beta`, `bcryptjs`, `@types/bcryptjs`
  - Run `npx prisma init` to create `prisma/schema.prisma` and `.env`
  - Define the Prisma schema with these models:
    - `User`: id (cuid), username (unique), passwordHash, createdAt, updatedAt
    - `CourseProgress`: id (cuid), courseId, userId (FK → User), lastAccessedAt. Unique constraint on [userId, courseId]
    - `LessonProgress`: id (cuid), lessonId, courseProgressId (FK → CourseProgress), currentScreenIndex (Int), startedAt, completedAt (nullable). Unique constraint on [courseProgressId, lessonId]
    - `ScreenResult`: id (cuid), screenId, lessonProgressId (FK → LessonProgress), answeredCorrectly (Boolean), attempts (Int), hintsUsed (Int), answeredAt. Unique constraint on [lessonProgressId, screenId]
  - Set datasource to `postgresql` with `env("DATABASE_URL")`
  - Create `src/lib/db.ts` with Prisma client singleton pattern using `globalThis` caching for serverless:
    ```
    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
    export const prisma = globalForPrisma.prisma || new PrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
    ```
  - Create `.env.local.example` documenting required vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
  - Run `npx prisma generate` to generate the client
  - Run `npx prisma db push` to apply schema to the database (requires DATABASE_URL to be configured)

  **Must NOT do**:
  - Do NOT create JSONB columns — use normalized relational tables
  - Do NOT add fields beyond what's specified (no email, no avatar, no roles)
  - Do NOT configure the Neon adapter — standard Prisma postgres driver is sufficient for Vercel Postgres

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Database setup with ORM config requires careful schema design but isn't visual or algorithmic
  - **Skills**: []
    - No specialized skills needed — standard Prisma setup
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/lib/claude/client.ts` — Follow the singleton/module pattern used here for the Prisma client export
  - `src/lib/schemas/progress.ts` — Existing Zod schemas defining CourseProgress, LessonProgress, ScreenResult shapes — the Prisma models should mirror these fields

  **API/Type References**:
  - `src/lib/hooks/use-progress.ts:6-26` — The `ScreenResult`, `LessonProgress`, and `CourseProgress` TypeScript types that define the data shape consumers expect

  **External References**:
  - Prisma + Vercel Postgres setup: https://www.prisma.io/docs/orm/overview/databases/vercel-postgres

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Prisma client generates successfully
    Tool: Bash
    Preconditions: Dependencies installed, schema defined
    Steps:
      1. Run `npx prisma generate`
      2. Check exit code is 0
      3. Verify `node_modules/.prisma/client` directory exists
    Expected Result: Exit code 0, generated client exists
    Failure Indicators: Non-zero exit code, missing .prisma directory
    Evidence: .sisyphus/evidence/task-1-prisma-generate.txt

  Scenario: Schema push to database works
    Tool: Bash
    Preconditions: DATABASE_URL configured in .env.local
    Steps:
      1. Run `npx prisma db push`
      2. Check exit code is 0
      3. Run `npx prisma studio` briefly to verify tables exist (or use prisma db pull)
    Expected Result: All 4 tables created (User, CourseProgress, LessonProgress, ScreenResult)
    Failure Indicators: Connection error, schema validation error
    Evidence: .sisyphus/evidence/task-1-db-push.txt

  Scenario: Build succeeds with new dependencies
    Tool: Bash
    Preconditions: All deps installed, client generated
    Steps:
      1. Run `bun run build`
      2. Check exit code is 0
    Expected Result: Build succeeds with no type errors
    Failure Indicators: Type errors referencing Prisma models, import failures
    Evidence: .sisyphus/evidence/task-1-build.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add Prisma schema with User and progress tables`
  - Files: `prisma/schema.prisma`, `src/lib/db.ts`, `.env.local.example`, `package.json`
  - Pre-commit: `npx prisma generate && bun run build`

- [ ] 2. Auth + Progress API Validation Schemas

  **What to do**:
  - Create `src/lib/schemas/auth.ts` with Zod schemas:
    - `RegisterSchema`: username (string, min 3, max 30, alphanumeric + underscores), password (string, min 8)
    - `LoginSchema`: username (string, min 1), password (string, min 1)
  - Update `src/lib/schemas/progress.ts` — add Zod schemas for API request validation:
    - `ProgressGetQuerySchema`: courseId (string)
    - `ProgressPutBodySchema`: courseId (string), lessonId (string), action discriminated union:
      - `{ type: "screen_complete", screenId, answeredCorrectly, attempts, hintsUsed }`
      - `{ type: "update_index", currentScreenIndex }`
      - `{ type: "lesson_complete" }`
  - Export inferred TypeScript types from all schemas

  **Must NOT do**:
  - Do NOT modify existing Zod schemas — only add new ones
  - Do NOT add email field to auth schemas

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure schema definitions, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` — Follow the exact Zod schema style used here: exported const schemas, `.describe()` on every field, inferred types exported at bottom
  - `src/lib/schemas/progress.ts` — Existing progress schemas to extend (not modify)
  - `src/app/api/adapt/explain/route.ts:5-16` — Example of inline Zod request schema in an API route — the new schemas should be extractable to the schemas directory instead

  **API/Type References**:
  - `src/lib/hooks/use-progress.ts:6-26` — The existing ScreenResult type fields that the `screen_complete` action schema must match

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auth schemas validate correctly
    Tool: Bash
    Preconditions: Schema file created
    Steps:
      1. Run a quick TypeScript snippet via `npx tsx -e`:
         - Parse valid register data: { username: "testuser", password: "password123" } → success
         - Parse invalid: { username: "ab", password: "short" } → failure with specific errors
         - Parse valid login: { username: "test", password: "x" } → success
      2. Verify type exports compile
    Expected Result: Valid inputs parse, invalid inputs rejected with correct error messages
    Failure Indicators: Unexpected parse results, missing type exports
    Evidence: .sisyphus/evidence/task-2-schema-validation.txt

  Scenario: Progress API schemas handle discriminated union
    Tool: Bash
    Preconditions: Schema file updated
    Steps:
      1. Parse screen_complete action: { courseId: "c1", lessonId: "l1", action: { type: "screen_complete", screenId: "s1", answeredCorrectly: true, attempts: 1, hintsUsed: 0 } } → success
      2. Parse update_index action: { courseId: "c1", lessonId: "l1", action: { type: "update_index", currentScreenIndex: 3 } } → success
      3. Parse invalid action type → failure
    Expected Result: All valid actions parse, invalid rejected
    Failure Indicators: Discriminated union doesn't dispatch correctly
    Evidence: .sisyphus/evidence/task-2-progress-schema.txt
  ```

  **Commit**: YES
  - Message: `feat(schemas): add auth and progress API validation schemas`
  - Files: `src/lib/schemas/auth.ts`, `src/lib/schemas/progress.ts`
  - Pre-commit: `bun run build`

- [ ] 3. Login Page UI

  **What to do**:
  - Create `src/app/(auth)/layout.tsx` — minimal centered layout for auth pages (no navigation, just centered card)
  - Create `src/app/(auth)/login/page.tsx` — client component with:
    - Username input field
    - Password input field
    - Submit button with loading state
    - Error message display area (for "Invalid credentials" etc.)
    - Link to `/register` ("Don't have an account? Register")
    - Form posts to NextAuth signIn (wiring happens in Task 10, stub the onSubmit for now)
  - Use existing UI components from `src/components/ui/` (Button, Input, etc.)
  - Match the app's existing visual style (Tailwind, same fonts, dark mode support via next-themes)

  **Must NOT do**:
  - Do NOT implement actual auth logic — just build the form UI
  - Do NOT add social login buttons
  - Do NOT add "forgot password" link

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI page with form layout, styling, and component composition
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: QA will be visual verification but the form is static at this stage
    - `frontend-ui-ux`: Could help with design, but this is a standard auth form

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 10
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/app/page.tsx` — Page component structure (server vs client, layout patterns)
  - `src/app/courses/[courseId]/page.tsx` — How existing pages import and use components
  - `src/components/ui/` — Available UI primitives (Button, Input, Dialog, etc.)

  **External References**:
  - `src/app/globals.css` — Global styles and CSS variables to match existing theme

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Login page renders with all form elements
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/login
      2. Assert input[name="username"] exists and is visible
      3. Assert input[name="password"] exists and is visible
      4. Assert button[type="submit"] exists with text containing "Log in" or "Sign in"
      5. Assert link to /register exists with text containing "Register"
      6. Take screenshot
    Expected Result: All form elements present and visible, styled consistently with app theme
    Failure Indicators: 404 page, missing inputs, unstyled form
    Evidence: .sisyphus/evidence/task-3-login-page.png

  Scenario: Login page handles empty submission
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, on /login page
    Steps:
      1. Click submit button without filling fields
      2. Assert form shows validation feedback (HTML5 required or custom)
    Expected Result: Form does not submit, shows validation hints
    Failure Indicators: Form submits with empty fields, no validation feedback
    Evidence: .sisyphus/evidence/task-3-login-validation.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `feat(auth): add login and register page UI`
  - Files: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`

- [ ] 4. Register Page UI

  **What to do**:
  - Create `src/app/(auth)/register/page.tsx` — client component with:
    - Username input field
    - Password input field
    - Confirm password input field
    - Submit button with loading state
    - Error message display area (for "Username taken" etc.)
    - Link to `/login` ("Already have an account? Log in")
    - Client-side validation: password match check, min length display
    - Form posts to `/api/auth/register` (wiring happens in Task 11, stub the onSubmit for now)
  - Use existing UI components from `src/components/ui/`
  - Match the app's existing visual style

  **Must NOT do**:
  - Do NOT implement actual registration API call — just build the form UI
  - Do NOT add email field
  - Do NOT add terms of service checkbox

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI page with form layout and client-side validation display
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 11
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/app/(auth)/login/page.tsx` (from Task 3) — Sister page, should share layout and visual style
  - `src/components/ui/` — Available UI primitives

  **External References**:
  - `src/app/globals.css` — Theme variables

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Register page renders with all form elements
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/register
      2. Assert input[name="username"] exists
      3. Assert input[name="password"] exists
      4. Assert input[name="confirmPassword"] exists
      5. Assert submit button exists
      6. Assert link to /login exists
      7. Take screenshot
    Expected Result: All form elements present and visible
    Failure Indicators: 404 page, missing inputs
    Evidence: .sisyphus/evidence/task-4-register-page.png

  Scenario: Password mismatch shows error
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, on /register page
    Steps:
      1. Fill username: "testuser"
      2. Fill password: "password123"
      3. Fill confirmPassword: "different456"
      4. Click submit
      5. Assert error message visible containing "match" or "don't match"
    Expected Result: Client-side validation prevents submission, shows mismatch error
    Failure Indicators: Form submits despite mismatch, no error shown
    Evidence: .sisyphus/evidence/task-4-password-mismatch.png
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(auth): add login and register page UI`
  - Files: `src/app/(auth)/register/page.tsx`

- [ ] 5. NextAuth v5 Configuration

  **What to do**:
  - Create `src/lib/auth.ts` — NextAuth v5 configuration:
    - Import `NextAuth` from `next-auth`
    - Configure `CredentialsProvider` with `authorize` callback:
      - Accept `username` and `password` from credentials
      - Query Prisma for user by username
      - Compare password with `bcryptjs.compare()`
      - Return user object `{ id, username }` on success, `null` on failure
    - Set `session: { strategy: "jwt" }`
    - Configure `callbacks.jwt` to include `userId` and `username` in the token
    - Configure `callbacks.session` to expose `userId` and `username` in the session object
    - Export `{ handlers, auth, signIn, signOut }` from `NextAuth()`
  - Create `src/app/api/auth/[...nextauth]/route.ts`:
    - Import `handlers` from `@/lib/auth`
    - Export `{ handlers.GET as GET, handlers.POST as POST }`
  - Create `src/types/next-auth.d.ts` — extend NextAuth types:
    - Extend `Session.user` to include `id` and `username`
    - Extend `JWT` to include `userId` and `username`
  - Set `NEXTAUTH_SECRET` in `.env.local` (generate with `openssl rand -base64 32`)
  - Set `NEXTAUTH_URL=http://localhost:3000` in `.env.local`

  **Must NOT do**:
  - Do NOT use database session strategy — JWT only
  - Do NOT install `@auth/prisma-adapter` — not needed with CredentialsProvider + JWT
  - Do NOT add any providers besides Credentials
  - Do NOT use `@auth/nextjs` package name — it's `next-auth`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Auth configuration is tricky with specific version quirks (v5 beta, JWT callbacks, type extensions). Requires careful attention to NextAuth v5 API.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Tasks 9, 10, 12
  - **Blocked By**: Task 1 (needs Prisma client for user queries)

  **References**:

  **Pattern References**:
  - `src/lib/claude/client.ts` — Module export pattern (singleton, env-dependent configuration)
  - `src/lib/db.ts` (from Task 1) — Prisma client import path

  **API/Type References**:
  - `prisma/schema.prisma` (from Task 1) — User model fields for the authorize callback query

  **External References**:
  - NextAuth v5 CredentialsProvider: https://authjs.dev/getting-started/authentication/credentials
  - NextAuth v5 with Next.js App Router: https://authjs.dev/getting-started/installation?framework=next.js

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NextAuth endpoints respond
    Tool: Bash (curl)
    Preconditions: Dev server running, a test user exists in DB (seed or create via register API if available)
    Steps:
      1. curl -s http://localhost:3000/api/auth/providers → JSON with "credentials" key
      2. curl -s http://localhost:3000/api/auth/csrf → JSON with "csrfToken" string
    Expected Result: Both endpoints return valid JSON responses
    Failure Indicators: 404, 500, or empty responses
    Evidence: .sisyphus/evidence/task-5-auth-endpoints.txt

  Scenario: Auth config exports compile
    Tool: Bash
    Preconditions: All dependencies installed
    Steps:
      1. Run `bun run build`
      2. Verify no type errors in auth.ts or next-auth.d.ts
    Expected Result: Build succeeds with 0 errors
    Failure Indicators: Type errors related to NextAuth session/JWT extensions
    Evidence: .sisyphus/evidence/task-5-build.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): configure NextAuth v5 with credentials provider`
  - Files: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`
  - Pre-commit: `bun run build`

- [ ] 6. User Registration API Route

  **What to do**:
  - Create `src/app/api/auth/register/route.ts` — POST endpoint:
    - Parse request body with `RegisterSchema` from `src/lib/schemas/auth.ts`
    - Check if username already exists in database (Prisma query)
    - Hash password with `bcryptjs.hash(password, 10)` (10 salt rounds)
    - Create user in database via Prisma
    - Return `{ success: true, user: { id, username } }` with status 201
    - Handle errors:
      - Invalid body → 400 with Zod error details
      - Duplicate username → 409 with `{ error: "Username already taken" }`
      - Server error → 500 with generic error message
  - Follow the exact pattern from existing `/api/adapt/*` routes: Zod parse → logic → NextResponse.json

  **Must NOT do**:
  - Do NOT auto-login after registration (user navigates to /login)
  - Do NOT send verification emails
  - Do NOT add rate limiting (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single API route with straightforward CRUD logic, following existing patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1 (Prisma), 2 (schemas)

  **References**:

  **Pattern References**:
  - `src/app/api/adapt/explain/route.ts` — **Primary pattern**: Zod validation → logic → NextResponse.json. Follow this exact structure for request parsing, error handling, and response format.
  - `src/lib/db.ts` (from Task 1) — Prisma client import

  **API/Type References**:
  - `src/lib/schemas/auth.ts` (from Task 2) — `RegisterSchema` for request validation
  - `prisma/schema.prisma` (from Task 1) — User model for Prisma.create call

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Successful registration
    Tool: Bash (curl)
    Preconditions: Dev server running, database empty
    Steps:
      1. curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"username":"testuser","password":"TestPass123"}'
      2. Assert response status is 201
      3. Assert response body contains { success: true, user: { username: "testuser" } }
    Expected Result: 201 with user data, no password in response
    Failure Indicators: Non-201 status, password hash leaked in response
    Evidence: .sisyphus/evidence/task-6-register-success.txt

  Scenario: Duplicate username returns 409
    Tool: Bash (curl)
    Preconditions: "testuser" already registered (from previous scenario)
    Steps:
      1. curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"username":"testuser","password":"DifferentPass456"}'
      2. Assert response status is 409
      3. Assert response body contains error about username taken
    Expected Result: 409 with clear error message
    Failure Indicators: 500 error, 201 allowing duplicate
    Evidence: .sisyphus/evidence/task-6-register-duplicate.txt

  Scenario: Invalid input returns 400
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"username":"ab","password":"short"}'
      2. Assert response status is 400
      3. Assert response body contains Zod validation error details
    Expected Result: 400 with specific field errors
    Failure Indicators: 500 error, 201 allowing invalid data
    Evidence: .sisyphus/evidence/task-6-register-invalid.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): add user registration API endpoint`
  - Files: `src/app/api/auth/register/route.ts`
  - Pre-commit: `bun run build`

- [ ] 7. Progress API Routes (GET + PUT)

  **What to do**:
  - Create `src/app/api/progress/route.ts` with two handlers:
  - **GET handler**: Fetch user's progress for a specific course
    - Read `courseId` from URL search params, validate with Zod
    - Get userId from NextAuth session via `auth()` from `@/lib/auth`
    - If no session → return 401
    - Query Prisma: CourseProgress with nested LessonProgress and ScreenResults
    - Reconstruct the nested `CourseProgress` shape that the `useProgress` hook consumers expect:
      ```
      {
        courseId, lastAccessedAt,
        lessonProgress: {
          [lessonId]: { lessonId, currentScreenIndex, startedAt, completedAt,
            screenResults: { [screenId]: { screenId, answeredCorrectly, attempts, hintsUsed, answeredAt } }
          }
        }
      }
      ```
    - If no progress exists yet, return the initial shape: `{ courseId, lessonProgress: {}, lastAccessedAt: now }`
  - **PUT handler**: Upsert progress records
    - Parse body with `ProgressPutBodySchema` from `src/lib/schemas/progress.ts`
    - Get userId from session, 401 if missing
    - Based on `action.type`:
      - `screen_complete`: Upsert CourseProgress, upsert LessonProgress, upsert ScreenResult
      - `update_index`: Upsert CourseProgress, upsert LessonProgress with new currentScreenIndex
      - `lesson_complete`: Update LessonProgress with completedAt timestamp
    - Always update CourseProgress.lastAccessedAt
    - Return the updated full CourseProgress in the same nested shape as GET
  - Use Prisma transactions for writes that touch multiple tables

  **Must NOT do**:
  - Do NOT expose other users' progress (always filter by session userId)
  - Do NOT allow bulk operations — one action per request
  - Do NOT store the full nested JSON as a JSONB column

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex data transformation (flat DB → nested shape), multiple Prisma operations, auth integration. More than a quick task.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1 (Prisma), 2 (schemas)

  **References**:

  **Pattern References**:
  - `src/app/api/adapt/explain/route.ts` — API route pattern: Zod validation, error handling, NextResponse.json
  - `src/lib/hooks/use-progress.ts:28-33` — The `makeInitialProgress()` function shows the exact shape to return when no progress exists
  - `src/lib/hooks/use-progress.ts:14-26` — `CourseProgress` and `LessonProgress` types that define the nested shape consumers expect

  **API/Type References**:
  - `src/lib/schemas/progress.ts` (from Task 2) — `ProgressPutBodySchema` for request validation
  - `prisma/schema.prisma` (from Task 1) — All progress-related models and their relationships
  - `src/lib/auth.ts` (from Task 5) — `auth()` function for session retrieval

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: GET returns initial progress for new course
    Tool: Bash (curl)
    Preconditions: User registered and logged in (have session cookie), no progress saved yet
    Steps:
      1. curl -X GET 'http://localhost:3000/api/progress?courseId=calendar-trick' --cookie "session-cookie-here"
      2. Assert status 200
      3. Assert body: { courseId: "calendar-trick", lessonProgress: {}, lastAccessedAt: "<timestamp>" }
    Expected Result: Empty but valid CourseProgress shape
    Failure Indicators: 500, null response, missing fields
    Evidence: .sisyphus/evidence/task-7-get-initial.txt

  Scenario: PUT screen_complete creates progress records
    Tool: Bash (curl)
    Preconditions: Authenticated session
    Steps:
      1. curl -X PUT http://localhost:3000/api/progress -H 'Content-Type: application/json' --cookie "..." -d '{"courseId":"calendar-trick","lessonId":"lesson-1","action":{"type":"screen_complete","screenId":"screen-1","answeredCorrectly":true,"attempts":1,"hintsUsed":0}}'
      2. Assert status 200
      3. Assert response contains lessonProgress["lesson-1"].screenResults["screen-1"] with answeredCorrectly: true
      4. GET the progress again, verify the same data persists
    Expected Result: Screen result saved and returned in nested shape
    Failure Indicators: Missing nested data, 500 on upsert
    Evidence: .sisyphus/evidence/task-7-put-screen-complete.txt

  Scenario: Unauthenticated request returns 401
    Tool: Bash (curl)
    Preconditions: No session cookie
    Steps:
      1. curl -s -o /dev/null -w '%{http_code}' 'http://localhost:3000/api/progress?courseId=test'
      2. Assert status is 401
    Expected Result: 401 Unauthorized
    Failure Indicators: 200 with data, 500 error
    Evidence: .sisyphus/evidence/task-7-unauth.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add progress GET and PUT endpoints`
  - Files: `src/app/api/progress/route.ts`
  - Pre-commit: `bun run build`

- [ ] 8. Rewrite useProgress Hook (Server-Backed)

  **What to do**:
  - Rewrite `src/lib/hooks/use-progress.ts` to replace localStorage with server API calls:
  - **State management**:
    - Keep `useState<CourseProgress>` for local read cache (same shape as before)
    - Add `useState<boolean>` for `loading` state
    - Add `useState<boolean>` for `error` state
  - **Initial load**: `useEffect` on mount that calls `GET /api/progress?courseId=...`
    - Set loading=true initially, false after fetch completes
    - Populate state from server response
  - **Write operations** — rewrite each to call PUT API:
    - `markScreenComplete(lessonId, screenId, result)`:
      - Update local state optimistically (immediate UI update)
      - `await fetch('/api/progress', { method: 'PUT', body: ... })` with `action.type = "screen_complete"`
      - On server error: revert local state, show error via Sonner toast
    - `updateCurrentScreenIndex(lessonId, index)`:
      - Update local state immediately
      - Fire-and-forget: `fetch(...)` without `await` — do NOT block UI
      - Silently ignore server errors (low-value write)
    - `markLessonComplete(lessonId)`:
      - Update local state optimistically
      - `await fetch(...)` with `action.type = "lesson_complete"`
      - On error: revert, show toast
  - **Read operations** — keep as pure functions from local state (no change):
    - `getLessonProgress`, `getScreenResult`, `getCourseCompletionPercent` — read from `progress` state as before
  - `resetProgress` — call PUT to clear (or a DELETE endpoint), then reset local state
  - Remove all localStorage/`useStickyState` imports
  - Export `loading` flag alongside existing returns

  **Must NOT do**:
  - Do NOT change the return type signature beyond adding `loading` and `error`
  - Do NOT remove any existing exported methods (even unused ones)
  - Do NOT use `useStickyState` or `localStorage` in any capacity
  - Do NOT import from `use-sticky-state.ts` (leave that file alone, don't delete it)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex async state management with optimistic updates, error handling, fire-and-forget patterns. Core business logic rewrite.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (but starts as soon as Task 7 is done)
  - **Blocks**: Task 13
  - **Blocked By**: Task 7 (needs Progress API routes)

  **References**:

  **Pattern References**:
  - `src/lib/hooks/use-progress.ts` — **THE file being rewritten**. Read it entirely to understand current API surface, all 7 exported methods, state shape, and how each method transforms state. The NEW hook must keep the same external API.
  - `src/lib/hooks/use-sticky-state.ts` — The current persistence mechanism being replaced. Understand what it does (localStorage read/write) so you know what to replace with server calls.
  - `src/lib/adaptation/engine.ts` — Example of client-side code calling API routes (fetch pattern)

  **API/Type References**:
  - `src/app/api/progress/route.ts` (from Task 7) — The API endpoints this hook will call. Match the request/response shapes exactly.
  - `src/lib/schemas/progress.ts` (from Task 2) — `ProgressPutBodySchema` defines what the PUT body must look like

  **External References**:
  - Sonner toast: already installed in the app (`sonner` package in package.json) — use for error notifications

  **WHY Each Reference Matters**:
  - `use-progress.ts`: You're rewriting this file — must preserve the exact same public API (method names, parameter types, return shapes)
  - `use-sticky-state.ts`: Understand what you're removing — the read-on-mount + write-on-change pattern maps to fetch-on-mount + PUT-on-change
  - `engine.ts`: Shows how existing client code calls API routes in this codebase

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Hook fetches progress from server on mount
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user logged in with existing progress in DB
    Steps:
      1. Navigate to a course page that uses useProgress
      2. Open browser DevTools Network tab (or intercept via Playwright)
      3. Assert GET request to /api/progress?courseId=calendar-trick fires
      4. Assert response contains expected progress data
      5. Assert no localStorage read/write occurs for brilliance-progress-*
    Expected Result: Progress loaded from server, not localStorage
    Failure Indicators: localStorage access detected, no network request
    Evidence: .sisyphus/evidence/task-8-fetch-on-mount.png

  Scenario: Build compiles with rewritten hook
    Tool: Bash
    Preconditions: Hook rewritten
    Steps:
      1. Run `bun run build`
      2. Assert exit code 0
      3. Assert no type errors in use-progress.ts or its consumers
    Expected Result: Clean build
    Failure Indicators: Type errors from changed hook API
    Evidence: .sisyphus/evidence/task-8-build.txt
  ```

  **Commit**: YES
  - Message: `feat(progress): rewrite useProgress hook with server persistence`
  - Files: `src/lib/hooks/use-progress.ts`
  - Pre-commit: `bun run build`

- [ ] 9. Proxy.ts Route Protection

  **What to do**:
  - Create `proxy.ts` at the **project root** (NOT in `src/`):
    - Import `auth` from `@/lib/auth`
    - Define protected route patterns: `/courses/:path*`, `/api/progress/:path*`, `/api/adapt/:path*`
    - Define public routes: `/`, `/login`, `/register`, `/api/auth/:path*`
    - In the proxy function:
      - Get session via `auth()` or decode JWT from cookie
      - If route is protected AND no valid session → redirect to `/login`
      - If route is `/login` or `/register` AND session exists → redirect to `/`
      - Otherwise → `NextResponse.next()`
    - Export `config.matcher` to exclude static files: `['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)']`
  - The function must be named `proxy` (Next.js 16 convention), NOT `middleware`

  **Must NOT do**:
  - Do NOT name the file `middleware.ts` — Next.js 16 uses `proxy.ts`
  - Do NOT name the export `middleware` — must be `proxy`
  - Do NOT run Prisma queries inside proxy — JWT validation only
  - Do NOT protect the homepage `/` — it should be publicly accessible

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, well-documented pattern from Next.js 16 docs
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Task 5 (needs auth config)

  **References**:

  **Pattern References**:
  - `src/lib/auth.ts` (from Task 5) — `auth` export for session validation in proxy

  **External References**:
  - Next.js 16 proxy docs: The proxy function pattern shown in official upgrade guide (middleware → proxy rename)
  - Auth.js v5 middleware integration: `export { auth as proxy } from "@/auth"` pattern (but may need custom logic for route matching)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Unauthenticated access to /courses redirects to /login
    Tool: Bash (curl)
    Preconditions: Dev server running, no session cookie
    Steps:
      1. curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/courses/calendar-trick
      2. Assert status is 307 (redirect)
      3. curl -s -D - http://localhost:3000/courses/calendar-trick | grep -i "location"
      4. Assert Location header contains "/login"
    Expected Result: 307 redirect to /login
    Failure Indicators: 200 (no protection), 404, 500
    Evidence: .sisyphus/evidence/task-9-redirect-unauth.txt

  Scenario: Homepage accessible without auth
    Tool: Bash (curl)
    Preconditions: Dev server running, no session cookie
    Steps:
      1. curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/
      2. Assert status is 200
    Expected Result: 200 OK — homepage is public
    Failure Indicators: 307 redirect to login
    Evidence: .sisyphus/evidence/task-9-homepage-public.txt

  Scenario: Authenticated user accessing /login redirects to /
    Tool: Bash (curl)
    Preconditions: Valid session cookie
    Steps:
      1. curl -s -o /dev/null -w '%{http_code}' --cookie "..." http://localhost:3000/login
      2. Assert status is 307 with Location: /
    Expected Result: Authenticated users bounced away from login page
    Failure Indicators: 200 showing login form to already-authenticated user
    Evidence: .sisyphus/evidence/task-9-auth-redirect.txt
  ```

  **Commit**: YES (groups with Tasks 10, 11, 12)
  - Message: `feat(auth): add route protection and wire auth pages`
  - Files: `proxy.ts`

- [ ] 10. Wire Login Page to NextAuth

  **What to do**:
  - Update `src/app/(auth)/login/page.tsx` (from Task 3):
    - Import `signIn` from `next-auth/react`
    - On form submit: call `signIn("credentials", { username, password, redirect: false })`
    - Handle response:
      - If `result.error` → display error message ("Invalid username or password")
      - If `result.ok` → `router.push("/")` to redirect to homepage
    - Show loading spinner on submit button during signIn call
    - Add `SessionProvider` wrapper if needed (or ensure it's in the layout)
  - Ensure `src/app/(auth)/layout.tsx` wraps children with `SessionProvider` from `next-auth/react`

  **Must NOT do**:
  - Do NOT add "remember me" checkbox
  - Do NOT add social login buttons

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Wiring existing form to NextAuth signIn — small, well-defined change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 3 (login page UI), 5 (NextAuth config)

  **References**:

  **Pattern References**:
  - `src/app/(auth)/login/page.tsx` (from Task 3) — The page being wired
  - `src/lib/auth.ts` (from Task 5) — Auth config (signIn is client-side via next-auth/react, not the server export)

  **External References**:
  - NextAuth v5 client-side signIn: `signIn("credentials", { redirect: false, username, password })`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Successful login redirects to homepage
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, test user exists (registered via Task 6 API)
    Steps:
      1. Navigate to http://localhost:3000/login
      2. Fill input[name="username"] with "testuser"
      3. Fill input[name="password"] with "TestPass123"
      4. Click submit button
      5. Wait for navigation
      6. Assert URL is now "/"
      7. Take screenshot
    Expected Result: Redirected to homepage after successful login
    Failure Indicators: Stays on /login, error message shown, 500 error
    Evidence: .sisyphus/evidence/task-10-login-success.png

  Scenario: Wrong password shows error
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, test user exists
    Steps:
      1. Navigate to /login
      2. Fill username: "testuser"
      3. Fill password: "wrongpassword"
      4. Click submit
      5. Assert error message visible containing "Invalid" or "incorrect"
      6. Assert URL is still /login
    Expected Result: Error message displayed, stays on login page
    Failure Indicators: Redirects anyway, no error shown, page crashes
    Evidence: .sisyphus/evidence/task-10-login-failure.png
  ```

  **Commit**: YES (groups with Tasks 9, 11, 12)
  - Message: `feat(auth): add route protection and wire auth pages`
  - Files: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/layout.tsx`

- [ ] 11. Wire Register Page to API

  **What to do**:
  - Update `src/app/(auth)/register/page.tsx` (from Task 4):
    - On form submit: `fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })`
    - Handle responses:
      - 201 → show success message, redirect to `/login` after 1-2 seconds (or immediately)
      - 409 → display "Username already taken" error
      - 400 → display validation errors from Zod
      - Other → display generic error
    - Show loading state on submit button during API call

  **Must NOT do**:
  - Do NOT auto-login after registration
  - Do NOT add any fields beyond username, password, confirmPassword

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Wiring existing form to fetch API — small, well-defined change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 4 (register page UI), 6 (register API route)

  **References**:

  **Pattern References**:
  - `src/app/(auth)/register/page.tsx` (from Task 4) — The page being wired
  - `src/app/api/auth/register/route.ts` (from Task 6) — The API endpoint being called, response shapes to handle

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Successful registration redirects to login
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/register
      2. Fill username: "newuser123"
      3. Fill password: "SecurePass456"
      4. Fill confirmPassword: "SecurePass456"
      5. Click submit
      6. Wait for navigation or success message
      7. Assert URL is now /login (or success message shown)
    Expected Result: Registration succeeds, user directed to login
    Failure Indicators: Stays on register with error, 500
    Evidence: .sisyphus/evidence/task-11-register-success.png

  Scenario: Duplicate username shows error
    Tool: Playwright (playwright skill)
    Preconditions: "newuser123" already registered
    Steps:
      1. Navigate to /register
      2. Fill same username: "newuser123"
      3. Fill password: "AnotherPass789"
      4. Fill confirmPassword: "AnotherPass789"
      5. Click submit
      6. Assert error message containing "taken" or "already exists"
    Expected Result: 409 error displayed clearly to user
    Failure Indicators: Generic error, no error shown, success despite duplicate
    Evidence: .sisyphus/evidence/task-11-register-duplicate.png
  ```

  **Commit**: YES (groups with Tasks 9, 10, 12)
  - Message: `feat(auth): add route protection and wire auth pages`
  - Files: `src/app/(auth)/register/page.tsx`

- [ ] 12. Auth Guards on Existing /api/adapt/* Routes

  **What to do**:
  - Update all 3 existing API routes to require authentication:
    - `src/app/api/adapt/explain/route.ts`
    - `src/app/api/adapt/hint/route.ts`
    - `src/app/api/adapt/difficulty/route.ts`
  - In each route's POST handler, add at the top (before existing Zod parsing):
    - Import `auth` from `@/lib/auth`
    - Call `const session = await auth()`
    - If `!session?.user` → return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
  - This is ~5 lines added to each file. Do NOT change any other logic.

  **Must NOT do**:
  - Do NOT refactor these routes or change their existing logic
  - Do NOT extract a shared auth middleware helper (keep it simple, 3 files)
  - Do NOT change request/response schemas

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Identical 5-line addition to 3 files, mechanical change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Task 5 (needs auth config for `auth()` import)

  **References**:

  **Pattern References**:
  - `src/app/api/adapt/explain/route.ts` — **THE file being modified**. Read it to see where to insert the auth check (before the Zod parse at line 19-24).
  - `src/app/api/adapt/hint/route.ts` — Same modification needed
  - `src/app/api/adapt/difficulty/route.ts` — Same modification needed
  - `src/lib/auth.ts` (from Task 5) — `auth()` function to import

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: /api/adapt/hint rejects unauthenticated
    Tool: Bash (curl)
    Preconditions: Dev server running, no session cookie
    Steps:
      1. curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/adapt/hint -H 'Content-Type: application/json' -d '{"courseId":"test","lessonId":"test","screenId":"test","userAnswer":"test","screenData":{"type":"mc","title":"test"}}'
      2. Assert status is 401
    Expected Result: 401 Unauthorized
    Failure Indicators: 200 (guard missing), 500
    Evidence: .sisyphus/evidence/task-12-adapt-unauth.txt

  Scenario: /api/adapt/explain works when authenticated
    Tool: Bash (curl)
    Preconditions: Valid session cookie
    Steps:
      1. curl -X POST http://localhost:3000/api/adapt/explain --cookie "..." -H 'Content-Type: application/json' -d '{"courseId":"calendar-trick","lessonId":"l1","screenId":"s1","userAnswer":"wrong","correctAnswer":"right","screenData":{"type":"multiple_choice","title":"Test"}}'
      2. Assert status is 200 (or the existing response behavior)
    Expected Result: Route still works for authenticated users
    Failure Indicators: 401 for authenticated users, changed response format
    Evidence: .sisyphus/evidence/task-12-adapt-authed.txt
  ```

  **Commit**: YES (groups with Tasks 9, 10, 11)
  - Message: `feat(auth): add route protection and wire auth pages`
  - Files: `src/app/api/adapt/explain/route.ts`, `src/app/api/adapt/hint/route.ts`, `src/app/api/adapt/difficulty/route.ts`

- [ ] 13. Update Progress Consumers (LessonPlayer + CourseOverviewClient)

  **What to do**:
  - Update `src/components/lesson/lesson-player.tsx`:
    - The rewritten `useProgress` hook (Task 8) now returns `loading` alongside existing fields
    - Add loading state handling: while `loading` is true, show a simple loading indicator (spinner or "Loading..." text) before rendering lesson content
    - `markScreenComplete` is now async — the hook handles optimistic updates internally, but the component should handle the returned promise for error feedback:
      - Wrap `markScreenComplete` calls in try/catch or handle the promise
      - On error: Sonner toast is fired by the hook, no additional component-level handling needed unless the component needs to know about failure
    - `updateCurrentScreenIndex` is fire-and-forget — no changes needed for this call (hook handles it)
    - `markLessonComplete` is async — same pattern as markScreenComplete
    - Verify `getLessonProgress` still works synchronously from in-memory state (it should — no changes to read methods)
  - Update `src/components/course/course-overview-client.tsx`:
    - Add loading state handling: while `loading` is true, show a simple loading indicator
    - `progress.lessonProgress` is still the same shape once loaded — read logic should work unchanged
    - `getLessonProgress(lessonId)` still works the same from in-memory state
  - Add `SessionProvider` wrapper in the appropriate layout:
    - If `src/app/layout.tsx` doesn't already wrap with SessionProvider, add it there (or in a providers component)
    - `useProgress` hook (or the pages using it) needs access to the session for API calls

  **Must NOT do**:
  - Do NOT change any screen components (`*-screen.tsx`)
  - Do NOT add complex loading skeletons — simple spinner/text is sufficient
  - Do NOT change the progress display logic — only add loading state
  - Do NOT modify how `screen-renderer.tsx` produces ScreenResult objects

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple files, requires understanding how the async hook integrates with existing component logic. Needs careful testing.
  - **Skills**: [`playwright`]
    - `playwright`: Needed for QA scenarios verifying the full user flow (navigate, interact, verify progress)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential, depends on Task 8)
  - **Blocks**: Final verification
  - **Blocked By**: Task 8 (rewritten useProgress hook)

  **References**:

  **Pattern References**:
  - `src/components/lesson/lesson-player.tsx` — **THE file being modified**. Read entirely. Understand how it uses `useProgress` methods (lines ~79-143): markScreenComplete, updateCurrentScreenIndex, markLessonComplete, getLessonProgress. The changes are minimal — add loading guard and handle async writes.
  - `src/components/course/course-overview-client.tsx` — **THE file being modified**. Read entirely. Understand how it uses `progress.lessonProgress` and `getLessonProgress` for computing course completion.
  - `src/lib/hooks/use-progress.ts` (from Task 8) — The rewritten hook. Understand its new API: same methods but now returns `loading`, and write methods are async.

  **API/Type References**:
  - `src/components/screens/screen-renderer.tsx` — Defines `ScreenResult` interface that flows into `markScreenComplete`. Do NOT touch this file.

  **External References**:
  - `sonner` (already installed) — For toast notifications on progress save errors

  **WHY Each Reference Matters**:
  - `lesson-player.tsx`: You're adding loading state and async handling — must understand the exact call sites for each useProgress method
  - `course-overview-client.tsx`: Adding loading state — must understand how progress data is used for completion calculation
  - `use-progress.ts`: The hook you're consuming — must know what changed (loading flag, async writes) vs what stayed the same (read methods)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Course overview shows progress after completing screens
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user logged in, course exists
    Steps:
      1. Navigate to http://localhost:3000/courses/calendar-trick
      2. Assert page loads without errors (no loading stuck forever)
      3. Verify lesson cards render with status indicators
      4. Take screenshot
    Expected Result: Course overview loads, shows lesson statuses
    Failure Indicators: Infinite loading, error messages, blank page
    Evidence: .sisyphus/evidence/task-13-course-overview.png

  Scenario: Lesson player loads and saves progress
    Tool: Playwright (playwright skill)
    Preconditions: Logged in, navigated to a lesson
    Steps:
      1. Navigate to http://localhost:3000/courses/calendar-trick/lessons/{first-lesson-id}
      2. Assert lesson content loads (not stuck on loading indicator)
      3. Answer a question (interact with the screen)
      4. Assert screen advances to next
      5. Refresh the page
      6. Assert progress is preserved (not back to screen 1)
      7. Take screenshot
    Expected Result: Progress saved to server and restored on refresh
    Failure Indicators: Progress lost on refresh, stuck loading, localStorage usage
    Evidence: .sisyphus/evidence/task-13-progress-persistence.png

  Scenario: Full cross-session persistence
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Register a new user "persistence_test"
      2. Login as "persistence_test"
      3. Navigate to course, start lesson, answer 2 screens
      4. Clear browser cookies (simulate new session)
      5. Navigate to /login, login as "persistence_test" again
      6. Navigate back to the same course/lesson
      7. Assert progress shows the 2 completed screens
    Expected Result: Progress fully persists across sessions
    Failure Indicators: Progress lost, starts from beginning
    Evidence: .sisyphus/evidence/task-13-cross-session.png
  ```

  **Commit**: YES
  - Message: `feat(ui): update progress consumers for server-backed hook`
  - Files: `src/components/lesson/lesson-player.tsx`, `src/components/course/course-overview-client.tsx`, possibly `src/app/layout.tsx`
  - Pre-commit: `bun run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns (middleware.ts, database sessions, native bcrypt, @auth/nextjs). Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `bun run lint`. Review all changed/new files for: `as any`/`@ts-ignore`, empty catches, console.log in production code, commented-out code, unused imports. Check for AI slop: excessive comments, over-abstraction, generic variable names. Verify Prisma client singleton pattern is correct. Verify bcryptjs salt rounds ≥ 10.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start dev server. Full user journey: Register → Login → Navigate to course → Start lesson → Answer screens → Progress bar updates → Logout → Login again → Progress persisted. Test error cases: wrong password, duplicate username, unauthenticated access. Test two-user isolation. Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Specifically verify: no screen components touched, no ScreenResult consolidation, no unused method removal, content loader unchanged, no social login, no email verification. Flag unaccounted file changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Task(s) | Commit Message | Key Files |
|---------------|---------------|-----------|
| 1 | `feat(db): add Prisma schema with User and progress tables` | `prisma/schema.prisma`, `src/lib/db.ts`, `.env.local.example` |
| 2 | `feat(schemas): add auth and progress API validation schemas` | `src/lib/schemas/auth.ts`, `src/lib/schemas/progress.ts` |
| 3, 4 | `feat(auth): add login and register page UI` | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` |
| 5 | `feat(auth): configure NextAuth v5 with credentials provider` | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` |
| 6 | `feat(auth): add user registration API endpoint` | `src/app/api/auth/register/route.ts` |
| 7 | `feat(api): add progress GET and PUT endpoints` | `src/app/api/progress/route.ts` |
| 8 | `feat(progress): rewrite useProgress hook with server persistence` | `src/lib/hooks/use-progress.ts` |
| 9, 10, 11, 12 | `feat(auth): add route protection and wire auth pages` | `proxy.ts`, adapted route files |
| 13 | `feat(ui): update progress consumers for server-backed hook` | `src/components/lesson/lesson-player.tsx`, `src/components/course/course-overview-client.tsx` |

---

## Success Criteria

### Verification Commands
```bash
bun run build              # Expected: exits 0, no type errors
curl -s -o /dev/null -w '%{http_code}' localhost:3000/courses/calendar-trick  # Expected: 307 (redirect to /login)
curl -s -o /dev/null -w '%{http_code}' -X POST localhost:3000/api/adapt/hint -H 'Content-Type: application/json' -d '{}'  # Expected: 401
```

### Final Checklist
- [ ] All "Must Have" items implemented and verified
- [ ] All "Must NOT Have" items absent from codebase
- [ ] Register → Login → complete screen → logout → login → progress persists
- [ ] Two users have completely isolated progress
- [ ] `bun run build` exits 0
- [ ] All API routes return 401 for unauthenticated requests
- [ ] Homepage `/` accessible without auth
- [ ] Login and register pages accessible without auth
