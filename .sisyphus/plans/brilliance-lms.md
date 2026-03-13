# Brilliance: LLM-Authored Interactive Learning Platform

## TL;DR

> **Quick Summary**: Build a Brilliant.org-inspired learning platform where LLMs author structured course content (JSON validated by Zod) and humans learn through interactive, "learn by doing" lessons. The app uses Next.js 15 + shadcn/ui for the UI, Claude Agent SDK for live content adaptation, and Framer Motion for polished transitions.
> 
> **Deliverables**:
> - Next.js 15 app with course catalog, lesson player, and 5 screen types
> - Zod content schema optimized for LLM authoring (`.describe()` on every field)
> - Content validation pipeline (semantic checks beyond Zod parsing)
> - Claude Agent SDK integration for live hints, difficulty adjustment, and adaptive explanations
> - Seed course: "Calendar in Your Head" (deduce day-of-week from any date)
> - LLM authoring guide (system prompt + schema docs + examples)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Scaffolding → Schema → Screen Renderers → Lesson Player → Live Adaptation

---

## Context

### Original Request
Build an LMS that an LLM can use to teach concepts in a concise way, much like Brilliant.org. The system needs to support guided step-by-step courses that help master concepts (e.g., the "calendar in your head" trick, CS concepts). Must be an engaging and elegant experience for both the LLM content author and the human learner.

### Interview Summary
**Key Discussions**:
- **Authoring model**: HYBRID — LLM pre-authors course skeletons as structured JSON files; app calls Claude API for live adaptation (hints, difficulty adjustment, tailored explanations) based on learner performance
- **LLM integration**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) using Pro/Max subscription OAuth — no API keys needed
- **Tech stack**: Next.js 15 (App Router) + shadcn/ui + Framer Motion + Zod + TypeScript
- **User scope**: Single user, no auth, localStorage for progress
- **Gamification**: Minimal — progress bars and completion checkmarks only
- **Interaction types (v1)**: Multiple choice, fill-in-blank, ordering/sequencing, interactive code blocks
- **Test strategy**: No automated unit tests; agent-executed QA (Playwright, curl) for all verification

**Research Findings**:
- Brilliant.org's core philosophy: "Learn by doing" — every screen requires action, no passive reading
- Key pedagogical pattern: "Intuition before formalism" — let learners solve before naming the concept
- Brilliant's AI pipeline: humans design learning objectives + game types → LLM generates structured configurations → automated evals validate → humans curate
- Critical insight from Brilliant's engineering: *"The breakthrough came from making the representations in our game engine more LLM-friendly"* — the content schema IS the authoring API
- Production schemas to reference: QuML (300M+ users), mdbook-quiz (Rust book), Educhain (LLM content generation)

### Metis Review
**Identified Gaps** (addressed):
- **Screen types must be interaction-based, not pedagogical-phase-based**: Use `explanation`, `multiple_choice`, `fill_in_blank`, `ordering`, `code_block` as discriminated union types. Pedagogical flow (hook → explore → challenge → reveal → practice) is an ordering convention, not a type constraint.
- **Schema must use `.describe()` on every Zod field**: This IS the LLM's authoring documentation. Follows Educhain's `Field(description=...)` pattern.
- **Require `explanation` field on every interactive screen**: Forces LLM to reason about correctness, preventing wrong-answer-marked-correct failures.
- **Content validation beyond Zod**: MCQ must have exactly one correct answer, ordering must have ≥2 items, fill-in-blank must have at least one blank marker, code blocks must have test cases.
- **Seed course sizing**: 3–5 lessons, 8–12 screens each (based on Brilliant's ~20 screens/lesson, scaled for v1).
- **LLM failure modes to guard against**: Wrong answer marked correct, ambiguous questions, difficulty miscalibration, repetitive patterns, unsolvable problems.

---

## Work Objectives

### Core Objective
Build a complete, interactive learning platform where any LLM can author rich educational courses by producing Zod-validated JSON, and a human learner can work through those courses with Brilliant.org-quality interactivity, progression, and live AI-powered adaptation.

### Concrete Deliverables
- Next.js 15 web application with App Router
- Zod content schema with full `.describe()` annotations
- 5 screen type renderers: explanation, multiple choice, fill-in-blank, ordering, code block
- Lesson player with Framer Motion card transitions
- Course catalog and course overview pages
- localStorage-based progress tracking
- Claude Agent SDK integration for live content adaptation
- Content validation pipeline (Zod + semantic checks)
- Seed course: "Calendar in Your Head" (3–5 lessons, 8–12 screens each)
- LLM authoring guide: system prompt, schema reference, examples

### Definition of Done
- [ ] `bun run build` succeeds with zero errors
- [ ] Home page shows course catalog with at least one course
- [ ] Learner can complete the "Calendar in Your Head" course end-to-end
- [ ] All 5 screen types render and accept user interaction
- [ ] Progress persists across page refreshes (localStorage)
- [ ] Live adaptation API returns valid content (hints, explanations)
- [ ] An LLM can produce a valid course JSON from the authoring guide alone

### Must Have
- Every screen requires learner ACTION — no passive "read and continue" except explanation screens (and even those should have a "got it" confirmation)
- Content schema uses `.describe()` on every field — the schema IS the LLM documentation
- `explanation` field required on every interactive screen (forces LLM correctness reasoning)
- Immediate, visceral feedback on answers — not just "correct/incorrect" text, but visual animations
- Card-based screen progression with smooth Framer Motion transitions
- Responsive design (works on desktop and tablet)

### Must NOT Have (Guardrails)
- No user authentication or multi-user support (single user, localStorage only)
- No database (all content is file-based JSON, all progress is localStorage)
- No gamification beyond progress bars and completion checkmarks (no streaks, XP, leagues)
- No video content or video player
- No drag-and-drop between screens (only within ordering screen type)
- No custom illustration/image generation — use text, code, and simple visual patterns
- No server-side progress persistence — localStorage only
- No CMS or admin panel — courses are JSON files authored by LLMs
- No automated unit tests — QA is agent-executed (Playwright, curl)
- No over-abstracted "plugin system" for screen types — keep it simple with a component map
- No excessive JSDoc or code comments — the code should be self-documenting

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: NONE
- **Framework**: N/A
- **Verification method**: Agent-executed QA only (Playwright for UI, curl for API, tmux for CLI)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Schema/Validation**: Use Bash (bun/node REPL) — Import schema, validate test data, check errors

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent, start immediately):
├── Task 1: Project scaffolding + tooling [quick]
├── Task 2: Content schema (Zod types) [deep]
├── Task 3: App shell + layout [visual-engineering]
├── Task 4: Progress tracking system [quick]
└── Task 5: UI component kit [visual-engineering]

Wave 2 (Content Pipeline + Screen Renderers — depend on Wave 1):
├── Task 6: Content validation layer (depends: 2) [quick]
├── Task 7: Content loader (depends: 2) [quick]
├── Task 8: Claude Agent SDK + API route (depends: 1, 2) [deep]
├── Task 9: Explanation screen renderer (depends: 2, 5) [visual-engineering]
├── Task 10: Multiple choice screen renderer (depends: 2, 5) [visual-engineering]
├── Task 11: Fill-in-blank screen renderer (depends: 2, 5) [visual-engineering]
├── Task 12: Ordering screen renderer (depends: 2, 5) [visual-engineering]
└── Task 13: Code block screen renderer (depends: 2, 5) [visual-engineering]

Wave 3 (Core Experience — depend on Wave 2):
├── Task 14: Lesson player (depends: 7, 9-13, 4) [deep]
├── Task 15: Course overview page (depends: 3, 7, 4) [visual-engineering]
├── Task 16: Home page / course catalog (depends: 3, 7) [visual-engineering]
├── Task 17: Seed course: "Calendar in Your Head" (depends: 2, 6) [artistry]
└── Task 18: LLM authoring guide (depends: 2, 6) [writing]

Wave 4 (Integration + Polish — depend on Wave 3):
├── Task 19: Live adaptation engine (depends: 8, 14) [deep]
├── Task 20: Animation + transition polish (depends: 14) [visual-engineering]
└── Task 21: Responsive design + final styling (depends: 14, 15, 16) [visual-engineering]

