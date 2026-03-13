# Learnings — Brilliance LMS

## Conventions, Patterns, Decisions

## Task: Project Scaffolding (2026-03-13)

### create-next-app
- `bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --yes` works with bun
- The `.` (current dir) target fails if ANY files exist in the directory — must move them out first
- Installed Next.js 16.1.6 (latest, despite task saying "15")
- `--src-dir` flag works and creates `src/` structure automatically

### shadcn/ui
- Use `npx shadcn@latest add <components> --yes` (not `bunx`) — shadcn CLI works via npx
- `toast` component is deprecated — use `sonner` instead
- shadcn does NOT auto-create `src/lib/utils.ts` — must create manually with `cn()` helper
- `@/lib/utils` resolves to `src/lib/utils/index.ts` when `utils` is a directory (TypeScript module resolution)
- components.json must be created manually when not using `shadcn init` interactively

### Turbopack / Next.js config
- Multiple lockfiles (bun.lock + parent package-lock.json) trigger a workspace root warning
- Fix: set `turbopack: { root: __dirname }` in `next.config.ts`

### Dependencies installed
- framer-motion@12.36.0, zod@4.3.6, @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2
- @anthropic-ai/claude-agent-sdk@0.2.74 (exists on npm)
- shadcn peer deps: class-variance-authority, clsx, tailwind-merge, lucide-react, @radix-ui/*

### Path alias
- `@/*` → `./src/*` configured in tsconfig.json by create-next-app automatically

## Task: Progress Tracking Hooks (2026-03-13)

### SSR-safe localStorage (useStickyState)
- Josh Comeau pattern: initialize with `initialValue` in `useState` (server-safe), then hydrate from localStorage in a separate `useEffect` — this prevents hydration mismatch
- Two separate `useEffect` calls: one for hydration (runs once on mount, `[key]` dep), one for persistence (runs on every state change, `[key, state]` deps)
- Hydration effect must have `// eslint-disable-next-line react-hooks/exhaustive-deps` because `setState` is intentionally excluded to avoid re-running on every render
- Both `localStorage.getItem` (parse) and `localStorage.setItem` (write) must be wrapped in try/catch — handles corrupted JSON, private browsing, and storage quota exceeded
- `'use client'` directive required on all hook files in Next.js App Router

### useProgress design
- Storage key format: `brilliance-progress-{courseId}` — namespaced to avoid collisions
- Types defined inline (not imported from schemas) — schemas not ready yet; types can be extracted later
- `useCallback` on all returned functions to prevent unnecessary re-renders in consumers
- `getCourseCompletionPercent(totalScreens)` takes total as param (not stored) — course structure is source of truth for total, not progress state
- `makeInitialProgress` is a factory function (not a constant) so each call gets a fresh `lastAccessedAt` timestamp

## Task: UI Component Kit (2026-03-13)

### Framer Motion v12 typing
- String easing values like `'easeInOut'` must use `as const` in variant objects — otherwise TS infers `string` which doesn't satisfy the `Easing` union type
- Import path: `import { motion, AnimatePresence } from 'framer-motion'` (v12 still uses this)

### Component patterns
- All lesson/course components are `'use client'` — required for Framer Motion and interactive state
- `cn()` from `@/lib/utils` for all className merging — consistent with shadcn patterns
- Lucide icons imported individually: `import { CheckCircle2, XCircle } from 'lucide-react'`
- shadcn Card's `CardContent` has `p-6 pt-0` by default — account for this when adding custom padding
- Created `src/components/course/` directory (didn't exist) for course-level components
- Component file layout: `src/components/lesson/` for in-lesson UI, `src/components/course/` for course-listing UI

### Design decisions
- ScreenContainer: subtle card with backdrop-blur, muted uppercase screen counter, border-t footer separation
- FeedbackOverlay: emerald for correct, red for incorrect — with dark mode variants using /30 and /50 opacity modifiers
- HintDrawer: inline accordion (not Sheet) — less intrusive for progressive hint reveals; amber color scheme for warmth
- ProgressBar: custom motion.div with spring physics instead of shadcn Progress — needed animated width transitions
- LessonCard: status config object pattern with `as const` for exhaustive status→UI mapping

## Task: App Shell & Layout (2026-03-13)

### Tailwind v4 dark mode with next-themes
- Tailwind v4 uses `prefers-color-scheme` for dark mode by default — to use class-based (needed for next-themes), add `@custom-variant dark (&:is(.dark *));` in globals.css
- `@theme inline` block maps CSS variables to Tailwind color names: `--color-primary: var(--primary);` enables `bg-primary` utility
- All shadcn color semantics (background, foreground, primary, secondary, muted, accent, destructive, border, input, ring, card, popover) must be registered in `@theme inline`
- Radius values also go in `@theme inline`: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`

### next-themes setup
- ThemeProvider must be a `'use client'` wrapper component — can't use next-themes directly in server layout
- `attribute="class"` on ThemeProvider to add `.dark` class to `<html>` (required for Tailwind class-based dark mode)
- `suppressHydrationWarning` required on `<html>` element — next-themes modifies it client-side
- `disableTransitionOnChange` prevents flash-of-wrong-theme during toggle
- Theme toggle needs `mounted` state guard — `resolvedTheme` is undefined during SSR, show empty placeholder until hydrated

### Next.js 16 params
- Dynamic route params in Next.js 16 are `Promise<{}>` — must `await params` before destructuring
- Pattern: `export default async function Page({ params }: { params: Promise<{ id: string }> })`

### Color palette
- Primary: `#2563eb` (light) / `#3b82f6` (dark) — calm blue-600/500 for focused learning
- Dark background: `#0a0f1a` — very slight blue tint, easier on eyes than pure black for extended reading
- Dark card: `#111827` — subtle elevation from background
- Success: `#16a34a` / `#22c55e`, Destructive: `#ef4444` / `#dc2626`

### File structure
- `src/components/theme-provider.tsx` — client wrapper for next-themes
- `src/components/navigation.tsx` — top nav with branding + theme toggle
- Route structure: `/`, `/courses/[courseId]`, `/courses/[courseId]/lessons/[lessonId]`

## Task: Content Schema Design (2026-03-13)

### Zod 4.x API
- `z.discriminatedUnion('type', [...])` works identically to Zod 3 — same API signature
- `.describe()` still works in Zod 4, equivalent to `.meta({ description: "..." })` — both produce JSON Schema `description` field
- `z.infer<typeof Schema>` works for type inference in Zod 4
- `z.enum(['a', 'b', 'c'])` unchanged from v3
- `z.record(keySchema, valueSchema)` in Zod 4 now requires ALL enum keys present (not partial like v3) — use `z.partialRecord()` for optional keys

### Schema design decisions
- 5 screen types as interaction types (not pedagogical phases): explanation, multiple_choice, fill_in_blank, ordering, code_block
- Every field has `.describe()` — these are the LLM authoring API docs; LLMs read descriptions to understand what to generate
- Interactive screens (all except explanation) require: `explanation` (min 20 chars), `hints` (1-3 strings), `difficulty` (easy/medium/hard)
- FillInBlank uses `{{blank}}` markers in prompt text, with a parallel `blanks[]` array containing `acceptedAnswers[]` and `caseSensitive`
- Ordering uses `items[]{id, text}` + `correctOrder: string[]` (IDs) — decoupled so items can be shuffled at render
- CodeBlock has `starterCode`, `language`, `testCases[]{input, expectedOutput}` — simple I/O testing
- MultipleChoice `options[]{id, text, isCorrect}` — boolean for isCorrect is acceptable here (exactly-one constraint enforced at runtime, not schema level)
- Hierarchy: Course → Module → Lesson → Screen (max 2 levels of nesting in any single schema)
- Progress types (CourseProgress, LessonProgress, ScreenResult) match the inline types from useProgress hook — can be swapped in later

### File structure
- `src/lib/schemas/content.ts` — Course/Module/Lesson/Screen schemas + all type exports
- `src/lib/schemas/progress.ts` — CourseProgress/LessonProgress/ScreenResult schemas + type exports