Wave FINAL (Verification — after ALL tasks, 4 parallel):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real QA walkthrough [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 2 → Task 9-13 → Task 14 → Task 19
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 8 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 8 | 1 |
| 2 | — | 6, 7, 8, 9-13, 17, 18 | 1 |
| 3 | — | 15, 16 | 1 |
| 4 | — | 14, 15 | 1 |
| 5 | — | 9-13 | 1 |
| 6 | 2 | 17, 18 | 2 |
| 7 | 2 | 14, 15, 16 | 2 |
| 8 | 1, 2 | 19 | 2 |
| 9 | 2, 5 | 14 | 2 |
| 10 | 2, 5 | 14 | 2 |
| 11 | 2, 5 | 14 | 2 |
| 12 | 2, 5 | 14 | 2 |
| 13 | 2, 5 | 14 | 2 |
| 14 | 4, 7, 9-13 | 19, 20, 21 | 3 |
| 15 | 3, 4, 7 | 21 | 3 |
| 16 | 3, 7 | 21 | 3 |
| 17 | 2, 6 | — | 3 |
| 18 | 2, 6 | — | 3 |
| 19 | 8, 14 | — | 4 |
| 20 | 14 | — | 4 |
| 21 | 14, 15, 16 | — | 4 |

### Agent Dispatch Summary

- **Wave 1**: **5 tasks** — T1 → `quick`, T2 → `deep`, T3 → `visual-engineering`, T4 → `quick`, T5 → `visual-engineering`
- **Wave 2**: **8 tasks** — T6 → `quick`, T7 → `quick`, T8 → `deep`, T9-T13 → `visual-engineering`
- **Wave 3**: **5 tasks** — T14 → `deep`, T15-T16 → `visual-engineering`, T17 → `artistry`, T18 → `writing`
- **Wave 4**: **3 tasks** — T19 → `deep`, T20-T21 → `visual-engineering`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Project Scaffolding + Tooling

  **What to do**:
  - Initialize git repository
  - Create Next.js 15 project with App Router, TypeScript, Tailwind CSS 4
  - Install and configure shadcn/ui (use `npx shadcn@latest init`)
  - Install dependencies: `framer-motion`, `zod`, `@anthropic-ai/claude-agent-sdk`
  - Install dev dependencies: `@dnd-kit/core`, `@dnd-kit/sortable` (for ordering screen)
  - Set up project directory structure:
    ```
    src/
    ├── app/              # Next.js App Router pages
    ├── components/       # React components
    │   ├── ui/           # shadcn/ui components
    │   ├── screens/      # Screen type renderers
    │   └── lesson/       # Lesson player components
    ├── lib/              # Utilities, hooks, helpers
    │   ├── schemas/      # Zod content schemas
    │   ├── hooks/        # Custom React hooks
    │   └── utils/        # General utilities
    └── content/          # Course JSON files
        └── courses/      # One directory per course
    ```
  - Add initial shadcn/ui components: `button`, `card`, `progress`, `badge`, `dialog`, `toast`, `tabs`, `separator`, `scroll-area`
  - Configure `tsconfig.json` with path aliases (`@/` → `src/`)
  - Add `.gitignore` for Next.js project
  - Create `.env.local.example` with `ANTHROPIC_AUTH_TOKEN` placeholder
  - Verify `bun run dev` starts successfully on port 3000

  **Must NOT do**:
  - Do NOT add any database, ORM, or server-side storage
  - Do NOT set up authentication
  - Do NOT add testing frameworks
  - Do NOT install unnecessary dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard project scaffolding with well-known tools — no creative problem-solving needed
  - **Skills**: []
    - No special skills needed — this is standard CLI/package manager work
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed for scaffolding, will be used in UI tasks
    - `playwright`: Not needed for scaffolding

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Task 8 (Claude Agent SDK needs project initialized)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Next.js 15 App Router: `https://nextjs.org/docs/app` — Project structure and routing conventions
  - shadcn/ui installation: `https://ui.shadcn.com/docs/installation/next` — Init command and component installation
  - Tailwind CSS 4: `https://tailwindcss.com/docs/installation/framework-guides/nextjs` — Next.js integration
  - @dnd-kit: `https://docs.dndkit.com/` — Drag-and-drop library for ordering screen

  **WHY Each Reference Matters**:
  - Next.js docs define the canonical App Router structure this entire project builds on
  - shadcn/ui init must be run correctly to generate the `components.json` and base styles
  - @dnd-kit is needed by Task 12 (ordering screen) — install now to avoid dependency issues later

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: Project scaffolded, dependencies installed
    Steps:
      1. Run `bun run dev &` to start dev server in background
      2. Wait 5 seconds for server startup
      3. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
      4. Assert HTTP status code is 200
      5. Kill dev server
    Expected Result: Status code 200
    Failure Indicators: Non-200 status code, server crash, port conflict
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: Project structure is correct
    Tool: Bash
    Preconditions: Project scaffolded
    Steps:
      1. Run `ls -la src/` — verify app/, components/, lib/, content/ directories exist
      2. Run `ls src/components/ui/` — verify shadcn components are installed
      3. Run `cat package.json | grep framer-motion` — verify dependency present
      4. Run `cat package.json | grep zod` — verify dependency present
      5. Run `cat package.json | grep claude-agent-sdk` — verify dependency present
      6. Run `cat tsconfig.json | grep "@/"` — verify path alias configured
    Expected Result: All directories exist, all dependencies present, path alias configured
    Failure Indicators: Missing directories, missing dependencies, broken tsconfig
    Evidence: .sisyphus/evidence/task-1-structure.txt

  Scenario: Build succeeds
    Tool: Bash
    Preconditions: Project scaffolded
    Steps:
      1. Run `bun run build`
      2. Assert exit code is 0
      3. Verify `.next/` directory exists
    Expected Result: Build completes with zero errors
    Failure Indicators: TypeScript errors, build failures, missing dependencies
    Evidence: .sisyphus/evidence/task-1-build.txt
  ```

  **Commit**: YES
  - Message: `feat(scaffold): initialize Next.js 15 project with shadcn/ui and tooling`
  - Files: All scaffolding files
  - Pre-commit: `bun run build`

- [x] 2. Content Schema Design (Zod Types)

  **What to do**:
  - Create `src/lib/schemas/content.ts` — the core content schema
  - Define the complete content hierarchy as Zod types with `.describe()` on EVERY field:
    ```typescript
    // Hierarchy: Course → Module → Lesson → Screen
    CourseSchema: { id, title, description, modules[] }
    ModuleSchema: { id, title, description, lessons[] }
    LessonSchema: { id, title, description, screens[], prerequisiteLessonIds[] }
    ```
  - Define Screen as a discriminated union on `type` field:
    ```typescript
    ScreenSchema = z.discriminatedUnion('type', [
      ExplanationScreenSchema,    // Markdown content + optional visual
      MultipleChoiceScreenSchema, // Question + options + exactly 1 correct
      FillInBlankScreenSchema,    // Template with blanks + accepted answers
      OrderingScreenSchema,       // Items to arrange in correct sequence
      CodeBlockScreenSchema,      // Code editor + test cases
    ])
    ```
  - Every interactive screen MUST include:
    - `explanation: z.string().min(20).describe("Why the correct answer is correct...")` — forces LLM correctness reasoning
    - `hints: z.array(z.string()).min(1).max(3).describe("Progressive hints...")` — from easy nudge to near-answer
    - `difficulty: z.enum(['easy', 'medium', 'hard']).describe("...")` — string enum, not boolean
  - ExplanationScreen: `{ type: 'explanation', title, content (markdown string), callout? }`
  - MultipleChoiceScreen: `{ type: 'multiple_choice', question, options[]{id, text, isCorrect}, explanation, hints, difficulty }`
  - FillInBlankScreen: `{ type: 'fill_in_blank', prompt (with {{blank}} markers), blanks[]{id, acceptedAnswers[], caseSensitive}, explanation, hints, difficulty }`
  - OrderingScreen: `{ type: 'ordering', instruction, items[]{id, text}, correctOrder: string[], explanation, hints, difficulty }`
  - CodeBlockScreen: `{ type: 'code_block', instruction, starterCode, language, testCases[]{input, expectedOutput}, explanation, hints, difficulty }`
  - Export TypeScript types via `z.infer<>` for all schemas
  - Use string enums over booleans everywhere (LLMs handle them better)
  - Keep nesting ≤ 2 levels deep (LLM generation reliability)
  - Create `src/lib/schemas/progress.ts` — progress state types:
    ```typescript
    CourseProgressSchema: { courseId, lessonProgress: Record<string, LessonProgress>, lastAccessedAt }
    LessonProgressSchema: { lessonId, currentScreenIndex, screenResults: Record<string, ScreenResult>, completedAt? }
    ScreenResultSchema: { screenId, answeredCorrectly, attempts, hintsUsed }
    ```

  **Must NOT do**:
  - Do NOT use pedagogical-phase screen types (Hook, Challenge, Reveal, etc.) — use interaction types only
  - Do NOT use booleans where string enums work better (`difficulty: 'easy'` not `isHard: true`)
  - Do NOT nest deeper than 2 levels in any schema
  - Do NOT omit `.describe()` from any field — this IS the LLM's authoring API documentation
  - Do NOT make `explanation` optional on interactive screens

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Schema design is the single most critical architectural decision — determines LLM authoring quality and rendering correctness. Requires careful thought about Zod discriminated unions, LLM generation patterns, and type inference.
  - **Skills**: []
    - No special skills needed — this is pure TypeScript/Zod work
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable — this is data modeling, not UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 6, 7, 8, 9, 10, 11, 12, 13, 17, 18 (nearly everything depends on the schema)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Zod discriminated unions: `https://zod.dev/?id=discriminated-unions` — Core pattern for screen types
  - Zod `.describe()`: `https://zod.dev/?id=describe` — Adding descriptions to schema fields
  - QuML specification: `https://quml.sunbird.org/` — Battle-tested education content schema (300M+ users)
  - Educhain Pydantic models: `https://github.com/satvik314/educhain` — LLM-optimized content generation schemas
  - mdbook-quiz: `https://github.com/cognitive-engineering-lab/mdbook-quiz` — Clean quiz schema used in The Rust Programming Language book

  **WHY Each Reference Matters**:
  - Zod discriminated unions are the exact pattern for screen types — each type has completely different required fields
  - `.describe()` transforms the schema from a validation tool into an LLM authoring guide
  - QuML shows what a battle-tested education schema looks like at scale
  - Educhain's `Field(description=...)` pattern maps directly to Zod's `.describe()` — use their description style
  - mdbook-quiz shows a minimal, clean schema for a similar interactive learning use case

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Schema validates a correct course JSON
    Tool: Bash (bun)
    Preconditions: Schema file exists at src/lib/schemas/content.ts
    Steps:
      1. Create a test script that imports CourseSchema
      2. Parse a valid course JSON object through CourseSchema.parse()
      3. Assert parse succeeds without errors
      4. Assert inferred TypeScript type matches expected shape
    Expected Result: Valid JSON parses successfully, types are correct
    Failure Indicators: ZodError thrown, type mismatch
    Evidence: .sisyphus/evidence/task-2-valid-parse.txt

  Scenario: Schema rejects invalid content
    Tool: Bash (bun)
    Preconditions: Schema file exists
    Steps:
      1. Try parsing a MultipleChoiceScreen with zero correct answers — expect ZodError
      2. Try parsing a screen with missing `explanation` field — expect ZodError
      3. Try parsing a screen with unknown `type` value — expect ZodError
      4. Try parsing a FillInBlankScreen with no blank markers in prompt — should parse (semantic validation is Task 6)
    Expected Result: Invalid JSON correctly rejected with descriptive error messages
    Failure Indicators: Invalid JSON accepted without error
    Evidence: .sisyphus/evidence/task-2-invalid-reject.txt

  Scenario: Every field has a .describe() annotation
    Tool: Bash (grep)
    Preconditions: Schema file exists
    Steps:
      1. Count total z.string(), z.number(), z.enum(), z.array(), z.boolean(), z.object() calls in content.ts
      2. Count total .describe() calls in content.ts
      3. Verify ratio is close to 1:1 (every field has a description)
    Expected Result: Every Zod field has a .describe() annotation
    Failure Indicators: Fields without .describe(), ratio significantly below 1:1
    Evidence: .sisyphus/evidence/task-2-describe-coverage.txt
  ```

  **Commit**: YES
  - Message: `feat(schema): define Zod content schema with LLM-optimized descriptions`
  - Files: `src/lib/schemas/content.ts`, `src/lib/schemas/progress.ts`
  - Pre-commit: `bun run build`

- [x] 3. App Shell + Layout

  **What to do**:
  - Create `src/app/layout.tsx` — root layout with:
    - Inter font (or system font stack)
    - shadcn/ui `ThemeProvider` for dark/light mode
    - Top navigation bar with: app logo/name ("Brilliance"), theme toggle, simple breadcrumb
    - Main content area with max-width container (centered, ~768px for lesson content)
    - Responsive: full-width on mobile, centered container on desktop
  - Create `src/app/page.tsx` — placeholder home page (will be built out in Task 16)
  - Create `src/app/courses/[courseId]/page.tsx` — placeholder course page
  - Create `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx` — placeholder lesson page
  - Set up the route structure following Next.js App Router conventions
  - Add shadcn `Toaster` component for feedback notifications
  - Configure Tailwind theme with a learning-focused color palette:
    - Primary: A calm, focused blue
    - Success: Green for correct answers
    - Destructive: Red/orange for incorrect answers
    - Muted backgrounds for content cards
  - Add basic `metadata` exports for SEO on each page

  **Must NOT do**:
  - Do NOT add sidebar navigation (this is a focused learning experience, not a dashboard)
  - Do NOT add footer (keep it minimal)
  - Do NOT add auth-related UI (login, user menu, etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout and navigation design requires visual taste and responsive design expertise
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout design, responsive patterns, color palette selection
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for layout creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 15, 16 (pages need the layout shell)
  - **Blocked By**: None (can start immediately — uses default Next.js scaffolding assumptions)

  **References**:

  **External References**:
  - Next.js App Router layouts: `https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates`
  - shadcn/ui theming: `https://ui.shadcn.com/docs/theming`
  - shadcn/ui dark mode: `https://ui.shadcn.com/docs/dark-mode/next`

  **WHY Each Reference Matters**:
  - Next.js layout docs show the root layout pattern and metadata API
  - shadcn theming docs show how to configure CSS variables for the color system
  - Dark mode requires specific provider setup with next-themes

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: App shell renders with navigation
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert page title contains "Brilliance"
      3. Assert navigation bar is visible (selector: `nav` or `header`)
      4. Assert "Brilliance" logo/text is visible in nav
      5. Assert theme toggle button exists
      6. Take screenshot
    Expected Result: Clean layout with nav bar, branding, and theme toggle
    Failure Indicators: Missing nav, broken layout, no theme toggle
    Evidence: .sisyphus/evidence/task-3-shell-render.png

  Scenario: Dark mode toggle works
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000
      2. Note current background color
      3. Click theme toggle button
      4. Assert background color has changed
      5. Take screenshot of dark mode
    Expected Result: Theme switches between light and dark
    Failure Indicators: No visual change on toggle, flash of unstyled content
    Evidence: .sisyphus/evidence/task-3-dark-mode.png

  Scenario: Route structure works
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000 — assert 200
      2. Navigate to http://localhost:3000/courses/test-course — assert page renders (even if placeholder)
      3. Navigate to http://localhost:3000/courses/test-course/lessons/test-lesson — assert page renders
    Expected Result: All routes resolve without 404
    Failure Indicators: 404 errors, runtime crashes
    Evidence: .sisyphus/evidence/task-3-routes.txt
  ```

  **Commit**: YES
  - Message: `feat(shell): add app layout, navigation, and theme`
  - Files: `src/app/layout.tsx`, `src/app/page.tsx`, route files
  - Pre-commit: `bun run build`

- [x] 4. Progress Tracking System

  **What to do**:
  - Create `src/lib/hooks/use-progress.ts` — main progress hook:
    ```typescript
    function useProgress(courseId: string): {
      progress: CourseProgress
      markScreenComplete: (lessonId: string, screenId: string, result: ScreenResult) => void
      getScreenResult: (lessonId: string, screenId: string) => ScreenResult | null
      getLessonProgress: (lessonId: string) => LessonProgress | null
      getCourseCompletionPercent: () => number
      resetProgress: () => void
    }
    ```
  - Use localStorage as backing store with SSR-safe pattern:
    - Initialize state from `initialValue` on server render
    - Hydrate from localStorage in `useEffect` on client
    - Write to localStorage on every state change
  - Create `src/lib/hooks/use-sticky-state.ts` — generic localStorage hook (SSR-safe)
  - Storage key format: `brilliance-progress-{courseId}`
  - Handle edge cases: corrupted localStorage data (catch JSON parse errors, reset to default), storage quota exceeded, private browsing mode
  - Track per-screen: `answeredCorrectly`, `attempts`, `hintsUsed`, `answeredAt`
  - Track per-lesson: `currentScreenIndex`, `completedAt`
  - Track per-course: `lastAccessedAt`, overall completion percentage

  **Must NOT do**:
  - Do NOT add server-side storage or database
  - Do NOT add user identification or auth
  - Do NOT add sync to any external service
  - Do NOT import the content schema (progress schema is defined independently in Task 2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-understood React hook pattern (localStorage + SSR). No visual design needed.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — this is data/state logic, not UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Tasks 14, 15 (lesson player and course page need progress tracking)
  - **Blocked By**: None (can start immediately — progress schema types can be defined inline or imported from Task 2 when available)

  **References**:

  **External References**:
  - Josh Comeau's useStickyState: `https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/` — SSR-safe localStorage pattern
  - React useReducer: `https://react.dev/reference/react/useReducer` — State machine pattern for complex state

  **WHY Each Reference Matters**:
  - Comeau's pattern solves the SSR hydration mismatch problem that breaks localStorage hooks in Next.js
  - useReducer handles complex state transitions (marking screens, computing completion) more reliably than nested setState calls

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Progress persists across page refresh
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, a test page that uses the progress hook
    Steps:
      1. Create a simple test page that renders progress state and has a "mark complete" button
      2. Navigate to test page
      3. Click "mark complete" button
      4. Assert completion state shows in UI
      5. Refresh the page (page.reload())
      6. Assert completion state is still visible after refresh
    Expected Result: Progress survives page refresh
    Failure Indicators: Progress resets on refresh, hydration mismatch errors in console
    Evidence: .sisyphus/evidence/task-4-persistence.png

  Scenario: Handles corrupted localStorage gracefully
    Tool: Bash (bun)
    Preconditions: Hook file exists
    Steps:
      1. Create a test script that: sets corrupted JSON in localStorage key, then calls the hook
      2. Assert hook returns default/empty progress (not crash)
      3. Assert localStorage is reset to valid state
    Expected Result: Graceful fallback to default state
    Failure Indicators: JSON parse error thrown, crash
    Evidence: .sisyphus/evidence/task-4-corrupted.txt
  ```

  **Commit**: YES
  - Message: `feat(progress): add localStorage-based progress tracking`
  - Files: `src/lib/hooks/use-progress.ts`, `src/lib/hooks/use-sticky-state.ts`
  - Pre-commit: `bun run build`

- [x] 5. UI Component Kit

  **What to do**:
  - Create `src/components/lesson/screen-container.tsx` — the main card wrapper for all screen types:
    - Full-width card with consistent padding, rounded corners, subtle shadow
    - Top: screen number indicator ("3 of 12")
    - Bottom: "Continue" / "Check Answer" / "Skip" button bar
    - Framer Motion `AnimatePresence` wrapper for entry/exit transitions
    - Accepts children (specific screen content) + callback props (`onNext`, `onCheck`, `onSkip`)
  - Create `src/components/lesson/feedback-overlay.tsx` — answer feedback component:
    - Correct: green background, checkmark icon, celebration animation (scale + fade)
    - Incorrect: red/orange background, X icon, subtle shake animation
    - Shows the `explanation` text from the screen schema
    - "Continue" button to proceed (correct) or "Try Again" button (incorrect)
  - Create `src/components/lesson/hint-drawer.tsx` — progressive hint system:
    - "Need a hint?" button that reveals hints one at a time
    - Each hint reveal shows the next hint in the array
    - Visual indicator of how many hints are left
    - Uses shadcn `Sheet` or custom drawer with Framer Motion slide-in
  - Create `src/components/lesson/progress-bar.tsx` — lesson progress indicator:
    - Thin bar at top of lesson view showing screen progress
    - Animated fill with Framer Motion `motion.div` width transitions
    - Shows completed/total count
  - Create `src/components/course/lesson-card.tsx` — lesson list item for course page:
    - shadcn Card with lesson title, description, screen count
    - Completion badge (checkmark if complete, progress if in-progress)
    - Click to navigate to lesson
  - All components should use shadcn primitives (Card, Button, Badge, etc.) where possible
  - All animations should use Framer Motion — no CSS keyframe animations

  **Must NOT do**:
  - Do NOT implement specific screen type logic (that's Tasks 9-13)
  - Do NOT add gamification elements (XP badges, streak counters, etc.)
  - Do NOT add custom icon library — use Lucide icons (included with shadcn)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: These are visual components requiring design taste, animation expertise, and attention to micro-interactions
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component design, animation patterns, visual feedback design
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for component creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Tasks 9, 10, 11, 12, 13 (all screen renderers use these components)
  - **Blocked By**: None (can start immediately — uses shadcn primitives which will be installed by Task 1)

  **References**:

  **External References**:
  - Framer Motion AnimatePresence: `https://motion.dev/docs/react-animate-presence` — Entry/exit animation pattern
  - Framer Motion layout animations: `https://motion.dev/docs/react-layout-animations` — Smooth layout transitions
  - shadcn Card: `https://ui.shadcn.com/docs/components/card` — Base card component
  - shadcn Sheet: `https://ui.shadcn.com/docs/components/sheet` — Drawer/slide-out panel for hints
  - Lucide icons: `https://lucide.dev/icons/` — Icon library included with shadcn

  **WHY Each Reference Matters**:
  - AnimatePresence is required for screen transition animations (enter/exit)
  - Layout animations make the progress bar width changes smooth
  - The screen container is built on shadcn Card — need to understand its API
  - Sheet component is the base for the hint drawer

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Screen container renders with progress and buttons
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, a test page rendering ScreenContainer
    Steps:
      1. Navigate to test page
      2. Assert screen number indicator visible ("1 of 5" or similar)
      3. Assert "Continue" or "Check Answer" button visible
      4. Assert card has rounded corners and padding
      5. Take screenshot
    Expected Result: Clean card layout with progress indicator and action buttons
    Failure Indicators: Missing elements, broken layout
    Evidence: .sisyphus/evidence/task-5-screen-container.png

  Scenario: Feedback overlay shows correct/incorrect states
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, test page with feedback trigger
    Steps:
      1. Trigger correct answer feedback
      2. Assert green background or success styling visible
      3. Assert checkmark icon or "Correct" text visible
      4. Assert explanation text visible
      5. Take screenshot of correct state
      6. Trigger incorrect answer feedback
      7. Assert red/orange styling visible
      8. Assert "Try Again" button visible
      9. Take screenshot of incorrect state
    Expected Result: Distinct, animated feedback for correct and incorrect
    Failure Indicators: No visual difference between correct/incorrect, missing explanation
    Evidence: .sisyphus/evidence/task-5-feedback-correct.png, .sisyphus/evidence/task-5-feedback-incorrect.png

  Scenario: Hint drawer reveals hints progressively
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, test page with hint drawer
    Steps:
      1. Assert "Need a hint?" button visible
      2. Click hint button — assert first hint text appears
      3. Assert hint counter shows "1 of 3" or similar
      4. Click again — assert second hint appears
      5. Assert previous hint still visible
    Expected Result: Hints reveal one at a time with visual counter
    Failure Indicators: All hints shown at once, counter not updating
    Evidence: .sisyphus/evidence/task-5-hints.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add base component kit for screen rendering`
  - Files: `src/components/lesson/screen-container.tsx`, `src/components/lesson/feedback-overlay.tsx`, `src/components/lesson/hint-drawer.tsx`, `src/components/lesson/progress-bar.tsx`, `src/components/course/lesson-card.tsx`
  - Pre-commit: `bun run build`

- [x] 6. Content Validation Layer

  **What to do**:
  - Create `src/lib/validation/content-validator.ts` — semantic validators beyond Zod parsing:
    - `validateMultipleChoice(screen)`: Exactly one option has `isCorrect: true`. At least 2 options. No duplicate option text.
    - `validateFillInBlank(screen)`: Prompt contains at least one `{{blank}}` marker. Number of markers matches `blanks` array length. Each blank has at least one `acceptedAnswer`.
    - `validateOrdering(screen)`: At least 2 items. `correctOrder` array contains exactly the same IDs as `items` array. No duplicate IDs.
    - `validateCodeBlock(screen)`: At least one test case. `starterCode` is non-empty. `language` is a supported value.
    - `validateLesson(lesson)`: At least 2 screens. First screen should be `explanation` type (warning, not error). No duplicate screen IDs.
    - `validateCourse(course)`: At least 1 module with 1 lesson. No duplicate IDs at any level. All `prerequisiteLessonIds` reference existing lessons.
  - Each validator returns `{ valid: boolean, errors: string[], warnings: string[] }`
  - Create `validateContent(course: Course): ValidationResult` — runs all validators, aggregates results
  - Warnings vs errors: errors prevent rendering, warnings are informational (e.g., "first screen isn't explanation type")

  **Must NOT do**:
  - Do NOT add LLM-based validation (that's a future feature)
  - Do NOT make validation block content loading — validate and report, let the UI decide

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward validation logic with clear rules — no creative problem-solving
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable — pure logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9-13)
  - **Blocks**: Tasks 17, 18 (seed course and authoring guide need validation)
  - **Blocked By**: Task 2 (needs schema types)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (from Task 2) — Schema types to validate against

  **WHY Each Reference Matters**:
  - Validators operate on the parsed types from the schema — need exact field names and shapes

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Catches MCQ with zero correct answers
    Tool: Bash (bun)
    Preconditions: Validator and schema exist
    Steps:
      1. Create a MultipleChoiceScreen with all options having isCorrect: false
      2. Run validateMultipleChoice()
      3. Assert result.valid === false
      4. Assert result.errors includes message about missing correct answer
    Expected Result: Validation fails with descriptive error
    Failure Indicators: Validation passes, or error message is vague
    Evidence: .sisyphus/evidence/task-6-mcq-no-correct.txt

  Scenario: Catches ordering with duplicate IDs
    Tool: Bash (bun)
    Steps:
      1. Create an OrderingScreen where correctOrder has IDs not in items
      2. Run validateOrdering()
      3. Assert result.valid === false
    Expected Result: Validation catches ID mismatch
    Evidence: .sisyphus/evidence/task-6-ordering-ids.txt

  Scenario: Valid course passes all validation
    Tool: Bash (bun)
    Steps:
      1. Create a fully valid course object
      2. Run validateContent()
      3. Assert result.valid === true and result.errors.length === 0
    Expected Result: Valid content passes without errors
    Evidence: .sisyphus/evidence/task-6-valid-course.txt
  ```

  **Commit**: YES
  - Message: `feat(validation): add semantic content validation beyond Zod`
  - Files: `src/lib/validation/content-validator.ts`
  - Pre-commit: `bun run build`

- [x] 7. Content Loader

  **What to do**:
  - Create `src/lib/content/loader.ts` — filesystem content loading:
    - `getCourses(): Promise<CourseMeta[]>` — list all courses from `src/content/courses/` directory. Returns metadata only (id, title, description, module count, lesson count).
    - `getCourse(courseId: string): Promise<Course>` — load full course JSON from `src/content/courses/{courseId}/course.json`, validate with Zod schema, return parsed result
    - `getLesson(courseId: string, lessonId: string): Promise<Lesson>` — extract specific lesson from course data
  - Content is stored as JSON files: `src/content/courses/{course-id}/course.json`
  - On load: parse with `CourseSchema.safeParse()`, run content validators, log warnings
  - Handle errors gracefully: file not found → throw descriptive error, invalid JSON → throw with Zod error details
  - Create `src/content/courses/.gitkeep` placeholder
  - Make sure the loader works with Next.js server components (no `'use client'`, no browser APIs)

  **Must NOT do**:
  - Do NOT add caching layer (premature optimization for v1)
  - Do NOT add database or API — read directly from filesystem
  - Do NOT add hot-reloading of content files (Next.js dev server handles this via HMR)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward file I/O + Zod parsing — well-understood pattern
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable — server-side data loading

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9-13)
  - **Blocks**: Tasks 14, 15, 16 (lesson player and pages need content loading)
  - **Blocked By**: Task 2 (needs schema types)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (from Task 2) — Schema for parsing/validation

  **External References**:
  - Next.js data fetching: `https://nextjs.org/docs/app/building-your-application/data-fetching/fetching` — Server component data loading patterns

  **WHY Each Reference Matters**:
  - Content loader runs in server components — must follow Next.js patterns (no hooks, no browser APIs)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Loads a valid course file
    Tool: Bash (bun)
    Preconditions: A valid course JSON exists in src/content/courses/test-course/course.json
    Steps:
      1. Call getCourse('test-course')
      2. Assert returned object matches Course type
      3. Assert modules and lessons are present
    Expected Result: Course loaded and validated successfully
    Failure Indicators: Parse error, missing fields
    Evidence: .sisyphus/evidence/task-7-load-course.txt

  Scenario: Returns descriptive error for missing course
    Tool: Bash (bun)
    Steps:
      1. Call getCourse('nonexistent-course')
      2. Assert error is thrown with message containing "not found" or similar
    Expected Result: Clear error message, not generic ENOENT
    Failure Indicators: Cryptic error message, unhandled promise rejection
    Evidence: .sisyphus/evidence/task-7-missing-course.txt
  ```

  **Commit**: YES
  - Message: `feat(loader): add filesystem content loader with Zod validation`
  - Files: `src/lib/content/loader.ts`
  - Pre-commit: `bun run build`

- [x] 8. Claude Agent SDK Integration + API Route

  **What to do**:
  - Create `src/lib/claude/client.ts` — Claude Agent SDK client setup:
    - Initialize the Claude Agent SDK with OAuth authentication (Pro/Max subscription)
    - The SDK authenticates using the user's Claude subscription — follow the same pattern as Claude Code CLI authentication
    - Create a wrapper that provides content generation capabilities
    - Research and implement the correct authentication flow for the Claude Agent SDK with a consumer subscription (the SDK docs at `https://platform.claude.com/docs/en/agent-sdk/overview` should clarify)
    - If the Agent SDK requires API keys rather than subscription OAuth, fall back to the standard `@anthropic-ai/sdk` package with structured output (tool_use) — the user may need to configure an API key in this case, but prefer subscription auth if possible
  - Create `src/app/api/adapt/hint/route.ts` — hint generation API:
    - POST endpoint: accepts `{ courseId, lessonId, screenId, userAnswer, screenData }`
    - Uses Claude to generate a contextual hint based on what the user got wrong
    - Returns `{ hint: string }` — tailored to the specific mistake
    - Validates request body with Zod
  - Create `src/app/api/adapt/explain/route.ts` — explanation generation API:
    - POST endpoint: accepts `{ courseId, lessonId, screenId, userAnswer, correctAnswer, screenData }`
    - Uses Claude to generate a personalized explanation of WHY the answer is wrong and HOW to think about it correctly
    - Returns `{ explanation: string }` — more detailed than the static explanation in the schema
  - Create `src/app/api/adapt/difficulty/route.ts` — difficulty adjustment API:
    - POST endpoint: accepts `{ courseId, lessonId, recentResults: ScreenResult[] }`
    - Uses Claude to analyze performance and suggest whether to: continue, review earlier content, or skip ahead
    - Returns `{ recommendation: 'continue' | 'review' | 'skip', message: string, targetLessonId?: string }`
  - All API routes must handle errors gracefully (Claude API unavailable → return fallback response, not crash)
  - All API routes must include proper system prompts that give Claude context about the course, lesson, and screen

  **Must NOT do**:
  - Do NOT build a full agent with autonomous tool use — these are simple structured generation calls
  - Do NOT store any data server-side (no sessions, no user tracking)
  - Do NOT expose the API publicly — these are internal API routes

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Claude Agent SDK integration requires research into auth flows, SDK patterns, and building reliable API routes. Non-trivial debugging potential.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable — server-side only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9-13)
  - **Blocks**: Task 19 (live adaptation engine needs these API routes)
  - **Blocked By**: Tasks 1, 2 (needs project initialized and schema types)

  **References**:

  **External References**:
  - Claude Agent SDK: `https://platform.claude.com/docs/en/agent-sdk/overview` — Official documentation
  - Claude Agent SDK npm: `https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk` — Package reference
  - Next.js Route Handlers: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` — API route patterns

  **WHY Each Reference Matters**:
  - The SDK docs define the correct authentication flow — CRITICAL to get right
  - Route Handlers docs show how to properly create POST endpoints in App Router

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Hint API returns contextual hint
    Tool: Bash (curl)
    Preconditions: Dev server running, Claude auth configured in .env.local
    Steps:
      1. curl -X POST http://localhost:3000/api/adapt/hint \
         -H "Content-Type: application/json" \
         -d '{"courseId":"calendar-trick","lessonId":"lesson-1","screenId":"screen-3","userAnswer":"Tuesday","screenData":{"type":"fill_in_blank","prompt":"What day was January 1, 2023?"}}'
      2. Assert HTTP status 200
      3. Assert response body contains `hint` field
      4. Assert hint is a non-empty string
    Expected Result: Contextual hint returned as JSON
    Failure Indicators: 500 error, empty response, auth failure
    Evidence: .sisyphus/evidence/task-8-hint-api.txt

  Scenario: API handles missing Claude auth gracefully
    Tool: Bash (curl)
    Preconditions: Dev server running, NO Claude auth configured
    Steps:
      1. Unset ANTHROPIC_AUTH_TOKEN
      2. curl -X POST http://localhost:3000/api/adapt/hint with valid body
      3. Assert HTTP status is 503 or response includes fallback message
    Expected Result: Graceful error response, not crash
    Failure Indicators: 500 Internal Server Error, server crash
    Evidence: .sisyphus/evidence/task-8-no-auth.txt
  ```

  **Commit**: YES
  - Message: `feat(claude): integrate Claude Agent SDK for content generation`
  - Files: `src/lib/claude/client.ts`, `src/app/api/adapt/hint/route.ts`, `src/app/api/adapt/explain/route.ts`, `src/app/api/adapt/difficulty/route.ts`
  - Pre-commit: `bun run build`

- [x] 9. Explanation Screen Renderer

  **What to do**:
  - Create `src/components/screens/explanation-screen.tsx` — renders explanation screen type:
    - Displays `title` as heading
    - Renders `content` as rich text (support basic markdown: bold, italic, lists, code blocks, headers)
    - Use a lightweight markdown renderer (e.g., `react-markdown` or simple regex-based for v1)
    - If `callout` field exists, render it in a highlighted callout box (like a tip or key insight)
    - Bottom: "Got it!" button that advances to next screen
    - This is the ONLY screen type that doesn't require an answer — but it DOES require the learner to acknowledge ("Got it!")
  - Create `src/components/screens/screen-renderer.tsx` — the screen type dispatcher:
    - Accepts a `Screen` type (discriminated union)
    - Switches on `screen.type` and renders the appropriate component
    - This is the central registry — all screen renderers plug into this
    - Pass common props: `onComplete`, `onHintRequest`, screen data

  **Must NOT do**:
  - Do NOT add full MDX support (too complex for v1 — stick with basic markdown)
  - Do NOT add image rendering (text and code only for v1)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Text rendering with typography, callout design, and visual polish
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Typography, content layout, callout box design
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for component creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 10-13)
  - **Blocks**: Task 14 (lesson player needs all screen renderers)
  - **Blocked By**: Tasks 2, 5 (needs schema types and UI component kit)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — ExplanationScreenSchema shape
  - `src/components/lesson/screen-container.tsx` (Task 5) — Wrapper component

  **External References**:
  - react-markdown: `https://github.com/remarkjs/react-markdown` — Markdown rendering in React

  **WHY Each Reference Matters**:
  - Schema defines exactly what fields the renderer receives
  - ScreenContainer provides the card wrapper and button bar — this component fills the content area

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Explanation screen renders content
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, test page with an explanation screen
    Steps:
      1. Navigate to test page
      2. Assert title heading is visible
      3. Assert content text is rendered (not raw markdown)
      4. Assert "Got it!" button is visible
      5. Click "Got it!" — assert onComplete callback fires
      6. Take screenshot
    Expected Result: Clean explanation with rendered markdown and action button
    Failure Indicators: Raw markdown visible, missing button, broken layout
    Evidence: .sisyphus/evidence/task-9-explanation.png

  Scenario: Screen renderer dispatches correct component
    Tool: Playwright (playwright skill)
    Steps:
      1. Render ScreenRenderer with type: 'explanation' — assert explanation content appears
      2. Render ScreenRenderer with type: 'multiple_choice' — assert quiz options appear
    Expected Result: Correct component rendered for each screen type
    Failure Indicators: Wrong component, crash on unknown type
    Evidence: .sisyphus/evidence/task-9-dispatcher.png
  ```

  **Commit**: YES (groups with Tasks 10-13)
  - Message: `feat(screens): add all 5 screen type renderers`
  - Files: `src/components/screens/explanation-screen.tsx`, `src/components/screens/screen-renderer.tsx`
  - Pre-commit: `bun run build`

- [x] 10. Multiple Choice Screen Renderer

  **What to do**:
  - Create `src/components/screens/multiple-choice-screen.tsx`:
    - Display `question` text prominently
    - Render options as selectable cards/buttons (one per option)
    - On option select: highlight selected option (primary border/background)
    - "Check Answer" button appears after selection
    - On check: compare selected option to correct answer
      - Correct: show FeedbackOverlay with success state + explanation
      - Incorrect: shake animation on selected option, show FeedbackOverlay with error state + explanation, let user try again
    - Track attempts in component state
    - After correct answer (or max 3 attempts): show "Continue" to advance
    - Hint button available that triggers HintDrawer with progressive hints
    - Visual design: options should look like tappable cards, not radio buttons. Each option is a shadcn Card with hover effect and selectable state.

  **Must NOT do**:
  - Do NOT support multiple correct answers (single correct only for v1)
  - Do NOT add timer or time-based scoring

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive quiz UI with selection states, feedback animations, and polished UX
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Interactive selection UI, state management, feedback animation design
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for component creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-9, 11-13)
  - **Blocks**: Task 14 (lesson player needs all screen renderers)
  - **Blocked By**: Tasks 2, 5 (needs schema types and UI component kit)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — MultipleChoiceScreenSchema shape
  - `src/components/lesson/screen-container.tsx` (Task 5) — Card wrapper
  - `src/components/lesson/feedback-overlay.tsx` (Task 5) — Answer feedback
  - `src/components/lesson/hint-drawer.tsx` (Task 5) — Hint system

  **WHY Each Reference Matters**:
  - Schema defines the options array and isCorrect flags
  - FeedbackOverlay is used for correct/incorrect states
  - HintDrawer provides the progressive hint reveal

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Correct answer flow
    Tool: Playwright (playwright skill)
    Steps:
      1. Render MC screen with known correct answer (option B)
      2. Click option B — assert it's visually selected
      3. Click "Check Answer"
      4. Assert success feedback overlay appears with green styling
      5. Assert explanation text is visible
      6. Click "Continue"
      7. Assert onComplete callback fires with result { answeredCorrectly: true, attempts: 1 }
    Expected Result: Smooth correct answer flow with feedback
    Evidence: .sisyphus/evidence/task-10-correct.png

  Scenario: Incorrect answer with retry
    Tool: Playwright (playwright skill)
    Steps:
      1. Render MC screen with known correct answer (option B)
      2. Click option A (wrong) — click "Check Answer"
      3. Assert error feedback overlay with shake animation
      4. Assert "Try Again" button visible
      5. Click "Try Again" — select option B — click "Check Answer"
      6. Assert success feedback
      7. Assert result shows attempts: 2
    Expected Result: Retry allowed with attempt tracking
    Evidence: .sisyphus/evidence/task-10-retry.png
  ```

  **Commit**: YES (groups with Tasks 9, 11-13)
  - Files: `src/components/screens/multiple-choice-screen.tsx`

- [x] 11. Fill-in-the-Blank Screen Renderer

  **What to do**:
  - Create `src/components/screens/fill-in-blank-screen.tsx`:
    - Render `prompt` text with `{{blank}}` markers replaced by input fields
    - Each blank becomes a text input (inline or below the prompt)
    - Input styling: underlined with subtle animation on focus
    - "Check Answer" button validates all blanks
    - Validation: compare user input to `acceptedAnswers` array for each blank
      - Case sensitivity controlled by `caseSensitive` field per blank
      - Trim whitespace before comparison
    - Correct: show FeedbackOverlay success + explanation
    - Incorrect: highlight wrong blanks in red, show FeedbackOverlay error + explanation
    - Support numeric and text answers
    - Progressive hints available via HintDrawer

  **Must NOT do**:
  - Do NOT add autocomplete or suggestions
  - Do NOT add regex-based answer matching (exact match + accepted alternatives only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Inline input rendering, text replacement, validation UX
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Inline form design, input validation UX
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10, 12-13)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 5

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — FillInBlankScreenSchema shape
  - `src/components/lesson/feedback-overlay.tsx` (Task 5) — Feedback component
  - `src/components/lesson/hint-drawer.tsx` (Task 5) — Hint system

  **WHY Each Reference Matters**:
  - Schema defines the `{{blank}}` marker format and `blanks` array with `acceptedAnswers`
  - Must parse the prompt string and replace markers with input components

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Correct answer accepted (case insensitive)
    Tool: Playwright (playwright skill)
    Steps:
      1. Render fill-in-blank with prompt "The day is {{blank}}" and acceptedAnswers: ["Monday"]
      2. Type "monday" (lowercase) in the blank
      3. Click "Check Answer"
      4. Assert success feedback (case insensitive should accept "monday")
    Expected Result: Case-insensitive match succeeds
    Evidence: .sisyphus/evidence/task-11-case-insensitive.png

  Scenario: Wrong answer shows which blank is wrong
    Tool: Playwright (playwright skill)
    Steps:
      1. Render screen with 2 blanks
      2. Enter correct answer in first blank, wrong in second
      3. Click "Check Answer"
      4. Assert second blank is highlighted in red
      5. Assert first blank is NOT highlighted in red
    Expected Result: Per-blank error indication
    Evidence: .sisyphus/evidence/task-11-wrong-blank.png
  ```

  **Commit**: YES (groups with Tasks 9, 10, 12-13)
  - Files: `src/components/screens/fill-in-blank-screen.tsx`

- [x] 12. Ordering Screen Renderer

  **What to do**:
  - Create `src/components/screens/ordering-screen.tsx`:
    - Display `instruction` text
    - Render `items` as a vertical list of draggable cards
    - Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop reordering
    - Items start in randomized order (shuffle on mount, but deterministic from screen ID for consistency)
    - Each item is a card with a drag handle (grip icon) on the left and text on the right
    - "Check Answer" button compares current order to `correctOrder` array
    - Correct: success feedback + explanation
    - Incorrect: highlight items in wrong positions (red border), show feedback
    - Smooth reorder animation via @dnd-kit's built-in transitions
    - Keyboard accessible: use @dnd-kit keyboard sensor for arrow key reordering
    - Progressive hints available

  **Must NOT do**:
  - Do NOT implement horizontal drag-and-drop (vertical list only)
  - Do NOT add drag between multiple lists (single sortable list only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Drag-and-drop is a complex interaction pattern requiring smooth animations and accessibility
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: DnD interaction design, animation, accessibility
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-11, 13)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 5

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — OrderingScreenSchema shape

  **External References**:
  - @dnd-kit sortable: `https://docs.dndkit.com/presets/sortable` — Sortable preset for reorderable lists
  - @dnd-kit accessibility: `https://docs.dndkit.com/api-documentation/sensors/keyboard` — Keyboard sensor for a11y

  **WHY Each Reference Matters**:
  - @dnd-kit sortable preset handles the complex parts: collision detection, animation, and DOM management
  - Keyboard sensor is required for accessibility — drag-and-drop must work without a mouse

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Drag items into correct order
    Tool: Playwright (playwright skill)
    Steps:
      1. Render ordering screen with items ["C", "A", "B"] and correctOrder: ["A", "B", "C"]
      2. Drag item "A" to position 1 (top)
      3. Drag item "B" to position 2
      4. Click "Check Answer"
      5. Assert success feedback appears
    Expected Result: Correct order recognized, success shown
    Failure Indicators: Order check fails despite correct arrangement, drag doesn't work
    Evidence: .sisyphus/evidence/task-12-correct-order.png

  Scenario: Wrong order highlights incorrect items
    Tool: Playwright (playwright skill)
    Steps:
      1. Render ordering screen, leave in initial (wrong) order
      2. Click "Check Answer"
      3. Assert items in wrong positions have red highlighting
      4. Assert error feedback appears
    Expected Result: Wrong items visually indicated
    Evidence: .sisyphus/evidence/task-12-wrong-order.png
  ```

  **Commit**: YES (groups with Tasks 9-11, 13)
  - Files: `src/components/screens/ordering-screen.tsx`

- [x] 13. Code Block Screen Renderer

  **What to do**:
  - Create `src/components/screens/code-block-screen.tsx`:
    - Display `instruction` text explaining what the learner should code
    - Code editor area: use a `textarea` with monospace font and basic styling (NOT a full Monaco/CodeMirror editor — too heavy for v1)
    - Pre-fill editor with `starterCode`
    - Syntax highlighting: use a lightweight approach — either `prism-react-renderer` for display or just styled monospace
    - "Run Code" / "Check Answer" button that validates the user's code against `testCases`
    - For v1 validation: simple string comparison of output
      - Create a `src/lib/code/evaluator.ts` that:
        - For JavaScript/TypeScript: uses `new Function()` to execute in a sandboxed scope (with try/catch)
        - For other languages: compare expected output via string matching (limited but functional for v1)
      - Each test case: `{ input: string, expectedOutput: string }`
      - Run all test cases, show pass/fail for each
    - Display test results: green check for passed, red X for failed, with actual vs expected output
    - Progressive hints available
    - Line numbers in the editor
    - Tab key inserts 2 spaces (not focus change)

  **Must NOT do**:
  - Do NOT add full IDE features (autocomplete, linting, intellisense)
  - Do NOT add support for running arbitrary languages server-side (client-side JS/TS execution only for v1)
  - Do NOT add WebContainer/Sandpack (too complex for v1)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Code editor UX, test result display, and safe code execution
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Editor UX, result display design
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-12)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 5

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — CodeBlockScreenSchema shape

  **External References**:
  - prism-react-renderer: `https://github.com/FormidableLabs/prism-react-renderer` — Lightweight syntax highlighting

  **WHY Each Reference Matters**:
  - prism-react-renderer adds syntax highlighting without the weight of a full editor like Monaco

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Correct code passes test cases
    Tool: Playwright (playwright skill)
    Steps:
      1. Render code block with starterCode "function add(a, b) { return }" and testCase {input: "add(2,3)", expectedOutput: "5"}
      2. Edit code to "function add(a, b) { return a + b }"
      3. Click "Check Answer"
      4. Assert test case shows green check
      5. Assert success feedback
    Expected Result: Code evaluated, test passes
    Failure Indicators: Execution error, wrong comparison, security issue
    Evidence: .sisyphus/evidence/task-13-correct-code.png

  Scenario: Wrong code shows failing tests
    Tool: Playwright (playwright skill)
    Steps:
      1. Leave starterCode as-is (incomplete)
      2. Click "Check Answer"
      3. Assert test case shows red X
      4. Assert actual vs expected output displayed
    Expected Result: Clear indication of what failed and why
    Evidence: .sisyphus/evidence/task-13-wrong-code.png
  ```

  **Commit**: YES (groups with Tasks 9-12)
  - Message: `feat(screens): add all 5 screen type renderers`
  - Files: `src/components/screens/code-block-screen.tsx`, `src/lib/code/evaluator.ts`
  - Pre-commit: `bun run build`

- [x] 14. Lesson Player

  **What to do**:
  - Create `src/components/lesson/lesson-player.tsx` — the central learning experience:
    - Receives a `Lesson` object (array of screens)
    - Manages current screen index as state
    - Renders current screen via `ScreenRenderer` (from Task 9)
    - Wraps each screen in `ScreenContainer` (from Task 5)
    - Screen transitions: Framer Motion `AnimatePresence` with horizontal slide animation (new screen slides in from right, old screen slides out to left)
    - Progress bar at top showing current screen / total screens
    - On screen complete: update progress (via useProgress from Task 4), advance to next screen
    - On last screen complete: show lesson completion state (celebration animation, "Back to Course" button)
    - Track per-screen results (correct/incorrect, attempts, hints used)
    - Support keyboard navigation: Enter to submit/advance, Tab for options
    - On hint request: call the live adaptation API (Task 8) if configured, otherwise use static hints from screen data
    - Handle edge cases: browser back button (confirm "leave lesson?"), page refresh (resume from last screen via progress state)
  - Create `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx` — lesson page:
    - Server component that loads lesson data via content loader (Task 7)
    - Passes lesson to LessonPlayer client component
    - Shows error state if lesson not found

  **Must NOT do**:
  - Do NOT add lesson-to-lesson navigation (learner navigates back to course page between lessons)
  - Do NOT add a sidebar or table of contents within lessons
  - Do NOT add keyboard shortcuts beyond basic Enter/Tab

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: The lesson player is the core product experience — orchestrating screen sequencing, transitions, progress tracking, and state management. Complex state machine with many edge cases.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Transition design, user flow, responsive layout within the player
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation (used in QA)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 16, 17, 18)
  - **Blocks**: Tasks 19, 20, 21 (adaptation, animations, and polish depend on the player)
  - **Blocked By**: Tasks 4, 7, 9-13 (needs progress hooks, content loader, and all screen renderers)

  **References**:

  **Pattern References**:
  - `src/components/screens/screen-renderer.tsx` (Task 9) — Screen type dispatcher
  - `src/components/lesson/screen-container.tsx` (Task 5) — Card wrapper
  - `src/components/lesson/progress-bar.tsx` (Task 5) — Progress indicator
  - `src/components/lesson/feedback-overlay.tsx` (Task 5) — Answer feedback
  - `src/lib/hooks/use-progress.ts` (Task 4) — Progress tracking hook
  - `src/lib/content/loader.ts` (Task 7) — Content loading

  **External References**:
  - Framer Motion AnimatePresence: `https://motion.dev/docs/react-animate-presence` — Screen transitions
  - React useReducer: `https://react.dev/reference/react/useReducer` — State machine for lesson state

  **WHY Each Reference Matters**:
  - AnimatePresence enables the enter/exit transition between screens — the core visual experience
  - The lesson player is essentially a state machine: current screen → user interacts → advance/retry → next screen → lesson complete. useReducer models this cleanly.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Complete a full lesson end-to-end
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, seed course loaded with at least one lesson
    Steps:
      1. Navigate to a lesson page
      2. Assert first screen renders (explanation type)
      3. Click "Got it!" to advance
      4. Assert second screen renders (different type)
      5. Complete the screen (answer quiz, fill blanks, etc.)
      6. Assert progress bar updates
      7. Continue through all screens
      8. Assert lesson completion celebration appears on last screen
      9. Assert "Back to Course" button visible
      10. Take screenshot of completion state
    Expected Result: Full lesson playthrough with smooth transitions and progress tracking
    Failure Indicators: Stuck on a screen, progress not updating, crash on screen change
    Evidence: .sisyphus/evidence/task-14-full-lesson.png

  Scenario: Progress persists across refresh
    Tool: Playwright (playwright skill)
    Steps:
      1. Start a lesson, complete 3 screens
      2. Refresh the page
      3. Assert lesson resumes from screen 4 (not screen 1)
    Expected Result: Progress survives refresh
    Failure Indicators: Resets to beginning
    Evidence: .sisyphus/evidence/task-14-refresh-resume.png

  Scenario: Screen transitions animate smoothly
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to lesson
      2. Complete first screen
      3. Observe/screenshot the transition between screens
      4. Assert new screen slides in from the right
    Expected Result: Smooth horizontal slide transition
    Failure Indicators: Abrupt change, no animation, layout jump
    Evidence: .sisyphus/evidence/task-14-transition.png
  ```

  **Commit**: YES
  - Message: `feat(player): add lesson player with screen sequencing and transitions`
  - Files: `src/components/lesson/lesson-player.tsx`, `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`
  - Pre-commit: `bun run build`

- [x] 15. Course Overview Page

  **What to do**:
  - Build out `src/app/courses/[courseId]/page.tsx` — course overview:
    - Server component: load course via `getCourse(courseId)` from content loader
    - Display course title, description prominently
    - Show module structure: each module as a section header with its lessons listed below
    - Each lesson rendered as a `LessonCard` (from Task 5):
      - Title, description, screen count, estimated time (screen count × ~1 min)
      - Completion state: not started / in progress / completed (from useProgress)
      - Click navigates to `/courses/{courseId}/lessons/{lessonId}`
    - Overall course progress bar at the top
    - Prerequisite handling: if a lesson has `prerequisiteLessonIds`, show a lock icon if prerequisites aren't completed (but don't hard-block — let user click through with a warning)
    - Clean, spacious layout — one column of lesson cards

  **Must NOT do**:
  - Do NOT hard-block lessons behind prerequisites (show warning, allow override)
  - Do NOT add a rating or review system

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Page layout with progress visualization and lesson cards
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Page layout, card grid design, progress visualization
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 16, 17, 18)
  - **Blocks**: Task 21 (responsive polish)
  - **Blocked By**: Tasks 3, 4, 7 (needs layout shell, progress hooks, content loader)

  **References**:

  **Pattern References**:
  - `src/app/layout.tsx` (Task 3) — Layout wrapper
  - `src/lib/content/loader.ts` (Task 7) — Course data loading
  - `src/lib/hooks/use-progress.ts` (Task 4) — Progress state
  - `src/components/course/lesson-card.tsx` (Task 5) — Lesson card component

  **WHY Each Reference Matters**:
  - The page is a server component that loads data, then hands off to client components for interactivity (progress, click handling)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Course page displays all lessons
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, seed course loaded
    Steps:
      1. Navigate to /courses/calendar-trick
      2. Assert course title is visible
      3. Assert at least 3 lesson cards are visible
      4. Assert each card shows title, description, screen count
      5. Assert progress bar is visible at top
      6. Take screenshot
    Expected Result: Course overview with all lessons displayed
    Failure Indicators: Missing lessons, 404, broken layout
    Evidence: .sisyphus/evidence/task-15-course-page.png

  Scenario: Lesson card navigates to lesson
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to course page
      2. Click on first lesson card
      3. Assert URL changes to /courses/calendar-trick/lessons/{lessonId}
      4. Assert lesson player renders
    Expected Result: Smooth navigation to lesson
    Evidence: .sisyphus/evidence/task-15-navigation.png
  ```

  **Commit**: YES (groups with Task 16)
  - Message: `feat(pages): add course overview and home pages`
  - Files: `src/app/courses/[courseId]/page.tsx`

- [x] 16. Home Page / Course Catalog

  **What to do**:
  - Build out `src/app/page.tsx` — the home page:
    - Hero section: "Brilliance" branding, tagline ("Master concepts through interactive lessons crafted by AI"), brief description
    - Course catalog: grid of course cards (2 columns on desktop, 1 on mobile)
    - Each course card shows: title, description, module/lesson count, difficulty level, completion progress (if started)
    - Uses `getCourses()` from content loader to get course list
    - Server component for data loading, with client components for interactive elements
    - Empty state: "No courses yet. Create your first course with the authoring guide!" with link to authoring docs
    - Clean, inviting design — this is the first thing a learner sees

  **Must NOT do**:
  - Do NOT add search or filtering (only a few courses for v1)
  - Do NOT add categories or tags UI
  - Do NOT add a "featured" or "recommended" section

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Landing page design, course card grid, responsive layout
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Landing page design, grid layout, visual hierarchy
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 15, 17, 18)
  - **Blocks**: Task 21 (responsive polish)
  - **Blocked By**: Tasks 3, 7 (needs layout shell and content loader)

  **References**:

  **Pattern References**:
  - `src/app/layout.tsx` (Task 3) — Layout wrapper
  - `src/lib/content/loader.ts` (Task 7) — Course listing

  **WHY Each Reference Matters**:
  - Home page lives inside the root layout
  - Course listing comes from the content loader's `getCourses()` function

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Home page shows course catalog
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, seed course loaded
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert "Brilliance" branding visible
      3. Assert at least one course card visible
      4. Assert course card shows title, description
      5. Click course card — assert navigation to course page
      6. Take screenshot
    Expected Result: Inviting home page with course catalog
    Failure Indicators: Empty page, missing courses, broken layout
    Evidence: .sisyphus/evidence/task-16-home.png

  Scenario: Empty state when no courses exist
    Tool: Playwright (playwright skill)
    Steps:
      1. Remove all course JSON files temporarily
      2. Navigate to home page
      3. Assert empty state message visible
    Expected Result: Friendly empty state, not error
    Evidence: .sisyphus/evidence/task-16-empty.png
  ```

  **Commit**: YES (groups with Task 15)
  - Message: `feat(pages): add course overview and home pages`
  - Files: `src/app/page.tsx`
  - Pre-commit: `bun run build`

- [x] 17. Seed Course: "Calendar in Your Head"

  **What to do**:
  - Create `src/content/courses/calendar-trick/course.json` — the complete seed course:
  - **Course concept**: Teach the Doomsday Algorithm for mental day-of-week calculation
  - **Structure**: 3 modules, each with 2-3 lessons, each lesson 8-12 screens
  - **Module 1: Foundation** (understanding the building blocks)
    - Lesson 1: "Days and Numbers" — Map days to numbers (Sun=0, Mon=1...Sat=6), practice with multiple choice
    - Lesson 2: "Century Codes" — Memorize century anchor codes (1900→0, 2000→6), practice with fill-in-blank
  - **Module 2: The Algorithm** (step by step method)
    - Lesson 3: "Year Codes Made Easy" — Calculate year code from last two digits, practice calculation steps with fill-in-blank
    - Lesson 4: "Month Codes" — Memorize month codes with mnemonics, practice with multiple choice and fill-in-blank
    - Lesson 5: "Putting It All Together" — The full formula: (century + year + month + day) mod 7, step-by-step walkthrough with ordering (arrange the steps), practice with fill-in-blank
  - **Module 3: Mastery** (speed and fluency)
    - Lesson 6: "Speed Drills" — Random dates, fill-in-blank answers, increasing difficulty
    - Lesson 7: "Party Tricks" — Fun applications (birthdays, historical dates), mixed question types
  - **Pedagogical approach**: Follow Brilliant's principles:
    - Start with a hook: "What day of the week were you born?" (ask before explaining)
    - Build intuition before formalism: show patterns before naming the algorithm
    - Each screen requires action — no passive reading
    - Progressive difficulty within each lesson
    - Hints are progressive: nudge → method hint → near-answer
  - Validate the entire course JSON against the schema and content validators
  - This course must be CORRECT — all day-of-week calculations must be mathematically accurate

  **Must NOT do**:
  - Do NOT use images or external assets
  - Do NOT create more than 7 lessons (keep it focused)
  - Do NOT include content that requires the live adaptation API to function

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: Creating engaging educational content requires creative problem-solving — the course needs to be pedagogically sound, mathematically correct, and entertaining. This is content design, not just JSON generation.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable — this is content authoring, not UI
    - `playwright`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 15, 16, 18)
  - **Blocks**: None (but used by all verification tasks)
  - **Blocked By**: Tasks 2, 6 (needs schema types and validators to ensure correctness)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — Schema the course JSON must match

  **External References**:
  - Doomsday Algorithm: `https://en.wikipedia.org/wiki/Doomsday_rule` — The mental calculation method
  - Doomsday Algorithm tutorial: `https://www.timeanddate.com/date/doomsday-rule.html` — Step-by-step explanation

  **WHY Each Reference Matters**:
  - Wikipedia article explains the full Doomsday Algorithm with mathematical proofs — must be 100% accurate
  - timeanddate.com has a simplified step-by-step that's more learner-friendly

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Course JSON validates against schema
    Tool: Bash (bun)
    Steps:
      1. Import CourseSchema and course JSON
      2. Run CourseSchema.parse(courseJson)
      3. Run validateContent(courseJson)
      4. Assert zero errors
    Expected Result: Course passes all validation
    Failure Indicators: Zod errors, semantic validation failures
    Evidence: .sisyphus/evidence/task-17-validation.txt

  Scenario: Mathematical correctness of day-of-week answers
    Tool: Bash (bun)
    Steps:
      1. Extract all fill-in-blank screens that ask for day-of-week
      2. For each: compute the correct day using JavaScript's Date object
      3. Compare to the acceptedAnswers in the course JSON
      4. Assert 100% match
    Expected Result: Every day-of-week answer is mathematically correct
    Failure Indicators: Any mismatch between schema answer and actual day of week
    Evidence: .sisyphus/evidence/task-17-math-check.txt

  Scenario: Course renders in the app
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to home page — assert "Calendar in Your Head" course card visible
      2. Click into course — assert lesson list with 7 lessons
      3. Click first lesson — assert screens render
      4. Take screenshot
    Expected Result: Course loads and renders correctly in the app
    Evidence: .sisyphus/evidence/task-17-renders.png
  ```

  **Commit**: YES
  - Message: `feat(content): add "Calendar in Your Head" seed course`
  - Files: `src/content/courses/calendar-trick/course.json`
  - Pre-commit: `bun run build`

- [x] 18. LLM Authoring Guide

  **What to do**:
  - Create `AUTHORING.md` in project root — comprehensive guide for LLMs to author courses:
  - **Section 1: Quick Start** — Minimal example: a valid course JSON with 1 module, 1 lesson, 3 screens (explanation → MC → fill-in-blank). Copy-paste this and the LLM has a working template.
  - **Section 2: Schema Reference** — Complete schema documentation generated from the Zod `.describe()` annotations. Every field, every type, every constraint. Include JSON examples for each screen type.
  - **Section 3: Pedagogical Guidelines** — The ordering convention for screens:
    1. Start with a hook (explanation screen with an engaging question or surprising fact)
    2. Guided exploration (1-2 easy interactive screens that build intuition)
    3. Concept reveal (explanation screen naming the formal concept)
    4. Practice with increasing difficulty (3-5 interactive screens, easy → hard)
    5. Extension or edge case (1-2 screens with a twist)
  - **Section 4: Content Quality Checklist**:
    - Every interactive screen has a non-trivial `explanation` field
    - Hints are progressive: first hint is a nudge, last hint is nearly the answer
    - Multiple choice has plausible distractors, not obviously wrong options
    - Fill-in-blank uses `acceptedAnswers` for common variations (e.g., "Monday", "Mon", "monday")
    - Difficulty actually increases through the lesson
    - Mathematical/factual content is verifiable
  - **Section 5: System Prompt** — A copy-paste system prompt that an LLM can use to author courses:
    ```
    You are a course author for Brilliance, an interactive learning platform.
    Your job is to create engaging, concise courses that teach through doing.
    [Schema reference]
    [Pedagogical guidelines]
    [Quality checklist]
    Generate a complete course.json following this schema...
    ```
  - **Section 6: Validation** — How to validate authored content (run the validation script)

  **Must NOT do**:
  - Do NOT write a user-facing README (that's separate)
  - Do NOT include implementation details about the app's internals

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: This is technical documentation requiring clear, structured writing
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable — documentation
    - `playwright`: Not applicable

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 15, 16, 17)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 6 (needs final schema and validation rules to document)

  **References**:

  **Pattern References**:
  - `src/lib/schemas/content.ts` (Task 2) — Schema to document
  - `src/lib/validation/content-validator.ts` (Task 6) — Validation rules to document
  - `src/content/courses/calendar-trick/course.json` (Task 17) — Example course to reference

  **WHY Each Reference Matters**:
  - The guide's schema reference MUST match the actual Zod schema exactly
  - Validation rules inform the quality checklist
  - The seed course serves as the primary example

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: LLM can author a valid course from the guide alone
    Tool: Bash (curl or bun)
    Steps:
      1. Extract the system prompt from AUTHORING.md
      2. Feed it to Claude with: "Create a course about sorting algorithms with 2 lessons"
      3. Parse the output as JSON
      4. Validate against CourseSchema
      5. Assert validation passes
    Expected Result: LLM produces valid course JSON from the guide
    Failure Indicators: Invalid JSON, schema validation errors
    Evidence: .sisyphus/evidence/task-18-llm-authoring.txt

  Scenario: Guide covers all screen types with examples
    Tool: Bash (grep)
    Steps:
      1. Search AUTHORING.md for "explanation" example — assert present
      2. Search for "multiple_choice" example — assert present
      3. Search for "fill_in_blank" example — assert present
      4. Search for "ordering" example — assert present
      5. Search for "code_block" example — assert present
    Expected Result: Every screen type has a JSON example in the guide
    Evidence: .sisyphus/evidence/task-18-coverage.txt
  ```

  **Commit**: YES
  - Message: `docs(authoring): add LLM content authoring guide`
  - Files: `AUTHORING.md`
  - Pre-commit: `bun run build`

- [x] 19. Live Adaptation Engine

  **What to do**:
  - Create `src/lib/adaptation/engine.ts` — the adaptation logic layer:
    - `requestHint(context: AdaptationContext): Promise<string>` — calls `/api/adapt/hint` with current screen context, falls back to static hints if API unavailable
    - `requestExplanation(context: AdaptationContext): Promise<string>` — calls `/api/adapt/explain` for personalized explanation after wrong answer
    - `assessDifficulty(results: ScreenResult[]): Promise<DifficultyRecommendation>` — calls `/api/adapt/difficulty` after every 3-5 screens
    - `AdaptationContext`: courseId, lessonId, screenId, screen data, user's answer, correct answer, attempt count
  - Create `src/components/lesson/adaptation-provider.tsx` — React context that provides adaptation functions to the lesson player:
    - Wraps the lesson player
    - Provides `useAdaptation()` hook with `requestHint`, `requestExplanation`, `assessDifficulty`
    - Manages loading states for API calls
    - Shows inline loading indicator when waiting for Claude response
    - Handles API errors gracefully: show static content as fallback, not error messages
  - Integrate with lesson player (Task 14):
    - When learner clicks "Need a hint?" — first try live adaptation API, fall back to static hints
    - When learner gets wrong answer — offer "Get a personalized explanation" link that calls the explain API
    - After every 3 completed screens — silently assess difficulty and show recommendation if needed ("You're doing great! Ready for a challenge?" or "Let's review this concept")
  - The adaptation should feel seamless — learners shouldn't notice the difference between static and live content unless the live content is clearly more personalized

  **Must NOT do**:
  - Do NOT make the app dependent on Claude API — everything must work with static content if API is unavailable
  - Do NOT add streaming responses (keep it simple: request → response)
  - Do NOT store adaptation history (beyond current session)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration across multiple systems (Claude API, lesson player, progress tracking) with complex fallback logic and loading states
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Loading state design, inline adaptation UI, seamless integration UX
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 20, 21)
  - **Blocks**: None (final integration)
  - **Blocked By**: Tasks 8, 14 (needs Claude API routes and lesson player)

  **References**:

  **Pattern References**:
  - `src/app/api/adapt/hint/route.ts` (Task 8) — Hint API endpoint
  - `src/app/api/adapt/explain/route.ts` (Task 8) — Explanation API endpoint
  - `src/app/api/adapt/difficulty/route.ts` (Task 8) — Difficulty assessment API
  - `src/components/lesson/lesson-player.tsx` (Task 14) — Lesson player to integrate with
  - `src/lib/hooks/use-progress.ts` (Task 4) — Progress data for difficulty assessment

  **WHY Each Reference Matters**:
  - The adaptation engine is a client-side layer that calls the API routes from Task 8
  - Must integrate with the lesson player's screen transition flow without disrupting it
  - Progress data feeds into difficulty assessment

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Live hint generation works
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, Claude auth configured
    Steps:
      1. Navigate to a lesson
      2. Reach a multiple choice screen
      3. Click "Need a hint?"
      4. Assert loading indicator appears briefly
      5. Assert a hint is displayed (may be AI-generated or static fallback)
      6. Take screenshot
    Expected Result: Hint appears (live or static)
    Failure Indicators: Crash, infinite loading, no hint
    Evidence: .sisyphus/evidence/task-19-live-hint.png

  Scenario: Adaptation works without Claude API
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, NO Claude auth configured
    Steps:
      1. Navigate to a lesson
      2. Click "Need a hint?" — assert static hint from schema appears
      3. Get wrong answer — assert static explanation from schema appears
      4. Complete 5 screens — no crash or error from difficulty assessment
    Expected Result: Full functionality via static fallback
    Failure Indicators: Error toast, API error in console, broken flow
    Evidence: .sisyphus/evidence/task-19-fallback.png
  ```

  **Commit**: YES
  - Message: `feat(adapt): add live adaptation engine with Claude integration`
  - Files: `src/lib/adaptation/engine.ts`, `src/components/lesson/adaptation-provider.tsx`
  - Pre-commit: `bun run build`

- [x] 20. Animation + Transition Polish

  **What to do**:
  - Enhance screen transitions in lesson player:
    - Screen entry: slide in from right with spring physics (stiffness: 300, damping: 25)
    - Screen exit: slide out to left with fade
    - Direction-aware: going forward slides left-to-right, going back slides right-to-left
  - Enhance answer feedback animations:
    - Correct: option/input pulses green, confetti-like particle burst (subtle, not overwhelming), then smooth fade to feedback overlay
    - Incorrect: option/input shakes horizontally (3 oscillations), then fade to feedback overlay
    - These should feel "visceral" per Brilliant's principle — the feedback should be felt, not read
  - Progress bar animation: width transitions smoothly with spring physics
  - Lesson completion celebration:
    - Large checkmark animation (draw path with Framer Motion)
    - "Lesson Complete!" text scales in
    - Subtle background pulse
  - Page transitions: course page → lesson page uses a smooth fade
  - Card hover effects on course and lesson cards: subtle scale + shadow
  - All animations should be under 500ms — snappy, not sluggish
  - Respect `prefers-reduced-motion` media query: skip animations if user has reduced motion enabled

  **Must NOT do**:
  - Do NOT add sound effects
  - Do NOT add confetti libraries (CSS-only particle effects if any)
  - Do NOT make animations blocking (user can always skip/advance)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Pure animation and micro-interaction design — requires visual polish expertise
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Animation design, micro-interactions, visual feedback
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 19, 21)
  - **Blocks**: None
  - **Blocked By**: Task 14 (needs lesson player to enhance)

  **References**:

  **Pattern References**:
  - `src/components/lesson/lesson-player.tsx` (Task 14) — Lesson player transitions
  - `src/components/lesson/feedback-overlay.tsx` (Task 5) — Feedback animations
  - `src/components/lesson/screen-container.tsx` (Task 5) — Card animations

  **External References**:
  - Framer Motion spring: `https://motion.dev/docs/react-transitions#spring` — Spring physics config
  - Framer Motion SVG path: `https://motion.dev/docs/react-animation#svg-line-drawing` — Checkmark draw animation
  - prefers-reduced-motion: `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion` — Accessibility

  **WHY Each Reference Matters**:
  - Spring physics creates the Brilliant-style "snappy but organic" feel
  - SVG path animation is the technique for the completion checkmark draw effect
  - Reduced motion is a critical accessibility requirement

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Screen transitions are smooth
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to a lesson
      2. Complete first screen, observe transition
      3. Assert no layout jumps or flickers during transition
      4. Take screenshot mid-transition if possible, or record observation
    Expected Result: Smooth, spring-physics slide transition
    Failure Indicators: Jump cut, flash of white, layout shift
    Evidence: .sisyphus/evidence/task-20-transitions.png

  Scenario: Correct answer celebration animates
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to a multiple choice screen
      2. Select correct answer, click check
      3. Assert green pulse/highlight on correct option
      4. Assert feedback overlay slides in smoothly
      5. Take screenshot of celebration state
    Expected Result: Visceral, satisfying correct answer animation
    Failure Indicators: No animation, abrupt appearance
    Evidence: .sisyphus/evidence/task-20-celebration.png

  Scenario: Lesson completion animation
    Tool: Playwright (playwright skill)
    Steps:
      1. Complete all screens in a lesson
      2. Assert checkmark draw animation plays
      3. Assert "Lesson Complete!" text appears with scale animation
    Expected Result: Satisfying completion celebration
    Evidence: .sisyphus/evidence/task-20-completion.png
  ```

  **Commit**: YES (groups with Task 21)
  - Message: `feat(polish): add animations, transitions, and responsive polish`
  - Files: Modified animation code in existing components

- [x] 21. Responsive Design + Final Styling

  **What to do**:
  - Audit all pages and components for responsive design:
    - Desktop (1280px+): centered content, max-width 768px for lesson content, wider for catalog
    - Tablet (768px-1279px): full-width with padding
    - Mobile (< 768px): stack layouts, full-width cards, touch-friendly targets (min 44px)
  - Fix any responsive issues:
    - Drag-and-drop ordering screen: ensure drag targets are large enough on mobile
    - Code block screen: make editor full-width on mobile, consider smaller font
    - Navigation: ensure nav works on mobile (may need hamburger menu or simplified nav)
  - Typography polish:
    - Heading hierarchy: course title (h1), lesson title (h2), screen title (h3)
    - Body text: 16px+ for readability, 1.6 line height for lesson content
    - Code: monospace, slightly smaller
  - Color consistency: verify all states (hover, active, focus, disabled) use theme colors
  - Focus states: ensure all interactive elements have visible focus rings (a11y)
  - Dark mode: verify all components look correct in dark mode
  - Add basic favicon and meta tags

  **Must NOT do**:
  - Do NOT add a mobile app wrapper or PWA support
  - Do NOT add mobile-specific gestures (swipe between screens, etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Responsive design audit and CSS polish across the entire app
  - **Skills**: [`frontend-ui-ux`, `playwright`]
    - `frontend-ui-ux`: Responsive design, typography, color consistency
    - `playwright`: Use to screenshot at different viewport sizes for verification
  - **Skills Evaluated but Omitted**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 19, 20)
  - **Blocks**: None
  - **Blocked By**: Tasks 14, 15, 16 (needs all pages built to polish)

  **References**:

  **Pattern References**:
  - All page files from Tasks 3, 15, 16 — Pages to audit
  - All component files from Tasks 5, 9-14 — Components to audit

  **External References**:
  - Tailwind responsive: `https://tailwindcss.com/docs/responsive-design` — Breakpoint utilities

  **WHY Each Reference Matters**:
  - Tailwind responsive utilities are the primary tool for responsive adjustments

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Desktop layout looks correct
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 1440x900
      2. Navigate to home page — screenshot
      3. Navigate to course page — screenshot
      4. Navigate to lesson — screenshot
      5. Assert content is centered, max-width applied
    Expected Result: Clean, centered desktop layout
    Evidence: .sisyphus/evidence/task-21-desktop.png

  Scenario: Mobile layout is usable
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to home page — assert no horizontal scroll
      3. Navigate to course page — assert lesson cards stack vertically
      4. Navigate to lesson — assert screen content fits viewport
      5. Assert all buttons are touch-friendly (min 44px height)
      6. Screenshot all pages
    Expected Result: Fully usable on mobile viewport
    Failure Indicators: Horizontal scroll, tiny touch targets, text overflow
    Evidence: .sisyphus/evidence/task-21-mobile-home.png, .sisyphus/evidence/task-21-mobile-lesson.png

  Scenario: Dark mode consistency
    Tool: Playwright (playwright skill)
    Steps:
      1. Enable dark mode via theme toggle
      2. Navigate through all pages: home, course, lesson
      3. Assert no white backgrounds in dark mode
      4. Assert text is readable (sufficient contrast)
      5. Assert interactive elements are visible
    Expected Result: Consistent dark mode across all pages
    Evidence: .sisyphus/evidence/task-21-dark-mode.png
  ```

  **Commit**: YES (groups with Task 20)
  - Message: `feat(polish): add animations, transitions, and responsive polish`
  - Files: Modified CSS/layout code across all components
  - Pre-commit: `bun run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` (must pass). Review all source files for: `as any`/`@ts-ignore`, empty catches, console.log in prod code, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify Zod schemas have `.describe()` on every field.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | Schema Descriptions [N/N] | VERDICT`

- [x] F3. **Real QA Walkthrough** — `unspecified-high` (+ `playwright` skill)
  Start dev server. Open browser. Navigate home page → pick "Calendar in Your Head" course → complete at least 2 full lessons. Test every screen type (explanation, MC, fill-blank, ordering, code). Test wrong answers (feedback appears). Test progress persistence (refresh, verify progress). Test live adaptation API (trigger hint). Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Screen Types [5/5] | Progress [PERSISTS/BROKEN] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual implementation. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check every "Must NOT Have" guardrail. Flag any auth code, database code, gamification beyond progress bars, video players, or CMS panels.
  Output: `Tasks [N/N compliant] | Guardrails [N/N clean] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(scaffold): initialize Next.js 15 project with shadcn/ui and tooling` — all scaffolding files
- **Wave 1**: `feat(schema): define Zod content schema with LLM-optimized descriptions` — schema files
- **Wave 1**: `feat(shell): add app layout, navigation, and theme` — layout files
- **Wave 1**: `feat(progress): add localStorage-based progress tracking` — progress hooks
- **Wave 1**: `feat(ui): add base component kit for screen rendering` — UI components
- **Wave 2**: `feat(validation): add semantic content validation beyond Zod` — validators
- **Wave 2**: `feat(loader): add filesystem content loader with Zod validation` — loader
- **Wave 2**: `feat(claude): integrate Claude Agent SDK for content generation` — SDK setup
- **Wave 2**: `feat(screens): add all 5 screen type renderers` — screen components (group commit)
- **Wave 3**: `feat(player): add lesson player with screen sequencing and transitions` — player
- **Wave 3**: `feat(pages): add course overview and home pages` — pages (group commit)
- **Wave 3**: `feat(content): add "Calendar in Your Head" seed course` — content JSON
- **Wave 3**: `docs(authoring): add LLM content authoring guide` — authoring docs
- **Wave 4**: `feat(adapt): add live adaptation engine with Claude integration` — adaptation
- **Wave 4**: `feat(polish): add animations, transitions, and responsive polish` — polish (group commit)

---

## Success Criteria

### Verification Commands
```bash
bun run build          # Expected: Build succeeds, zero errors
bun run dev            # Expected: Dev server starts on localhost:3000
curl localhost:3000    # Expected: HTML response with course catalog
curl localhost:3000/api/adapt/hint -X POST -d '{"lessonId":"...","screenId":"...","userAnswer":"..."}' # Expected: JSON hint response
```

### Final Checklist
- [ ] All "Must Have" items present and functional
- [ ] All "Must NOT Have" items absent from codebase
- [ ] Home page renders course catalog
- [ ] Full "Calendar in Your Head" course playable end-to-end
- [ ] All 5 screen types interactive and providing feedback
- [ ] Progress persists across page refresh
- [ ] Live adaptation API responds with valid structured content
- [ ] An LLM can author a new course using only the authoring guide
- [ ] Responsive on desktop and tablet viewports
